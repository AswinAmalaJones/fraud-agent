"""
Deterministic simulator for customer and analyst replies.
The README states: "Customer and analyst replies are not provided.
If your agent asks the customer or requests step-up authentication,
simulate the response in your own system and record what you assumed
in evidence_requests."

Design rules (Stage 3):
- Every reply is DETERMINISTIC: the same request, run twice, gives the
    same reply. We use a seed derived from the case_id and step number,
    never Python's global random state.
- Every reply is explicitly marked is_simulated = True.
- The simulator NEVER invents facts that aren't already in the evidence
    passed to it (e.g. it will not claim "I was travelling" out of nowhere;
    it only confirms/denies based on the probability the agent itself computed).
"""

import hashlib
import random


def _seeded_rng(case_id: str, step_no: int, request_type: str) -> random.Random:
    """A private, reproducible random source. Does not touch global random state."""
    key = f"{case_id}|{step_no}|{request_type}"
    digest = hashlib.sha256(key.encode()).hexdigest()
    return random.Random(int(digest[:16], 16))


def simulate_customer_validation(case_id: str, step_no: int, fraud_probability: float,
                                amount_usd: float, is_home_region: bool = True) -> dict:
    """
    Simulate a customer's answer to "did you make this transaction?"

    Policy: this is where R1/R2/R3 branch. A higher fraud_probability makes a
    denial more likely; a lower one makes confirmation more likely. The
    boundary sits at 0.5 with a little seeded noise, so borderline cases
    aren't always resolved the same way in fiction -- but ARE always the
    same way for the same case_id/step, because the RNG is seeded.
    """
    rng = _seeded_rng(case_id, step_no, "customer_validation")
    denies = rng.random() < fraud_probability

    if denies:
        response = (
            f"Customer states they did not make this ${amount_usd:.2f} transaction "
            "and still has the card in their possession."
        )
        outcome = "denied"
    else:
        if is_home_region:
            response = (
                f"Customer confirms they made this ${amount_usd:.2f} purchase themselves."
            )
        else:
            response = (
                f"Customer confirms travel to the billing region and made this "
                f"${amount_usd:.2f} purchase themselves."
            )
        outcome = "confirmed"

    return {
        "type": "customer_validation",
        "asked_after_step": step_no,
        "assumed_response": response,
        "is_simulated": True,
        "outcome": outcome,  # "denied" | "confirmed" -- used by the orchestrator, not emitted
    }


def simulate_step_up_auth(case_id: str, step_no: int, fraud_probability: float) -> dict:
    """
    Simulate the result of asking for a one-time passcode / app confirmation.
    A genuine cardholder almost always passes step-up; a compromised session
    almost always fails it. We tie the pass rate to (1 - fraud_probability).
    """
    rng = _seeded_rng(case_id, step_no, "step_up_auth")
    passed = rng.random() > fraud_probability

    if passed:
        response = "Step-up authentication (one-time passcode) was completed successfully."
        outcome = "passed"
    else:
        response = "Step-up authentication failed: no valid response to the one-time passcode."
        outcome = "failed"

    return {
        "type": "step_up_auth",
        "asked_after_step": step_no,
        "assumed_response": response,
        "is_simulated": True,
        "outcome": outcome,
    }


def simulate_analyst_info(case_id: str, step_no: int, context_note: str) -> dict:
    """
    Simulate an analyst providing extra context they have access to but the
    graph does not (e.g. a linked case elsewhere, a known merchant issue).
    This one does NOT invent new facts: it only echoes back context_note,
    which the caller must supply from evidence already gathered.
    """
    response = f"Analyst confirms: {context_note}"
    return {
        "type": "analyst_info",
        "asked_after_step": step_no,
        "assumed_response": response,
        "is_simulated": True,
        "outcome": "info_provided",
    }


if __name__ == "__main__":
    print("=== determinism check: same inputs must give the same reply, every time ===")
    r1 = simulate_customer_validation("HHG-006", 3, fraud_probability=0.75, amount_usd=482.12)
    r2 = simulate_customer_validation("HHG-006", 3, fraud_probability=0.75, amount_usd=482.12)
    print("run 1:", r1)
    print("run 2:", r2)
    print("identical:", r1 == r2, "(expect True)")
    print()

    print("=== a different step number must be free to give a different outcome ===")
    r3 = simulate_customer_validation("HHG-006", 7, fraud_probability=0.75, amount_usd=482.12)
    print("step 3:", r1["outcome"], "| step 7:", r3["outcome"])
    print()

    print("=== high probability tends toward denial, low probability toward confirmation ===")
    denies = sum(
        simulate_customer_validation(f"TEST-{i}", 1, fraud_probability=0.9, amount_usd=100.0)["outcome"] == "denied"
        for i in range(200)
    )
    confirms = sum(
        simulate_customer_validation(f"TEST-{i}", 1, fraud_probability=0.1, amount_usd=100.0)["outcome"] == "confirmed"
        for i in range(200)
    )
    print(f"prob=0.9: denied in {denies}/200 cases (expect close to 180)")
    print(f"prob=0.1: confirmed in {confirms}/200 cases (expect close to 180)")
    print()

    print("=== step_up_auth ===")
    print(simulate_step_up_auth("HHG-010", 2, fraud_probability=0.85))
    print(simulate_step_up_auth("HHG-020", 2, fraud_probability=0.20))
    print()

    print("=== analyst_info ===")
    print(simulate_analyst_info(
        "HHG-014", 5,
        "two other cardholders reported the same device profile this month"
    ))