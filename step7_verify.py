import duckdb

con = duckdb.connect()
con.execute("CREATE VIEW t AS SELECT * FROM read_parquet('staging/transactions.parquet')")

def one(sql):
    return con.execute(sql).fetchone()[0]

def check(name, got, expected):
    status = "OK   " if got == expected else "CHECK"
    print(f"{status} {name}: {got:,}  (expected {expected:,})")

check("rows", one("SELECT count(*) FROM t"), 590742)
check("columns", len(con.execute("DESCRIBE t").fetchall()), 397)
check("unique TransactionID", one("SELECT count(DISTINCT TransactionID) FROM t"), 590742)
check("ts mismatch", one(
    "SELECT count(*) FROM t WHERE CAST(ts AS TIMESTAMP) <> "
    "TIMESTAMP '2016-07-02 00:00:00' + to_seconds(CAST(TransactionDT AS BIGINT))"), 0)
check("customers", one("SELECT count(DISTINCT customer_id) FROM t"), 13553)
check("distinct card1", one("SELECT count(DISTINCT card1) FROM t"), 13553)
check("customers with >1 card1", one(
    "SELECT count(*) FROM (SELECT customer_id FROM t GROUP BY customer_id HAVING count(DISTINCT card1) > 1)"), 0)
check("card1 with >1 customer", one(
    "SELECT count(*) FROM (SELECT card1 FROM t GROUP BY card1 HAVING count(DISTINCT customer_id) > 1)"), 0)
check("online", one("SELECT count(*) FROM t WHERE channel = 'online'"), 151072)
check("in_person", one("SELECT count(*) FROM t WHERE channel = 'in_person'"), 439670)
check("ProductCD W vs in_person mismatch", one(
    "SELECT count(*) FROM t WHERE (ProductCD = 'W') <> (channel = 'in_person')"), 0)