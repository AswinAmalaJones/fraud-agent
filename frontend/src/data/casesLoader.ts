import { CaseRecord } from '../types/fraud';
import { CASE_PACK_ALERTS } from './casePackAlerts';

// Dynamically import all 20 case JSON files from the root cases/ folder
const caseModules = import.meta.glob('./cases/*.json', { eager: true }) as Record<string, any>;

export function loadAllCases(): CaseRecord[] {
  const loadedList: CaseRecord[] = [];

  for (const path in caseModules) {
    const rawData = (caseModules[path] as any).default || caseModules[path];
    if (rawData && rawData.case_id) {
      const caseId = rawData.case_id;
      const alertContext = CASE_PACK_ALERTS[caseId] || undefined;
      loadedList.push({
        ...rawData,
        alert_context: alertContext
      });
    }
  }

  // Sort by case ID naturally: HHG-001, HHG-002, ..., HHG-020
  loadedList.sort((a, b) => {
    const numA = parseInt(a.case_id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.case_id.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  return loadedList;
}

export function getCaseById(caseId: string): CaseRecord | undefined {
  const allCases = loadAllCases();
  return allCases.find((c) => c.case_id === caseId);
}
