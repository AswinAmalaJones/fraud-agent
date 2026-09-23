import React from 'react';
import { ShieldAlert, ArrowRight, Layers, Share2, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { CaseRecord } from '../../types/fraud';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface PriorityCasesListProps {
  cases: CaseRecord[];
  onSelectCaseId: (caseId: string) => void;
}

export const PriorityCasesList: React.FC<PriorityCasesListProps> = ({ cases, onSelectCaseId }) => {
  const case006 = cases.find((c) => c.case_id === 'HHG-006');
  const case014 = cases.find((c) => c.case_id === 'HHG-014');

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#F8FAFC', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="#F59E0B" /> PRIORITY INVESTIGATION DEMO SHOWCASES
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Key cases demonstrating multi-transaction structuring bursts and shared-device fraud rings
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
        {/* HHG-006 Card */}
        {case006 && (
          <div
            className="soc-card soc-card-interactive"
            onClick={() => onSelectCaseId('HHG-006')}
            style={{
              padding: '20px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(17, 24, 39, 0.95) 100%)',
              boxShadow: '0 0 25px -5px rgba(239, 68, 68, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: '800', color: '#F8FAFC' }}>
                    HHG-006
                  </span>
                  <span className="badge-fraud">FRAUD (99%)</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Card Not Present</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                  Customer C07297 • Flagged Txn #3476682 ($482.12)
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#EF4444', fontFamily: 'var(--font-mono)' }}>
                  $1,906.07
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>4 Linked Transactions</div>
              </div>
            </div>

            {/* Evidence Tags */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              margin: '14px 0',
              padding: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{ fontSize: '11px', color: '#E2E8F0' }}>
                <strong style={{ color: '#06B6D4' }}>139 Shared Devices:</strong> Exact fingerprint on 139 customers
              </div>
              <div style={{ fontSize: '11px', color: '#E2E8F0' }}>
                <strong style={{ color: '#EF4444' }}>6 Prior Fraud Cases:</strong> CC-0781, CC-1476, CC-1960...
              </div>
              <div style={{ fontSize: '11px', color: '#E2E8F0' }}>
                <strong style={{ color: '#F59E0B' }}>Burst Scan:</strong> 3 similar txns within 24 minutes ($1,423.95)
              </div>
              <div style={{ fontSize: '11px', color: '#E2E8F0' }}>
                <strong style={{ color: '#10B981' }}>Actions:</strong> BLOCK_CARD (L1), CREATE_CASE
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: '600' }}>
                Demonstrates Structuring Bursts &amp; Grounded Graph Signals
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>
                <span>Inspect Case</span>
                <ArrowRight size={14} color="#06B6D4" />
              </div>
            </div>
          </div>
        )}

        {/* HHG-014 Card */}
        {case014 && (
          <div
            className="soc-card soc-card-interactive"
            onClick={() => onSelectCaseId('HHG-014')}
            style={{
              padding: '20px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(17, 24, 39, 0.95) 100%)',
              boxShadow: '0 0 25px -5px rgba(245, 158, 11, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: '800', color: '#F8FAFC' }}>
                    HHG-014
                  </span>
                  <span className="badge-uncertain">FRAUD (95%)</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Undocumented Pattern</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                  Customer C13487 • Flagged Txn #3478561 ($74.96)
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#F59E0B', fontFamily: 'var(--font-mono)' }}>
                  $74.96
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Device Syndicate Ring</div>
              </div>
            </div>

            {/* Evidence Tags */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              margin: '14px 0',
              padding: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{ fontSize: '11px', color: '#E2E8F0' }}>
                <strong style={{ color: '#06B6D4' }}>27 Shared Devices:</strong> Rare Android 7.0 / Galaxy S7 signature
              </div>
              <div style={{ fontSize: '11px', color: '#EF4444' }}>
                <strong style={{ color: '#EF4444' }}>4 Prior Fraud Cases:</strong> CC-2649, CC-2971, CC-2985, CC-3035
              </div>
              <div style={{ fontSize: '11px', color: '#E2E8F0' }}>
                <strong style={{ color: '#A855F7' }}>Network Risk:</strong> Normal amount ($74.96) but toxic signature
              </div>
              <div style={{ fontSize: '11px', color: '#E2E8F0' }}>
                <strong style={{ color: '#10B981' }}>Policy Action:</strong> MONITOR_CONNECTED_CARDS (Rule R6)
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <span style={{ fontSize: '11px', color: '#FBBF24', fontWeight: '600' }}>
                Demonstrates Shared Device Intelligence &amp; Multi-Card Action
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>
                <span>Inspect Case</span>
                <ArrowRight size={14} color="#F59E0B" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
