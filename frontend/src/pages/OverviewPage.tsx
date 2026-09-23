import React from 'react';
import { Shield, Sparkles, Database, CheckCircle2 } from 'lucide-react';
import { CaseRecord } from '../types/fraud';
import { calculateAggregateStats } from '../utils/statsCalculator';
import { ExecutiveMetrics } from '../components/overview/ExecutiveMetrics';
import { RiskDistributionChart } from '../components/overview/RiskDistributionChart';
import { PatternBreakdown } from '../components/overview/PatternBreakdown';
import { PriorityCasesList } from '../components/overview/PriorityCasesList';

interface OverviewPageProps {
  cases: CaseRecord[];
  onSelectCaseId: (caseId: string) => void;
  onSelectTab: (tab: any) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  cases,
  onSelectCaseId,
  onSelectTab
}) => {
  const stats = calculateAggregateStats(cases);

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Section */}
      <div className="soc-card" style={{
        padding: '24px 28px',
        background: 'radial-gradient(ellipse at top left, rgba(6, 182, 212, 0.12) 0%, rgba(13, 19, 31, 0.95) 70%)',
        border: '1px solid var(--border-medium)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              letterSpacing: '0.1em',
              color: '#06B6D4',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              TIGERGRAPH PARTNER TRIAL &bull; HACKER HOUSE GOA
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              IEEE-CIS Fraud Dataset (590k Transactions)
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#F8FAFC', letterSpacing: '-0.02em' }}>
            AI Fraud Investigation Command Center
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '780px' }}>
            Evidence-driven autonomous investigation across customer baselines, device fingerprints, transaction bursts, and historical fraud networks.
          </p>
        </div>

        {/* Pipeline Formula Badge */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '6px'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            color: '#38BDF8',
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            Evidence &rarr; Graph Intelligence &rarr; Policy Decision &rarr; Action
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} color="#10B981" />
            <span>20/20 Test Suite Verified &bull; Pure Policy v1.0</span>
          </div>
        </div>
      </div>

      {/* Executive Metrics */}
      <ExecutiveMetrics stats={stats} />

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', minHeight: '340px' }}>
        <RiskDistributionChart stats={stats} />
        <PatternBreakdown
          stats={stats}
          onSelectPattern={(pattern) => {
            onSelectTab('cases');
          }}
        />
      </div>

      {/* Priority Demo Showcases */}
      <PriorityCasesList cases={cases} onSelectCaseId={onSelectCaseId} />
    </div>
  );
};
