"""
Graph tools for the fraud investigation agent.
Every tool returns a small dict (summary), never raw transaction rows.
Every tool respects the Stage 3 time rules:
  - baseline tools only see data strictly BEFORE the flagged transaction's ts.
  - discovery tools may look up to +/- discovery_window_days around ts.
"""

import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import pyTigerGraph as tg

load_dotenv()

HOST = os.getenv("TG_HOST", "")
GRAPH = os.getenv("TG_GRAPH", "")
USER = os.getenv("TG_USERNAME", "")
SECRET = os.getenv("TG_SECRET", "")
DISCOVERY_WINDOW_DAYS = 30

DEVICE_PROFILE = "SM-G935F Build/NRD90M | Android 7.0 | chrome 62.0 for android | 1920x1080"


def connect():
    conn = tg.TigerGraphConnection(host=HOST, graphname=GRAPH, username=USER, gsqlSecret=SECRET)
    conn.getToken(SECRET)
    return conn


def _fmt(ts):
    return ts.strftime("%Y-%m-%d %H:%M:%S")


def _parse(ts_str):
    return datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# Tool 1: look up one transaction by its ID (the flagged transaction, or any other)
# ---------------------------------------------------------------------------
def get_transaction(conn, transaction_id):
    res = conn.getVerticesById("Transaction", str(transaction_id))
    if not res:
        return {"found": False, "transaction_id": str(transaction_id)}
    v = res[0]["attributes"]
    return {
        "found": True,
        "transaction_id": str(transaction_id),
        "ts": v["ts"],
        "amount_usd": v["amount_usd"],
        "product_cd": v["product_cd"],
        "channel": v["channel"],
        "risk_score": v["risk_score"],
        "customer_id": v["customer_id"],
        "addr1": v["addr1"],
        "has_identity": v["has_identity"],
        "profile_key": v["profile_key"],
    }


# ---------------------------------------------------------------------------
# Tool 2: customer baseline BEFORE the flagged transaction (never looks ahead)
# ---------------------------------------------------------------------------
def customer_baseline(conn, customer_id, baseline_cutoff_ts):
    """
    baseline_cutoff_ts: string "YYYY-MM-DD HH:MM:SS" -- normally the flagged txn's ts.
    Only transactions with ts < baseline_cutoff_ts are used.
    """
    query = """
    INTERPRET QUERY (VERTEX<Customer> cust, DATETIME cutoff) FOR GRAPH fraudGraph {
      SumAccum<INT> @@n;
      SumAccum<DOUBLE> @@sum_amt;
      MaxAccum<DOUBLE> @@max_amt;
      SetAccum<STRING> @@channels;
      SetAccum<STRING> @@products;
      SetAccum<INT> @@regions;
      S = {cust};
      T = SELECT t FROM S:s -(MADE>:e)- Transaction:t
          WHERE t.ts < cutoff
          ACCUM @@n += 1, @@sum_amt += t.amount_usd, @@max_amt += t.amount_usd,
                @@channels += t.channel, @@products += t.product_cd,
                @@regions += t.addr1;
      PRINT @@n, @@sum_amt, @@max_amt, @@channels, @@products, @@regions;
    }
    """
    res = conn.runInterpretedQuery(
        query,
        params={"cust": customer_id, "cutoff": baseline_cutoff_ts},
    )
    row = res[0] if res else {}
    n = row.get("@@n", 0)
    return {
        "customer_id": customer_id,
        "as_of_ts": baseline_cutoff_ts,
        "n_prior_txns": n,
        "avg_amount_usd": round(row.get("@@sum_amt", 0) / n, 2) if n else 0,
        "max_amount_usd": row.get("@@max_amt", 0),
        "channels_seen": sorted(row.get("@@channels", [])),
        "products_seen": sorted(row.get("@@products", [])),
        "distinct_regions_seen": len(row.get("@@regions", [])),
    }


# ---------------------------------------------------------------------------
# Tool 3: has this customer seen this billing region before the flagged txn?
# ---------------------------------------------------------------------------
def region_history(conn, customer_id, region_code, baseline_cutoff_ts):
    query = """
    INTERPRET QUERY (VERTEX<Customer> cust, INT region, DATETIME cutoff) FOR GRAPH fraudGraph {
      SumAccum<INT> @@n_in_region;
      SumAccum<INT> @@n_total;
      MinAccum<DATETIME> @@first_seen;
      S = {cust};
      T = SELECT t FROM S:s -(MADE>:e)- Transaction:t
          WHERE t.ts < cutoff
          ACCUM @@n_total += 1,
                CASE WHEN t.addr1 == region THEN
                  @@n_in_region += 1, @@first_seen += t.ts
                END;
      PRINT @@n_in_region, @@n_total, @@first_seen;
    }
    """
    res = conn.runInterpretedQuery(
        query,
        params={"cust": customer_id, "region": int(region_code), "cutoff": baseline_cutoff_ts},
    )
    row = res[0] if res else {}
    n_region = row.get("@@n_in_region", 0)
    return {
        "customer_id": customer_id,
        "region_code": int(region_code),
        "as_of_ts": baseline_cutoff_ts,
        "seen_before": n_region > 0,
        "n_prior_txns_in_region": n_region,
        "n_prior_txns_total": row.get("@@n_total", 0),
        "first_seen_ts": row.get("@@first_seen") or None,
    }


# ---------------------------------------------------------------------------
# Tool 4: device signature search (discovery tool: allowed +/- 30 days of a center ts)
# ---------------------------------------------------------------------------
def device_signature_matches(conn, profile_key, center_ts, proxy_type=None, device_status=None):
    center = _parse(center_ts)
    start = _fmt(center - timedelta(days=DISCOVERY_WINDOW_DAYS))
    end = _fmt(center + timedelta(days=DISCOVERY_WINDOW_DAYS))

    query = """
    INTERPRET QUERY (STRING pkey, STRING proxy, STRING status, DATETIME start_ts, DATETIME end_ts)
    FOR GRAPH fraudGraph {
      SumAccum<INT> @@n_txns;
      SetAccum<STRING> @@customers;
      P = {DeviceProfile.*};
      T = SELECT t FROM P:p -(DEVICE_OF>:e)- Transaction:t
          WHERE p.profile_key == pkey
            AND (proxy == "" OR e.proxy_type == proxy)
            AND (status == "" OR e.device_status == status)
            AND t.ts >= start_ts AND t.ts <= end_ts
          ACCUM @@n_txns += 1, @@customers += t.customer_id;
      PRINT @@n_txns, @@customers;
    }
    """
    res = conn.runInterpretedQuery(
        query,
        params={
            "pkey": profile_key,
            "proxy": proxy_type or "",
            "status": device_status or "",
            "start_ts": start,
            "end_ts": end,
        },
    )
    row = res[0] if res else {}
    customers = sorted(row.get("@@customers", []))
    return {
        "profile_key": profile_key,
        "proxy_type": proxy_type,
        "device_status": device_status,
        "window_start_ts": start,
        "window_end_ts": end,
        "n_txns": row.get("@@n_txns", 0),
        "n_distinct_customers": len(customers),
        "customer_ids": customers,
    }


# ---------------------------------------------------------------------------
# Tool 5: burst scan -- transactions close together in time, in an amount band
#          (discovery tool: allowed +/- 30 days of the flagged txn's ts)
# ---------------------------------------------------------------------------
def burst_scan(conn, customer_id, center_ts, amount_min, amount_max, window_minutes=60):
    center = _parse(center_ts)
    start = _fmt(center - timedelta(days=DISCOVERY_WINDOW_DAYS))
    end = _fmt(center + timedelta(days=DISCOVERY_WINDOW_DAYS))

    query = """
    INTERPRET QUERY (VERTEX<Customer> cust, DOUBLE amt_min, DOUBLE amt_max,
                      DATETIME start_ts, DATETIME end_ts)
    FOR GRAPH fraudGraph {
      ListAccum<STRING> @@txn_ids;
      ListAccum<DATETIME> @@txn_ts;
      ListAccum<DOUBLE> @@txn_amt;
      S = {cust};
      T = SELECT t FROM S:s -(MADE>:e)- Transaction:t
          WHERE t.ts >= start_ts AND t.ts <= end_ts
            AND t.amount_usd >= amt_min AND t.amount_usd <= amt_max
          ACCUM @@txn_ids += t.transaction_id, @@txn_ts += t.ts, @@txn_amt += t.amount_usd
          ORDER BY t.ts ASC;
      PRINT @@txn_ids, @@txn_ts, @@txn_amt;
    }
    """
    res = conn.runInterpretedQuery(
        query,
        params={
            "cust": customer_id, "amt_min": amount_min, "amt_max": amount_max,
            "start_ts": start, "end_ts": end,
        },
    )
    row = res[0] if res else {}
    ids = row.get("@@txn_ids", [])
    tss = row.get("@@txn_ts", [])
    amts = row.get("@@txn_amt", [])

    # find clusters where consecutive transactions are within window_minutes of each other
    clusters = []
    current = []
    for i in range(len(ids)):
        if not current:
            current = [i]
        else:
            prev_ts = _parse(tss[current[-1]])
            this_ts = _parse(tss[i])
            if (this_ts - prev_ts).total_seconds() <= window_minutes * 60:
                current.append(i)
            else:
                if len(current) >= 3:
                    clusters.append(current)
                current = [i]
    if len(current) >= 3:
        clusters.append(current)

    return {
        "customer_id": customer_id,
        "window_start_ts": start,
        "window_end_ts": end,
        "amount_band": [amount_min, amount_max],
        "n_candidate_txns": len(ids),
        "clusters": [
            {
                "transaction_ids": [ids[i] for i in c],
                "start_ts": tss[c[0]],
                "end_ts": tss[c[-1]],
                "span_minutes": round((_parse(tss[c[-1]]) - _parse(tss[c[0]])).total_seconds() / 60, 1),
                "total_amount_usd": round(sum(amts[i] for i in c), 2),
            }
            for c in clusters
        ],
    }


if __name__ == "__main__":
    conn = connect()
    print("connected")
    print()

    print("=== get_transaction (HHG-014 flagged txn) ===")
    print(get_transaction(conn, "3478561"))
    print()

    print("=== customer_baseline (C13487, cutoff = flagged ts) ===")
    print(customer_baseline(conn, "C13487", "2016-11-22 16:11:00"))
    print()

    print("=== region_history (C13487, region 191, cutoff = flagged ts) ===")
    print(region_history(conn, "C13487", 191, "2016-11-22 16:11:00"))
    print()

    print("=== device_signature_matches (the Stage 2 Samsung profile, +/-30d around the flagged ts) ===")
    r = device_signature_matches(
        conn, DEVICE_PROFILE, "2016-11-22 16:11:00",
        proxy_type="IP_PROXY:ANONYMOUS", device_status="New",
    )
    print({k: v for k, v in r.items() if k != "customer_ids"}, "| n_distinct_customers:", r["n_distinct_customers"])
    print()

    print("=== burst_scan (C07297 / HHG-006, near-$500 band) ===")
    r2 = burst_scan(conn, "C07297", "2016-11-21 20:30:00", 400, 500, window_minutes=60)
    print({k: v for k, v in r2.items() if k != "clusters"})
    for c in r2["clusters"]:
        print("  cluster:", c)