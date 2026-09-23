import React from 'react';
import {
  ShieldAlert,
  Clock,
  Wrench,
  DollarSign,
  Layers,
  Database,
  Play,
  Share2,
  CheckCircle2,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { CaseRecord } from '../../types/fraud';
import { formatCurrency, formatPercent, formatPatternName, getVerdictTheme } from '../../utils/formatters';

interface InvestigationHeaderProps {
  caseRecord: CaseRecord;
  onTriggerReplay: () => void;
  onOpenGraph: () => void;
}

export const InvestigationHeader: React.FC<InvestigationHeaderProps> = ({
  caseRecord,
  onTriggerReplay,
  onOpenGraph
}) => {
  const vt = getVerdictTheme(caseRecord.case.verdict);
  const alert = caseRecord.alert_context;
  const isHHG006 = caseRecord.case_id === 'HHG-006';
  const isHHG014 = caseRecord.case_id === 'HHG-014';

  return (
    <div className="soc-card" style={{
      padding: '24px',
      border: `1px solid ${vt.border}`,
      background: `linear-gradient(135deg, ${vt.bg} 0%, rgba(13, 19, 31, 0.98) 100%)`,
      boxShadow: vt.glow
    }}>
      {/* Top Row: Case ID, Pattern, Replay Button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '24px',
              fontWeight: '800',
              color: '#F8FAFC',
              letterSpacing: '-0.02em'
            }}>
              {caseRecord.case_id}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: '800',
              color: vt.color,
              backgroundColor: vt.bg,
              border: `1px solid ${vt.border}`,
              padding: '4px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: vt.color }} />
              {caseRecord.case.verdict.toUpperCase()} ({formatPercent(caseRecord.case.fraud_probability)})
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: '700',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#38BDF8',
              padding: '4px 10px',
              borderRadius: '6px'
            }}>
              {formatPatternName(caseRecord.case.pattern)}
            </span>
            {caseRecord.case.written_to_graph && (
              <span style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '3px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Database size={10} /> TG AgentCase Written
              </span>
            )}
          </div>

          <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '8px', maxWidth: '850px' }}>
            {caseRecord.case.summary}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onTriggerReplay}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              backgroundColor: '#06B6D4',
              color: '#070A0F',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Play size={14} fill="#070A0F" />
            <span>Replay Investigation</span>
          </button>

          <button
            onClick={onOpenGraph}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              backgroundColor: 'var(--bg-card)',
              color: '#F8FAFC',
              border: '1px solid var(--border-medium)',
              padding: '9px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card)'; }}
          >
            <Share2 size={14} color="#06B6D4" />
            <span>Open Network Graph</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL EXPOSURE</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: caseRecord.case.exposure_usd > 500 ? '#EF4444' : '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(caseRecord.case.exposure_usd)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>AFFECTED TXNS</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
            {caseRecord.case.affected_txn_ids?.length || 1}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>TOOL CALLS</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
            {caseRecord.tool_calls}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>LATENCY</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
            {caseRecord.latency_s}s
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>LLM TOKENS</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#C084FC', fontFamily: 'var(--font-mono)' }}>
            {caseRecord.tokens}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>CUSTOMER ID</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
            {alert?.customer_id || 'C07297'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>FLAGGED TXN</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#FBBF24', fontFamily: 'var(--font-mono)' }}>
            #{alert?.flagged_txn_id || caseRecord.case.first_suspicious_txn_id}
          </div>
        </div>
      </div>
    </div>
  );
};
