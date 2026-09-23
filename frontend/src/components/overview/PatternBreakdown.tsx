import React from 'react';
import { AggregateStats } from '../../utils/statsCalculator';
import { formatCurrency } from '../../utils/formatters';

interface PatternBreakdownProps {
  stats: AggregateStats;
  onSelectPattern?: (pattern: string) => void;
}

export const PatternBreakdown: React.FC<PatternBreakdownProps> = ({ stats, onSelectPattern }) => {
  return (
    <div className="soc-card" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC' }}>
          DETECTED FRAUD PATTERNS
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Autonomous classification under Fraud Policy v1.0 specifications
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {stats.patternDistribution.map((item) => {
          const percent = stats.totalCases > 0 ? Math.round((item.count / stats.totalCases) * 100) : 0;
          const isZero = item.count === 0;

          return (
            <div
              key={item.pattern}
              onClick={() => !isZero && onSelectPattern && onSelectPattern(item.pattern)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: isZero ? 'default' : 'pointer',
                transition: 'background 0.15s ease',
                backgroundColor: isZero ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
              }}
              onMouseEnter={(e) => {
                if (!isZero) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isZero) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ fontWeight: '600', color: isZero ? 'var(--text-dim)' : '#E2E8F0' }}>
                  {item.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(item.exposure)}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)',
                    color: isZero ? 'var(--text-dim)' : '#38BDF8',
                    minWidth: '24px',
                    textAlign: 'right'
                  }}>
                    {item.count}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '4px',
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${percent}%`,
                  backgroundColor: item.pattern === 'none' ? '#10B981' : (item.pattern === 'undocumented' ? '#A855F7' : '#06B6D4'),
                  borderRadius: '2px'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
