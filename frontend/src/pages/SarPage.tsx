import React from 'react';
import {
  FileCheck2,
  FileText,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  DollarSign,
  User,
  ExternalLink
} from 'lucide-react';
import { CaseRecord } from '../types/fraud';
import { formatCurrency } from '../utils/formatters';

interface SarPageProps {
  caseRecord: CaseRecord;
}

export const SarPage: React.FC<SarPageProps> = ({ caseRecord }) => {
  const sar = caseRecord.sar;
  const isFiled = sar.file;

  const regLinks = [
    { title: 'FinCEN SAR Narrative Guidance', desc: 'Standard for suspicious activity narrative formatting', link: 'https://www.fincen.gov/system/files/shared/sar_guidance_narrative.pdf' },
    { title: 'FATF Cyber-Enabled Fraud Report', desc: 'Typologies for card-not-present and device syndicates', link: 'https://www.fatf-gafi.org' },
    { title: 'FFIEC Red Flag Manual', desc: 'BSA/AML regulatory reporting guidelines', link: 'https://bsaaml.ffiec.gov' }
  ];

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCheck2 size={20} color={isFiled ? '#EF4444' : '#10B981'} />
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#F8FAFC' }}>
            REGULATORY SAR / COMPLIANCE &bull; <span style={{ color: isFiled ? '#EF4444' : '#10B981' }}>{caseRecord.case_id}</span>
          </h1>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          FinCEN Suspicious Activity Report regulatory filing record per Fraud Policy section 3a
        </p>
      </div>

      {/* Main Filing Status Banner */}
      <div className="soc-card" style={{
        padding: '24px',
        border: `1px solid ${isFiled ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
        background: isFiled
          ? 'radial-gradient(ellipse at top left, rgba(239, 68, 68, 0.12) 0%, rgba(17, 24, 39, 0.98) 80%)'
          : 'radial-gradient(ellipse at top left, rgba(16, 185, 129, 0.12) 0%, rgba(17, 24, 39, 0.98) 80%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '13px',
                fontWeight: '800',
                color: isFiled ? '#F87171' : '#34D399',
                backgroundColor: isFiled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                border: `1px solid ${isFiled ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                padding: '4px 12px',
                borderRadius: '6px'
              }}>
                {isFiled ? 'SAR FILING MANDATED (FILE_REPORT)' : 'SAR FILING NOT REQUIRED'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Policy Section 3a Criteria
              </span>
            </div>

            <div style={{ fontSize: '14px', color: '#F8FAFC', fontWeight: '600', marginTop: '12px' }}>
              Filing Determination Reason:
            </div>
            <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {sar.reason}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL REPORTED EXPOSURE</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: isFiled ? '#EF4444' : '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(sar.total_amount_usd)}
            </div>
          </div>
        </div>

        {/* Subjects & Activity Dates */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>REPORTED SUBJECTS</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#38BDF8', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {sar.subjects.length > 0 ? sar.subjects.join(', ') : 'None'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>ACTIVITY DATES WINDOW</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {sar.activity_dates.length > 0 ? sar.activity_dates.join(' to ') : 'N/A'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>APPROVAL ROUTE</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: isFiled ? '#EF4444' : '#10B981', marginTop: '4px' }}>
              {isFiled ? 'L2 (Fraud Manager Sign-off)' : 'Auto / N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* FinCEN Narrative Box */}
      {isFiled && sar.narrative && (
        <div className="soc-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <FileText size={16} color="#06B6D4" />
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC' }}>
              FINCEN FORM 111 COMPLIANT NARRATIVE
            </div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(0,0,0,0.4)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#E2E8F0',
            lineHeight: 1.6,
            fontFamily: 'var(--font-sans)'
          }}>
            {sar.narrative}
          </div>
        </div>
      )}

      {/* Regulatory References List */}
      <div className="soc-card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC', marginBottom: '12px' }}>
          REGULATORY CITATIONS &amp; GUIDANCE REPOSITORIES
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {regLinks.map((rl, i) => (
            <div
              key={i}
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#38BDF8' }}>
                {rl.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {rl.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
