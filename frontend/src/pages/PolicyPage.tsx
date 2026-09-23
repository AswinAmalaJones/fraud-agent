import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Scale,
  FileText
} from 'lucide-react';
import { CaseRecord } from '../types/fraud';
import { formatCurrency, formatPercent, getActionRouteBadge } from '../utils/formatters';

interface PolicyPageProps {
  caseRecord: CaseRecord;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ caseRecord }) => {
  const initialActions = caseRecord.next_best_actions.initial;
  const finalActions = caseRecord.next_best_actions.final;
  const whatChanged = caseRecord.next_best_actions.what_changed;

  const policyRules = [
    { rule: 'Rule R1', desc: 'Probability >= 0.70 with 2+ independent signals allows direct CARD_BLOCK (L1).' },
    { rule: 'Rule R2', desc: 'Customer denial of transaction forces probability >= 0.85 and card block.' },
    { rule: 'Rule R6', desc: 'Shared device signature triggers mandatory MONITOR_CONNECTED_CARDS.' },
    { rule: 'Rule R8', desc: 'Uncertain verdict with exposure > $500 requires ESCALATE_TO_ANALYST.' },
    { rule: 'Policy 3a', desc: 'SAR filing required for confirmed fraud with exposure > $1,000 or device syndicate.' }
  ];

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Scale size={20} color="#10B981" />
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#F8FAFC' }}>
            DETERMINISTIC POLICY ENGINE &bull; <span style={{ color: '#10B981' }}>{caseRecord.case_id}</span>
          </h1>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Pure rule-based execution engine applying Fraud Policy v1.0 constraints (no LLM decision hallucination)
        </p>
      </div>

      {/* Side-by-Side Action Routing Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Initial Actions */}
        <div className="soc-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC' }}>
                INITIAL PROPOSED ACTIONS
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Computed before simulated customer evidence requests
              </div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {initialActions.length} Actions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {initialActions.map((act, i) => {
              const rb = getActionRouteBadge(act.route);
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                      {act.action}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      color: rb.color,
                      backgroundColor: rb.bg,
                      border: `1px solid ${rb.border}`,
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {rb.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {act.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Final Actions */}
        <div className="soc-card" style={{ padding: '20px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#34D399' }}>
                FINAL POLICY RECOMMENDATIONS
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Validated against policy.py routing &amp; exposure thresholds
              </div>
            </div>
            <span style={{ fontSize: '11px', color: '#34D399', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
              {finalActions.length} Actions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {finalActions.map((act, i) => {
              const rb = getActionRouteBadge(act.route);
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                      {act.action}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      color: rb.color,
                      backgroundColor: rb.bg,
                      border: `1px solid ${rb.border}`,
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {rb.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: 1.4 }}>
                    {act.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* What Changed / Forensic Evaluation Summary */}
      <div className="soc-card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC', marginBottom: '8px' }}>
          POLICY AUDIT &bull; WHAT CHANGED IN EVALUATION
        </div>
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          fontSize: '12px',
          color: whatChanged === 'nothing' ? 'var(--text-secondary)' : '#FDE68A',
          fontFamily: 'var(--font-mono)'
        }}>
          {whatChanged === 'nothing' ? 'No policy modifications after initial evaluation. Direct stop condition met.' : whatChanged}
        </div>
      </div>

      {/* Policy Rules Matrix */}
      <div className="soc-card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC', marginBottom: '12px' }}>
          FRAUD POLICY V1.0 RULE CITATION MATRIX
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          {policyRules.map((pr, i) => (
            <div
              key={i}
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
                {pr.rule}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {pr.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
