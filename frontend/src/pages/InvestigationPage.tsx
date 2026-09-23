import React, { useState } from 'react';
import { CaseRecord } from '../types/fraud';
import { InvestigationHeader } from '../components/investigation/InvestigationHeader';
import { PipelineTimeline } from '../components/investigation/PipelineTimeline';
import { ExplainabilityPanel } from '../components/investigation/ExplainabilityPanel';
import { EvidenceConvergence } from '../components/investigation/EvidenceConvergence';
import { BurstTimeline } from '../components/burst/BurstTimeline';
import { InvestigationReplayModal } from '../components/investigation/InvestigationReplayModal';

interface InvestigationPageProps {
  caseRecord: CaseRecord;
  onOpenGraph: () => void;
}

export const InvestigationPage: React.FC<InvestigationPageProps> = ({
  caseRecord,
  onOpenGraph
}) => {
  const [isReplayOpen, setIsReplayOpen] = useState<boolean>(false);

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Investigation Telemetry Header */}
      <InvestigationHeader
        caseRecord={caseRecord}
        onTriggerReplay={() => setIsReplayOpen(true)}
        onOpenGraph={onOpenGraph}
      />

      {/* Autonomous Pipeline Timeline */}
      <PipelineTimeline caseRecord={caseRecord} />

      {/* Structuring Burst Timeline (for multi-transaction episodes like HHG-006) */}
      <BurstTimeline caseRecord={caseRecord} />

      {/* Multi-Signal Evidence Convergence */}
      <EvidenceConvergence caseRecord={caseRecord} />

      {/* Epistemic Explainability Panel (FACT vs INFERENCE vs ASSUMPTION) */}
      <ExplainabilityPanel caseRecord={caseRecord} />

      {/* Live Investigation Replay Modal */}
      <InvestigationReplayModal
        caseRecord={caseRecord}
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
      />
    </div>
  );
};
