import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ShieldAlert,
  ArrowRight,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { CaseRecord, Verdict, Pattern } from '../types/fraud';
import { formatCurrency, formatPercent, formatPatternName, getVerdictTheme } from '../utils/formatters';

interface CasesPageProps {
  cases: CaseRecord[];
  onSelectCaseId: (caseId: string) => void;
  onSelectTab: (tab: any) => void;
}

export const CasesPage: React.FC<CasesPageProps> = ({
  cases,
  onSelectCaseId,
  onSelectTab
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerdict, setSelectedVerdict] = useState<string>('all');
  const [selectedPattern, setSelectedPattern] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'id' | 'prob' | 'exposure' | 'latency'>('prob');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = c.case_id.toLowerCase().includes(q);
          const matchCust = c.alert_context?.customer_id?.toLowerCase().includes(q);
          const matchTxn = c.case.affected_txn_ids?.some((t) => t.includes(q)) || c.alert_context?.flagged_txn_id?.includes(q);
          const matchPattern = c.case.pattern.toLowerCase().includes(q);
          if (!matchId && !matchCust && !matchTxn && !matchPattern) return false;
        }

        // Verdict filter
        if (selectedVerdict !== 'all' && c.case.verdict !== selectedVerdict) {
          return false;
        }

        // Pattern filter
        if (selectedPattern !== 'all' && c.case.pattern !== selectedPattern) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'prob') {
          diff = a.case.fraud_probability - b.case.fraud_probability;
        } else if (sortBy === 'exposure') {
          diff = a.case.exposure_usd - b.case.exposure_usd;
        } else if (sortBy === 'latency') {
          diff = a.latency_s - b.latency_s;
        } else {
          const numA = parseInt(a.case_id.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.case_id.replace(/\D/g, ''), 10) || 0;
          diff = numA - numB;
        }
        return sortDirection === 'desc' ? -diff : diff;
      });
  }, [cases, searchQuery, selectedVerdict, selectedPattern, sortBy, sortDirection]);

  const toggleSort = (field: 'id' | 'prob' | 'exposure' | 'latency') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#F8FAFC' }}>
            CASES EXPLORER
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {filteredCases.length} of {cases.length} investigated fraud alert cases
          </p>
        </div>

        {/* Quick presets */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              onSelectCaseId('HHG-006');
              onSelectTab('investigation');
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--color-fraud-border)',
              color: '#F87171',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Sparkles size={12} /> HHG-006 (Burst Demo)
          </button>
          <button
            onClick={() => {
              onSelectCaseId('HHG-014');
              onSelectTab('investigation');
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid var(--color-uncertain-border)',
              color: '#FBBF24',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Sparkles size={12} /> HHG-014 (Device Ring)
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="soc-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '7px 12px',
          width: '280px'
        }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search Case, Customer, Txn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#F8FAFC',
              fontSize: '12px',
              width: '100%'
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Verdict Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Verdict:</span>
            <select
              value={selectedVerdict}
              onChange={(e) => setSelectedVerdict(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: '#F8FAFC',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Verdicts</option>
              <option value="fraud">Fraud</option>
              <option value="legitimate">Legitimate</option>
              <option value="uncertain">Uncertain</option>
            </select>
          </div>

          {/* Pattern Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pattern:</span>
            <select
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: '#F8FAFC',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Patterns</option>
              <option value="card_not_present_fraud">Card Not Present</option>
              <option value="card_testing">Card Testing</option>
              <option value="card_not_present_new_device">CNP (New Device)</option>
              <option value="out_of_region_use">Out of Region</option>
              <option value="account_takeover">Account Takeover</option>
              <option value="undocumented">Undocumented</option>
              <option value="none">None (Legitimate)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div className="soc-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-medium)',
              color: 'var(--text-muted)',
              fontSize: '11px',
              letterSpacing: '0.05em'
            }}>
              <th onClick={() => toggleSort('id')} style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  CASE ID <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 16px' }}>VERDICT</th>
              <th onClick={() => toggleSort('prob')} style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  PROBABILITY <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 16px' }}>PATTERN</th>
              <th onClick={() => toggleSort('exposure')} style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  EXPOSURE <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 16px' }}>TXNS / NETWORK</th>
              <th style={{ padding: '12px 16px' }}>PRIOR FRAUD</th>
              <th style={{ padding: '12px 16px' }}>STATUS</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.map((c) => {
              const vt = getVerdictTheme(c.case.verdict);
              const isPriority = c.case_id === 'HHG-006' || c.case_id === 'HHG-014';
              const affectedTxnCount = c.case.affected_txn_ids?.length || 1;
              const priorFraudCount = c.case.similar_prior_cases?.length || 0;

              return (
                <tr
                  key={c.case_id}
                  onClick={() => {
                    onSelectCaseId(c.case_id);
                    onSelectTab('investigation');
                  }}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                    backgroundColor: isPriority ? 'rgba(6, 182, 212, 0.03)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isPriority ? 'rgba(6, 182, 212, 0.03)' : 'transparent';
                  }}
                >
                  {/* Case ID */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: '#F8FAFC', fontSize: '13px' }}>
                        {c.case_id}
                      </span>
                      {isPriority && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '700',
                          backgroundColor: c.case_id === 'HHG-006' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: c.case_id === 'HHG-006' ? '#F87171' : '#FBBF24',
                          border: `1px solid ${c.case_id === 'HHG-006' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                          padding: '1px 5px',
                          borderRadius: '3px'
                        }}>
                          DEMO
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                      Cust: {c.alert_context?.customer_id || 'N/A'}
                    </div>
                  </td>

                  {/* Verdict */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      color: vt.color,
                      backgroundColor: vt.bg,
                      border: `1px solid ${vt.border}`,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: vt.color }} />
                      {c.case.verdict.toUpperCase()}
                    </span>
                  </td>

                  {/* Probability */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#F8FAFC', fontSize: '12px', minWidth: '32px' }}>
                        {formatPercent(c.case.fraud_probability)}
                      </span>
                      <div style={{ width: '60px', height: '5px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${c.case.fraud_probability * 100}%`,
                          backgroundColor: vt.color
                        }} />
                      </div>
                    </div>
                  </td>

                  {/* Pattern */}
                  <td style={{ padding: '12px 16px', color: '#E2E8F0', fontWeight: '500' }}>
                    {formatPatternName(c.case.pattern)}
                  </td>

                  {/* Exposure */}
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: c.case.exposure_usd > 500 ? '#EF4444' : '#F8FAFC' }}>
                    {formatCurrency(c.case.exposure_usd)}
                  </td>

                  {/* Txns & Device Connections */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#CBD5E1' }}>
                      {affectedTxnCount} txn{affectedTxnCount > 1 ? 's' : ''}
                      {c.case_id === 'HHG-006' && <span style={{ color: '#06B6D4', marginLeft: '6px' }}>(139 shared)</span>}
                      {c.case_id === 'HHG-014' && <span style={{ color: '#F59E0B', marginLeft: '6px' }}>(27 shared)</span>}
                    </div>
                  </td>

                  {/* Prior Fraud Cases */}
                  <td style={{ padding: '12px 16px' }}>
                    {priorFraudCount > 0 ? (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {priorFraudCount} cases
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>None</span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {c.case.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      style={{
                        background: 'none',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#06B6D4',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Inspect</span>
                      <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
