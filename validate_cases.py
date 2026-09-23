"""
validate_cases.py -- checks every cases/<id>.json file against:
  1. the README Answer Format schema (required keys, types, allowed enum values)
  2. policy.py itself (routing, R1) -- so a case can never silently drift
     from what policy.py would actually compute for it

This does NOT re-run the LLM or touch TigerGraph. It only inspects the
JSON files already written by orchestrator.py.

Run:
  python validate_cases.py            # validate every case in cases/
  python validate_cases.py HHG-017    # validate just one

Exit code is 0 if every case has zero ERRORs (warnings don't fail the run --
a WARN flags something worth a human look, not a schema violation).
"""

import glob
import json
import os
import sys

import policy as pol

CASES_DIR = "cases"

VALID_VERDICTS = {"fraud", "legitimate", "uncertain"}
VALID_PATTERNS = {"card_testing", "card_not_present_fraud", "card_not_present_new_device",
                   "out_of_region_use", "account_takeover", "undocumented", "none"}
VALID_STATUSES = {"open", "closed_fraud", "closed_legitimate", "escalated"}
VALID_EVIDENCE_REQUEST_TYPES = {"customer_validation", "step_up_auth", "analyst_info"}
VALID_EVIDENCE_SOURCES = {"graph", "document", "customer", "external"}

REQUIRED_TOP_KEYS = {"case_id", "case", "evidence_requests", "next_best_actions",
                      "sar", "stop_reason", "tool_calls", "tokens", "latency_s"}
REQUIRED_CASE_KEYS = {"status", "verdict", "fraud_probability", "pattern", "pattern_description",
                       "affected_txn_ids", "first_suspicious_txn_id", "connected_card_ids",
                       "connected_device_profiles", "exposure_usd", "evidence",
                       "similar_prior_cases", "summary", "written_to_graph", "graph_case_id"}


class Result:
    def __init__(self, case_id):
        self.case_id = case_id
        self.errors = []
        self.warnings = []

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    @property
    def ok(self):
        return not self.errors


def validate_one(path):
    case_id = os.path.splitext(os.path.basename(path))[0]
    r = Result(case_id)

    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        r.error(f"not valid JSON: {e}")
        return r

    # -- top level --
    missing = REQUIRED_TOP_KEYS - data.keys()
    if missing:
        r.error(f"missing top-level keys: {sorted(missing)}")
    if data.get("case_id") != case_id:
        r.error(f"case_id field '{data.get('case_id')}' does not match filename '{case_id}'")

    case = data.get("case", {})
    missing = REQUIRED_CASE_KEYS - case.keys()
    if missing:
        r.error(f"case: missing keys: {sorted(missing)}")

    verdict = case.get("verdict")
    if verdict not in VALID_VERDICTS:
        r.error(f"case.verdict '{verdict}' not one of {sorted(VALID_VERDICTS)}")

    status = case.get("status")
    if status not in VALID_STATUSES:
        r.warn(f"case.status '{status}' not one of the expected {sorted(VALID_STATUSES)}")

    pattern = case.get("pattern")
    if pattern not in VALID_PATTERNS:
        r.error(f"case.pattern '{pattern}' not one of {sorted(VALID_PATTERNS)}")

    # the pattern="none" bug we fixed earlier -- guard it permanently
    if verdict == "legitimate" and pattern != "none":
        r.error(f"verdict=legitimate but pattern='{pattern}' (must be 'none')")
    if verdict in ("fraud", "uncertain") and pattern == "none":
        r.error(f"verdict={verdict} but pattern='none' (must be a real pattern or 'undocumented')")
    if pattern == "undocumented" and not str(case.get("pattern_description", "")).strip():
        r.error("pattern='undocumented' but pattern_description is empty")

    prob = case.get("fraud_probability")
    if not isinstance(prob, (int, float)) or not (0 <= prob <= 1):
        r.error(f"case.fraud_probability {prob!r} is not a number in [0, 1]")

    if verdict == "legitimate" and case.get("affected_txn_ids"):
        r.warn("verdict=legitimate but affected_txn_ids is non-empty")

    evidence = case.get("evidence", [])
    if not evidence:
        r.error("case.evidence is empty -- every case needs at least one grounded claim")
    for i, e in enumerate(evidence):
        for k in ("claim", "source", "ref", "entity_ids"):
            if k not in e:
                r.error(f"evidence[{i}]: missing '{k}'")
        if e.get("source") not in VALID_EVIDENCE_SOURCES:
            r.error(f"evidence[{i}].source '{e.get('source')}' not one of {sorted(VALID_EVIDENCE_SOURCES)}")

    independent_evidence_count = len(evidence)

    # -- evidence_requests --
    for i, req in enumerate(data.get("evidence_requests", [])):
        if req.get("type") not in VALID_EVIDENCE_REQUEST_TYPES:
            r.error(f"evidence_requests[{i}].type '{req.get('type')}' invalid")
        if not isinstance(req.get("asked_after_step"), int):
            r.error(f"evidence_requests[{i}].asked_after_step is not an int")
        if not str(req.get("assumed_response", "")).strip():
            r.error(f"evidence_requests[{i}].assumed_response is empty")

    # -- next_best_actions: validate against policy.py itself, not just the schema --
    nba = data.get("next_best_actions", {})
    for phase in ("initial", "final"):
        for i, a in enumerate(nba.get(phase, [])):
            name = a.get("action")
            if name not in pol.ACTIONS:
                r.error(f"next_best_actions.{phase}[{i}].action '{name}' is not a valid policy action")
                continue
            expected_route = pol.route_for(name, case.get("exposure_usd", 0))
            if a.get("route") != expected_route:
                r.error(f"next_best_actions.{phase}[{i}]: action={name} route='{a.get('route')}' "
                        f"but policy.route_for computes '{expected_route}'")
            if pol.r1_violation(name, prob if isinstance(prob, (int, float)) else 1.0,
                                 independent_evidence_count):
                r.error(f"next_best_actions.{phase}[{i}]: action={name} VIOLATES R1 "
                        f"(single signal, probability {prob} < 0.70)")

    # -- sar --
    sar = data.get("sar", {})
    if "file" not in sar or "reason" not in sar:
        r.error("sar: missing 'file' or 'reason'")
    if sar.get("file") and not sar.get("subjects"):
        r.warn("sar.file=true but sar.subjects is empty")
    if sar.get("file") and sar.get("total_amount_usd", 0) != case.get("exposure_usd", 0):
        r.warn(f"sar.total_amount_usd ({sar.get('total_amount_usd')}) != "
               f"case.exposure_usd ({case.get('exposure_usd')})")

    # -- graph write-back --
    if not case.get("written_to_graph"):
        r.warn("written_to_graph is False -- this case was not saved to TigerGraph")
    if case.get("written_to_graph") and case.get("graph_case_id") != case_id:
        r.warn(f"graph_case_id '{case.get('graph_case_id')}' does not match case_id '{case_id}'")

    # -- counters --
    for k in ("tool_calls", "tokens"):
        if not isinstance(data.get(k), int) or data.get(k) < 0:
            r.error(f"'{k}' must be a non-negative integer, got {data.get(k)!r}")
    if not isinstance(data.get("latency_s"), (int, float)) or data.get("latency_s") < 0:
        r.error(f"'latency_s' must be a non-negative number, got {data.get('latency_s')!r}")

    if not str(data.get("stop_reason", "")).strip():
        r.error("stop_reason is empty")

    return r


def main():
    if len(sys.argv) == 2:
        paths = [os.path.join(CASES_DIR, f"{sys.argv[1]}.json")]
    else:
        paths = sorted(glob.glob(os.path.join(CASES_DIR, "*.json")))

    if not paths:
        raise SystemExit(f"No case files found in {CASES_DIR}/")

    all_ok = True
    total_errors = 0
    total_warnings = 0

    for path in paths:
        if not os.path.exists(path):
            print(f"MISSING  {path}")
            all_ok = False
            continue
        r = validate_one(path)
        total_errors += len(r.errors)
        total_warnings += len(r.warnings)
        if r.ok and not r.warnings:
            print(f"OK       {r.case_id}")
        elif r.ok:
            print(f"WARN     {r.case_id}  ({len(r.warnings)} warning(s))")
            for w in r.warnings:
                print(f"           - {w}")
        else:
            all_ok = False
            print(f"ERROR    {r.case_id}  ({len(r.errors)} error(s), {len(r.warnings)} warning(s))")
            for e in r.errors:
                print(f"           ERROR: {e}")
            for w in r.warnings:
                print(f"           WARN:  {w}")

    print()
    print(f"Checked {len(paths)} case(s). {total_errors} error(s), {total_warnings} warning(s).")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()