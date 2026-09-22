import duckdb, os

os.makedirs("staging", exist_ok=True)
con = duckdb.connect()

# 1) both case files -> parquet (all columns kept as text, exactly as in the files)
for name, out in [("closed_cases_history", "closed_cases"), ("case_pack", "case_pack")]:
    con.execute(f"""
    COPY (SELECT * FROM read_csv('data/{name}.csv', all_varchar=true))
    TO 'staging/{out}.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)

con.execute("CREATE VIEW t  AS SELECT * FROM read_parquet('staging/transactions.parquet')")
con.execute("CREATE VIEW c  AS SELECT * FROM read_parquet('staging/closed_cases.parquet')")
con.execute("CREATE VIEW p  AS SELECT * FROM read_parquet('staging/case_pack.parquet')")
con.execute("""
CREATE VIEW refs AS
SELECT case_id, CAST(unnest(string_split(txn_ids, '|')) AS BIGINT) AS tid FROM c
""")

def one(sql):
    return con.execute(sql).fetchone()[0]

def check(name, got, expected):
    status = "OK   " if got == expected else "CHECK"
    print(f"{status} {name}: {got:,}  (expected {expected:,})")

def checkf(name, got, expected):
    status = "OK   " if abs(got - expected) < 0.005 else "CHECK"
    print(f"{status} {name}: {got:,.2f}  (expected {expected:,.2f})")

print("--- closed_cases_history ---")
check("rows", one("SELECT count(*) FROM c"), 5565)
check("columns", len(con.execute("DESCRIBE c").fetchall()), 15)
check("unique case_id", one("SELECT count(DISTINCT case_id) FROM c"), 5565)
check("confirmed_fraud", one("SELECT count(*) FROM c WHERE outcome = 'confirmed_fraud'"), 4665)
check("cleared", one("SELECT count(*) FROM c WHERE outcome = 'cleared'"), 900)
for pat, n in [("card_not_present_fraud", 1404), ("account_takeover", 1205),
               ("card_not_present_new_device", 1076), ("out_of_region_use", 955),
               ("none", 900), ("card_testing", 16), ("undocumented", 9)]:
    check(f"pattern {pat}", one(f"SELECT count(*) FROM c WHERE pattern = '{pat}'"), n)
check("transaction references", one("SELECT count(*) FROM refs"), 14955)
check("unique transaction references", one("SELECT count(DISTINCT tid) FROM refs"), 14955)
check("references NOT found in transactions", one(
    "SELECT count(*) FROM refs r LEFT JOIN t ON t.TransactionID = r.tid WHERE t.TransactionID IS NULL"), 0)
check("cases with connected_card_ids", one("SELECT count(*) FROM c WHERE connected_card_ids IS NOT NULL"), 4)
check("card_id prefix != customer_id", one(
    "SELECT count(*) FROM c WHERE split_part(card_id, '-', 1) <> customer_id"), 0)
checkf("confirmed-fraud exposure total", one(
    "SELECT sum(CAST(exposure_usd AS DOUBLE)) FROM c WHERE outcome = 'confirmed_fraud'"), 2072387.77)
checkf("cleared cases: sum of transaction amounts", one(
    "SELECT sum(t.TransactionAmt) FROM refs r JOIN t ON t.TransactionID = r.tid "
    "JOIN c ON c.case_id = r.case_id WHERE c.outcome = 'cleared'"), 249255.79)
check("confirmed cases where exposure != sum of amounts", one("""
SELECT count(*) FROM c JOIN (
  SELECT r.case_id, sum(t.TransactionAmt) AS amt FROM refs r JOIN t ON t.TransactionID = r.tid GROUP BY r.case_id
) s ON s.case_id = c.case_id
WHERE c.outcome = 'confirmed_fraud' AND abs(CAST(c.exposure_usd AS DOUBLE) - s.amt) > 0.005"""), 0)

print("--- case_pack ---")
check("rows", one("SELECT count(*) FROM p"), 20)
check("columns", len(con.execute("DESCRIBE p").fetchall()), 8)
check("trigger risk_score", one("SELECT count(*) FROM p WHERE trigger_type = 'risk_score'"), 11)
check("trigger customer_report", one("SELECT count(*) FROM p WHERE trigger_type = 'customer_report'"), 8)
check("trigger analyst_request", one("SELECT count(*) FROM p WHERE trigger_type = 'analyst_request'"), 1)
check("flagged txn found in transactions", one(
    "SELECT count(*) FROM p JOIN t ON t.TransactionID = CAST(p.flagged_txn_id AS BIGINT)"), 20)
check("customer_id differs from transaction's customer", one(
    "SELECT count(*) FROM p JOIN t ON t.TransactionID = CAST(p.flagged_txn_id AS BIGINT) "
    "WHERE t.customer_id <> p.customer_id"), 0)
check("risk_score differs from transaction's risk_score", one(
    "SELECT count(*) FROM p JOIN t ON t.TransactionID = CAST(p.flagged_txn_id AS BIGINT) "
    "WHERE p.risk_score IS NOT NULL AND abs(CAST(p.risk_score AS DOUBLE) - t.risk_score) > 0.0001"), 0)
check("opened_at NOT 1-6 whole hours after ts", one("""
SELECT count(*) FROM p JOIN t ON t.TransactionID = CAST(p.flagged_txn_id AS BIGINT)
WHERE NOT (date_diff('second', CAST(t.ts AS TIMESTAMP), CAST(p.opened_at AS TIMESTAMP)) % 3600 = 0
       AND date_diff('second', CAST(t.ts AS TIMESTAMP), CAST(p.opened_at AS TIMESTAMP)) BETWEEN 3600 AND 21600)"""), 0)
check("amount in trigger_text differs from transaction amount", one("""
SELECT count(*) FROM p JOIN t ON t.TransactionID = CAST(p.flagged_txn_id AS BIGINT)
WHERE regexp_extract(p.trigger_text, '\\$([0-9,]+\\.[0-9][0-9])', 1) <> ''
  AND abs(CAST(replace(regexp_extract(p.trigger_text, '\\$([0-9,]+\\.[0-9][0-9])', 1), ',', '') AS DOUBLE)
          - t.TransactionAmt) > 0.005"""), 0)