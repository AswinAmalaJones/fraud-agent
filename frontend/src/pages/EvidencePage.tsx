import React, { useState } from 'react';
import {
  FileSearch,
  Filter,
  Brain,
  Share2,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { CaseRecord, EpistemicStatus } from '../types/fraud';
import { getEpistemicBadge } from '../utils/formatters';

interface EvidencePageProps {
  caseRecord: CaseRecord;
  onOpenGraph: () => void;
}

export const EvidencePage: React.FC<EvidencePageProps> = ({ caseRecord, onOpenGraph }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<string>('ALL');

  const evidenceItems = caseRecord.case.evidence;
  const filteredItems = evidenceItems.filter((item) => {
    if (filterStatus !== 'ALL' && (item.epistemic_status || 'FACT') !== filterStatus) return false;
    if (filterSource !== 'ALL' && item.source !== filterSource) return false;
    return true;
  });

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSearch size={20} color="#06B6D4" />
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#F8FAFC' }}>
              EVIDENCE EXPLORER &bull; <span style={{ color: '#06B6D4' }}>{caseRecord.case_id}</span>
            </h1>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Forensic audit trail of all grounded claims retrieved from TigerGraph and synthesized under Fraud Policy v1.0
          </p>
        </div>

        <button
          onClick={onOpenGraph}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid var(--color-cyan-border)',
            color: '#22D3EE',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Share2 size={14} />
          <span>Trace in Network Graph</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="soc-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Epistemic Status:</span>
          {['ALL', 'FACT', 'INFERENCE', 'ASSUMPTION'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                backgroundColor: filterStatus === status ? 'var(--bg-elevated)' : 'transparent',
                color: filterStatus === status ? '#38BDF8' : 'var(--text-muted)',
                border: filterStatus === status ? '1px solid var(--border-medium)' : '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Source:</span>
          {['ALL', 'graph', 'customer', 'document'].map((src) => (
            <button
              key={src}
              onClick={() => setFilterSource(src)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: filterSource === src ? 'var(--bg-elevated)' : 'transparent',
                color: filterSource === src ? '#F8FAFC' : 'var(--text-muted)',
                border: filterSource === src ? '1px solid var(--border-medium)' : '1px solid transparent',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredItems.map((item, idx) => {
          const badge = getEpistemicBadge(item.epistemic_status);
          const isFact = item.epistemic_status === 'FACT';

          return (
            <div
              key={idx}
              className="soc-card"
              style={{
                padding: '18px 20px',
                borderLeft: `4px solid ${badge.color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#F8FAFC', lineHeight: 1.5 }}>
                  {item.claim}
                </div>
                <span
                  style={{
                    backgroundColor: badge.bg,
                    border: `1px solid ${badge.border}`,
                    color: badge.color,
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0
                  }}
                >
                  {badge.label}
                </span>
              </div>

              {/* Metadata strip */}
              <div style={{
                marginTop: '4px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-muted)',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span>Source: <strong style={{ color: '#E2E8F0' }}>{item.source}</strong></span>
                  <span>Tool Reference: <strong style={{ color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>{item.ref}</strong></span>
                </div>

                {item.entity_ids && item.entity_ids.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Entities:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#CBD5E1' }}>
                      {item.entity_ids.join(', ')}
                    </span>
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
