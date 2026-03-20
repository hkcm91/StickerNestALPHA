/**
 * CardNode -- Card-style graph node with mini card showing icon, name,
 * and color-coded category (Storm, Ember, Opal, Violet, Moss).
 *
 * Designed as a richer visual alternative to NodeShell for the Graph
 * Visual Overhaul (Phase 2). Uses glassmorphism consistent with GlassPanel.
 *
 * Works with @xyflow/react -- registered as a custom node type.
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import { Position } from '@xyflow/react';
import React, { useState } from 'react';

import type { NodeType } from '../../graph/graph-compiler';
import type { SceneNodeType } from '../../graph/scene-types';
import { SPRING, hexToRgb } from '../shared/palette';

import { PortDot } from './PortDot';

// ======================================================================
// Category Color Map
// ======================================================================

export type CardCategory = 'storm' | 'ember' | 'opal' | 'violet' | 'moss';

const CATEGORY_HEX: Record<CardCategory, string> = {
  storm:  '#4E7B8E',
  ember:  '#E8806C',
  opal:   '#B0D0D8',
  violet: '#B8A0D8',
  moss:   '#5AA878',
};

/** Map widget-level node types to categories */
const NODE_TYPE_CATEGORY: Record<NodeType, CardCategory> = {
  subscribe:            'storm',
  emit:                 'ember',
  transform:            'violet',
  filter:               'violet',
  map:                  'violet',
  setState:             'opal',
  getState:             'opal',
  'integration.query':  'moss',
  'integration.mutate': 'moss',
};

/** Map scene-level node types to categories */
const SCENE_TYPE_CATEGORY: Record<SceneNodeType, CardCategory> = {
  widget:         'storm',
  sticker:        'ember',
  docker:         'opal',
  group:          'violet',
  'scene-input':  'moss',
  'scene-output': 'moss',
};

/** Icon map for widget-level node types */
const NODE_TYPE_ICONS: Record<NodeType, string> = {
  subscribe:            '\u25BC', // down triangle (receiving)
  emit:                 '\u25B2', // up triangle (sending)
  transform:            '\u2B21', // hexagon
  filter:               '\u25C7', // diamond outline
  map:                  '\u21C4', // arrows left-right
  setState:             '\u25A0', // filled square
  getState:             '\u25A1', // empty square
  'integration.query':  '\u2193', // down arrow
  'integration.mutate': '\u2191', // up arrow
};

/** Icon map for scene-level node types */
const SCENE_TYPE_ICONS: Record<SceneNodeType, string> = {
  widget:         '\u25A3', // filled square with inner
  sticker:        '\u2606', // star outline
  docker:         '\u25A1', // empty square
  group:          '\u25CB', // circle
  'scene-input':  '\u25B6', // right triangle
  'scene-output': '\u25C0', // left triangle
};

/** Node type display labels */
const NODE_TYPE_LABELS: Record<NodeType, string> = {
  subscribe:            'Subscribe',
  emit:                 'Emit',
  transform:            'Transform',
  filter:               'Filter',
  map:                  'Map',
  setState:             'Set State',
  getState:             'Get State',
  'integration.query':  'Query',
  'integration.mutate': 'Mutate',
};

const SCENE_TYPE_LABELS: Record<SceneNodeType, string> = {
  widget:         'Widget',
  sticker:        'Sticker',
  docker:         'Docker',
  group:          'Group',
  'scene-input':  'Input',
  'scene-output': 'Output',
};

// ======================================================================
// Port Derivation (mirrors LabGraph.tsx getWidgetNodePorts)
// ======================================================================

function getWidgetNodePorts(type: NodeType): {
  inputs: Array<{ id: string; name: string; color: string }>;
  outputs: Array<{ id: string; name: string; color: string }>;
} {
  const c = CATEGORY_HEX[NODE_TYPE_CATEGORY[type]];
  switch (type) {
    case 'subscribe':
      return { inputs: [], outputs: [{ id: 'out', name: 'data', color: c }] };
    case 'emit':
      return { inputs: [{ id: 'in', name: 'data', color: c }], outputs: [] };
    case 'filter':
      return {
        inputs: [{ id: 'in', name: 'in', color: c }],
        outputs: [{ id: 'out', name: 'pass', color: c }],
      };
    case 'map':
    case 'transform':
      return {
        inputs: [{ id: 'in', name: 'in', color: c }],
        outputs: [{ id: 'out', name: 'out', color: c }],
      };
    case 'setState':
      return { inputs: [{ id: 'in', name: 'value', color: c }], outputs: [] };
    case 'getState':
      return { inputs: [], outputs: [{ id: 'out', name: 'value', color: c }] };
    case 'integration.query':
      return { inputs: [], outputs: [{ id: 'out', name: 'result', color: c }] };
    case 'integration.mutate':
      return { inputs: [{ id: 'in', name: 'data', color: c }], outputs: [] };
    default:
      return { inputs: [], outputs: [] };
  }
}

// ======================================================================
// CardNode Props
// ======================================================================

export interface CardNodeData {
  /** Widget-level node type (if widget-level graph) */
  nodeType?: NodeType;
  /** Scene-level node type (if scene-level graph) */
  sceneType?: SceneNodeType;
  /** Override label */
  label?: string;
  /** Node config (event type, key, etc.) */
  config?: Record<string, unknown>;
  /** Input ports for scene nodes */
  inputPorts?: Array<{ id: string; name: string; direction: string; eventType?: string }>;
  /** Output ports for scene nodes */
  outputPorts?: Array<{ id: string; name: string; direction: string; eventType?: string }>;
  /** Callback for entering widget internals (scene-level) */
  onEnterWidget?: (nodeId: string) => void;
  /** Index signature for xyflow compatibility */
  [key: string]: unknown;
}

export interface CardNodeProps {
  id: string;
  data: CardNodeData;
  selected?: boolean;
}

// ======================================================================
// Component
// ======================================================================

export const CardNode: React.FC<CardNodeProps> = ({ id, data, selected = false }) => {
  const [hovered, setHovered] = useState(false);

  // Determine category, label, icon
  const isScene = data.sceneType != null;
  const category: CardCategory = isScene
    ? SCENE_TYPE_CATEGORY[data.sceneType!] ?? 'storm'
    : NODE_TYPE_CATEGORY[data.nodeType!] ?? 'storm';

  const hex = CATEGORY_HEX[category];
  const [r, g, b] = hexToRgb(hex);

  const displayLabel = data.label
    ?? (isScene ? SCENE_TYPE_LABELS[data.sceneType!] : NODE_TYPE_LABELS[data.nodeType!])
    ?? 'Node';

  const icon = isScene
    ? SCENE_TYPE_ICONS[data.sceneType!] ?? '\u25C6'
    : NODE_TYPE_ICONS[data.nodeType!] ?? '\u25C6';

  const canEnter = isScene && (data.sceneType === 'widget' || data.sceneType === 'docker');
  const glowIntensity = selected ? 0.35 : hovered ? 0.18 : 0;

  // Ports
  const scenePorts = isScene
    ? {
        inputs: (data.inputPorts ?? []).map((p) => ({ id: p.id, name: p.name, color: hex })),
        outputs: (data.outputPorts ?? []).map((p) => ({ id: p.id, name: p.name, color: hex })),
      }
    : null;
  const widgetPorts = !isScene && data.nodeType ? getWidgetNodePorts(data.nodeType) : null;
  const ports = scenePorts ?? widgetPorts ?? { inputs: [], outputs: [] };

  // Subtitle text
  const subtitle = (() => {
    if (data.config?.eventType != null) return String(data.config.eventType);
    if (data.config?.key != null) return `key: ${String(data.config.key)}`;
    if (data.config?.name != null) return String(data.config.name);
    if (isScene) return `${ports.inputs.length} in / ${ports.outputs.length} out`;
    return null;
  })();

  return (
    <div
      data-testid={`card-node-${id}`}
      data-category={category}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={() => {
        if (canEnter && data.onEnterWidget) data.onEnterWidget(id);
      }}
      style={{
        minWidth: 170,
        position: 'relative',
        borderRadius: 14,
        // Glassmorphism consistent with GlassPanel
        background: `
          linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%),
          rgba(20,17,24,0.78)
        `,
        backdropFilter: 'blur(20px) saturate(1.35)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.35)',
        border: `1px solid rgba(${r},${g},${b},${selected ? 0.4 : hovered ? 0.2 : 0.07})`,
        boxShadow: [
          // Bioluminescent glow layers (matching GlassPanel)
          `0 0 ${Math.round(2 + glowIntensity * 6)}px rgba(${r},${g},${b},${(glowIntensity * 0.2).toFixed(2)})`,
          `0 0 ${Math.round(6 + glowIntensity * 12)}px rgba(${r},${g},${b},${(glowIntensity * 0.1).toFixed(2)})`,
          `0 0 ${Math.round(12 + glowIntensity * 20)}px rgba(${r},${g},${b},${(glowIntensity * 0.04).toFixed(2)})`,
          // Structural shadows
          '0 2px 8px rgba(0,0,0,0.25)',
          '0 8px 24px rgba(0,0,0,0.1)',
          // Inset highlight
          `inset 0 1px 0 rgba(255,255,255,${selected ? 0.06 : 0.03})`,
        ].join(', '),
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: `all 400ms ${SPRING}`,
        cursor: canEnter ? 'pointer' : 'grab',
        overflow: 'hidden',
      }}
    >
      {/* ---- Header with icon and name ---- */}
      <div
        data-testid={`card-node-header-${id}`}
        style={{
          padding: '8px 12px',
          background: `rgba(${r},${g},${b},0.08)`,
          borderBottom: `1px solid rgba(${r},${g},${b},0.1)`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: '14px 14px 0 0',
        }}
      >
        {/* Category icon */}
        <div
          data-testid={`card-node-icon-${id}`}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: `rgba(${r},${g},${b},0.15)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: hex,
            flexShrink: 0,
            boxShadow: `0 0 6px rgba(${r},${g},${b},0.12)`,
          }}
        >
          {icon}
        </div>

        {/* Name */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: hex,
            fontFamily: 'var(--sn-font-family)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {displayLabel}
        </span>

        {/* Enter indicator for widget/docker */}
        {canEnter && (
          <span
            style={{
              fontSize: 8,
              color: `rgba(${r},${g},${b},0.4)`,
              fontFamily: 'var(--sn-font-family)',
            }}
          >
            {'\u25B6'}
          </span>
        )}
      </div>

      {/* ---- Body ---- */}
      <div style={{ padding: '6px 12px 8px', minHeight: 20 }}>
        {subtitle && (
          <div
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.35)',
              fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* ---- Input ports (left) ---- */}
      {ports.inputs.map((port, i) => (
        <PortDot
          key={port.id}
          portId={port.id}
          type="target"
          position={Position.Left}
          label={port.name}
          color={port.color}
          index={i}
          total={ports.inputs.length}
        />
      ))}

      {/* ---- Output ports (right) ---- */}
      {ports.outputs.map((port, i) => (
        <PortDot
          key={port.id}
          portId={port.id}
          type="source"
          position={Position.Right}
          label={port.name}
          color={port.color}
          index={i}
          total={ports.outputs.length}
        />
      ))}
    </div>
  );
};

// ======================================================================
// Exports for external consumption
// ======================================================================

export { CATEGORY_HEX, NODE_TYPE_CATEGORY, SCENE_TYPE_CATEGORY };
