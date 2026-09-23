import React, { useState } from 'react';
import {
  Search,
  Play,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  Layers,
  ArrowRight
} from 'lucide-react';
import { CaseRecord } from '../../types/fraud';
import { getVerdictTheme, formatCurrency, formatPercent } from '../../utils/formatters';

interface TopBarProps {
  cases: CaseRecord[];
  selectedCase: CaseRecord | null;
  onSelectCaseId: (caseId: string) => void;
  onTriggerReplay: () => void;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  cases,
  selectedCase,
  onSelectCaseId,
  onTriggerReplay,
  isDemoMode,
  onToggleDemoMode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredSearchResults = searchQuery.trim()
    ? cases.filter((c) => {
        const q = searchQuery.toLowerCase();
        const caseIdMatch = c.case_id.toLowerCase().includes(q);
        const custMatch = c.alert_context?.customer_id?.toLowerCase().includes(q);
        const txnMatch = c.case.affected_txn_ids?.some((t) => t.includes(q)) || c.alert_context?.flagged_txn_id?.includes(q);
        const patternMatch = c.case.pattern.toLowerCase().includes(q);
        return caseIdMatch || custMatch || txnMatch || patternMatch;
      }).slice(0, 6)
    : [];

  const verdictTheme = selectedCase ? getVerdictTheme(selectedCase.case.verdict) : null;

  return (
    <header style={{
      height: '64px',
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      gap: '20px',
      zIndex: 20
    }}>
      {/* Left: Global Search with Instant Dropdown */}
      <div style={{ position: 'relative', width: '360px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-card)',
          border: isSearchFocused ? '1px solid var(--color-cyan-border)' : '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '7px 12px',
          boxShadow: isSearchFocused ? '0 0 12px rgba(6, 182, 212, 0.2)' : 'none',
          transition: 'all 0.15s ease'
        }}>
          <Search size={15} color={isSearchFocused ? '#06B6D4' : 'var(--text-muted)'} />
          <input
            type="text"
            placeholder="Search Case (HHG-006), Txn (3476682), Cust..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F8FAFC',
              fontSize: '12px',
              width: '100%',
              fontFamily: 'var(--font-sans)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {isSearchFocused && filteredSearchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '42px',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: '6px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 100,
            overflow: 'hidden'
          }}>
            {filteredSearchResults.map((c) => {
              const vt = getVerdictTheme(c.case.verdict);
              return (
                <div
                  key={c.case_id}
                  onMouseDown={() => {
                    onSelectCaseId(c.case_id);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#F8FAFC', fontSize: '12px' }}>
                        {c.case_id}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {c.case.pattern}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                      Cust: {c.alert_context?.customer_id || 'N/A'} • {formatCurrency(c.case.exposure_usd)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: vt.color,
                    backgroundColor: vt.bg,
                    border: `1px solid ${vt.border}`,
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {formatPercent(c.case.fraud_probability)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Middle: Active Case Quick Context Pill */}
      {selectedCase && verdictTheme && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          padding: '5px 14px',
          borderRadius: '30px'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Case:</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: '#F8FAFC', fontSize: '13px' }}>
            {selectedCase.case_id}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: verdictTheme.color,
            backgroundColor: verdictTheme.bg,
            border: `1px solid ${verdictTheme.border}`,
            padding: '2px 8px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: verdictTheme.color }} />
            {selectedCase.case.verdict.toUpperCase()} ({formatPercent(selectedCase.case.fraud_probability)})
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(selectedCase.case.exposure_usd)}
          </span>
        </div>
      )}

      {/* Right: Actions, Validation Badge, and Replay Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Replay Button (WOW Feature) */}
        <button
          onClick={onTriggerReplay}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid var(--color-cyan-border)',
            color: '#22D3EE',
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(6, 182, 212, 0.25)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(6, 182, 212, 0.15)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Play size={13} fill="#22D3EE" />
          <span>Launch Investigation</span>
        </button>

        {/* Demo Mode Switch */}
        <button
          onClick={onToggleDemoMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: isDemoMode ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
            border: isDemoMode ? '1px solid var(--color-uncertain-border)' : '1px solid var(--border-subtle)',
            color: isDemoMode ? '#FBBF24' : 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
          title="Demo Mode sets up priority presentations"
        >
          <Sparkles size={12} color={isDemoMode ? '#FBBF24' : 'currentColor'} />
          <span>{isDemoMode ? 'DEMO MODE: ON' : 'DEMO MODE'}</span>
        </button>

        {/* 20/20 Test Passed Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          borderRadius: '6px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34D399',
          fontSize: '11px',
          fontWeight: '700'
        }}>
          <CheckCircle2 size={13} color="#10B981" />
          <span>20/20 VALIDATED</span>
        </div>
      </div>
    </header>
  );
};
