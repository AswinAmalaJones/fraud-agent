import { Verdict, EpistemicStatus } from '../types/fraud';

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatPercent(prob: number | undefined | null): string {
  if (prob === undefined || prob === null || isNaN(prob)) return '0%';
  return `${Math.round(prob * 100)}%`;
}

export function formatPatternName(pattern: string | undefined | null): string {
  if (!pattern) return 'None';
  switch (pattern) {
    case 'card_not_present_fraud':
      return 'Card-Not-Present Fraud';
    case 'card_testing':
      return 'Card Testing';
    case 'card_not_present_new_device':
      return 'CNP (New Device)';
    case 'out_of_region_use':
      return 'Out of Region Use';
    case 'account_takeover':
      return 'Account Takeover';
    case 'undocumented':
      return 'Undocumented Pattern';
    case 'none':
      return 'Legitimate (No Pattern)';
    default:
      return pattern
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
}

export function getVerdictTheme(verdict: Verdict | string) {
  switch (verdict) {
    case 'fraud':
      return {
        label: 'FRAUD',
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.35)',
        glow: '0 0 16px rgba(239, 68, 68, 0.4)',
        badgeBg: 'bg-red-500/20 text-red-400 border-red-500/40'
      };
    case 'legitimate':
      return {
        label: 'LEGITIMATE',
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.35)',
        glow: '0 0 16px rgba(16, 185, 129, 0.4)',
        badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      };
    case 'uncertain':
    default:
      return {
        label: 'UNCERTAIN',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.35)',
        glow: '0 0 16px rgba(245, 158, 11, 0.4)',
        badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      };
  }
}

export function getEpistemicBadge(status?: EpistemicStatus | string) {
  switch (status) {
    case 'FACT':
      return {
        label: 'FACT',
        description: 'Verified Graph Tool Fact',
        color: '#06B6D4',
        bg: 'rgba(6, 182, 212, 0.15)',
        border: 'rgba(6, 182, 212, 0.4)',
        iconColor: 'text-cyan-400'
      };
    case 'INFERENCE':
      return {
        label: 'INFERENCE',
        description: 'LLM Synthesized Inference',
        color: '#A855F7',
        bg: 'rgba(168, 85, 247, 0.15)',
        border: 'rgba(168, 85, 247, 0.4)',
        iconColor: 'text-purple-400'
      };
    case 'ASSUMPTION':
      return {
        label: 'ASSUMPTION',
        description: 'Simulated Evidence Request',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.4)',
        iconColor: 'text-amber-400'
      };
    default:
      return {
        label: 'OBSERVATION',
        description: 'Raw Observation',
        color: '#94A3B8',
        bg: 'rgba(148, 163, 184, 0.15)',
        border: 'rgba(148, 163, 184, 0.4)',
        iconColor: 'text-slate-400'
      };
  }
}

export function getActionRouteBadge(route: string) {
  switch (route) {
    case 'auto':
      return {
        label: 'AUTO',
        desc: 'Autonomous Agent Execution',
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.35)'
      };
    case 'L1':
      return {
        label: 'L1 APPROVAL',
        desc: 'Team Lead Approval Required',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.35)'
      };
    case 'L2':
      return {
        label: 'L2 APPROVAL',
        desc: 'Fraud Manager Approval Required',
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.35)'
      };
    default:
      return {
        label: route.toUpperCase(),
        desc: 'Approval Route',
        color: '#94A3B8',
        bg: 'rgba(148, 163, 184, 0.15)',
        border: 'rgba(148, 163, 184, 0.35)'
      };
  }
}
