import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  Search,
  Share2,
  Clock,
  History,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Layers,
  Database,
  Fingerprint,
  TrendingUp,
  Sliders,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { CaseRecord } from '../../types/fraud';
import { formatCurrency, formatPercent, getVerdictTheme, getActionRouteBadge } from '../../utils/formatters';

interface InvestigationReplayModalProps {
  caseRecord: CaseRecord;
  isOpen: boolean;
  onClose: () => void;
}

export const InvestigationReplayModal: React.FC<InvestigationReplayModalProps> = ({
  caseRecord,
  isOpen,
  onClose
}) => {
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 1.5x, 2x
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);

  const isHHG006 = caseRecord.case_id === 'HHG-006';
  const isHHG014 = caseRecord.case_id === 'HHG-014';
  const vt = getVerdictTheme(caseRecord.case.verdict);
  const alert = caseRecord.alert_context;

  // 6 Defined Forensic Stages matching the required pipeline
  const stages = [
    {
      id: 'alert',
      stageNumber: 1,
      title: 'Alert Ingestion & Triage',
      badge: 'STAGE 1: ALERT',
      icon: Zap,
      color: '#F59E0B',
      stageTime: 1800, // ms at 1x
      simulatedProbability: 0.35,
      simulatedExposure: alert?.flagged_txn_id === '3476682' ? 482.12 : (alert?.flagged_txn_id === '3478561' ? 74.96 : (caseRecord.case.exposure_usd / (caseRecord.case.affected_txn_ids?.length || 1))),
      simulatedToolCalls: 1,
      summary: `Real-time anomaly or customer report ingested for transaction #${alert?.flagged_txn_id || caseRecord.case.first_suspicious_txn_id}.`,
      findings: [
        { label: 'Trigger Type', value: alert?.trigger_type || 'Customer Report / Risk Score', color: '#F59E0B' },
        { label: 'Customer Account', value: alert?.customer_id || 'C07297', color: '#06B6D4' },
        { label: 'Primary Card', value: alert?.card_id || 'C07297-K1', color: '#3B82F6' },
        { label: 'Trigger Message', value: alert?.trigger_text || caseRecord.case.summary, color: '#E2E8F0', fullWidth: true }
      ],
      epistemicBadge: 'OBSERVATION',
      toolCitation: 'Ingress Stream &bull; Alert Dispatcher'
    },
    {
      id: 'evidence',
      stageNumber: 2,
      title: 'Evidence Gathering & Baseline',
      badge: 'STAGE 2: EVIDENCE GATHERING',
      icon: Search,
      color: '#06B6D4',
      stageTime: 2000,
      simulatedProbability: isHHG006 ? 0.65 : (isHHG014 ? 0.50 : 0.45),
      simulatedExposure: alert?.flagged_txn_id === '3476682' ? 482.12 : (alert?.flagged_txn_id === '3478561' ? 74.96 : (caseRecord.case.exposure_usd / (caseRecord.case.affected_txn_ids?.length || 1))),
      simulatedToolCalls: 4,
      summary: 'Grounded queries executed strictly before the alert timestamp respecting Stage 3 time rules.',
      findings: [
        {
          label: 'Customer Baseline (199 Prior Txns)',
          value: isHHG006
            ? 'Flagged amount $482.12 vs historical average $116.73 (4.1x deviation, max $1104.00)'
            : (isHHG014 ? 'Flagged amount $74.96 vs average $58.13 across 71 prior txns' : 'Baseline calculated from historical transactions'),
          color: '#06B6D4',
          fullWidth: true
        },
        {
          label: 'Regional Billing History',
          value: isHHG006 ? '28 prior txns in region 264 since 2016-07-06 (Consistent home region)' : 'Customer historical billing region profile confirmed',
          color: '#38BDF8',
          fullWidth: true
        }
      ],
      epistemicBadge: 'FACT',
      toolCitation: 'tools.customer_baseline, tools.region_history'
    },
    {
      id: 'graph',
      stageNumber: 3,
      title: 'Graph Intelligence & Syndicate Expansion',
      badge: 'STAGE 3: GRAPH INTELLIGENCE',
      icon: Share2,
      color: '#A855F7',
      stageTime: 2400,
      simulatedProbability: isHHG006 ? 0.88 : (isHHG014 ? 0.85 : 0.70),
      simulatedExposure: isHHG006 ? 1906.07 : caseRecord.case.exposure_usd,
      simulatedToolCalls: 9,
      summary: 'Deep 2-hop TigerGraph traversal linking digital device fingerprints, structuring bursts, and historical closed cases.',
      findings: [
        {
          label: 'Device Signature Multi-Tenancy',
          value: isHHG006
            ? 'Fingerprint (Trident/7.0 | Windows 7 | IE 11.0) shared with 139 OTHER customer accounts within +/-30 days'
            : (isHHG014 ? 'Rare Android 7.0 / Galaxy S7 fingerprint shared with 27 OTHER customer accounts' : 'Device fingerprint evaluated across customer graph'),
          color: '#C084FC',
          fullWidth: true
        },
        {
          label: 'Historical Confirmed Fraud Matches',
          value: isHHG006
            ? 'Exact device linked to 6 PREVIOUSLY CONFIRMED FRAUD closed cases (CC-0781, CC-1476, CC-1960, CC-3368, CC-3624, CC-5111)'
            : (isHHG014 ? 'Exact device linked to 4 PREVIOUSLY CONFIRMED FRAUD cases (CC-2649, CC-2971, CC-2985, CC-3035)' : 'Checked closed case memory'),
          color: '#EF4444',
          fullWidth: true
        },
        {
          label: 'Structuring Burst Window Detection',
          value: isHHG006
            ? 'Uncovered 3 near-equal-amount txns ($1,423.95 total) within 24.0 minutes (#3476602, #3476633, #3476665)'
            : 'Scanned 85%-105% amount structuring band',
          color: '#F59E0B',
          fullWidth: true
        }
      ],
      epistemicBadge: 'FACT',
      toolCitation: 'tools.device_signature_matches, tools.device_closed_case_history, tools.burst_scan'
    },
    {
      id: 'pattern',
      stageNumber: 4,
      title: 'Pattern Detection & Model Convergence',
      badge: 'STAGE 4: PATTERN DETECTION',
      icon: Fingerprint,
      color: '#38BDF8',
      stageTime: 1800,
      simulatedProbability: caseRecord.case.fraud_probability,
      simulatedExposure: caseRecord.case.exposure_usd,
      simulatedToolCalls: 12,
      summary: 'Multi-signal evidence converges into formal pattern classification under Fraud Policy v1.0.',
      findings: [
        { label: 'Classified Pattern', value: caseRecord.case.pattern.toUpperCase(), color: '#38BDF8' },
        { label: 'Final Probability', value: `${formatPercent(caseRecord.case.fraud_probability)} (${caseRecord.case.verdict.toUpperCase()})`, color: vt.color },
        { label: 'Full Episode Exposure', value: `${formatCurrency(caseRecord.case.exposure_usd)} (${caseRecord.case.affected_txn_ids?.length || 1} transactions)`, color: '#EF4444' },
        { label: 'Pattern Description', value: caseRecord.case.pattern_description || 'Card-not-present fraud episode with structuring burst and shared compromised device signature.', color: '#CBD5E1', fullWidth: true }
      ],
      epistemicBadge: 'INFERENCE',
      toolCitation: 'llm:synthesis &bull; Stage 3 Guardrails'
    },
    {
      id: 'policy',
      stageNumber: 5,
      title: 'Deterministic Policy Evaluation',
      badge: 'STAGE 5: POLICY DECISION',
      icon: ShieldCheck,
      color: '#10B981',
      stageTime: 2000,
      simulatedProbability: caseRecord.case.fraud_probability,
      simulatedExposure: caseRecord.case.exposure_usd,
      simulatedToolCalls: caseRecord.tool_calls,
      summary: 'Pure rule engine (policy.py) evaluates action approvals without LLM hallucinations.',
      findings: [
        { label: 'Primary Action', value: `${caseRecord.next_best_actions.final[0]?.action} (${caseRecord.next_best_actions.final[0]?.route})`, color: '#EF4444' },
        { label: 'Secondary Action', value: `${caseRecord.next_best_actions.final[1]?.action || 'CREATE_CASE'} (${caseRecord.next_best_actions.final[1]?.route || 'auto'})`, color: '#38BDF8' },
        { label: 'Device Action', value: `${caseRecord.next_best_actions.final[2]?.action || 'MONITOR_CONNECTED_CARDS'} (Rule R6)`, color: '#10B981' },
        { label: 'Policy Stopping Rule', value: caseRecord.stop_reason, color: '#FDE68A', fullWidth: true }
      ],
      epistemicBadge: 'POLICY v1.0',
      toolCitation: 'policy.recommend_final_actions, policy.route_for'
    },
    {
      id: 'action',
      stageNumber: 6,
      title: 'Final Action & TigerGraph Write-Back',
      badge: 'STAGE 6: FINAL ACTION',
      icon: CheckCircle2,
      color: caseRecord.case.verdict === 'fraud' ? '#EF4444' : '#10B981',
      stageTime: 2000,
      simulatedProbability: caseRecord.case.fraud_probability,
      simulatedExposure: caseRecord.case.exposure_usd,
      simulatedToolCalls: caseRecord.tool_calls,
      summary: 'Case finalized, SAR evaluation completed, and AgentCase provenance written to TigerGraph.',
      findings: [
        { label: 'Investigation Status', value: caseRecord.case.status.toUpperCase(), color: vt.color },
        { label: 'SAR Filing Status', value: caseRecord.sar.file ? 'FILED (FinCEN Compliance)' : 'NOT REQUIRED', color: caseRecord.sar.file ? '#EF4444' : '#10B981' },
        { label: 'TigerGraph Vertex ID', value: caseRecord.case.graph_case_id || caseRecord.case_id, color: '#06B6D4' },
        { label: 'Investigation Summary', value: caseRecord.case.summary, color: '#E2E8F0', fullWidth: true }
      ],
      epistemicBadge: 'PERSISTED',
      toolCitation: 'graph_writer.write_case_to_graph (AgentCase Vertex)'
    }
  ];

  const totalReplayDurationMs = stages.reduce((acc, s) => acc + s.stageTime, 0);

  // Timer loop for playback
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const intervalMs = 100;
    const timer = setInterval(() => {
      setElapsedTimeMs((prev) => {
        const nextTime = prev + intervalMs * playbackSpeed;
        if (nextTime >= totalReplayDurationMs) {
          setIsPlaying(false);
          setCurrentStageIdx(stages.length - 1);
          return totalReplayDurationMs;
        }

        // Determine active stage based on elapsed time
        let accumulated = 0;
        for (let i = 0; i < stages.length; i++) {
          accumulated += stages[i].stageTime;
          if (nextTime < accumulated) {
            setCurrentStageIdx(i);
            break;
          }
        }

        return nextTime;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, playbackSpeed, totalReplayDurationMs, stages.length]);

  // Reset when modal opens or case changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStageIdx(0);
      setElapsedTimeMs(0);
      setIsPlaying(true);
    }
  }, [isOpen, caseRecord.case_id]);

  const handleJumpToStage = (idx: number) => {
    setCurrentStageIdx(idx);
    let timeBefore = 0;
    for (let i = 0; i < idx; i++) {
      timeBefore += stages[i].stageTime;
    }
    setElapsedTimeMs(timeBefore + 50);
  };

  const handleRestart = () => {
    setCurrentStageIdx(0);
    setElapsedTimeMs(0);
    setIsPlaying(true);
  };

  const handleSkipToDecision = () => {
    setCurrentStageIdx(stages.length - 1);
    setElapsedTimeMs(totalReplayDurationMs);
    setIsPlaying(false);
  };

  const handleStepBack = () => {
    if (currentStageIdx > 0) {
      handleJumpToStage(currentStageIdx - 1);
    }
  };

  const handleStepForward = () => {
    if (currentStageIdx < stages.length - 1) {
      handleJumpToStage(currentStageIdx + 1);
    }
  };

  if (!isOpen) return null;

  const currentStage = stages[currentStageIdx];
  const StageIcon = currentStage.icon;
  const progressPercent = Math.min(100, Math.round((elapsedTimeMs / totalReplayDurationMs) * 100));

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.88)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="soc-card" style={{
        width: '100%',
        maxWidth: '960px',
        backgroundColor: '#0A0F1A',
        border: '1px solid var(--color-cyan-border)',
        boxShadow: '0 0 60px rgba(6, 182, 212, 0.35)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh'
      }}>
        {/* Top Header Bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
              border: '1px solid var(--color-cyan-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)'
            }}>
              <Zap size={20} color="#06B6D4" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#F8FAFC' }}>
                  INVESTIGATION REPLAY ENGINE
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: '800',
                  color: '#06B6D4',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-cyan-border)'
                }}>
                  {caseRecord.case_id}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Automated 10s step-by-step forensic reconstruction of the TigerGraph fraud agent
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Speed selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '3px 6px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '4px' }}>SPEED:</span>
              {[1, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: playbackSpeed === spd ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                    color: playbackSpeed === spd ? '#22D3EE' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stage Timeline Navigation Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          backgroundColor: '#070A0F',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          {stages.map((stg, i) => {
            const isCurrent = currentStageIdx === i;
            const isPassed = currentStageIdx > i;
            const Icon = stg.icon;

            return (
              <button
                key={stg.id}
                onClick={() => handleJumpToStage(i)}
                style={{
                  padding: '10px 6px',
                  backgroundColor: isCurrent ? 'rgba(6, 182, 212, 0.12)' : (isPassed ? 'rgba(255,255,255,0.02)' : 'transparent'),
                  borderBottom: isCurrent ? `2px solid ${stg.color}` : '2px solid transparent',
                  borderRight: i < 5 ? '1px solid var(--border-subtle)' : 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: isCurrent ? stg.color : (isPassed ? '#10B981' : 'rgba(255,255,255,0.06)'),
                  color: isCurrent ? '#070A0F' : (isPassed ? '#070A0F' : 'var(--text-dim)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '800'
                }}>
                  {isPassed ? <CheckCircle2 size={12} /> : (i + 1)}
                </div>
                <div style={{
                  fontSize: '10px',
                  fontWeight: isCurrent ? '700' : '500',
                  color: isCurrent ? '#F8FAFC' : (isPassed ? '#CBD5E1' : 'var(--text-dim)'),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {stg.title.split(' ')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Global Progress Bar */}
        <div style={{ height: '3px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: currentStage.color,
            transition: 'width 0.1s linear',
            boxShadow: `0 0 10px ${currentStage.color}`
          }} />
        </div>

        {/* Main Content Presentation Grid */}
        <div style={{
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '20px',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Left Column: Active Stage Forensic Findings */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* Stage Title Card */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: 'var(--bg-secondary)',
              border: `1px solid ${currentStage.color}50`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              boxShadow: `0 0 20px -5px ${currentStage.color}25`
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: `${currentStage.color}20`,
                border: `1px solid ${currentStage.color}60`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <StageIcon size={22} color={currentStage.color} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: currentStage.color,
                    backgroundColor: `${currentStage.color}15`,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {currentStage.badge}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#06B6D4',
                    backgroundColor: 'rgba(6,182,212,0.1)',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    {currentStage.epistemicBadge}
                  </span>
                </div>

                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#F8FAFC', marginTop: '4px' }}>
                  {currentStage.title}
                </h2>
                <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  {currentStage.summary}
                </p>
              </div>
            </div>

            {/* Forensic Findings Box */}
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                STAGE FORENSIC DISCOVERIES
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentStage.findings.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px'
                    }}
                  >
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      {f.label}
                    </div>
                    <div style={{ fontSize: '12px', color: f.color, fontWeight: '500', lineHeight: 1.4 }}>
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: '4px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '10px',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)'
              }}>
                Tool Invocation: {currentStage.toolCitation}
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Telemetry HUD */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* Live Model Confidence Radar */}
            <div style={{
              padding: '20px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '12px' }}>
                LIVE MODEL CONFIDENCE GAUGE
              </div>

              <div style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                backgroundColor: currentStageIdx >= 3 ? vt.bg : 'rgba(6, 182, 212, 0.1)',
                border: `3px solid ${currentStageIdx >= 3 ? vt.color : '#06B6D4'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: currentStageIdx >= 3 ? vt.glow : '0 0 15px rgba(6, 182, 212, 0.25)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  fontSize: '26px',
                  fontWeight: '900',
                  color: currentStageIdx >= 3 ? vt.color : '#06B6D4',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {formatPercent(currentStage.simulatedProbability)}
                </div>
                <div style={{ fontSize: '9px', fontWeight: '800', color: '#F8FAFC', marginTop: '2px' }}>
                  {currentStageIdx >= 3 ? caseRecord.case.verdict.toUpperCase() : 'EVALUATING'}
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '14px', textAlign: 'center' }}>
                {currentStageIdx >= 3 ? (
                  <span>Satisfies <strong>Rule R1</strong> (High prob + 2 signals)</span>
                ) : (
                  <span>Gathering independent graph signals...</span>
                )}
              </div>
            </div>

            {/* Telemetry Metrics Stack */}
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>EPISODE EXPOSURE</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#F8FAFC', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {formatCurrency(currentStage.simulatedExposure)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>GRAPH TOOL CALLS</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#38BDF8', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {currentStage.simulatedToolCalls} / {caseRecord.tool_calls}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>AFFECTED TXNS</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#F8FAFC', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {currentStageIdx >= 2 ? (caseRecord.case.affected_txn_ids?.length || 1) : 1}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ELAPSED TIME</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#FBBF24', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {(elapsedTimeMs / 1000).toFixed(1)}s
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Playback Controls Bar */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-medium)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Playback Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: isPlaying ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: isPlaying ? '1px solid var(--color-fraud-border)' : '1px solid var(--color-legit-border)',
                color: isPlaying ? '#F87171' : '#34D399',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'PAUSE' : 'RESUME'}</span>
            </button>

            <button
              onClick={handleStepBack}
              disabled={currentStageIdx === 0}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: currentStageIdx === 0 ? 'var(--text-dim)' : 'var(--text-secondary)',
                fontSize: '12px',
                cursor: currentStageIdx === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Step Backward"
            >
              <ChevronLeft size={14} /> <span>Step Back</span>
            </button>

            <button
              onClick={handleStepForward}
              disabled={currentStageIdx === stages.length - 1}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: currentStageIdx === stages.length - 1 ? 'var(--text-dim)' : 'var(--text-secondary)',
                fontSize: '12px',
                cursor: currentStageIdx === stages.length - 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Step Forward"
            >
              <span>Step Next</span> <ChevronRight size={14} />
            </button>

            <button
              onClick={handleRestart}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Restart from Stage 1"
            >
              <RotateCcw size={13} /> <span>Restart</span>
            </button>

            <button
              onClick={handleSkipToDecision}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: '#38BDF8',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Jump directly to Final Decision"
            >
              <FastForward size={13} /> <span>Skip to Action</span>
            </button>
          </div>

          {/* Close modal */}
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-medium)',
              color: '#F8FAFC',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Close Replay
          </button>
        </div>
      </div>
    </div>
  );
};
