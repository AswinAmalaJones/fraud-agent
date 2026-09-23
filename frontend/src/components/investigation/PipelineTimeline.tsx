import React, { useState } from 'react';
import {
  Bell,
  Search,
  Share2,
  Fingerprint,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { CaseRecord } from '../../types/fraud';
import { formatCurrency, formatPercent, getVerdictTheme, getActionRouteBadge } from '../../utils/formatters';

interface PipelineTimelineProps {
  caseRecord: CaseRecord;
}

export const PipelineTimeline: React.FC<PipelineTimelineProps> = ({ caseRecord }) => {
  const [activeStage, setActiveStage] = useState<number>(2); // Default to Graph Intelligence

  const alert = caseRecord.alert_context;
  const vt = getVerdictTheme(caseRecord.case.verdict);
  const factEvidence = caseRecord.case.evidence.filter((e) => e.epistemic_status === 'FACT');
  const simEvidence = caseRecord.evidence_requests;
  const initialActions = caseRecord.next_best_actions.initial;
  const finalActions = caseRecord.next_best_actions.final;

  const stages = [
    {
      idx: 0,
      title: '1. ALERT TRIGGER',
      subtitle: alert?.trigger_type || 'Risk Score Flag',
      icon: Bell,
      color: '#F59E0B',
      content: (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#F8FAFC', marginBottom: '8px' }}>
            Alert Received: {alert?.opened_at || 'Exam Alert'}
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: '#E2E8F0',
            fontFamily: 'var(--font-mono)'
          }}>
            &quot;{alert?.trigger_text || caseRecord.case.summary}&quot;
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Trigger Type: <strong style={{ color: '#F8FAFC' }}>{alert?.trigger_type || 'risk_score'}</strong></span>
            <span>Flagged Txn: <strong style={{ color: '#FBBF24' }}>#{alert?.flagged_txn_id}</strong></span>
            <span>Customer: <strong style={{ color: '#06B6D4' }}>{alert?.customer_id}</strong></span>
            {alert?.risk_score && <span>Model Score: <strong style={{ color: '#EF4444' }}>{alert.risk_score}</strong></span>}
          </div>
        </div>
      )
    },
    {
      idx: 1,
      title: '2. EVIDENCE GATHERING',
      subtitle: `${factEvidence.length} Grounded Graph Facts`,
      icon: Search,
      color: '#06B6D4',
      content: (
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            TigerGraph tools executed respecting Stage 3 time rules (never looking ahead of flagged timestamp):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {factEvidence.map((e, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(6, 182, 212, 0.05)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#F8FAFC' }}>{e.claim}</div>
                  <div style={{ fontSize: '10px', color: '#06B6D4', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    Ref: {e.ref} &bull; Entities: {e.entity_ids.join(', ') || 'N/A'}
                  </div>
                </div>
                <span className="badge-fact">FACT</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      idx: 2,
      title: '3. GRAPH INTELLIGENCE',
      subtitle: caseRecord.case.connected_device_profiles.length > 0 ? 'Device & Closed Cases Matched' : 'Customer Topology Analysis',
      icon: Share2,
      color: '#A855F7',
      content: (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            {/* Device Sharing Card */}
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#C084FC', textTransform: 'uppercase' }}>
                Device Signature Intelligence
              </div>
              <div style={{ fontSize: '12px', color: '#F8FAFC', marginTop: '4px' }}>
                {caseRecord.case.connected_device_profiles[0] || 'In-Person / Standard Browser'}
              </div>
              <div style={{ fontSize: '11px', color: '#E2E8F0', marginTop: '6px' }}>
                {caseRecord.case_id === 'HHG-006' && <strong style={{ color: '#22D3EE' }}>&bull; Shared with 139 other customers</strong>}
                {caseRecord.case_id === 'HHG-014' && <strong style={{ color: '#FBBF24' }}>&bull; Shared with 27 other customers</strong>}
              </div>
            </div>

            {/* Historical Closed Fraud Cases */}
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#F87171', textTransform: 'uppercase' }}>
                Historical Confirmed Fraud Matches
              </div>
              {caseRecord.case.similar_prior_cases?.length > 0 ? (
                <div>
                  <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: '700', marginTop: '4px' }}>
                    {caseRecord.case.similar_prior_cases.length} Closed Fraud Cases Matched
                  </div>
                  <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    {caseRecord.case.similar_prior_cases.join(', ')}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  No prior confirmed fraud cases matched on this signature
                </div>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      idx: 3,
      title: '4. PATTERN DETECTION',
      subtitle: caseRecord.case.pattern,
      icon: Fingerprint,
      color: '#38BDF8',
      content: (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#F8FAFC' }}>
                {caseRecord.case.pattern.toUpperCase()}
              </span>
              <span className={caseRecord.case.verdict === 'fraud' ? 'badge-fraud' : (caseRecord.case.verdict === 'legitimate' ? 'badge-legit' : 'badge-uncertain')}>
                {caseRecord.case.verdict.toUpperCase()} (p={caseRecord.case.fraud_probability})
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Stop Reason: <strong style={{ color: '#F8FAFC' }}>{caseRecord.stop_reason}</strong>
            </div>
          </div>
          {caseRecord.case.pattern_description && (
            <div style={{
              padding: '10px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              color: '#CBD5E1'
            }}>
              {caseRecord.case.pattern_description}
            </div>
          )}
        </div>
      )
    },
    {
      idx: 4,
      title: '5. POLICY DECISION',
      subtitle: `${initialActions.length} Initial &rarr; ${finalActions.length} Final Actions`,
      icon: ShieldCheck,
      color: '#10B981',
      content: (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {/* Initial Actions */}
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px' }}>
                INITIAL POLICY RECOMMENDATIONS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {initialActions.map((act, i) => {
                  const rb = getActionRouteBadge(act.route);
                  return (
                    <div key={i} style={{ fontSize: '11px', color: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{act.action}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: rb.color, backgroundColor: rb.bg, border: `1px solid ${rb.border}`, padding: '1px 6px', borderRadius: '3px' }}>
                        {rb.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final Actions */}
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#34D399', marginBottom: '8px' }}>
                FINAL POLICY ACTIONS (EXECUTED)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {finalActions.map((act, i) => {
                  const rb = getActionRouteBadge(act.route);
                  return (
                    <div key={i} style={{ fontSize: '11px', color: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{act.action}</span>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{act.reason}</div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: rb.color, backgroundColor: rb.bg, border: `1px solid ${rb.border}`, padding: '1px 6px', borderRadius: '3px' }}>
                        {rb.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      idx: 5,
      title: '6. FINAL ACTION & WRITE-BACK',
      subtitle: caseRecord.sar.file ? 'SAR Filing Mandated' : 'Case Closed / Monitored',
      icon: CheckCircle2,
      color: caseRecord.case.verdict === 'fraud' ? '#EF4444' : '#10B981',
      content: (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC' }}>
                Investigation Status: <span style={{ color: vt.color }}>{caseRecord.case.status.toUpperCase()}</span>
              </span>
            </div>
            <div style={{ fontSize: '11px', color: caseRecord.sar.file ? '#EF4444' : '#10B981', fontWeight: '700' }}>
              SAR Report: {caseRecord.sar.file ? 'FILED (FinCEN Compliance)' : 'NOT RECOMMENDED'}
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Written to TigerGraph graph database under vertex ID: <strong style={{ color: '#06B6D4', fontFamily: 'var(--font-mono)' }}>{caseRecord.case.graph_case_id || caseRecord.case_id}</strong>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="soc-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#F8FAFC', letterSpacing: '0.02em' }}>
            AUTONOMOUS INVESTIGATION PIPELINE
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Sequential forensic stages from alert ingestion to deterministic action routing
          </p>
        </div>
        <span style={{ fontSize: '11px', color: '#06B6D4', fontWeight: '600' }}>
          Click any stage to inspect forensic output
        </span>
      </div>

      {/* Stage Flow Nodes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '8px',
        marginBottom: '16px'
      }}>
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.idx;

          return (
            <button
              key={stage.idx}
              onClick={() => setActiveStage(stage.idx)}
              style={{
                backgroundColor: isActive ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)',
                border: isActive ? '1px solid var(--color-cyan-border)' : '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'center',
                boxShadow: isActive ? '0 0 12px rgba(6, 182, 212, 0.25)' : 'none'
              }}
            >
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: isActive ? stage.color : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#070A0F' : stage.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={14} />
              </div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: isActive ? '#F8FAFC' : 'var(--text-muted)', lineHeight: 1.2 }}>
                {stage.title.split('. ')[1]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Active Stage Panel */}
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#38BDF8' }}>
            {stages[activeStage].title} &bull; <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>{stages[activeStage].subtitle}</span>
          </div>
        </div>
        {stages[activeStage].content}
      </div>
    </div>
  );
};
