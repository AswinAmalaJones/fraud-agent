import os
from dotenv import load_dotenv
import pyTigerGraph as tg

load_dotenv()
host = os.getenv("TG_HOST", "")
graph = os.getenv("TG_GRAPH", "")
user = os.getenv("TG_USERNAME", "")
secret = os.getenv("TG_SECRET", "")

def safe(err):
    """Error text with the secret hidden."""
    text = f"{type(err).__name__}: {err}"
    return text.replace(secret, "***") if secret else text

print("Host      :", host)
print("Graph     :", graph)
print("Username  :", user)
print("Secret    :", f"found ({len(secret)} characters)" if secret else "MISSING")
print()

if not (host and graph and secret):
    raise SystemExit("Something is missing in the .env file. Fix it and run again.")

conn = None
try:
    conn = tg.TigerGraphConnection(host=host, graphname=graph, username=user, gsqlSecret=secret)
    print("OK    1. connection object created")
except Exception as e:
    print("FAIL  1. connection object:", safe(e)[:300])

if conn is not None:
    try:
        token = conn.getToken(secret)
        print("OK    2. token received")
    except Exception as e:
        print("FAIL  2. token:", safe(e)[:300])

    try:
        print("OK    3. TigerGraph version:", conn.getVersion())
    except Exception as e:
        print("FAIL  3. version:", safe(e)[:300])

    try:
        print("OK    4. vertex types:", conn.getVertexTypes())
    except Exception as e:
        print("FAIL  4. vertex types:", safe(e)[:300])