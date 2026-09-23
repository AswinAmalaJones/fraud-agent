import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { AggregateStats } from '../../utils/statsCalculator';

interface RiskDistributionChartProps {
  stats: AggregateStats;
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ stats }) => {
  return (
    <div className="soc-card" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC' }}>
            CASE RISK PROBABILITY DISTRIBUTION
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Calibrated model confidence buckets across all 20 alert cases
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#EF4444' }} /> &gt;70% High
          </span>
          <span style={{ fontSize: '10px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10B981' }} /> &lt;30% Low
          </span>
        </div>
      </div>

      <div style={{ width: '100%', height: '220px', marginTop: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.riskBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="range"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{
                      backgroundColor: '#1E293B',
                      border: '1px solid rgba(255,255,255,0.15)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Risk Range</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC' }}>{data.range}</div>
                      <div style={{ fontSize: '12px', color: data.color, marginTop: '4px', fontWeight: '600' }}>
                        {data.count} Case(s)
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {stats.riskBuckets.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Chips */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '14px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: 'var(--text-secondary)'
      }}>
        <span>High Confidence (&ge;0.85): <strong style={{ color: '#EF4444' }}>{stats.fraudCount}</strong></span>
        <span>Uncertain / Step-Up: <strong style={{ color: '#F59E0B' }}>{stats.uncertainCount}</strong></span>
        <span>Cleared False Positives: <strong style={{ color: '#10B981' }}>{stats.legitimateCount}</strong></span>
      </div>
    </div>
  );
};
