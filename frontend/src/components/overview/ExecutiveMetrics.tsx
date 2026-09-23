import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  DollarSign,
  Clock,
  Wrench,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { AggregateStats } from '../../utils/statsCalculator';
import { formatCurrency } from '../../utils/formatters';

interface ExecutiveMetricsProps {
  stats: AggregateStats;
}

export const ExecutiveMetrics: React.FC<ExecutiveMetricsProps> = ({ stats }) => {
  const metricCards = [
    {
      title: 'Cases Investigated',
      value: `${stats.totalCases}`,
      subtitle: '20/20 Backend Verified',
      icon: CheckCircle2,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.3)'
    },
    {
      title: 'Total Episode Exposure',
      value: formatCurrency(stats.totalExposure),
      subtitle: 'Across all 20 alert episodes',
      icon: DollarSign,
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)'
    },
    {
      title: 'Verdict Distribution',
      value: `${stats.fraudCount}F / ${stats.legitimateCount}L / ${stats.uncertainCount}U`,
      subtitle: `${stats.fraudCount} Fraud • ${stats.legitimateCount} Cleared • ${stats.uncertainCount} Escalated`,
      icon: ShieldAlert,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.3)'
    },
    {
      title: 'Avg Investigation Latency',
      value: `${stats.avgLatency}s`,
      subtitle: `${stats.avgTokens} avg tokens / case`,
      icon: Clock,
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.1)',
      border: 'rgba(6, 182, 212, 0.3)'
    },
    {
      title: 'Avg Graph Tool Calls',
      value: `${stats.avgToolCalls}`,
      subtitle: 'Baseline, burst & signature scans',
      icon: Wrench,
      color: '#A855F7',
      bg: 'rgba(168, 85, 247, 0.1)',
      border: 'rgba(168, 85, 247, 0.3)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
      gap: '16px'
    }}>
      {metricCards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="soc-card"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '115px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                {card.title.toUpperCase()}
              </span>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: card.bg,
                border: `1px solid ${card.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={16} color={card.color} />
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <div style={{
                fontSize: '22px',
                fontWeight: '800',
                color: '#F8FAFC',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.1
              }}>
                {card.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {card.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
