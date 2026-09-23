export type Verdict = 'fraud' | 'legitimate' | 'uncertain';

export type Pattern =
  | 'card_not_present_fraud'
  | 'card_testing'
  | 'card_not_present_new_device'
  | 'out_of_region_use'
  | 'account_takeover'
  | 'undocumented'
  | 'none';

export type CaseStatus = 'open' | 'closed_fraud' | 'closed_legitimate' | 'escalated';

export type EpistemicStatus = 'FACT' | 'INFERENCE' | 'ASSUMPTION';

export type EvidenceSource = 'graph' | 'document' | 'customer' | 'external';

export interface EvidenceItem {
  claim: string;
  source: EvidenceSource;
  ref: string;
  entity_ids: string[];
  epistemic_status?: EpistemicStatus;
  direction?: 'supports_fraud' | 'supports_legitimate' | 'neutral';
}

export interface EvidenceRequest {
  type: 'customer_validation' | 'step_up_auth' | 'analyst_info';
  asked_after_step: number;
  assumed_response: string;
}

export interface PolicyAction {
  action: string;
  route: 'auto' | 'L1' | 'L2';
  reason: string;
}

export interface NextBestActions {
  initial: PolicyAction[];
  final: PolicyAction[];
  what_changed: string;
}

export interface SARReport {
  file: boolean;
  reason: string;
  narrative: string;
  subjects: string[];
  total_amount_usd: number;
  activity_dates: string[];
}

export interface CaseDetail {
  status: CaseStatus;
  verdict: Verdict;
  fraud_probability: number;
  pattern: Pattern;
  pattern_description: string;
  affected_txn_ids: string[];
  first_suspicious_txn_id: string;
  connected_card_ids: string[];
  connected_device_profiles: string[];
  exposure_usd: number;
  evidence: EvidenceItem[];
  similar_prior_cases: string[];
  summary: string;
  written_to_graph: boolean;
  graph_case_id: string;
}

export interface CasePackAlert {
  case_id: string;
  opened_at: string;
  trigger_type: 'risk_score' | 'customer_report' | 'analyst_request' | string;
  trigger_text: string;
  flagged_txn_id: string;
  card_id: string;
  customer_id: string;
  risk_score?: number | null;
}

export interface CaseRecord {
  case_id: string;
  case: CaseDetail;
  evidence_requests: EvidenceRequest[];
  next_best_actions: NextBestActions;
  sar: SARReport;
  stop_reason: string;
  tool_calls: number;
  tokens: number;
  latency_s: number;
  alert_context?: CasePackAlert;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'customer' | 'card' | 'transaction' | 'device' | 'shared_customer' | 'closed_case' | 'merchant_cluster';
  status?: 'fraud' | 'flagged' | 'normal' | 'shared' | 'historical_fraud';
  details?: Record<string, any>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'MADE' | 'USED' | 'DEVICE' | 'MATCHED' | 'LINKED_BURST' | 'PRIOR_FRAUD';
}

export interface CaseGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}
