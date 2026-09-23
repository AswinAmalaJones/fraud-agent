import json
import glob

for f in sorted(glob.glob("cases/*.json")):
    j = json.load(open(f))
    c = j["case"]
    print(f"{j['case_id']}: pattern={c['pattern']} "
          f"affected={len(c['affected_txn_ids'])} "
          f"exposure={c['exposure_usd']}")