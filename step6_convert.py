import duckdb, os, time

os.makedirs("staging", exist_ok=True)
t0 = time.time()

con = duckdb.connect()
con.execute("SET enable_progress_bar = true")
con.execute("""
COPY (SELECT * FROM read_csv('data/transactions.csv', sample_size=-1))
TO 'staging/transactions.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)
""")

print("Done in", round(time.time() - t0), "seconds")
print("Parquet size (MB):", round(os.path.getsize("staging/transactions.parquet") / 1e6, 1))