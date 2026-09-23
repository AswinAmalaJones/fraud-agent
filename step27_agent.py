"""
step27_agent.py -- orchestrates one fraud investigation case end-to-end.

Flow (matches README section 3b, "the next best action can change"):
  1. Load the case row from case_pack.csv.
  2. Gather evidence from TigerGraph via tools.py (baseline, region, device,
     burst scan -- all respecting the ts-authoritative / no-lookahead rules
     already built into tools.py).
  3. Ask Gemini for an INITIAL assessment: fraud_probability, pattern,
     evidence claims, candidate actions. Gemini never applies policy itself
     -- it only proposes (see policy.py's module docstring).
  4. Run the initial actions through policy.py's R1 check. If R1 requires
     verification before a block, the block is deferred and a verification
     action is used instead.
  5. If any evidence-gathering action was recommended (VERIFY_WITH_CUSTOMER /
     STEP_UP_AUTH / ESCALATE_TO_ANALYST), get a deterministic reply from
     simulator.py, record it under evidence_requests, and update the
     probability.
  6. Ask Gemini again for a FINAL assessment given the new evidence.
  7. Run the final actions through policy.py: routing, R1, SAR criteria,
     stop_check. Compute exposure from compute_exposure().
  8. Assemble the full README Answer Format JSON and write cases/<id>.json.

Run:
  python step27_agent.py HHG-017

ASSUMPTIONS (README does not pin these down exactly -- documented so they
can be revisited):
  - independent_evidence_count = len(case.evidence) at the time of the
    check, i.e. one "independent piece" per claim the LLM has grounded in
    a tool/document/customer ref. Each answered evidence_request adds one
    more claim (source="customer"/"analyst"), so it naturally increments
    this count.
  - "fraud confirmed or strongly suspected" (Policy 3a, SAR gate) is taken
    to mean verdict == "fraud" OR fraud_probability >= R1_PROBABILITY_THRESHOLD (0.70).

CHANGE LOG (this pass):
  - call_llm() now retries on 503/UNAVAILABLE with exponential backoff
    instead of crashing on the first transient failure.
  - run_case() prints the initial prompt length (chars) once, purely as a
    diagnostic to check whether prompt size is contributing to 503s.
    Remove/comment this out once it's no longer useful.
"""

import os
import sys
import csv
import json
import time

from dotenv import load_dotenv
from google import genai

import tools
import policy
import simulator

load_dotenv()
MODEL = "gemini-flash-latest"  # kept for reference; call_llm() now cycles FALLBACK_MODELS
FALLBACK_MODELS = [
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
]

CASE_PACK_PATH = "data/case_pack.csv"
OUTPUT_DIR = "cases"

# Actions that require a simulated reply before they can be "resolved".
# Maps action -> (evidence_requests.type, simulator function)
EVIDENCE_ACTION_MAP = {
    "VERIFY_WITH_CUSTOMER": ("customer_validation", simulator.simulate_customer_validation),
    "STEP_UP_AUTH": ("step_up_auth", simulator.simulate_step_up_auth),
    "ESCALATE_TO_ANALYST": ("analyst_info", simulator.simulate_analyst_info),
}

PATTERN_VALUES = {
    "card_testing", "card_not_present_fraud", "card_not_present_new_device",
    "out_of_region_use", "account_takeover", "undocumented", "none",
}


# ---------------------------------------------------------------------------
# 1. Load the case
# ---------------------------------------------------------------------------
def load_case(case_id: str, path: str = CASE_PACK_PATH) -> dict:
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["case_id"] == case_id:
                return row
    raise SystemExit(f"case_id '{case_id}' not found in {path}")


# ---------------------------------------------------------------------------
# 2. Gather evidence from the graph
# ---------------------------------------------------------------------------
def gather_evidence(conn, case: dict) -> dict:
    txn = tools.get_transaction(conn, case["flagged_txn_id"])
    if not txn["found"]:
        raise SystemExit(f"flagged_txn_id {case['flagged_txn_id']} not found in graph")

    baseline = tools.customer_baseline(conn, case["customer_id"], txn["ts"])
    region = tools.region_history(conn, case["customer_id"], txn["addr1"], txn["ts"])

    device = None
    if txn.get("profile_key"):
        device = tools.device_signature_matches(conn, txn["profile_key"], txn["ts"])

    burst = tools.burst_scan(conn, case["customer_id"], txn["ts"], 0.0, 5.0, window_minutes=60)

    return {
        "flagged_txn": txn,
        "customer_baseline": baseline,
        "region_history": region,
        "device_matches": device,
        "burst_scan_small_amounts": burst,
    }


def count_graph_tool_calls(evidence: dict) -> int:
    n = 3  # get_transaction, customer_baseline, region_history always run
    if evidence.get("device_matches") is not None:
        n += 1
    n += 1  # burst_scan always run
    return n


# ---------------------------------------------------------------------------
# 3. LLM calls
# ---------------------------------------------------------------------------
POLICY_SUMMARY = """
Fraud Policy v1.0 (condensed -- cite the rule number in every reason):
R1  Single weak signal (probability < 0.70): recommend VERIFY_WITH_CUSTOMER or
    STEP_UP_AUTH before any block.
R2  Customer denies: BLOCK_CARD + CREATE_CASE. Add FILE_REPORT if exposure > $1,000
    or shared device profile / another card's fraud.
R3  Customer confirms: CLOSE_NO_FRAUD.
R4  No reply in 24h: MONITOR_CARD + DECLINE_TRANSACTION for pending auths;
    escalate if exposure > $500.
R5  Card testing (>=3 tiny online auths in an hour, then a larger purchase):
    DECLINE_TRANSACTION + STEP_UP_AUTH; if the larger purchase already
    cleared, BLOCK_CARD.
R6  Shared device/region/email across cards: CREATE_CASE + FILE_REPORT +
    MONITOR_CONNECTED_CARDS for every card that shares it.
R7  Disputed but matches the customer's own recurring pattern: CREATE_CASE +
    VERIFY_WITH_CUSTOMER + WARN_CUSTOMER. Do not block.
R8  Verdict uncertain and exposure > $500, or evidence conflicts: ESCALATE_TO_ANALYST.
R9  Coordinated/repeated abuse fitting no known pattern: CREATE_CASE +
    FILE_REPORT + ESCALATE_TO_ANALYST; pattern="undocumented", describe it.
R10 Never BLOCK_ALL_CARDS unless >=2 of the customer's cards show confirmed
    fraud, or credentials are confirmed compromised.
Valid actions: ALLOW_TRANSACTION, DECLINE_TRANSACTION, MONITOR_CARD,
  MONITOR_CONNECTED_CARDS, WARN_CUSTOMER, VERIFY_WITH_CUSTOMER, STEP_UP_AUTH,
  BLOCK_CARD, BLOCK_ALL_CARDS, GENERATE_REPORT, CREATE_CASE, FILE_REPORT,
  ESCALATE_TO_ANALYST, CLOSE_NO_FRAUD.
Valid pattern values: card_testing, card_not_present_fraud,
  card_not_present_new_device, out_of_region_use, account_takeover,
  undocumented, none.
"""

RESPONSE_SCHEMA_NOTE = """
Reply with ONLY a JSON object (no markdown fences, no commentary), shaped:
{
  "fraud_probability": <float 0-1>,
  "verdict": "fraud" | "legitimate" | "uncertain",
  "pattern": <one of the pattern values>,
  "pattern_description": "<required if pattern is 'undocumented', else \\"\\">",
  "affected_txn_ids": [<string>, ...],
  "first_suspicious_txn_id": "<string or \\"\\">",
  "connected_card_ids": [<string>, ...],
  "connected_device_profiles": [<string>, ...],
  "evidence": [
    {"claim": "<string>", "source": "graph"|"document"|"customer"|"external",
     "ref": "<string>", "entity_ids": [<string>, ...]}
  ],
  "candidate_actions": [
    {"action": "<one of the valid actions>", "reason": "<cite the rule number>"}
  ],
  "summary": "<2-6 sentences>"
}
"""


def call_llm(client, prompt: str, max_retries: int = 2, base_wait: float = 2.0) -> dict:
    """
    Calls Gemini and parses the JSON reply.

    Cycles through FALLBACK_MODELS in order. For each model, retries on
    503 / UNAVAILABLE ("high demand") with exponential backoff
    (base_wait, base_wait*2, ...) up to max_retries times before moving on
    to the next model. Any non-503 exception is raised immediately -- we
    only retry/fallback on the specific transient-capacity failure, not
    real bugs (bad prompt, auth errors, etc.).
    """
    resp = None
    last_err = None

    for model in FALLBACK_MODELS:
        last_err = None
        for attempt in range(1, max_retries + 1):
            try:
                resp = client.models.generate_content(model=model, contents=prompt)
                break
            except Exception as e:
                last_err = e
                msg = str(e)
                if "503" in msg or "UNAVAILABLE" in msg:
                    wait = base_wait * (2 ** (attempt - 1))
                    print(f"  [call_llm] {model} 503, retry {attempt}/{max_retries} "
                          f"in {wait:.0f}s...")
                    time.sleep(wait)
                    continue
                raise  # not a 503 -- fail fast, don't mask real bugs

        if last_err is None:
            print(f"  [call_llm] succeeded with model: {model}")
            break
        print(f"  [call_llm] {model} exhausted retries, trying next model...")

    if last_err is not None:
        raise SystemExit(f"All fallback models failed: {last_err}")

    text = resp.text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    return json.loads(text)


def build_initial_prompt(case: dict, evidence: dict) -> str:
    return f"""You are a fraud investigation analyst assistant. You PROPOSE a
verdict and candidate actions; you do NOT apply approval routing or SAR
rules yourself -- a separate deterministic system does that.

{POLICY_SUMMARY}

CASE:
{json.dumps(case, indent=2)}

EVIDENCE GATHERED FROM THE GRAPH (baseline tools see only data strictly
before the flagged transaction's ts; discovery tools may look +/-30 days):
{json.dumps(evidence, indent=2, default=str)}

Give your INITIAL assessment before any customer/analyst reply.
{RESPONSE_SCHEMA_NOTE}
"""


def build_final_prompt(case: dict, evidence: dict, initial: dict,
                        evidence_requests: list) -> str:
    return f"""You are the same fraud investigation analyst assistant,
reassessing after new evidence came back.

{POLICY_SUMMARY}

CASE:
{json.dumps(case, indent=2)}

ORIGINAL GRAPH EVIDENCE:
{json.dumps(evidence, indent=2, default=str)}

YOUR INITIAL ASSESSMENT:
{json.dumps(initial, indent=2)}

NEW EVIDENCE (simulated replies -- state plainly, these are assumptions):
{json.dumps(evidence_requests, indent=2)}

Give your FINAL assessment now that this evidence is in.
{RESPONSE_SCHEMA_NOTE}
"""


# ---------------------------------------------------------------------------
# 4. R1 enforcement on candidate actions (deterministic safety net)
# ---------------------------------------------------------------------------
def enforce_r1(candidate_actions: list, fraud_probability: float,
               independent_evidence_count: int) -> list:
    """
    If a candidate action would violate R1, swap it for VERIFY_WITH_CUSTOMER
    instead of just flagging it -- the agent should not recommend a
    policy-breaching action in the first place.
    """
    out = []
    for a in candidate_actions:
        if policy.r1_violation(a["action"], fraud_probability, independent_evidence_count):
            out.append({"action": "VERIFY_WITH_CUSTOMER",
                        "reason": f"R1: {a['action']} on a single signal with "
                                  f"probability {fraud_probability} < 0.70 -- verify first"})
        else:
            out.append(a)
    # de-duplicate while preserving order
    seen = set()
    deduped = []
    for a in out:
        if a["action"] not in seen:
            seen.add(a["action"])
            deduped.append(a)
    return deduped


# ---------------------------------------------------------------------------
# 5. Resolve evidence-gathering actions via the simulator
# ---------------------------------------------------------------------------
def resolve_evidence_requests(case_id: str, candidate_actions: list,
                               fraud_probability: float, tool_calls_so_far: int):
    """
    Returns (evidence_requests: list, new_fraud_probability: float,
              settled: bool, new_evidence_claims: list)
    """
    evidence_requests = []
    new_evidence_claims = []
    prob = fraud_probability
    settled = False
    step = tool_calls_so_far

    for a in candidate_actions:
        mapping = EVIDENCE_ACTION_MAP.get(a["action"])
        if not mapping:
            continue
        req_type, sim_fn = mapping
        step += 1
        text, prob, settled = sim_fn(case_id, prob)
        evidence_requests.append({
            "type": req_type,
            "asked_after_step": step,
            "assumed_response": text,
        })
        new_evidence_claims.append({
            "claim": text,
            "source": "customer" if req_type == "customer_validation" else
                      ("customer" if req_type == "step_up_auth" else "external"),
            "ref": f"evidence_request:{len(evidence_requests)}",
            "entity_ids": [],
        })
        if settled:
            break  # one settling reply is enough; don't over-ask (Policy 6)

    return evidence_requests, prob, settled, new_evidence_claims


# ---------------------------------------------------------------------------
# 6. Finalize with policy.py
# ---------------------------------------------------------------------------
def fetch_exposure(conn, flagged_txn: dict, affected_txn_ids: list) -> float:
    amounts = []
    for tid in affected_txn_ids or [flagged_txn["transaction_id"]]:
        if tid == flagged_txn["transaction_id"]:
            amounts.append(flagged_txn["amount_usd"])
        else:
            t = tools.get_transaction(conn, tid)
            if t["found"]:
                amounts.append(t["amount_usd"])
    return policy.compute_exposure(amounts)


def finalize_actions(candidate_actions: list, fraud_probability: float,
                      independent_evidence_count: int, exposure_usd: float) -> list:
    actions = enforce_r1(candidate_actions, fraud_probability, independent_evidence_count)
    return [policy.build_action(a["action"], a["reason"], exposure_usd) for a in actions]


def determine_sar(verdict: str, fraud_probability: float, exposure_usd: float,
                   evidence: dict, pattern: str, connected_card_ids: list) -> tuple:
    fraud_confirmed_or_strong = (verdict == "fraud"
                                  or fraud_probability >= policy.R1_PROBABILITY_THRESHOLD)
    shared_device = bool(evidence.get("device_matches")
                          and evidence["device_matches"]["n_distinct_customers"] > 1)
    inp = policy.SarInputs(
        fraud_confirmed_or_strong=fraud_confirmed_or_strong,
        exposure_usd=exposure_usd,
        shared_device_profile=shared_device,
        shared_region_cluster=False,          # not computed by tools.py yet
        connects_to_other_customer_fraud=bool(connected_card_ids),
        pattern=pattern,
        coordinated_abuse=(pattern == "undocumented"),
    )
    return policy.should_file_sar(inp)


# ---------------------------------------------------------------------------
# 7. Assemble the README answer-format JSON
# ---------------------------------------------------------------------------
def build_sar_block(file_sar: bool, reason: str, verdict_summary: str,
                     subjects: list, exposure_usd: float, dates: list) -> dict:
    if not file_sar:
        return {"file": False, "reason": reason, "narrative": "", "subjects": [],
                "total_amount_usd": 0, "activity_dates": []}
    return {
        "file": True,
        "reason": reason,
        "narrative": verdict_summary,
        "subjects": subjects,
        "total_amount_usd": exposure_usd,
        "activity_dates": dates,
    }


def run_case(case_id: str) -> dict:
    case = load_case(case_id)
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
    conn = tools.connect()

    evidence = gather_evidence(conn, case)
    tool_calls = count_graph_tool_calls(evidence)

    initial_prompt = build_initial_prompt(case, evidence)
    print(f"  [diagnostic] initial prompt length: {len(initial_prompt)} chars")

    initial = call_llm(client, initial_prompt)
    initial_evidence_count = len(initial.get("evidence", []))
    initial["candidate_actions"] = enforce_r1(
        initial.get("candidate_actions", []),
        initial["fraud_probability"], initial_evidence_count,
    )
    initial_actions = finalize_actions(
        initial["candidate_actions"], initial["fraud_probability"],
        initial_evidence_count, 0.0,
    )

    evidence_requests, new_prob, settled, new_claims = resolve_evidence_requests(
        case_id, initial["candidate_actions"], initial["fraud_probability"], tool_calls,
    )

    if evidence_requests:
        final_prompt = build_final_prompt(case, evidence, initial, evidence_requests)
        print(f"  [diagnostic] final prompt length: {len(final_prompt)} chars")
        final = call_llm(client, final_prompt)
        final["evidence"] = final.get("evidence", []) + new_claims
        final_evidence_count = len(final.get("evidence", []))
        what_changed = (f"Assumed reply moved probability from "
                         f"{initial['fraud_probability']} to {new_prob}.")
    else:
        final = initial
        final_evidence_count = initial_evidence_count
        what_changed = "nothing"

    exposure_usd = fetch_exposure(conn, evidence["flagged_txn"], final.get("affected_txn_ids", []))
    final_actions = finalize_actions(
        final["candidate_actions"], final["fraud_probability"],
        final_evidence_count, exposure_usd,
    )

    file_sar, sar_criteria, sar_reason = determine_sar(
        final["verdict"], final["fraud_probability"], exposure_usd,
        evidence, final.get("pattern", "none"), final.get("connected_card_ids", []),
    )

    should_stop, stop_rule = policy.stop_check(
        final["fraud_probability"], final_evidence_count,
        verification_settled=settled,
    )
    stop_reason = stop_rule or "further evidence unlikely to change the decision"

    status = ("closed_fraud" if final["verdict"] == "fraud" and should_stop else
              "closed_legitimate" if final["verdict"] == "legitimate" and should_stop else
              "escalated" if any(a["action"] == "ESCALATE_TO_ANALYST" for a in final_actions) else
              "open")

    dates = [evidence["flagged_txn"]["ts"][:10]] * 2

    answer = {
        "case_id": case_id,
        "case": {
            "status": status,
            "verdict": final["verdict"],
            "fraud_probability": final["fraud_probability"],
            "pattern": final.get("pattern", "none"),
            "pattern_description": final.get("pattern_description", ""),
            "affected_txn_ids": final.get("affected_txn_ids", [evidence["flagged_txn"]["transaction_id"]]),
            "first_suspicious_txn_id": final.get("first_suspicious_txn_id", ""),
            "connected_card_ids": final.get("connected_card_ids", []),
            "connected_device_profiles": final.get("connected_device_profiles", []),
            "exposure_usd": exposure_usd,
            "evidence": final.get("evidence", []),
            "similar_prior_cases": [],  # RAG/memory retrieval: future work
            "summary": final.get("summary", ""),
            "written_to_graph": False,  # graph write-back: future work
            "graph_case_id": "",
        },
        "evidence_requests": evidence_requests,
        "next_best_actions": {
            "initial": initial_actions,
            "final": final_actions,
            "what_changed": what_changed,
        },
        "sar": build_sar_block(
            file_sar, sar_reason, final.get("summary", ""),
            [case["customer_id"], case["card_id"]] + final.get("connected_card_ids", []),
            exposure_usd, dates,
        ),
        "stop_reason": stop_reason,
        "tool_calls": tool_calls,
        "tokens": 0,   # not tracked yet: future work
        "latency_s": 0,  # not tracked yet: future work
    }
    return answer


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python step27_agent.py <case_id>   e.g. HHG-017")
    case_id = sys.argv[1]

    result = run_case(case_id)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, f"{case_id}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"OK  wrote {out_path}")
    print(json.dumps(result, indent=2)[:2000], "...(truncated)")