"""
graph_writer.py -- writes one agent-generated investigation case into
TigerGraph as an AgentCase vertex, linked to the same vertex types
ClosedCase already links to (Customer, Card, Transaction, DeviceProfile).

Ground-truth rule (README / Stage 3, non-negotiable):
  AgentCase != ClosedCase. This module NEVER writes into ClosedCase and
  NEVER sets a historical outcome on an AgentCase. AgentCase records what
  THIS agent run decided, nothing more.
"""

from datetime import datetime, timezone


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def write_case_to_graph(conn, alert: dict, result: dict, run_mode: str = "isolated") -> str:
    case_id = result["case_id"]
    case = result["case"]

    attrs = {
        "customer_id": alert["customer_id"],
        "card_id": alert.get("card_id", "") or "",
        "opened_at": alert["opened_at"],
        "created_at": _now_str(),
        "status": case["status"],
        "verdict": case["verdict"],
        "fraud_probability": case["fraud_probability"],
        "pattern": case["pattern"],
        "pattern_description": case["pattern_description"],
        "exposure_usd": case["exposure_usd"],
        "summary": case["summary"],
        "stop_reason": result["stop_reason"],
        "run_mode": run_mode,
        "sar_filed": result["sar"]["file"],
    }
    conn.upsertVertex("AgentCase", case_id, attrs)
    conn.upsertEdge("AgentCase", case_id, "AGENT_ON_CUSTOMER", "Customer", alert["customer_id"])

    if alert.get("card_id"):
        try:
            conn.upsertEdge("AgentCase", case_id, "AGENT_ON_CARD", "Card", alert["card_id"])
        except Exception as e:
            print(f"  [graph_writer] WARN: could not link card {alert['card_id']}: {e}")

    for i, txn_id in enumerate(case.get("affected_txn_ids", []), start=1):
        try:
            conn.upsertEdge(
                "AgentCase", case_id, "AGENT_INVOLVES", "Transaction", txn_id,
                {"seq": i, "is_first": txn_id == case.get("first_suspicious_txn_id", "")},
            )
        except Exception as e:
            print(f"  [graph_writer] WARN: could not link transaction {txn_id}: {e}")

    for profile_key in case.get("connected_device_profiles", []):
        try:
            conn.upsertEdge(
                "AgentCase", case_id, "AGENT_TOUCHES_DEVICE", "DeviceProfile", profile_key,
                {"n_txns": len(case.get("affected_txn_ids", []))},
            )
        except Exception as e:
            print(f"  [graph_writer] WARN: could not link device {profile_key}: {e}")

    for card_id in case.get("connected_card_ids", []):
        try:
            conn.upsertEdge("AgentCase", case_id, "AGENT_CONNECTED_TO", "Card", card_id)
        except Exception as e:
            print(f"  [graph_writer] WARN: could not link connected card {card_id}: {e}")

    return case_id