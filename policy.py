"""
Deterministic policy engine for the fraud investigation agent.
Fraud Policy v1.0 (from the official README). The LLM never applies policy
directly: it proposes evidence and a verdict, and this module turns that
into routed, rule-cited actions. Every function here is pure and testable.
"""

from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# 1. Actions (Policy section 1) -- exact identifiers, nothing else is valid
# ---------------------------------------------------------------------------
ACTIONS = {
    "ALLOW_TRANSACTION", "DECLINE_TRANSACTION", "MONITOR_CARD",
    "MONITOR_CONNECTED_CARDS", "WARN_CUSTOMER", "VERIFY_WITH_CUSTOMER",
    "STEP_UP_AUTH", "BLOCK_CARD", "BLOCK_ALL_CARDS", "GENERATE_REPORT",
    "CREATE_CASE", "FILE_REPORT", "ESCALATE_TO_ANALYST", "CLOSE_NO_FRAUD",
}

# ---------------------------------------------------------------------------
# 2. Approval routing (Policy section 2)
# ---------------------------------------------------------------------------
AUTO_ACTIONS = {
    "ALLOW_TRANSACTION", "MONITOR_CARD", "MONITOR_CONNECTED_CARDS",
    "WARN_CUSTOMER", "VERIFY_WITH_CUSTOMER", "STEP_UP_AUTH",
    "GENERATE_REPORT", "CREATE_CASE", "ESCALATE_TO_ANALYST", "CLOSE_NO_FRAUD",
}
L1_EXPOSURE_THRESHOLD_USD = 2500.0  # BLOCK_CARD: <= this is L1, above is L2
SAR_EXPOSURE_THRESHOLD_USD = 1000.0       # R2, 3a
ESCALATE_EXPOSURE_THRESHOLD_USD = 500.0   # R4, R8
STOP_HIGH = 0.85   # section 6
STOP_LOW = 0.15    # section 6
R1_PROBABILITY_THRESHOLD = 0.70  # R1
CASE_OPEN_PROBABILITY_THRESHOLD = 0.30  # section 3a


class PolicyError(ValueError):
    """Raised when the caller asks for something the policy does not define."""


def route_for(action: str, exposure_usd: float = 0.0) -> str:
    """Compute the approval route for one action. Policy section 2."""
    if action not in ACTIONS:
        raise PolicyError(f"'{action}' is not a policy action. Valid: {sorted(ACTIONS)}")
    if action == "DECLINE_TRANSACTION":
        return "L1"
    if action == "BLOCK_CARD":
        return "L1" if exposure_usd <= L1_EXPOSURE_THRESHOLD_USD else "L2"
    if action == "BLOCK_ALL_CARDS":
        return "L2"
    if action == "FILE_REPORT":
        return "L2"
    if action in AUTO_ACTIONS:
        return "auto"
    raise PolicyError(f"'{action}' has no defined route. This should never happen.")


def is_auto_executable(action: str) -> bool:
    """Only 'auto' actions may be executed by the agent (Policy section 2)."""
    return route_for(action) == "auto"


# ---------------------------------------------------------------------------
# 4. Exposure (Policy section 4)
# ---------------------------------------------------------------------------
def compute_exposure(affected_txn_amounts) -> float:
    """Sum of absolute amounts of every transaction in the episode."""
    return round(sum(abs(a) for a in affected_txn_amounts), 2)


# ---------------------------------------------------------------------------
# 3a. SAR criteria: fraud confirmed/strongly suspected AND at least one of:
#     exposure > $1,000; shared device/region-cluster/other-customer link;
#     coordinated or undocumented pattern (R9)
# ---------------------------------------------------------------------------
@dataclass
class SarInputs:
    fraud_confirmed_or_strong: bool
    exposure_usd: float
    shared_device_profile: bool = False
    shared_region_cluster: bool = False
    connects_to_other_customer_fraud: bool = False
    pattern: str = "none"          # one of the 7 pattern values
    coordinated_abuse: bool = False  # only meaningful for pattern == "undocumented" (R9)


def sar_criteria_met(inp: SarInputs) -> list[str]:
    """Which SAR trigger conditions are satisfied. Empty list = none."""
    met = []
    if inp.exposure_usd > SAR_EXPOSURE_THRESHOLD_USD:
        met.append("exposure_gt_1000")
    if inp.shared_device_profile:
        met.append("shared_device_profile")
    if inp.shared_region_cluster:
        met.append("shared_region_cluster")
    if inp.connects_to_other_customer_fraud:
        met.append("connects_to_other_customer_fraud")
    if inp.pattern == "undocumented" and inp.coordinated_abuse:
        met.append("coordinated_undocumented_r9")
    return met


def should_file_sar(inp: SarInputs) -> tuple[bool, list[str], str]:
    """
    Returns (file, criteria_met, reason_text).
    Policy 3a: fraud confirmed/strongly suspected AND at least one trigger.
    """
    criteria = sar_criteria_met(inp)
    if inp.fraud_confirmed_or_strong and criteria:
        return True, criteria, f"3a: fraud confirmed/strongly suspected; criteria met: {', '.join(criteria)}"
    if not inp.fraud_confirmed_or_strong:
        return False, [], "3a: fraud not confirmed or strongly suspected"
    return False, [], "3a: fraud suspected but no SAR trigger criterion is met"


# ---------------------------------------------------------------------------
# 6. Stopping rules
# ---------------------------------------------------------------------------
def stop_check(fraud_probability: float, independent_evidence_count: int,
               verification_settled: bool = False,
               further_evidence_unlikely_to_help: bool = False) -> tuple[bool, Optional[str]]:
    """
    Returns (should_stop, stop_rule). stop_rule is one of:
      'prob_high_2ev' | 'prob_low_2ev' | 'verification_settled' | 'no_further_value' | None
    """
    if verification_settled:
        return True, "verification_settled"
    if fraud_probability >= STOP_HIGH and independent_evidence_count >= 2:
        return True, "prob_high_2ev"
    if fraud_probability <= STOP_LOW and independent_evidence_count >= 2:
        return True, "prob_low_2ev"
    if further_evidence_unlikely_to_help:
        return True, "no_further_value"
    return False, None


# ---------------------------------------------------------------------------
# 3a / general: should a case even be opened?
# ---------------------------------------------------------------------------
def should_open_case(fraud_probability: float, evidence_requested: bool,
                      customer_disputes: bool) -> bool:
    return (fraud_probability >= CASE_OPEN_PROBABILITY_THRESHOLD
            or evidence_requested or customer_disputes)


# ---------------------------------------------------------------------------
# R1: verify before blocking on a weak signal
# ---------------------------------------------------------------------------
def r1_violation(action: str, fraud_probability: float, independent_evidence_count: int) -> bool:
    """
    True if this action would breach R1: a block-type action recommended on a
    single signal with probability below 0.70.
    """
    blocking = {"BLOCK_CARD", "BLOCK_ALL_CARDS", "DECLINE_TRANSACTION"}
    single_signal = independent_evidence_count <= 1
    return action in blocking and single_signal and fraud_probability < R1_PROBABILITY_THRESHOLD


# ---------------------------------------------------------------------------
# R10: BLOCK_ALL_CARDS guard
# ---------------------------------------------------------------------------
def r10_allows_block_all_cards(n_customer_cards_confirmed_fraud: int,
                                credentials_confirmed_compromised: bool) -> bool:
    return n_customer_cards_confirmed_fraud >= 2 or credentials_confirmed_compromised


# ---------------------------------------------------------------------------
# Recommended action bundle: one object per action the agent proposes
# ---------------------------------------------------------------------------
@dataclass
class ActionRec:
    action: str
    reason: str
    route: str = field(init=False)

    def __post_init__(self):
        pass  # route is filled by build_action() below, which knows exposure


def build_action(action: str, reason: str, exposure_usd: float = 0.0) -> dict:
    """Build one {action, route, reason} dict with the route computed by policy code."""
    if action not in ACTIONS:
        raise PolicyError(f"'{action}' is not a valid policy action")
    return {"action": action, "route": route_for(action, exposure_usd), "reason": reason}


# ---------------------------------------------------------------------------
# Full check: validate a case's next_best_actions against the policy
# ---------------------------------------------------------------------------
def check_actions(actions: list[dict], fraud_probability: float,
                   independent_evidence_count: int, exposure_usd: float) -> list[dict]:
    """
    Returns a list of PolicyCheckResult-style dicts: one per action, each
    {rule, status, detail}. status is 'satisfied' or 'violated'.
    """
    results = []
    for a in actions:
        name = a["action"]
        if name not in ACTIONS:
            results.append({"rule": "action_name", "status": "violated",
                             "detail": f"'{name}' is not a valid action name"})
            continue
        expected_route = route_for(name, exposure_usd)
        if a.get("route") != expected_route:
            results.append({"rule": "routing", "status": "violated",
                             "detail": f"{name}: got route '{a.get('route')}', expected '{expected_route}'"})
        else:
            results.append({"rule": "routing", "status": "satisfied", "detail": name})
        if r1_violation(name, fraud_probability, independent_evidence_count):
            results.append({"rule": "R1", "status": "violated",
                             "detail": f"{name} recommended on a single signal with probability "
                                       f"{fraud_probability} < {R1_PROBABILITY_THRESHOLD}"})
    return results


if __name__ == "__main__":
    print("=== route_for ===")
    print("DECLINE_TRANSACTION       ->", route_for("DECLINE_TRANSACTION"))
    print("BLOCK_CARD, exposure 268  ->", route_for("BLOCK_CARD", 268.43))
    print("BLOCK_CARD, exposure 3000 ->", route_for("BLOCK_CARD", 3000))
    print("BLOCK_ALL_CARDS           ->", route_for("BLOCK_ALL_CARDS"))
    print("FILE_REPORT               ->", route_for("FILE_REPORT"))
    print("CREATE_CASE               ->", route_for("CREATE_CASE"))
    print()

    print("=== compute_exposure ===")
    print(compute_exposure([1.10, 2.40, 0.95, 259.98]), "(expect 264.43)")
    print()

    print("=== should_file_sar (README worked example: HHG-017-style card testing) ===")
    inp = SarInputs(
        fraud_confirmed_or_strong=True,
        exposure_usd=268.43,
        shared_device_profile=True,
        pattern="card_testing",
    )
    file, criteria, reason = should_file_sar(inp)
    print("file:", file, "| criteria:", criteria)
    print("reason:", reason)
    print()

    print("=== stop_check ===")
    print(stop_check(0.86, 2), "(expect stop, prob_high_2ev)")
    print(stop_check(0.86, 1), "(expect NOT stop -- only 1 independent evidence)")
    print(stop_check(0.10, 3), "(expect stop, prob_low_2ev)")
    print(stop_check(0.45, 2), "(expect NOT stop)")
    print()

    print("=== R1 check ===")
    print("BLOCK_CARD, prob 0.45, 1 evidence ->", r1_violation("BLOCK_CARD", 0.45, 1), "(expect True: violation)")
    print("BLOCK_CARD, prob 0.86, 2 evidence ->", r1_violation("BLOCK_CARD", 0.86, 2), "(expect False: ok)")
    print()

    print("=== check_actions (README worked example, final actions) ===")
    final_actions = [
        build_action("BLOCK_CARD", "R2 and R5: customer denied; exposure $268 is under $2,500", 268.43),
        build_action("CREATE_CASE", "R2", 268.43),
        build_action("FILE_REPORT", "R2: shared device links this to another compromised card", 268.43),
        build_action("MONITOR_CONNECTED_CARDS", "Same device profile also used on another card", 268.43),
    ]
    for a in final_actions:
        print(" ", a)
    checks = check_actions(final_actions, fraud_probability=0.86, independent_evidence_count=2, exposure_usd=268.43)
    for c in checks:
        print(" ", c)