/**
 * NodeShell — Shared frosted glass wrapper for graph nodes.
 *
 * Each node type renders inside this shell. The shell provides:
 * - Frosted glass background with proximity glow
 * - Color-coded header accent by node type
 * - Hover: lift -2px + glow intensification
 * - Selected: brighter glow + storm border
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import React, { useState } from 'react';

import type { NodeType } from '../../graph/graph-compiler';
import { SPRING } from '../shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Color Map
// ═══════════════════════════════════════════════════════════════════

const NODE_COLORS: Record<NodeType, { accent: string; rgb: string }> = {
  subscribe:           { accent: '#4E7B8E', rgb: '78,123,142' },   // Storm
  emit:                { accent: '#E8806C', rgb: '232,128,108' },   // Ember
  transform:           { accent: '#B8A0D8', rgb: '184,160,216' },   // Violet
  filter:              { accent: '#B8A0D8', rgb: '184,160,216' },   // Violet
  map:                 { accent: '#B8A0D8', rgb: '184,160,216' },   // Violet
  setState:            { accent: '#B0D0D8', rgb: '176,208,216' },   // Opal
  getState:            { accent: '#B0D0D8', rgb: '176,208,216' },   // Opal
  'integration.query': { accent: '#5AA878', rgb: '90,168,120' },    // Moss
  'integration.mutate':{ accent: '#5AA878', rgb: '90,168,120' },    // Moss
};

const NODE_LABELS: Record<NodeType, string> = {
  subscribe: 'Subscribe',
  emit: 'Emit',
  transform: 'Transform',
  filter: 'Filter',
  map: 'Map',
  setState: 'Set State',
  getState: 'Get State',
  'integration.query': 'Query',
  'integration.mutate': 'Mutate',
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface NodeShellProps {
  nodeType: NodeType;
  label?: string;
  selected?: boolean;
  children?: React.ReactNode;
}

export const NodeShell: React.FC<NodeShellProps> = ({
  nodeType,
  label,
  selected = false,
  children,
}) => {
  const [hovered, setHovered] = useState(false);
  const colors = NODE_COLORS[nodeType] ?? NODE_COLORS.subscribe;
  const displayLabel = label ?? NODE_LABELS[nodeType] ?? nodeType;

  const glowIntensity = selected ? 0.3 : hovered ? 0.15 : 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minWidth: 160,
        borderRadius: 12,
        background: `
          linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%),
          rgba(20,17,24,0.85)
        `,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid rgba(${colors.rgb},${selected ? 0.4 : hovered ? 0.2 : 0.08})`,
        boxShadow: [
          `0 0 ${Math.round(4 + glowIntensity * 12)}px rgba(${colors.rgb},${glowIntensity.toFixed(2)})`,
          `0 0 ${Math.round(8 + glowIntensity * 20)}px rgba(${colors.rgb},${(glowIntensity * 0.5).toFixed(2)})`,
          '0 2px 8px rgba(0,0,0,0.3)',
          `inset 0 1px 0 rgba(255,255,255,${selected ? 0.06 : 0.03})`,
        ].join(', '),
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: `all 400ms ${SPRING}`,
        overflow: 'hidden',
        cursor: 'grab',
      }}
    >
      {/* Header accent */}
      <div style={{
        padding: '6px 12px',
        background: `rgba(${colors.rgb},0.08)`,
        borderBottom: `1px solid rgba(${colors.rgb},0.1)`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {/* Type dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: colors.accent,
          boxShadow: `0 0 6px ${colors.accent}44`,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: colors.accent,
          fontFamily: 'var(--sn-font-family)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {displayLabel}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 12px' }}>
        {children}
      </div>
    </div>
  );
};
