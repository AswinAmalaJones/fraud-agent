"""
Deterministic reply simulator for the fraud investigation agent.

README, "Things to know" and Policy section 5 ("Gathering more evidence"):
"Customer and analyst replies are not provided... simulate the response
in your own system and record what you assumed in evidence_requests."

Answer Format (Top level) requires evidence_requests entries shaped exactly:
  type             : "customer_validation" | "step_up_auth" | "analyst_info"
  asked_after_step : int   (the caller/agent fills this in -- it depends on
                             the agent's own tool-call sequence, which this
                             module has no visibility into)
  assumed_response : string

Design constraints this module satisfies:
  - Deterministic: same case_id + same prior probability -> same reply,
    every run. No `random.seed()`, no global random state.
  - Isolated from ground truth: takes only case_id and the agent's own
    prior fraud_probability as input. Never reads closed_cases_history.csv
    or any real outcome. A simulated reply cannot leak the answer key.
  - Never silently passed off as real: the caller is expected to record it
    under evidence_requests.assumed_response and cite it as source="customer"
    in the case evidence list, exactly as the README's own worked example
    does -- nothing here hides that this was fabricated.

Calibration check against the README's own worked example (HHG-017):
  prior probability 0.72, VERIFY_WITH_CUSTOMER, customer denies
  -> "Customer denial raised probability from 0.72 to 0.86"
  0.72 + DENY_BUMP(0.14) == 0.86  -- matches exactly.
"""

import hashlib

DENY_BUMP = 0.14      # customer denies / step-up fails -> probability moves toward 1
CONFIRM_DROP = 0.14   # customer confirms / step-up passes -> probability moves toward 0
AMBIGUOUS_LOW, AMBIGUOUS_HIGH = 0.30, 0.70


def _seeded_bit(case_id: str, kind: str) -> float:
    """
    Deterministic pseudo-random float in [0, 1), stable for a given
    (case_id, kind) pair. No use of Python's `random` module and no global
    seed state -- same input always produces the same output.
    """
    h = hashlib.sha256(f"{case_id}:{kind}".encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def _settled(prob: float) -> bool:
    """Matches Policy section 6 stop thresholds: >=0.85 or <=0.15."""
    return prob >= 0.85 or prob <= 0.15


def simulate_customer_validation(case_id: str, prior_fraud_probability: float):
    """
    Policy R2/R3. Customer either denies the transaction (probability moves
    toward fraud) or confirms it (probability moves toward legitimate).
    Returns (assumed_response: str, new_fraud_probability: float, settled: bool).
    """
    if prior_fraud_probability >= AMBIGUOUS_HIGH:
        denies = True
    elif prior_fraud_probability <= AMBIGUOUS_LOW:
        denies = False
    else:
        denies = _seeded_bit(case_id, "customer_validation") < prior_fraud_probability

    if denies:
        text = "Customer states they did not make this purchase and still has the card."
        new_prob = min(1.0, round(prior_fraud_probability + DENY_BUMP, 2))
    else:
        text = "Customer confirms they made this purchase."
        new_prob = max(0.0, round(prior_fraud_probability - CONFIRM_DROP, 2))

    return text, new_prob, _settled(new_prob)


def simulate_step_up_auth(case_id: str, prior_fraud_probability: float):
    """
    STEP_UP_AUTH: one-time passcode / app confirmation. Passing it is strong
    evidence the legitimate cardholder is present; failing it is strong
    evidence they are not.
    """
    passed = _seeded_bit(case_id, "step_up_auth") >= prior_fraud_probability
    if passed:
        text = "Step-up authentication passed; cardholder confirmed via one-time passcode."
        new_prob = max(0.0, round(prior_fraud_probability - CONFIRM_DROP, 2))
    else:
        text = "Step-up authentication failed; no confirmation received."
        new_prob = min(1.0, round(prior_fraud_probability + DENY_BUMP, 2))

    return text, new_prob, _settled(new_prob)


def simulate_analyst_info(case_id: str, prior_fraud_probability: float):
    """
    ESCALATE_TO_ANALYST / analyst_info ask: a human analyst weighs in with
    context the graph alone doesn't have. Smaller movement than a direct
    cardholder reply -- informative, not decisive on its own.
    """
    bit = _seeded_bit(case_id, "analyst_info")
    if bit < prior_fraud_probability:
        text = "Analyst review: pattern is consistent with prior confirmed-fraud cases."
        new_prob = min(1.0, round(prior_fraud_probability + DENY_BUMP / 2, 2))
    else:
        text = "Analyst review: no additional red flags found beyond the risk score."
        new_prob = max(0.0, round(prior_fraud_probability - CONFIRM_DROP / 2, 2))

    return text, new_prob, _settled(new_prob)


if __name__ == "__main__":
    print("=== simulate_customer_validation ===")
    for prob in [0.90, 0.72, 0.50, 0.28, 0.05]:
        text, new_prob, settled = simulate_customer_validation("HHG-017", prob)
        print(f"  prior={prob:<5} -> new={new_prob:<5} settled={settled}  \"{text}\"")
    print()

    print("=== README calibration check (HHG-017: 0.72 -> 0.86 on denial) ===")
    text, new_prob, settled = simulate_customer_validation("HHG-017", 0.72)
    print(f"  new_prob={new_prob} (expect 0.86)  match:", new_prob == 0.86)
    print()

    print("=== determinism check (same case, same prior prob, run twice) ===")
    r1 = simulate_customer_validation("HHG-CASE-XYZ", 0.55)
    r2 = simulate_customer_validation("HHG-CASE-XYZ", 0.55)
    print("  run 1:", r1)
    print("  run 2:", r2)
    print("  identical:", r1 == r2, "(expect True)")
    print()

    print("=== simulate_step_up_auth ===")
    for prob in [0.80, 0.50, 0.20]:
        print(f"  prior={prob} ->", simulate_step_up_auth("HHG-014", prob))
    print()

    print("=== simulate_analyst_info ===")
    for prob in [0.60, 0.35]:
        print(f"  prior={prob} ->", simulate_analyst_info("HHG-014", prob))