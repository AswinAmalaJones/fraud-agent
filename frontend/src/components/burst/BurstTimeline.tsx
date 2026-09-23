import React from 'react';
import {
  Clock,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { CaseRecord } from '../../types/fraud';
import { formatCurrency } from '../../utils/formatters';

interface BurstTimelineProps {
  caseRecord: CaseRecord;
}

export const BurstTimeline: React.FC<BurstTimelineProps> = ({ caseRecord }) => {
  const isHHG006 = caseRecord.case_id === 'HHG-006';
  const affectedIds = caseRecord.case.affected_txn_ids || [];

  if (affectedIds.length <= 1 && !isHHG006) {
    return null;
  }

  // Transaction items for HHG-006 structuring burst
  const hhg006Transactions = [
    {
      id: '3476602',
      ts: '2016-11-21 20:00:00',
      amount: 474.65,
      type: 'Online Purchase',
      flagged: false,
      note: 'First Structuring Burst Authorization'
    },
    {
      id: '3476633',
      ts: '2016-11-21 20:12:00',
      amount: 474.65,
      type: 'Online Purchase',
      flagged: false,
      note: '+12.0 min: Identical amount cluster'
    },
    {
      id: '3476665',
      ts: '2016-11-21 20:24:00',
      amount: 474.65,
      type: 'Online Purchase',
      flagged: false,
      note: '+24.0 min: Identical amount cluster ($1,423.95 sum)'
    },
    {
      id: '3476682',
      ts: '2016-11-22 02:30:00',
      amount: 482.12,
      type: 'Online Purchase',
      flagged: true,
      note: 'FLAGGED ALERT TRANSACTION (Customer Report)'
    }
  ];

  const transactions = isHHG006
    ? hhg006Transactions
    : affectedIds.map((tid, idx) => ({
        id: tid,
        ts: `Episode Txn #${idx + 1}`,
        amount: caseRecord.case.exposure_usd / affectedIds.length,
        type: 'Online Purchase',
        flagged: tid === caseRecord.alert_context?.flagged_txn_id,
        note: tid === caseRecord.alert_context?.flagged_txn_id ? 'Flagged Alert Transaction' : 'Linked in Fraud Episode'
      }));

  return (
    <div className="soc-card" style={{ padding: '24px', border: '1px solid var(--color-fraud-border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#EF4444" />
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#F8FAFC' }}>
              TRANSACTION BURST &amp; STRUCTURING EPISODE
            </h3>
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#F87171',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              EPISODE TIMELINE
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Temporal sequence of linked transactions uncovered by the 85%-105% structuring burst scan
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#EF4444', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(caseRecord.case.exposure_usd)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Total Episode Exposure ({transactions.length} Txns)
          </div>
        </div>
      </div>

      {/* Burst Highlight Banner */}
      {isHHG006 && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '6px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Clock size={18} color="#F59E0B" />
          <div style={{ fontSize: '12px', color: '#FDE68A' }}>
            <strong>Structuring Detection:</strong> 3 online transactions of near-identical size (<strong>$1,423.95 total</strong>) authorized within a tight <strong>24.0 minute window</strong> prior to the flagged $482.12 charge.
          </div>
        </div>
      )}

      {/* Visual Transaction Nodes Chain */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${transactions.length}, 1fr)`,
        gap: '12px',
        position: 'relative'
      }}>
        {transactions.map((tx, idx) => (
          <div
            key={tx.id}
            style={{
              padding: '14px',
              backgroundColor: tx.flagged ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)',
              border: tx.flagged ? '1px solid var(--color-fraud-border)' : '1px solid var(--border-subtle)',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: tx.flagged ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                color: tx.flagged ? '#F87171' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)'
              }}>
                STEP {idx + 1}
              </span>
              {tx.flagged && (
                <span className="badge-fraud" style={{ fontSize: '9px', padding: '1px 5px' }}>
                  ALERT TRIGGER
                </span>
              )}
            </div>

            <div style={{ fontSize: '16px', fontWeight: '800', color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(tx.amount)}
            </div>

            <div style={{ fontSize: '11px', color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
              Txn #{tx.id}
            </div>

            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {tx.ts}
            </div>

            <div style={{
              fontSize: '10px',
              color: tx.flagged ? '#FECACA' : '#94A3B8',
              marginTop: '4px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '6px',
              lineHeight: 1.3
            }}>
              {tx.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
