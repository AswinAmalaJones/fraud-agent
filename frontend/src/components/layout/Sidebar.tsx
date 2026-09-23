import React from 'react';
import {
  LayoutDashboard,
  FolderLock,
  Cpu,
  Share2,
  FileSearch,
  ShieldAlert,
  FileCheck2,
  Shield,
  Zap,
  CheckCircle2,
  Database
} from 'lucide-react';
import { CaseRecord } from '../../types/fraud';

export type NavTab = 'overview' | 'cases' | 'investigation' | 'network' | 'evidence' | 'policy' | 'sar';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  selectedCase: CaseRecord | null;
  onSelectCaseId: (caseId: string) => void;
  casesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  selectedCase,
  onSelectCaseId,
  casesCount
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'cases' as NavTab, label: 'Cases Explorer', icon: FolderLock, badge: `${casesCount}` },
    { id: 'investigation' as NavTab, label: 'Investigation', icon: Cpu, badge: selectedCase?.case_id || 'HHG-006' },
    { id: 'network' as NavTab, label: 'Network Graph', icon: Share2 },
    { id: 'evidence' as NavTab, label: 'Evidence Explorer', icon: FileSearch },
    { id: 'policy' as NavTab, label: 'Policy & Actions', icon: ShieldAlert },
    { id: 'sar' as NavTab, label: 'SAR / Compliance', icon: FileCheck2 }
  ];

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      userSelect: 'none',
      zIndex: 30
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
          border: '1px solid var(--color-cyan-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(6, 182, 212, 0.25)'
        }}>
          <Shield size={20} color="#06B6D4" />
        </div>
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: '800',
            letterSpacing: '0.08em',
            color: '#F8FAFC',
            lineHeight: 1.2
          }}>
            FRAUD<span style={{ color: '#06B6D4' }}>.AI</span>
          </div>
          <div style={{
            fontSize: '10px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)'
          }}>
            TIGERGRAPH CONSOLE
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: '700',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          padding: '4px 10px 8px 10px'
        }}>
          INVESTIGATION PIPELINE
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '6px',
                border: isActive ? '1px solid var(--color-cyan-border)' : '1px solid transparent',
                backgroundColor: isActive ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                color: isActive ? '#06B6D4' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#F8FAFC';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={17} color={isActive ? '#06B6D4' : 'currentColor'} />
                <span style={{ fontSize: '13px', fontWeight: isActive ? '600' : '400' }}>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(6, 182, 212, 0.25)' : 'var(--bg-elevated)',
                  color: isActive ? '#22D3EE' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Demo Priority Shortcuts */}
        <div style={{
          marginTop: '20px',
          padding: '12px 10px 6px 10px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <Zap size={11} color="#F59E0B" /> FEATURED DEMO CASES
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => {
                onSelectCaseId('HHG-006');
                onSelectTab('investigation');
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                background: selectedCase?.case_id === 'HHG-006' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: selectedCase?.case_id === 'HHG-006' ? '1px solid var(--color-fraud-border)' : '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#F87171', fontFamily: 'var(--font-mono)' }}>
                  HHG-006 (Burst & Structuring)
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  4 txns • 139 shared • p=0.99
                </div>
              </div>
              <span className="badge-fraud" style={{ fontSize: '9px', padding: '1px 5px' }}>99%</span>
            </button>

            <button
              onClick={() => {
                onSelectCaseId('HHG-014');
                onSelectTab('investigation');
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                background: selectedCase?.case_id === 'HHG-014' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: selectedCase?.case_id === 'HHG-014' ? '1px solid var(--color-uncertain-border)' : '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#FBBF24', fontFamily: 'var(--font-mono)' }}>
                  HHG-014 (Device Ring)
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  27 shared • 4 prior fraud • p=0.95
                </div>
              </div>
              <span className="badge-uncertain" style={{ fontSize: '9px', padding: '1px 5px' }}>95%</span>
            </button>
          </div>
        </div>
      </nav>

      {/* System Status Footer */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10B981', fontWeight: '600' }}>
            <span className="pulse-dot pulse-green" />
            <span>20/20 VALIDATED</span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>0 errors</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
          <Database size={11} color="#06B6D4" />
          <span>TigerGraph Savanna (Live)</span>
        </div>

        <div style={{
          fontSize: '9px',
          color: 'var(--text-dim)',
          marginTop: '4px',
          fontWeight: '500'
        }}>
          Hacker House Goa Demo Edition
        </div>
      </div>
    </aside>
  );
};
