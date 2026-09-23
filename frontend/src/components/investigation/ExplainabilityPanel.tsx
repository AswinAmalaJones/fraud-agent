import React, { useState } from 'react';
import {
  Brain,
  ShieldAlert,
  HelpCircle,
  Layers,
  Database,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';
import { CaseRecord, EpistemicStatus } from '../../types/fraud';
import { getEpistemicBadge, formatCurrency, formatPercent } from '../../utils/formatters';

interface ExplainabilityPanelProps {
  caseRecord: CaseRecord;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({ caseRecord }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const evidenceItems = caseRecord.case.evidence;
  const filteredEvidence = filterStatus === 'ALL'
    ? evidenceItems
    : evidenceItems.filter((e) => (e.epistemic_status || 'FACT') === filterStatus);

  const factCount = evidenceItems.filter((e) => e.epistemic_status === 'FACT').length;
  const inferenceCount = evidenceItems.filter((e) => e.epistemic_status === 'INFERENCE').length;
  const assumptionCount = evidenceItems.filter((e) => e.epistemic_status === 'ASSUMPTION').length;

  return (
    <div className="soc-card" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={18} color="#06B6D4" />
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#F8FAFC' }}>
              WHY DID THE AI DECIDE THIS?
            </h3>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              color: '#22D3EE',
              border: '1px solid var(--color-cyan-border)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              EPISTEMIC AUDIT
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Every decision claim is strictly partitioned into verified graph facts, LLM inferences, and simulated assumptions.
          </p>
        </div>

        {/* Epistemic Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setFilterStatus('ALL')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: filterStatus === 'ALL' ? 'var(--bg-elevated)' : 'transparent',
              color: filterStatus === 'ALL' ? '#F8FAFC' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
          >
            ALL ({evidenceItems.length})
          </button>
          <button
            onClick={() => setFilterStatus('FACT')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: filterStatus === 'FACT' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              color: filterStatus === 'FACT' ? '#22D3EE' : 'var(--text-muted)',
              border: filterStatus === 'FACT' ? '1px solid var(--color-cyan-border)' : '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
          >
            FACTS ({factCount})
          </button>
          <button
            onClick={() => setFilterStatus('INFERENCE')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: filterStatus === 'INFERENCE' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              color: filterStatus === 'INFERENCE' ? '#C084FC' : 'var(--text-muted)',
              border: filterStatus === 'INFERENCE' ? '1px solid var(--color-purple-border)' : '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
          >
            INFERENCES ({inferenceCount})
          </button>
          {assumptionCount > 0 && (
            <button
              onClick={() => setFilterStatus('ASSUMPTION')}
              style={{
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                backgroundColor: filterStatus === 'ASSUMPTION' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: filterStatus === 'ASSUMPTION' ? '#FBBF24' : 'var(--text-muted)',
                border: filterStatus === 'ASSUMPTION' ? '1px solid var(--color-uncertain-border)' : '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
            >
              ASSUMPTIONS ({assumptionCount})
            </button>
          )}
        </div>
      </div>

      {/* Grounded Claims List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredEvidence.map((item, idx) => {
          const badge = getEpistemicBadge(item.epistemic_status);
          const isFact = item.epistemic_status === 'FACT';

          return (
            <div
              key={idx}
              style={{
                padding: '14px 16px',
                backgroundColor: isFact ? 'rgba(6, 182, 212, 0.04)' : 'var(--bg-secondary)',
                border: isFact ? '1px solid rgba(6, 182, 212, 0.25)' : '1px solid var(--border-subtle)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: '#F8FAFC', lineHeight: 1.4, fontWeight: isFact ? '500' : '400' }}>
                  {item.claim}
                </div>
                <span
                  style={{
                    backgroundColor: badge.bg,
                    border: `1px solid ${badge.border}`,
                    color: badge.color,
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0
                  }}
                  title={badge.description}
                >
                  {badge.label}
                </span>
              </div>

              {/* Source & Entity Footprint */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>Source: <strong style={{ color: '#E2E8F0' }}>{item.source}</strong></span>
                  <span>Tool / Ref: <strong style={{ color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>{item.ref}</strong></span>
                </div>
                {item.entity_ids && item.entity_ids.length > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                    Entities: {item.entity_ids.slice(0, 5).join(', ')}{item.entity_ids.length > 5 ? ` +${item.entity_ids.length - 5} more` : ''}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
