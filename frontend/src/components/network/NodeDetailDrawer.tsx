import React from 'react';
import { X, Share2, ShieldAlert, CheckCircle2, Database, Layers, Hash } from 'lucide-react';
import { NetworkNode } from '../../types/fraud';

interface NodeDetailDrawerProps {
  node: NetworkNode | null;
  onClose: () => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '380px',
      backgroundColor: '#0D131F',
      borderLeft: '1px solid var(--border-medium)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: node.status === 'fraud' || node.status === 'historical_fraud' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {node.status === 'fraud' || node.status === 'historical_fraud' ? (
              <ShieldAlert size={15} color="#EF4444" />
            ) : (
              <Share2 size={15} color="#06B6D4" />
            )}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC' }}>
              NODE INSPECTOR
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ID: {node.id}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Node Label Card */}
        <div style={{
          padding: '14px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Entity Identifier
          </div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: '#F8FAFC', marginTop: '4px', wordBreak: 'break-all' }}>
            {node.label}
          </div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              color: '#38BDF8',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              textTransform: 'uppercase'
            }}>
              Type: {node.type}
            </span>
            {node.status && (
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: node.status === 'fraud' || node.status === 'historical_fraud' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: node.status === 'fraud' || node.status === 'historical_fraud' ? '#F87171' : '#34D399',
                border: `1px solid ${node.status === 'fraud' || node.status === 'historical_fraud' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                textTransform: 'uppercase'
              }}>
                Status: {node.status}
              </span>
            )}
          </div>
        </div>

        {/* Detailed Attributes */}
        {node.details && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#38BDF8', letterSpacing: '0.05em' }}>
              TIGERGRAPH FORENSIC ATTRIBUTES
            </div>

            {Object.entries(node.details).map(([key, val]) => (
              <div
                key={key}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px'
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {key}
                </div>
                <div style={{ fontSize: '12px', color: '#E2E8F0', marginTop: '2px', wordBreak: 'break-word', fontWeight: '500' }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
