import React, { useState, useMemo } from 'react';
import { loadAllCases } from './data/casesLoader';
import { CaseRecord } from './types/fraud';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewPage } from './pages/OverviewPage';
import { CasesPage } from './pages/CasesPage';
import { InvestigationPage } from './pages/InvestigationPage';
import { NetworkGraphPage } from './pages/NetworkGraphPage';
import { EvidencePage } from './pages/EvidencePage';
import { PolicyPage } from './pages/PolicyPage';
import { SarPage } from './pages/SarPage';
import { InvestigationReplayModal } from './components/investigation/InvestigationReplayModal';

export const App: React.FC = () => {
  const allCases = useMemo(() => loadAllCases(), []);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('HHG-006');
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState<boolean>(false);

  const selectedCase = useMemo(() => {
    return allCases.find((c) => c.case_id === selectedCaseId) || allCases[0] || null;
  }, [allCases, selectedCaseId]);

  const handleSelectCaseId = (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  const handleTriggerReplay = () => {
    setIsReplayModalOpen(true);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)'
    }}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedCase={selectedCase}
        onSelectCaseId={handleSelectCaseId}
        casesCount={allCases.length}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Top Header Bar */}
        <TopBar
          cases={allCases}
          selectedCase={selectedCase}
          onSelectCaseId={handleSelectCaseId}
          onTriggerReplay={handleTriggerReplay}
          isDemoMode={isDemoMode}
          onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
        />

        {/* Viewport Page Content */}
        <main style={{
          flex: 1,
          overflowY: currentTab === 'network' ? 'hidden' : 'auto',
          backgroundColor: 'var(--bg-primary)'
        }}>
          {currentTab === 'overview' && (
            <OverviewPage
              cases={allCases}
              onSelectCaseId={(id) => {
                handleSelectCaseId(id);
                setCurrentTab('investigation');
              }}
              onSelectTab={setCurrentTab}
            />
          )}

          {currentTab === 'cases' && (
            <CasesPage
              cases={allCases}
              onSelectCaseId={handleSelectCaseId}
              onSelectTab={setCurrentTab}
            />
          )}

          {currentTab === 'investigation' && selectedCase && (
            <InvestigationPage
              caseRecord={selectedCase}
              onOpenGraph={() => setCurrentTab('network')}
            />
          )}

          {currentTab === 'network' && selectedCase && (
            <NetworkGraphPage caseRecord={selectedCase} />
          )}

          {currentTab === 'evidence' && selectedCase && (
            <EvidencePage
              caseRecord={selectedCase}
              onOpenGraph={() => setCurrentTab('network')}
            />
          )}

          {currentTab === 'policy' && selectedCase && (
            <PolicyPage caseRecord={selectedCase} />
          )}

          {currentTab === 'sar' && selectedCase && (
            <SarPage caseRecord={selectedCase} />
          )}
        </main>
      </div>

      {/* Global Investigation Replay Modal */}
      {selectedCase && (
        <InvestigationReplayModal
          caseRecord={selectedCase}
          isOpen={isReplayModalOpen}
          onClose={() => setIsReplayModalOpen(false)}
        />
      )}
    </div>
  );
};
export default App;
