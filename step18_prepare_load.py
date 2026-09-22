import duckdb, os

os.makedirs("staging/load", exist_ok=True)
con = duckdb.connect()

con.execute("CREATE VIEW t AS SELECT * FROM read_parquet('staging/transactions.parquet')")
con.execute("CREATE VIEW i AS SELECT * FROM read_parquet('staging/identity.parquet')")
con.execute("CREATE VIEW c AS SELECT * FROM read_parquet('staging/closed_cases.parquet')")
con.execute("CREATE VIEW p AS SELECT * FROM read_parquet('staging/case_pack.parquet')")

def one(sql):
    return con.execute(sql).fetchone()[0]

problems = []

# ---- 0) text safety: the load files use TAB as separator, so no text may contain tab/newline/quote
def unsafe(view, cols):
    cond = " OR ".join(
        f"({col} LIKE '%' || chr(9) || '%' OR {col} LIKE '%' || chr(10) || '%' "
        f"OR {col} LIKE '%' || chr(13) || '%' OR {col} LIKE '%\"%')" for col in cols)
    return one(f"SELECT count(*) FROM {view} WHERE {cond}")

for view, cols in [("i", ["DeviceInfo", "id_30", "id_31", "id_33", "DeviceType", "id_15", "id_23", "id_34"]),
                   ("c", ["case_id", "customer_id", "card_id", "txn_ids", "connected_card_ids",
                          "actions_taken", "report_filed", "analyst_notes"]),
                   ("t", ["customer_id", "P_emaildomain", "R_emaildomain", "card4", "card6"])]:
    n = unsafe(view, cols)
    print(f"text safety check {view}: {n} risky rows")
    if n:
        problems.append(f"text safety {view}")

# ---- 1) device profiles built from identity (verbatim text, README format)
con.execute("""
CREATE VIEW idprof AS
SELECT CAST(TransactionID AS BIGINT) AS tid,
       DeviceInfo AS device_info, id_30 AS os, id_31 AS browser, id_33 AS screen,
       DeviceType AS device_type, id_15 AS device_status, id_23 AS proxy_type, id_34 AS match_status,
       (DeviceInfo IS NOT NULL)::INT + (id_30 IS NOT NULL)::INT
         + (id_31 IS NOT NULL)::INT + (id_33 IS NOT NULL)::INT AS completeness,
       coalesce(DeviceInfo, '') || ' | ' || coalesce(id_30, '') || ' | '
         || coalesce(id_31, '') || ' | ' || coalesce(id_33, '') AS profile_key
FROM i
""")

# ---- 2) case references (order kept exactly as listed in the file)
con.execute("""
CREATE VIEW refs AS
SELECT case_id, x.tid AS tid, x.seq AS seq
FROM (SELECT case_id,
             unnest(list_transform(string_split(txn_ids, '|'), (v, k) -> {'tid': v, 'seq': k})) AS x
      FROM c)
""")

# ---- 3) card aliases from case sources only (transactions have NO card_id)
con.execute("""
CREATE VIEW card_src AS
SELECT card_id, 'case_pack' AS src FROM p
UNION ALL SELECT card_id, 'closed' AS src FROM c
UNION ALL SELECT unnest(string_split(connected_card_ids, '|')) AS card_id, 'connected' AS src
          FROM c WHERE connected_card_ids IS NOT NULL
""")

files = {
 "customers": """SELECT customer_id, min(CAST(card1 AS BIGINT)) AS card1 FROM t GROUP BY customer_id""",
 "cards": """SELECT card_id, split_part(card_id, '-', 1) AS customer_id, split_part(card_id, '-', 2) AS suffix,
        CASE WHEN bool_or(src = 'case_pack') THEN 'true' ELSE 'false' END AS in_case_pack,
        CASE WHEN bool_or(src = 'closed') THEN 'true' ELSE 'false' END AS in_closed_history,
        CASE WHEN bool_or(src = 'connected') THEN 'true' ELSE 'false' END AS in_connected_list
        FROM card_src GROUP BY card_id""",
 "transactions": """SELECT CAST(t.TransactionID AS VARCHAR) AS transaction_id,
        CAST(t.TransactionDT AS BIGINT) AS transaction_dt,
        strftime(CAST(t.ts AS TIMESTAMP), '%Y-%m-%d %H:%M:%S') AS ts,
        t.TransactionAmt AS amount_usd, t.ProductCD AS product_cd, t.channel, t.risk_score,
        t.customer_id, CAST(t.card1 AS BIGINT) AS card1,
        t.card4 AS card4, t.card6 AS card6,
        coalesce(CAST(t.addr1 AS BIGINT), -1) AS addr1, coalesce(CAST(t.addr2 AS BIGINT), -1) AS addr2,
        CASE WHEN t.addr2 = 87 THEN 'true' ELSE 'false' END AS is_home_country,
        t.P_emaildomain AS p_emaildomain, t.R_emaildomain AS r_emaildomain,
        CASE WHEN d.tid IS NULL THEN 'false' ELSE 'true' END AS has_identity,
        CASE WHEN d.completeness >= 1 THEN d.profile_key ELSE NULL END AS profile_key
        FROM t LEFT JOIN idprof d ON d.tid = t.TransactionID""",
 "device_profiles": """SELECT profile_key, any_value(device_info) AS device_info, any_value(os) AS os,
        any_value(browser) AS browser, any_value(screen) AS screen, any_value(completeness) AS completeness
        FROM idprof WHERE completeness >= 1 GROUP BY profile_key""",
 "billing_regions": """SELECT DISTINCT CAST(addr1 AS BIGINT) AS region_code FROM t WHERE addr1 IS NOT NULL""",
 "email_domains": """SELECT DISTINCT d AS domain FROM (
        SELECT P_emaildomain AS d FROM t UNION SELECT R_emaildomain FROM t) WHERE d IS NOT NULL""",
 "closed_cases": """SELECT c.case_id, c.customer_id, c.card_id, c.opened_at, c.closed_at, c.outcome, c.pattern,
        c.first_fraud_txn_id AS first_fraud_txn_id, c.txn_ids,
        CAST(c.n_txns AS INT) AS n_txns, CAST(c.exposure_usd AS DOUBLE) AS exposure_usd,
        c.connected_card_ids AS connected_card_ids, c.actions_taken, c.report_filed, c.analyst_notes,
        round(coalesce(s.amt, 0), 2) AS txn_amount_sum_usd,
        CASE WHEN c.outcome = 'cleared' THEN 'not_applicable_cleared' ELSE 'txn_amount_sum' END AS exposure_basis,
        c.closed_at AS available_from_ts
        FROM c LEFT JOIN (SELECT r.case_id, sum(t.TransactionAmt) AS amt
                          FROM refs r JOIN t ON t.TransactionID = CAST(r.tid AS BIGINT)
                          GROUP BY r.case_id) s ON s.case_id = c.case_id""",
 "e_made": """SELECT customer_id, CAST(TransactionID AS VARCHAR) AS transaction_id FROM t""",
 "e_owns": """SELECT split_part(card_id, '-', 1) AS customer_id, card_id FROM (SELECT DISTINCT card_id FROM card_src)""",
 "e_from_device": """SELECT CAST(tid AS VARCHAR) AS transaction_id, profile_key, device_status, proxy_type, match_status, device_type
        FROM idprof WHERE completeness >= 1""",
 "e_billed_in": """SELECT CAST(TransactionID AS VARCHAR) AS transaction_id, CAST(addr1 AS BIGINT) AS region_code
        FROM t WHERE addr1 IS NOT NULL""",
 "e_purchaser_email": """SELECT CAST(TransactionID AS VARCHAR) AS transaction_id, P_emaildomain AS domain
        FROM t WHERE P_emaildomain IS NOT NULL""",
 "e_recipient_email": """SELECT CAST(TransactionID AS VARCHAR) AS transaction_id, R_emaildomain AS domain
        FROM t WHERE R_emaildomain IS NOT NULL""",
 "e_involves": """SELECT r.case_id, r.tid AS transaction_id, r.seq,
        CASE WHEN r.tid = c.first_fraud_txn_id THEN 'true' ELSE 'false' END AS is_first
        FROM refs r JOIN c ON c.case_id = r.case_id""",
 "e_on_customer": """SELECT case_id, customer_id FROM c""",
 "e_on_card": """SELECT case_id, card_id FROM c""",
 "e_connected_to": """SELECT case_id, unnest(string_split(connected_card_ids, '|')) AS card_id
        FROM c WHERE connected_card_ids IS NOT NULL""",
 "e_touches_device": """SELECT r.case_id, d.profile_key, count(*) AS n_txns
        FROM refs r JOIN idprof d ON d.tid = CAST(r.tid AS BIGINT)
        WHERE d.completeness >= 1 GROUP BY r.case_id, d.profile_key""",
}

expected = {"customers": 13553, "cards": 1927, "transactions": 590742, "billing_regions": 332,
            "closed_cases": 5565, "e_made": 590742, "e_owns": 1927, "e_involves": 14955,
            "e_on_customer": 5565, "e_on_card": 5565, "e_connected_to": 92}

print()
print(f"{'file':20} {'rows':>10}   expected")
for name, sql in files.items():
    path = f"staging/load/{name}.tsv"
    con.execute(f"COPY ({sql}) TO '{path}' (FORMAT CSV, DELIMITER '\t', HEADER true)")
    n = one(f"SELECT count(*) FROM read_csv('{path}', delim='\t', header=true, all_varchar=true)")
    exp = expected.get(name)
    flag = "" if exp is None else ("  OK" if n == exp else "  CHECK")
    if exp is not None and n != exp:
        problems.append(f"{name}: {n} rows, expected {exp}")
    print(f"{name:20} {n:>10,}   {exp if exp is not None else '-'}{flag}")

# ---- 4) orphan checks: every edge end must exist as a vertex
def L(name):
    return f"read_csv('staging/load/{name}.tsv', delim='\t', header=true, all_varchar=true)"

orphans = {
 "closed-case customers missing from customers": f"SELECT count(*) FROM {L('closed_cases')} x LEFT JOIN {L('customers')} y USING (customer_id) WHERE y.customer_id IS NULL",
 "card customers missing from customers": f"SELECT count(*) FROM {L('cards')} x LEFT JOIN {L('customers')} y USING (customer_id) WHERE y.customer_id IS NULL",
 "case transactions missing from transactions": f"SELECT count(*) FROM {L('e_involves')} x LEFT JOIN {L('transactions')} y USING (transaction_id) WHERE y.transaction_id IS NULL",
 "connected cards missing from cards": f"SELECT count(*) FROM {L('e_connected_to')} x LEFT JOIN {L('cards')} y USING (card_id) WHERE y.card_id IS NULL",
 "device edges missing a device profile": f"SELECT count(*) FROM {L('e_from_device')} x LEFT JOIN {L('device_profiles')} y USING (profile_key) WHERE y.profile_key IS NULL",
}
print()
for name, sql in orphans.items():
    n = one(sql)
    print(("OK    " if n == 0 else "CHECK ") + f"{name}: {n}")
    if n:
        problems.append(name)

print()
print("device profiles:", f"{one('SELECT count(*) FROM ' + L('device_profiles')):,}",
      "| identity rows skipped (no device fields):", f"{one('SELECT count(*) FROM idprof WHERE completeness = 0'):,}")
import glob
quoted = 0
for f in glob.glob("staging/load/*.tsv"):
    with open(f, encoding="utf-8") as fh:
        if '"' in fh.read():
            quoted += 1
            print("CHECK quote character found in", f)
            problems.append("quotes in " + f)
print("OK    no quote characters in any load file" if quoted == 0 else "CHECK quotes found")
print("PROBLEMS:", problems if problems else "none")