import { CaseRecord } from '../types/fraud';

export interface AggregateStats {
  totalCases: number;
  validatedCases: number;
  fraudCount: number;
  legitimateCount: number;
  uncertainCount: number;
  totalExposure: number;
  avgLatency: number;
  avgToolCalls: number;
  avgTokens: number;
  patternDistribution: { pattern: string; count: number; name: string; exposure: number }[];
  riskBuckets: { range: string; count: number; color: string }[];
  verdictData: { name: string; value: number; color: string }[];
}

export function calculateAggregateStats(cases: CaseRecord[]): AggregateStats {
  if (!cases || cases.length === 0) {
    return {
      totalCases: 0,
      validatedCases: 0,
      fraudCount: 0,
      legitimateCount: 0,
      uncertainCount: 0,
      totalExposure: 0,
      avgLatency: 0,
      avgToolCalls: 0,
      avgTokens: 0,
      patternDistribution: [],
      riskBuckets: [],
      verdictData: []
    };
  }

  let fraudCount = 0;
  let legitimateCount = 0;
  let uncertainCount = 0;
  let totalExposure = 0;
  let totalLatency = 0;
  let totalToolCalls = 0;
  let totalTokens = 0;

  const patternMap: Record<string, { count: number; exposure: number }> = {
    card_not_present_fraud: { count: 0, exposure: 0 },
    card_testing: { count: 0, exposure: 0 },
    card_not_present_new_device: { count: 0, exposure: 0 },
    out_of_region_use: { count: 0, exposure: 0 },
    account_takeover: { count: 0, exposure: 0 },
    undocumented: { count: 0, exposure: 0 },
    none: { count: 0, exposure: 0 }
  };

  const riskBucketsMap = {
    '0 - 20%': { count: 0, color: '#10B981' },
    '21 - 50%': { count: 0, color: '#3B82F6' },
    '51 - 70%': { count: 0, color: '#F59E0B' },
    '71 - 90%': { count: 0, color: '#F97316' },
    '91 - 100%': { count: 0, color: '#EF4444' }
  };

  for (const c of cases) {
    const verdict = c.case.verdict;
    if (verdict === 'fraud') fraudCount++;
    else if (verdict === 'legitimate') legitimateCount++;
    else uncertainCount++;

    const exposure = c.case.exposure_usd || 0;
    totalExposure += exposure;
    totalLatency += c.latency_s || 0;
    totalToolCalls += c.tool_calls || 0;
    totalTokens += c.tokens || 0;

    const pattern = c.case.pattern || 'none';
    if (!patternMap[pattern]) {
      patternMap[pattern] = { count: 0, exposure: 0 };
    }
    patternMap[pattern].count += 1;
    patternMap[pattern].exposure += exposure;

    const prob = c.case.fraud_probability || 0;
    if (prob <= 0.2) riskBucketsMap['0 - 20%'].count++;
    else if (prob <= 0.5) riskBucketsMap['21 - 50%'].count++;
    else if (prob <= 0.7) riskBucketsMap['51 - 70%'].count++;
    else if (prob <= 0.9) riskBucketsMap['71 - 90%'].count++;
    else riskBucketsMap['91 - 100%'].count++;
  }

  const patternNames: Record<string, string> = {
    card_not_present_fraud: 'Card-Not-Present Fraud',
    card_testing: 'Card Testing',
    card_not_present_new_device: 'CNP (New Device)',
    out_of_region_use: 'Out of Region',
    account_takeover: 'Account Takeover',
    undocumented: 'Undocumented Pattern',
    none: 'Legitimate / Cleared'
  };

  const patternDistribution = Object.keys(patternMap).map((key) => ({
    pattern: key,
    name: patternNames[key] || key,
    count: patternMap[key].count,
    exposure: patternMap[key].exposure
  }));

  const riskBuckets = Object.entries(riskBucketsMap).map(([range, val]) => ({
    range,
    count: val.count,
    color: val.color
  }));

  const verdictData = [
    { name: 'Fraud', value: fraudCount, color: '#EF4444' },
    { name: 'Legitimate', value: legitimateCount, color: '#10B981' },
    { name: 'Uncertain', value: uncertainCount, color: '#F59E0B' }
  ];

  return {
    totalCases: cases.length,
    validatedCases: cases.length,
    fraudCount,
    legitimateCount,
    uncertainCount,
    totalExposure: Math.round(totalExposure * 100) / 100,
    avgLatency: Math.round((totalLatency / cases.length) * 10) / 10,
    avgToolCalls: Math.round((totalToolCalls / cases.length) * 10) / 10,
    avgTokens: Math.round(totalTokens / cases.length),
    patternDistribution,
    riskBuckets,
    verdictData
  };
}
