import duckdb

con = duckdb.connect()
con.execute("CREATE VIEW t AS SELECT * FROM read_csv('data/transactions.csv', sample_size=-1)")

rows = con.execute("SELECT count(*) FROM t").fetchone()[0]
cols = len(con.execute("DESCRIBE t").fetchall())
first, last = con.execute("SELECT min(CAST(ts AS TIMESTAMP)), max(CAST(ts AS TIMESTAMP)) FROM t").fetchone()
bad = con.execute(
    "SELECT count(*) FROM t "
    "WHERE CAST(ts AS TIMESTAMP) <> TIMESTAMP '2016-07-02 00:00:00' + to_seconds(CAST(TransactionDT AS BIGINT))"
).fetchone()[0]

print("Rows        :", f"{rows:,}")
print("Columns     :", cols)
print("First ts    :", first)
print("Last ts     :", last)
print("ts mismatch :", bad)