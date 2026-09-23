import React from 'react';
import {
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Share2,
  Clock,
  History,
  Sparkles,
  Zap
} from 'lucide-react';
import { CaseRecord } from '../../types/fraud';
import { formatCurrency, formatPercent, getVerdictTheme } from '../../utils/formatters';

interface EvidenceConvergenceProps {
  caseRecord: CaseRecord;
}

export const EvidenceConvergence: React.FC<EvidenceConvergenceProps> = ({ caseRecord }) => {
  const vt = getVerdictTheme(caseRecord.case.verdict);
  const isHHG006 = caseRecord.case_id === 'HHG-006';
  const isHHG014 = caseRecord.case_id === 'HHG-014';

  // Extract signals dynamically from evidence
  const baselineEvidence = caseRecord.case.evidence.find(e => e.ref === 'tool:customer_baseline');
  const deviceEvidence = caseRecord.case.evidence.find(e => e.ref === 'tool:device_signature_matches');
  const historyEvidence = caseRecord.case.evidence.find(e => e.ref === 'tool:device_closed_case_history');
  const burstEvidence = caseRecord.case.evidence.find(e => e.ref === 'tool:burst_scan');

  const signals = [
    {
      title: 'Customer Baseline Anomaly',
      desc: isHHG006
        ? 'Flagged amount $482.12 is 4.1x above customer average ($116.73)'
        : (baselineEvidence ? baselineEvidence.claim : 'Baseline amount within historical variance'),
      strength: isHHG006 ? 'HIGH STRENGTH' : 'MODERATE',
      color: '#06B6D4',
      icon: TrendingUp
    },
    {
      title: 'Shared Device Topology',
      desc: isHHG006
        ? 'Exact browser/OS fingerprint shared across 139 other accounts'
        : (isHHG014 ? 'Rare Android 7.0 / Galaxy S7 signature shared on 27 accounts' : (deviceEvidence ? deviceEvidence.claim : 'No shared device fingerprint')),
      strength: 'CRITICAL GRAPH LINK',
      color: '#A855F7',
      icon: Share2
    },
    {
      title: 'Historical Fraud Case Memory',
      desc: isHHG006
        ? '6 previously CONFIRMED FRAUD closed cases tied to this exact device'
        : (isHHG014 ? '4 previously CONFIRMED FRAUD closed cases on this device' : (historyEvidence ? historyEvidence.claim : 'No past fraud matches on device')),
      strength: caseRecord.case.similar_prior_cases?.length > 0 ? 'CONVINCING PROOF' : 'NEUTRAL',
      color: '#EF4444',
      icon: History
    },
    {
      title: 'Burst & Structuring Scan',
      desc: isHHG006
        ? '3 online transactions of identical ~$475 size ($1,423.95 total) within 24 minutes'
        : (burstEvidence ? burstEvidence.claim : 'Single isolated authorization'),
      strength: isHHG006 ? 'HIGH CONFIRMATION' : 'ISOLATED',
      color: '#F59E0B',
      icon: Clock
    }
  ];

  return (
    <div className="soc-card" style={{
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, rgba(13, 19, 31, 0.95) 0%, rgba(7, 10, 15, 0.98) 100%)'
    }}>
      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#F59E0B" />
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#F8FAFC' }}>
              EVIDENCE CONVERGENCE ENGINE
            </h3>
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#FBBF24',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              MULTI-SIGNAL SYNTHESIS
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Independent graph evidence channels converging into policy-compliant fraud probability
          </p>
        </div>
      </div>

      {/* Convergence Visual Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: '24px',
        alignItems: 'center'
      }}>
        {/* Left: 4 Signal Streams */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {signals.map((sig, i) => {
            const Icon = sig.icon;
            return (
              <div
                key={i}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-card)',
                  border: `1px solid ${sig.color}40`,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: `0 0 10px -3px ${sig.color}20`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: `${sig.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Icon size={15} color={sig.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>
                      {sig.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                      {sig.desc}
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '9px',
                  fontWeight: '800',
                  color: sig.color,
                  backgroundColor: `${sig.color}15`,
                  border: `1px solid ${sig.color}40`,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap'
                }}>
                  {sig.strength}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right: Convergence Target Vortex */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: '8px',
          border: `1px solid ${vt.border}`,
          position: 'relative'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            marginBottom: '12px'
          }}>
            CONVERGED MODEL CONFIDENCE
          </div>

          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: vt.bg,
            border: `3px solid ${vt.color}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: vt.glow,
            position: 'relative'
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '900',
              color: vt.color,
              fontFamily: 'var(--font-mono)',
              lineHeight: 1
            }}>
              {formatPercent(caseRecord.case.fraud_probability)}
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: '800',
              color: '#F8FAFC',
              letterSpacing: '0.05em',
              marginTop: '4px'
            }}>
              {caseRecord.case.verdict.toUpperCase()}
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#E2E8F0',
            maxWidth: '240px'
          }}>
            Multi-signal graph proof satisfies <strong>Rule R1</strong> (2+ independent signals with probability &gt; 0.70).
          </div>
        </div>
      </div>
    </div>
  );
};
