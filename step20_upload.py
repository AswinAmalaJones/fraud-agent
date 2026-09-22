import os, sys, time
from dotenv import load_dotenv
import pyTigerGraph as tg

load_dotenv()
host = os.getenv("TG_HOST", "")
graph = os.getenv("TG_GRAPH", "")
user = os.getenv("TG_USERNAME", "")
secret = os.getenv("TG_SECRET", "")

# vertices first, then edges
ORDER = ["customers", "cards", "device_profiles", "billing_regions", "email_domains", "closed_cases",
         "transactions",
         "e_made", "e_owns", "e_from_device", "e_billed_in", "e_purchaser_email", "e_recipient_email",
         "e_involves", "e_on_customer", "e_on_card", "e_connected_to", "e_touches_device"]

EXPECTED_VERTICES = {"Customer": 13553, "Card": 1927, "Transaction": 590742, "DeviceProfile": 9705,
                     "BillingRegion": 332, "EmailDomain": 60, "ClosedCase": 5565}
EXPECTED_EDGES = {"MADE": 590742, "OWNS": 1927, "FROM_DEVICE": 140784, "BILLED_IN": 525003,
                  "PURCHASER_EMAIL": 496262, "RECIPIENT_EMAIL": 137453, "INVOLVES": 14955,
                  "ON_CUSTOMER": 5565, "ON_CARD": 5565, "CONNECTED_TO": 92, "TOUCHES_DEVICE": 5137}

CHUNK_LINES = 20000


def safe(err):
    text = f"{type(err).__name__}: {err}"
    return text.replace(secret, "***") if secret else text


def find_stats(obj):
    if isinstance(obj, dict):
        if "validLine" in obj:
            return obj
        for v in obj.values():
            r = find_stats(v)
            if r:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = find_stats(v)
            if r:
                return r
    return None


def connect():
    conn = tg.TigerGraphConnection(host=host, graphname=graph, username=user, gsqlSecret=secret)
    conn.getToken(secret)
    return conn


def wait_until_ready(conn):
    for attempt in range(1, 16):
        try:
            conn.getVertexTypes()
            print("workspace is ready")
            return
        except Exception as e:
            print(f"waiting for workspace to wake up ({attempt}/15): {safe(e)[:120]}")
            time.sleep(20)
    raise SystemExit("Workspace did not become ready. Check its status in Savanna and try again.")


def chunks(path):
    with open(path, encoding="utf-8", newline="") as fh:
        fh.readline()  # skip the header line
        buf = []
        for line in fh:
            buf.append(line.rstrip("\r\n") + "\n")
            if len(buf) >= CHUNK_LINES:
                yield "".join(buf), len(buf)
                buf = []
        if buf:
            yield "".join(buf), len(buf)


# the REST loader may ignore the separator written in the job, so we try a few ways of
# sending the data on the very first chunk and keep the first way that is accepted cleanly
VARIANTS = [("sep=TAB, eol=newline", {"sep": "\t", "eol": "\n"}),
            ("sep=TAB", {"sep": "\t"}),
            ("sep=backslash-t (text)", {"sep": "\\t", "eol": "\\n"}),
            ("no sep/eol", {})]
chosen = None
BAD_KEYS = ("rejectLine", "failedConditionLine", "notEnoughToken", "invalidJson", "oversizeToken")


def post_chunk(conn, job, data, n):
    """Send one chunk. Returns (accepted_lines, rejected_lines)."""
    global chosen
    candidates = [chosen] if chosen else VARIANTS
    for label, kw in candidates:
        for attempt in range(1, 4 if chosen else 2):
            try:
                res = conn.runLoadingJobWithData(data, "f", job, **kw)
            except Exception as e:
                print(f"   [{label}] failed: {safe(e)[:220]}")
                time.sleep(5 * attempt)
                continue
            st = find_stats(res)
            if st is None:
                print("   (could not read statistics; raw reply starts with:", str(res)[:300], ")")
                good, bad = n, 0
            else:
                good = st.get("validLine", 0)
                bad = sum(st.get(k, 0) for k in BAD_KEYS)
            if chosen is None:
                if good == n and bad == 0:
                    chosen = (label, kw)
                    print(f"   >>> this way works: {label}")
                    return good, bad
                print(f"   [{label}] loaded {good} of {n} lines, {bad} rejected -> trying the next way")
                break
            return good, bad
    raise SystemExit("Could not load this data any way. Send me this screen.")


def upload(conn, name):
    path = f"staging/load/{name}.tsv"
    job = f"load_{name}"
    sent = valid = bad = 0
    t0 = time.time()
    for data, n in chunks(path):
        good, rej = post_chunk(conn, job, data, n)
        sent += n
        valid += good
        bad += rej
        print(f"   {name}: {sent:,} lines sent, {valid:,} accepted, {bad:,} rejected", end="\r")
    flag = "OK   " if (sent == valid and bad == 0) else "CHECK"
    print(f"{flag} {name:20} sent {sent:>9,} | accepted {valid:>9,} | rejected {bad:>6,} | {time.time() - t0:.0f}s")
    return sent == valid and bad == 0


def verify(conn):
    print()
    print("Counts inside TigerGraph (expected from the load files):")
    for table, expected in (("vertex", EXPECTED_VERTICES), ("edge", EXPECTED_EDGES)):
        for name, exp in expected.items():
            try:
                got = conn.getVertexCount(name) if table == "vertex" else conn.getEdgeCount(name)
                got = got if isinstance(got, int) else got.get(name, got) if isinstance(got, dict) else got
                flag = "OK   " if got == exp else "CHECK"
                print(f"{flag} {table:6} {name:18} {got!s:>10}  (expected {exp:,})")
            except Exception as e:
                print(f"FAIL  {table:6} {name:18} {safe(e)[:150]}")


if __name__ == "__main__":
    if not (host and graph and secret):
        raise SystemExit("Something is missing in the .env file.")
    args = sys.argv[1:]
    conn = connect()
    wait_until_ready(conn)
    if args == ["verify"]:
        verify(conn)
        raise SystemExit(0)
    names = args if args else ORDER
    all_ok = True
    for name in names:
        all_ok = upload(conn, name) and all_ok
    print()
    print("ALL FILES LOADED CLEANLY" if all_ok else "SOME FILES NEED A LOOK (see CHECK lines)")
    verify(conn)