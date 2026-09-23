import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Share2,
  Filter,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { CaseRecord, NetworkNode } from '../types/fraud';
import { buildCaseGraphData } from '../utils/networkBuilder';
import { NodeDetailDrawer } from '../components/network/NodeDetailDrawer';

interface NetworkGraphPageProps {
  caseRecord: CaseRecord;
}

export const NetworkGraphPage: React.FC<NetworkGraphPageProps> = ({ caseRecord }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const graphData = buildCaseGraphData(caseRecord);

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert nodes to cytoscape format
    const cyNodes = graphData.nodes.map((n) => {
      let bgColor = '#06B6D4';
      let borderColor = '#22D3EE';
      let size = 45;

      if (n.type === 'customer') {
        bgColor = '#3B82F6';
        borderColor = '#60A5FA';
        size = 55;
      } else if (n.type === 'card') {
        bgColor = '#6366F1';
        borderColor = '#818CF8';
        size = 48;
      } else if (n.type === 'transaction') {
        if (n.status === 'flagged') {
          bgColor = '#F59E0B';
          borderColor = '#FBBF24';
          size = 50;
        } else {
          bgColor = '#EF4444';
          borderColor = '#F87171';
          size = 46;
        }
      } else if (n.type === 'device') {
        bgColor = '#A855F7';
        borderColor = '#C084FC';
        size = 56;
      } else if (n.type === 'closed_case') {
        bgColor = '#DC2626';
        borderColor = '#EF4444';
        size = 48;
      } else if (n.type === 'shared_customer' || n.type === 'merchant_cluster') {
        bgColor = '#475569';
        borderColor = '#94A3B8';
        size = 38;
      }

      return {
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          status: n.status,
          rawNode: n,
          bgColor,
          borderColor,
          size
        }
      };
    });

    const cyEdges = graphData.edges.map((e) => {
      let lineColor = 'rgba(255, 255, 255, 0.2)';
      let width = 2;

      if (e.type === 'PRIOR_FRAUD') {
        lineColor = '#EF4444';
        width = 3;
      } else if (e.type === 'DEVICE') {
        lineColor = '#A855F7';
        width = 2.5;
      } else if (e.type === 'LINKED_BURST') {
        lineColor = '#F59E0B';
        width = 2.5;
      }

      return {
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          lineColor,
          width
        }
      };
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(bgColor)',
            'border-width': 2,
            'border-color': 'data(borderColor)',
            'width': 'data(size)',
            'height': 'data(size)',
            'label': 'data(label)',
            'color': '#F8FAFC',
            'font-family': 'Inter, sans-serif',
            'font-size': '10px',
            'font-weight': 700,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-opacity': 0.8,
            'text-background-color': '#0D131F',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-border-width': 1,
            'text-border-color': 'rgba(255, 255, 255, 0.1)',
            'text-max-width': '120px',
            'text-wrap': 'ellipsis'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#38BDF8',
            'border-opacity': 1,
            'underlay-color': '#38BDF8',
            'underlay-padding': 6,
            'underlay-opacity': 0.35
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 'data(width)',
            'line-color': 'data(lineColor)',
            'target-arrow-color': 'data(lineColor)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
            'label': 'data(label)',
            'font-size': '8px',
            'color': 'var(--text-muted)',
            'text-rotation': 'autorotate',
            'text-background-opacity': 0.7,
            'text-background-color': '#070A0F',
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle'
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 600,
        nodeRepulsion: () => 6500,
        idealEdgeLength: () => 90,
        edgeElasticity: () => 100,
        gravity: 0.25,
        padding: 40
      }
    });

    cy.on('tap', 'node', (evt) => {
      const raw = evt.target.data('rawNode');
      setSelectedNode(raw);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [caseRecord.case_id]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 30);
  const handleResetLayout = () => {
    cyRef.current?.layout({
      name: 'cose',
      animate: true,
      animationDuration: 500,
      nodeRepulsion: () => 6500,
      idealEdgeLength: () => 90,
      gravity: 0.25,
      padding: 40
    }).run();
  };

  return (
    <div style={{
      height: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Controls Toolbar */}
      <div style={{
        padding: '12px 24px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={16} color="#06B6D4" />
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#F8FAFC' }}>
              TIGERGRAPH FRAUD NETWORK &bull; {caseRecord.case_id}
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginLeft: '16px',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} /> Customer
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} /> Flagged Txn
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} /> Linked Txns
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#A855F7' }} /> Device Profile
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626' }} /> Prior Closed Fraud (CC-*)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleZoomIn}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: '#F8FAFC',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px'
            }}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={handleZoomOut}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: '#F8FAFC',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px'
            }}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleFit}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: '#F8FAFC',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px'
            }}
            title="Fit to Viewport"
          >
            <Maximize2 size={14} /> <span>Fit</span>
          </button>
          <button
            onClick={handleResetLayout}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: '#06B6D4',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: '600'
            }}
            title="Reorganize graph layout"
          >
            <RefreshCw size={13} /> <span>Reset Layout</span>
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#070A0F' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Bottom Legend / Instructions */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '20px',
          backgroundColor: 'rgba(13, 19, 31, 0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--border-subtle)',
          padding: '8px 14px',
          borderRadius: '6px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none'
        }}>
          <Info size={14} color="#06B6D4" />
          <span>Click any node to inspect deep TigerGraph attributes &bull; Scroll to zoom &bull; Drag to pan</span>
        </div>

        {/* Node Detail Drawer */}
        <NodeDetailDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
      </div>
    </div>
  );
};
