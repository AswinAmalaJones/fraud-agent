import duckdb, os

os.makedirs("staging", exist_ok=True)
con = duckdb.connect()

# 1) identity.csv -> parquet (every column kept as text, exactly as in the file)
con.execute("""
COPY (SELECT * FROM read_csv('data/identity.csv', all_varchar=true))
TO 'staging/identity.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)
""")

con.execute("CREATE VIEW t AS SELECT * FROM read_parquet('staging/transactions.parquet')")
con.execute("CREATE VIEW i AS SELECT * FROM read_parquet('staging/identity.parquet')")

def one(sql):
    return con.execute(sql).fetchone()[0]

def check(name, got, expected):
    status = "OK   " if got == expected else "CHECK"
    print(f"{status} {name}: {got:,}  (expected {expected:,})")

JOIN = "FROM t JOIN i ON t.TransactionID = CAST(i.TransactionID AS BIGINT)"

check("identity rows", one("SELECT count(*) FROM i"), 144432)
check("identity columns", len(con.execute("DESCRIBE i").fetchall()), 41)
check("unique TransactionID in identity", one("SELECT count(DISTINCT TransactionID) FROM i"), 144432)
check("identity rows with no matching transaction", one(
    "SELECT count(*) FROM i LEFT JOIN t ON t.TransactionID = CAST(i.TransactionID AS BIGINT) "
    "WHERE t.TransactionID IS NULL"), 0)
check("ProductCD W with identity", one(f"SELECT count(*) {JOIN} WHERE t.ProductCD = 'W'"), 0)
check("online with identity", one(f"SELECT count(*) {JOIN} WHERE t.channel = 'online'"), 144432)
check("online WITHOUT identity", one(
    "SELECT count(*) FROM t LEFT JOIN i ON t.TransactionID = CAST(i.TransactionID AS BIGINT) "
    "WHERE t.channel = 'online' AND i.TransactionID IS NULL"), 6640)
check("DeviceType desktop", one("SELECT count(*) FROM i WHERE DeviceType = 'desktop'"), 85204)
check("DeviceType mobile", one("SELECT count(*) FROM i WHERE DeviceType = 'mobile'"), 55801)
check("DeviceType empty", one("SELECT count(*) FROM i WHERE DeviceType IS NULL"), 3427)
check("id_15 = New", one("SELECT count(*) FROM i WHERE id_15 = 'New'"), 61754)
check("id_23 = IP_PROXY:ANONYMOUS", one("SELECT count(*) FROM i WHERE id_23 = 'IP_PROXY:ANONYMOUS'"), 1185)
check("exact Samsung device profile (Stage 2)", one(
    "SELECT count(*) FROM i WHERE DeviceInfo = 'SM-G935F Build/NRD90M' AND id_30 = 'Android 7.0' "
    "AND id_31 = 'chrome 62.0 for android' AND id_33 = '1920x1080' AND id_23 = 'IP_PROXY:ANONYMOUS'"), 114)