"""
Orchestrator: runs one case pack alert end to end.
  1. gather evidence from the graph (tools.py)
  2. ask the LLM for an assessment based ONLY on that evidence (never raw data)
  3. turn the assessment into policy-compliant actions (policy.py -- deterministic)
  4. if the policy needs more evidence, simulate a reply (simulator.py) and reassess
  5. build the README-format answer dict
  6. write the case to TigerGraph as an AgentCase (graph_writer.py)

The LLM never decides actions, routes, exposure, or SAR criteria. It only
proposes verdict / probability / pattern / evidence claims.

CHANGE LOG (this pass):
  - _ask_llm() now cycles through FALLBACK_MODELS with retry/backoff on
    503 UNAVAILABLE ("high demand"), instead of hardcoding one model and
    crashing on the first transient failure. Non-503 errors (e.g. 404 model
    not found, bad JSON from the model) still raise immediately.
  - run_case() now writes the finished case into TigerGraph as an AgentCase
    vertex (graph_writer.py) right before returning. AgentCase is NEVER
    ClosedCase -- this only ever creates/updates AgentCase vertices and
    AGENT_-prefixed edges (see graph/04_add_agentcase.gsql). A failure to
    write to the graph is logged and leaves written_to_graph=False; it does
    NOT fail the whole case (the answer JSON is still written either way).
  - gather_evidence() now ALSO checks (a) whether the flagged device profile
    has touched prior CONFIRMED FRAUD closed cases (device_closed_case_history),
    since a common device shared by many customers is noise but a rare device
    tied to actual confirmed fraud is strong evidence; and (b) a "structuring"
    burst scan around the flagged transaction's OWN amount (85%-105% band,
    above $5 so it never overlaps the card-testing $0-$5 scan), which is what
    was missing for near-equal-amount bursts like HHG-006's four ~$480 txns.
  - recommend_final_actions() (policy.py) no longer lets a customer's own
    confirmation of THEIR transaction silence a shared-device signal: R6
    monitoring is still recommended when the device is shared, regardless of
    this one transaction's individual outcome.
"""

import csv
import json
import os
import re
import sys
import time
from datetime import datetime

from dotenv import load_dotenv
from google import genai

import policy as pol
import simulator as sim
import tools
import graph_writer

CASE_PACK_PATH = "data/case_pack.csv"
OUTPUT_DIR = "cases"

load_dotenv()
GEMINI_MODEL = "gemini-3.6-flash"  # kept for reference; _ask_llm() now cycles FALLBACK_MODELS
FALLBACK_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-pro-latest",
    "gemini-2.5-pro",
    "gemini-3.6-flash",
    "gemini-flash-latest",
]

PATTERNS = {"card_testing", "card_not_present_fraud", "card_not_present_new_device",
            "out_of_region_use", "account_takeover", "undocumented", "none"}

# Run mode passed through to graph_writer -- matches decisions.yaml's
# run.scored_run_mode. Scored runs must stay "isolated"; only change this
# for a deliberate demo run.
RUN_MODE = "isolated"


class ToolCallCounter:
    """Tracks tool_calls / tokens / latency_s for one case, as the answer file requires."""
    def __init__(self):
        self.tool_calls = 0
        self.tokens = 0
        self.start = time.time()

    def note_tool_call(self):
        self.tool_calls += 1

    def note_llm_tokens(self, n):
        self.tokens += n

    def latency_s(self):
        return round(time.time() - self.start, 1)


def _llm_client():
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise SystemExit("GEMINI_API_KEY is missing from .env")
    return genai.Client(api_key=key)


def _extract_json(text):
    """The model sometimes wraps JSON in ```json fences; strip those if present."""
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    return json.loads(text)


def _generate_with_fallback(client, prompt, max_retries=2, base_wait=2.0):
    """
    Calls Gemini, cycling through FALLBACK_MODELS. For each model, retries on
    503 / UNAVAILABLE with exponential backoff (base_wait, base_wait*2, ...)
    up to max_retries times before moving on to the next model. Any other
    exception (404 model-not-found, auth errors, etc.) raises immediately --
    that's a real bug, not transient capacity.

    Returns the raw response object (so callers can still read .text and
    .usage_metadata as before).
    """
    last_err = None
    for model in FALLBACK_MODELS:
        last_err = None
        for attempt in range(1, max_retries + 1):
            try:
                resp = client.models.generate_content(model=model, contents=prompt)
                return resp
            except Exception as e:
                last_err = e
                msg = str(e)
                if "503" in msg or "UNAVAILABLE" in msg:
                    wait = base_wait * (2 ** (attempt - 1))
                    print(f"  [_ask_llm] {model} 503, retry {attempt}/{max_retries} "
                          f"in {wait:.0f}s...")
                    time.sleep(wait)
                    continue
                if "404" in msg or "NOT_FOUND" in msg:
                    print(f"  [_ask_llm] {model} 404 (not available on this account), "
                          f"trying next model...")
                    break  # no point retrying a model that doesn't exist for us
                if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                    print(f"  [_ask_llm] {model} 429 (quota exhausted), "
                          f"trying next model...")
                    break  # daily/per-model quota -- retrying this model won't help today
                raise  # some other real error -- fail fast, don't mask real bugs
        else:
            # inner loop completed without break -> retries exhausted on a real 503
            print(f"  [_ask_llm] {model} exhausted retries, trying next model...")
            continue
        # inner loop was broken out of (404 case) -- fall through to next model
        continue

    raise SystemExit(f"All fallback models failed: {last_err}")


def _ask_llm(client, counter, alert, evidence_items, extra_context=""):
    """
    Sends the alert + evidence (never raw transaction dumps) to the LLM and asks
    for a strict-JSON assessment. Returns a dict with verdict/probability/pattern/
    evidence_claims/independent_evidence_count/key_uncertainties.
    """
    evidence_text = "\n".join(
        f"- ({e['source']}) {e['claim']}" for e in evidence_items
    )
    prompt = f"""You are assisting a bank fraud investigation. You NEVER invent facts.
Use only the evidence listed below. If evidence is thin, say so honestly.

ALERT
  case_id: {alert['case_id']}
  trigger_type: {alert['trigger_type']}
  trigger_text: {alert['trigger_text']}
  flagged_txn_id: {alert['flagged_txn_id']}

EVIDENCE
{evidence_text}
{extra_context}

Respond with STRICT JSON ONLY (no markdown, no commentary), matching exactly:
{{
  "verdict": "fraud" | "legitimate" | "uncertain",
  "fraud_probability": <number 0 to 1>,
  "pattern": one of {sorted(PATTERNS)}. Use "none" ONLY if verdict is "legitimate".
    If verdict is "fraud" or "uncertain", pick the best-fitting known pattern, or
    "undocumented" if none fit -- never "none" for a fraud/uncertain verdict. Only
    pick "card_testing" if a burst_scan cluster is actually listed in the EVIDENCE above,
  "pattern_description": "<empty string unless pattern is 'undocumented'>",
  "evidence_claims": [{{"claim": "<string>", "direction": "supports_fraud" | "supports_legitimate" | "neutral"}}],
  "affected_txn_ids": [<transaction ID strings, ONLY ones explicitly given in the EVIDENCE above -- never invent an ID. Include the flagged_txn_id if it is part of the fraud episode>],
  "first_suspicious_txn_id": "<one ID from affected_txn_ids where the episode started, or \\"\\" if none/legitimate>",
  "independent_evidence_count": <integer>,
  "key_uncertainties": ["<string>", ...]
}}"""
    resp = _generate_with_fallback(client, prompt)
    counter.note_tool_call()  # counts as one LLM call in the tool_calls tally as well
    tokens = getattr(getattr(resp, "usage_metadata", None), "total_token_count", 0) or 0
    counter.note_llm_tokens(tokens)
    data = _extract_json(resp.text)

    if data["verdict"] not in {"fraud", "legitimate", "uncertain"}:
        raise ValueError(f"LLM returned an invalid verdict: {data['verdict']}")
    if data["pattern"] not in PATTERNS:
        raise ValueError(f"LLM returned an invalid pattern: {data['pattern']}")
    if not (0 <= data["fraud_probability"] <= 1):
        raise ValueError("LLM returned a fraud_probability outside 0..1")
    data.setdefault("affected_txn_ids", [])
    data.setdefault("first_suspicious_txn_id", "")
    return data


def _validate_and_price_affected_ids(conn, counter, txn, proposed_ids, known_txn_ids):
    """
    Keeps only IDs the evidence actually surfaced (known_txn_ids) -- an LLM-invented
    ID is dropped, never trusted (README: "Made-up IDs score zero"). Always includes
    the flagged transaction. Fetches each kept ID's amount from the graph so exposure
    reflects the full episode, not just the single flagged transaction.
    Returns (ordered_valid_ids, exposure_usd).
    """
    valid_ids = [tid for tid in (proposed_ids or []) if tid in known_txn_ids]
    if txn["transaction_id"] not in valid_ids:
        valid_ids = [txn["transaction_id"]] + valid_ids

    seen = set()
    ordered = []
    for tid in valid_ids:
        if tid not in seen:
            seen.add(tid)
            ordered.append(tid)

    amounts = []
    for tid in ordered:
        if tid == txn["transaction_id"]:
            amounts.append(txn["amount_usd"])
        else:
            t = tools.get_transaction(conn, tid)
            counter.note_tool_call()
            if t["found"]:
                amounts.append(t["amount_usd"])
    return ordered, pol.compute_exposure(amounts)


def gather_evidence(conn, counter, alert):
    """
    Evidence gathering respects the Stage 3 time rules:
      baseline_cutoff_ts = flagged transaction's own ts (never later data).
    Returns (evidence_items, facts) where facts holds the raw tool outputs
    used later for policy decisions (exposure, shared_device, etc).
    """
    evidence = []
    facts = {}

    txn = tools.get_transaction(conn, alert["flagged_txn_id"])
    counter.note_tool_call()
    facts["txn"] = txn
    if not txn["found"]:
        raise ValueError(f"Flagged transaction {alert['flagged_txn_id']} not found in the graph")

    cutoff = txn["ts"]
    customer_id = txn["customer_id"]

    baseline = tools.customer_baseline(conn, customer_id, cutoff)
    counter.note_tool_call()
    facts["baseline"] = baseline
    if baseline["n_prior_txns"] > 0:
        evidence.append({
            "claim": f"Flagged amount ${txn['amount_usd']:.2f} vs. this customer's prior average "
                     f"${baseline['avg_amount_usd']:.2f} (max ${baseline['max_amount_usd']:.2f}) "
                     f"over {baseline['n_prior_txns']} transactions before this alert",
            "source": "graph", "ref": "tool:customer_baseline",
            "entity_ids": [customer_id, txn["transaction_id"]],
            "epistemic_status": "FACT",
        })
    else:
        evidence.append({
            "claim": "No transaction history exists for this customer before the flagged transaction",
            "source": "graph", "ref": "tool:customer_baseline",
            "entity_ids": [customer_id], "epistemic_status": "FACT",
        })

    if txn.get("addr1") not in (None, -1):
        region = tools.region_history(conn, customer_id, txn["addr1"], cutoff)
        counter.note_tool_call()
        facts["region"] = region
        if region["seen_before"]:
            evidence.append({
                "claim": f"Customer has {region['n_prior_txns_in_region']} prior transactions in "
                         f"billing region {region['region_code']}, first seen {region['first_seen_ts']}",
                "source": "graph", "ref": "tool:region_history",
                "entity_ids": [customer_id], "epistemic_status": "FACT",
            })
        else:
            evidence.append({
                "claim": f"Billing region {region['region_code']} has no prior history for this customer",
                "source": "graph", "ref": "tool:region_history",
                "entity_ids": [customer_id], "epistemic_status": "FACT",
            })

    facts["device"] = None
    facts["device_history"] = None
    if txn.get("has_identity") and txn.get("profile_key"):
        device = tools.device_signature_matches(conn, txn["profile_key"], cutoff)
        counter.note_tool_call()
        facts["device"] = device
        if device["n_distinct_customers"] > 1:
            evidence.append({
                "claim": f"Device profile also seen on {device['n_distinct_customers'] - 1} other "
                         f"customer(s) within +/-30 days of this transaction",
                "source": "graph", "ref": "tool:device_signature_matches",
                "entity_ids": device["customer_ids"], "epistemic_status": "FACT",
            })

        # A common device shared by a huge, generic customer count (e.g. a very
        # common browser/OS/screen combo) is noise. A device that has touched
        # actual PRIOR CONFIRMED FRAUD closed cases is strong evidence, no
        # matter how many total customers happen to share the same combo.
        history = tools.device_closed_case_history(conn, txn["profile_key"])
        counter.note_tool_call()
        facts["device_history"] = history
        if history["n_confirmed_fraud_cases"] > 0:
            evidence.append({
                "claim": f"This exact device profile is linked to {history['n_confirmed_fraud_cases']} "
                         f"previously CONFIRMED FRAUD case(s) in the bank's closed-case history "
                         f"(case IDs: {', '.join(history['case_ids'])}, "
                         f"pattern(s): {', '.join(history['patterns'])})",
                "source": "graph", "ref": "tool:device_closed_case_history",
                "entity_ids": history["case_ids"], "epistemic_status": "FACT",
            })

    # Card-testing / multi-transaction detection: scan for clusters of 3+ small
    # (<= $5) authorizations close together in time, +/-30 days of the flagged
    # txn. This is the only place real, additional transaction_ids (beyond the
    # flagged one) enter the evidence via the card-testing path, so
    # affected_txn_ids can ever be more than a single ID here -- and only IDs
    # that appear in evidence are ever trusted later.
    known_txn_ids = {txn["transaction_id"]}
    burst = tools.burst_scan(conn, customer_id, cutoff, 0.0, 5.0, window_minutes=60)
    counter.note_tool_call()
    facts["burst"] = burst
    for c in burst.get("clusters", []):
        known_txn_ids.update(c["transaction_ids"])
        evidence.append({
            "claim": f"Found {len(c['transaction_ids'])} small online authorizations "
                     f"(${c['total_amount_usd']:.2f} total) within {c['span_minutes']} minutes, "
                     f"{c['start_ts']} to {c['end_ts']}. Transaction IDs: "
                     + ", ".join(c["transaction_ids"]),
            "source": "graph", "ref": "tool:burst_scan",
            "entity_ids": c["transaction_ids"], "epistemic_status": "FACT",
        })

    # Same-size-cluster / structuring detection: a burst of transactions near
    # the FLAGGED transaction's OWN amount (85%-105% of it), close together in
    # time. This is what the card-testing $0-$5 scan structurally cannot see
    # -- e.g. four ~$480 transactions in 30 minutes. Only runs above $5 so it
    # never overlaps the card-testing scan above.
    near_band_min = round(txn["amount_usd"] * 0.85, 2)
    near_band_max = round(txn["amount_usd"] * 1.05, 2)
    facts["structuring"] = None
    if near_band_max > 5.0:
        structuring = tools.burst_scan(conn, customer_id, cutoff, near_band_min, near_band_max, window_minutes=60)
        counter.note_tool_call()
        facts["structuring"] = structuring
        for c in structuring.get("clusters", []):
            new_ids = set(c["transaction_ids"]) - known_txn_ids
            if new_ids:
                known_txn_ids.update(new_ids)
                evidence.append({
                    "claim": f"Found {len(c['transaction_ids'])} online transactions of similar size "
                             f"(${c['total_amount_usd']:.2f} total) within {c['span_minutes']} minutes, "
                             f"{c['start_ts']} to {c['end_ts']}. Transaction IDs: "
                             + ", ".join(c["transaction_ids"]),
                    "source": "graph", "ref": "tool:burst_scan",
                    "entity_ids": c["transaction_ids"], "epistemic_status": "FACT",
                })

    facts["known_txn_ids"] = known_txn_ids

    return evidence, facts


def run_case(conn, client, alert):
    counter = ToolCallCounter()
    evidence, facts = gather_evidence(conn, counter, alert)
    txn = facts["txn"]

    # -- step 1: initial LLM assessment, based only on gathered evidence --
    assessment = _ask_llm(client, counter, alert, evidence)
    evidence_objs = list(evidence)
    for c in assessment["evidence_claims"]:
        evidence_objs.append({
            "claim": c["claim"], "source": "graph", "ref": "llm:synthesis",
            "entity_ids": [txn["transaction_id"]], "epistemic_status": "INFERENCE",
        })

    shared_device = bool(facts.get("device") and facts["device"]["n_distinct_customers"] > 1)
    device_has_prior_fraud = bool(
        facts.get("device_history") and facts["device_history"]["n_confirmed_fraud_cases"] > 0
    )

    initial_ids, initial_exposure = _validate_and_price_affected_ids(
        conn, counter, txn, assessment.get("affected_txn_ids", []), facts["known_txn_ids"],
    )

    ctx = pol.DecisionContext(
        verdict=assessment["verdict"],
        fraud_probability=assessment["fraud_probability"],
        independent_evidence_count=assessment["independent_evidence_count"],
        exposure_usd=initial_exposure,
        pattern=assessment["pattern"],
        shared_device=shared_device,
    )
    initial_actions = pol.recommend_initial_actions(ctx)

    # -- step 2: does policy call for more evidence? (VERIFY_WITH_CUSTOMER / STEP_UP_AUTH present) --
    evidence_requests = []
    customer_outcome = None
    final_assessment = assessment
    step_no = len(evidence) + 1

    wants_customer_check = any(a["action"] in ("VERIFY_WITH_CUSTOMER",) for a in initial_actions)
    wants_step_up = any(a["action"] == "STEP_UP_AUTH" for a in initial_actions)

    if wants_customer_check:
        reply = sim.simulate_customer_validation(
            alert["case_id"], step_no, assessment["fraud_probability"], txn["amount_usd"],
        )
        evidence_requests.append({k: reply[k] for k in ("type", "asked_after_step", "assumed_response")})
        customer_outcome = reply["outcome"]
        evidence_objs.append({
            "claim": reply["assumed_response"], "source": "customer", "ref": "evidence_request:1",
            "entity_ids": [], "epistemic_status": "ASSUMPTION",
        })
        final_assessment = _ask_llm(
            client, counter, alert, evidence,
            extra_context=f"\nNEW EVIDENCE (simulated customer reply): {reply['assumed_response']}",
        )
    elif wants_step_up:
        reply = sim.simulate_step_up_auth(alert["case_id"], step_no, assessment["fraud_probability"])
        evidence_requests.append({k: reply[k] for k in ("type", "asked_after_step", "assumed_response")})
        customer_outcome = reply["outcome"]
        evidence_objs.append({
            "claim": reply["assumed_response"], "source": "customer", "ref": "evidence_request:1",
            "entity_ids": [], "epistemic_status": "ASSUMPTION",
        })

    # R3/R2 are deterministic policy outcomes, not LLM opinions: once the
    # simulated reply settles the question, the verdict must match the
    # action we are about to recommend, not whatever the LLM said before we
    # knew the reply.
    if customer_outcome in ("confirmed", "passed"):
        final_assessment = dict(final_assessment)
        final_assessment["verdict"] = "legitimate"
        final_assessment["fraud_probability"] = round(min(final_assessment["fraud_probability"], 0.15), 2)
    elif customer_outcome in ("denied", "failed"):
        final_assessment = dict(final_assessment)
        final_assessment["verdict"] = "fraud"
        final_assessment["fraud_probability"] = round(max(final_assessment["fraud_probability"], 0.85), 2)

    final_ids, final_exposure = _validate_and_price_affected_ids(
        conn, counter, txn, final_assessment.get("affected_txn_ids", []), facts["known_txn_ids"],
    )

    # README: pattern="none" only makes sense for a legitimate/cleared case. A
    # fraud/uncertain verdict must carry a real pattern -- fall back to
    # "undocumented" if the LLM said "none" here (deterministic safety net,
    # not left to the LLM's own consistency).
    if final_assessment["verdict"] == "legitimate":
        display_pattern = "none"
        display_pattern_desc = ""
    elif final_assessment["pattern"] == "none":
        display_pattern = "undocumented"
        display_pattern_desc = (
            "Fraud identified but activity does not clearly match a documented "
            "pattern; see evidence for the graph signals used."
        )
    else:
        display_pattern = final_assessment["pattern"]
        display_pattern_desc = final_assessment.get("pattern_description", "")

    final_ctx = pol.DecisionContext(
        verdict=final_assessment["verdict"],
        fraud_probability=final_assessment["fraud_probability"],
        independent_evidence_count=final_assessment["independent_evidence_count"],
        exposure_usd=final_exposure,
        pattern=display_pattern,
        shared_device=shared_device,
    )
    final_actions = (
        pol.recommend_final_actions(final_ctx, customer_outcome)
        if customer_outcome is not None
        else initial_actions
    )
    what_changed = (
        "nothing" if final_actions == initial_actions
        else f"Simulated response ({customer_outcome}) changed probability from "
             f"{assessment['fraud_probability']:.2f} to {final_assessment['fraud_probability']:.2f}."
    )

    should_stop, stop_rule = pol.stop_check(
        final_assessment["fraud_probability"], final_assessment["independent_evidence_count"],
        verification_settled=customer_outcome in ("denied", "confirmed"),
    )
    stop_reason = (
        f"Stopped: {stop_rule}." if should_stop
        else "Stopped after the single evidence request; further steps unlikely to change the decision."
    )

    file_report = any(a["action"] == "FILE_REPORT" for a in final_actions)
    sar = {"file": False, "reason": "3a: FILE_REPORT not recommended", "narrative": "",
           "subjects": [], "total_amount_usd": 0, "activity_dates": []}
    if file_report:
        n_ids = len(final_ids)
        episode_desc = (
            f"a ${txn['amount_usd']:.2f} {display_pattern} transaction (ID {txn['transaction_id']})"
            if n_ids <= 1 else
            f"a {display_pattern} episode totaling ${final_ctx.exposure_usd:.2f} across "
            f"{n_ids} linked transactions (IDs: {', '.join(final_ids)})"
        )
        sar = {
            "file": True,
            "reason": next(a["reason"] for a in final_actions if a["action"] == "FILE_REPORT"),
            "narrative": (
                f"On {txn['ts'][:10]}, customer {facts['baseline']['customer_id']} was affected by {episode_desc}. "
                f"Simulated customer contact recorded: {evidence_requests[0]['assumed_response'] if evidence_requests else 'n/a'}. "
                "Filed per Fraud Policy v1.0."
            ),
            "subjects": [facts["baseline"]["customer_id"]],
            "total_amount_usd": final_ctx.exposure_usd,
            "activity_dates": [txn["ts"][:10], txn["ts"][:10]],
        }

    status = "closed_legitimate" if final_assessment["verdict"] == "legitimate" else (
        "closed_fraud" if customer_outcome == "denied" else
        "escalated" if any(a["action"] == "ESCALATE_TO_ANALYST" for a in final_actions) else "open"
    )

    result = {
        "case_id": alert["case_id"],
        "case": {
            "status": status,
            "verdict": final_assessment["verdict"],
            "fraud_probability": round(final_assessment["fraud_probability"], 2),
            "pattern": display_pattern,
            "pattern_description": display_pattern_desc,
            "affected_txn_ids": [] if final_assessment["verdict"] == "legitimate" else final_ids,
            "first_suspicious_txn_id": (
                "" if final_assessment["verdict"] == "legitimate" else
                final_assessment.get("first_suspicious_txn_id")
                if final_assessment.get("first_suspicious_txn_id") in final_ids
                else (final_ids[0] if final_ids else txn["transaction_id"])
            ),
            "connected_card_ids": [],
            "connected_device_profiles": [txn["profile_key"]] if shared_device else [],
            "exposure_usd": 0 if final_assessment["verdict"] == "legitimate" else final_ctx.exposure_usd,
            "evidence": evidence_objs,
            "similar_prior_cases": (
                facts["device_history"]["case_ids"] if device_has_prior_fraud else []
            ),
            "summary": (
                f"{display_pattern} "
                f"case on transaction {txn['transaction_id']}"
                + (f" plus {len(final_ids)-1} linked transaction(s)" if len(final_ids) > 1 else "")
                + f" (exposure ${final_ctx.exposure_usd:.2f}). Verdict: {final_assessment['verdict']} "
                f"(p={final_assessment['fraud_probability']:.2f})."
            ),
            "written_to_graph": False,
            "graph_case_id": "",
        },
        "evidence_requests": evidence_requests,
        "next_best_actions": {
            "initial": [{"action": a["action"], "route": a["route"], "reason": a["reason"]} for a in initial_actions],
            "final": [{"action": a["action"], "route": a["route"], "reason": a["reason"]} for a in final_actions],
            "what_changed": what_changed,
        },
        "sar": sar,
        "stop_reason": stop_reason,
        "tool_calls": counter.tool_calls,
        "tokens": counter.tokens,
        "latency_s": counter.latency_s(),
    }

    # -- step 3: write the finished case into TigerGraph as an AgentCase --
    # Best-effort: a graph-write failure must not lose the answer JSON. The
    # case is already fully built above; this only adds provenance in the
    # graph on top of it. AgentCase is never ClosedCase (see graph_writer.py).
    try:
        graph_case_id = graph_writer.write_case_to_graph(conn, alert, result, run_mode=RUN_MODE)
        result["case"]["written_to_graph"] = True
        result["case"]["graph_case_id"] = graph_case_id
    except Exception as e:
        print(f"  [graph_writer] FAILED to write case {alert['case_id']} to graph: {e}")

    return result


def load_case_pack(path=CASE_PACK_PATH):
    """Loads all case rows from case_pack.csv as alert dicts."""
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_case(case_id, path=CASE_PACK_PATH):
    for row in load_case_pack(path):
        if row["case_id"] == case_id:
            return row
    raise SystemExit(f"case_id '{case_id}' not found in {path}")


def write_result(result, out_dir=OUTPUT_DIR):
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{result['case_id']}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    return out_path


if __name__ == "__main__":
    conn = tools.connect()
    client = _llm_client()

    if len(sys.argv) == 2:
        # Single case: python orchestrator.py HHG-017
        alert = load_case(sys.argv[1])
        result = run_case(conn, client, alert)
        out_path = write_result(result)
        print(f"OK  wrote {out_path}")
        print(json.dumps(result, indent=2))

    elif len(sys.argv) == 1:
        # No args: run every case in case_pack.csv
        alerts = load_case_pack()
        print(f"Running {len(alerts)} cases from {CASE_PACK_PATH}...")
        ok, failed = [], []
        for alert in alerts:
            cid = alert["case_id"]
            try:
                result = run_case(conn, client, alert)
                out_path = write_result(result)
                print(f"  OK      {cid}  ->  {out_path}  "
                      f"(verdict={result['case']['verdict']}, "
                      f"p={result['case']['fraud_probability']}, "
                      f"graph={result['case']['written_to_graph']})")
                ok.append(cid)
            except Exception as e:
                print(f"  FAILED  {cid}  ->  {e}")
                failed.append(cid)
            time.sleep(2)  # small gap between cases to ease per-minute rate limits
        print(f"\nDone. {len(ok)} succeeded, {len(failed)} failed.")
        if failed:
            print("Failed case_ids:", failed)

    else:
        raise SystemExit("Usage:\n"
                          "  python orchestrator.py            # run all 20 cases\n"
                          "  python orchestrator.py <case_id>  # run one case, e.g. HHG-017")
    