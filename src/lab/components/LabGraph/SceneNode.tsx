/**
 * SceneNode — Scene-level node renderer for widget, sticker, docker, group nodes.
 *
 * Each scene node shows:
 * - Frosted glass shell with type-colored header
 * - Input ports (left) and output ports (right) as PortDot handles
 * - Type-specific body content (widget manifest info, sticker preview, docker children)
 * - Double-click on widget nodes to enter internal graph
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import { Position } from '@xyflow/react';
import React, { useState } from 'react';

import type { Port, SceneNodeType } from '../../graph/scene-types';
import { SCENE_NODE_COLORS, SCENE_NODE_LABELS } from '../../graph/scene-types';
import { SPRING } from '../shared/palette';

import { PortDot } from './PortDot';

// ═══════════════════════════════════════════════════════════════════
// Data shape for scene node
// ═══════════════════════════════════════════════════════════════════

export interface SceneNodeData {
  sceneType: SceneNodeType;
  label?: string;
  inputPorts: Port[];
  outputPorts: Port[];
  config: Record<string, unknown>;
  children?: string[];
  widgetId?: string;
  onEnterWidget?: (nodeId: string) => void;
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export const SceneNodeComponent: React.FC<{
  id: string;
  data: SceneNodeData;
  selected?: boolean;
}> = ({ id, data, selected = false }) => {
  const [hovered, setHovered] = useState(false);
  const colors = SCENE_NODE_COLORS[data.sceneType] ?? SCENE_NODE_COLORS.widget;
  const displayLabel = data.label ?? SCENE_NODE_LABELS[data.sceneType] ?? data.sceneType;

  const glowIntensity = selected ? 0.3 : hovered ? 0.15 : 0;
  const canEnter = data.sceneType === 'widget' || data.sceneType === 'docker';

  const handleDoubleClick = () => {
    if (canEnter && data.onEnterWidget) {
      data.onEnterWidget(id);
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={handleDoubleClick}
      style={{
        minWidth: 180,
        position: 'relative',
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
        cursor: canEnter ? 'pointer' : 'grab',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '6px 12px',
        background: `rgba(${colors.rgb},0.08)`,
        borderBottom: `1px solid rgba(${colors.rgb},0.1)`,
        display: 'flex', alignItems: 'center', gap: 8,
        borderRadius: '12px 12px 0 0',
      }}>
        {/* Type icon */}
        <SceneTypeIcon type={data.sceneType} color={colors.accent} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: colors.accent,
          fontFamily: 'var(--sn-font-family)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {displayLabel}
        </span>
        {canEnter && (
          <span style={{
            fontSize: 8, color: 'rgba(255,255,255,0.25)',
            fontFamily: 'var(--sn-font-family)',
          }}>
            {'\u25B6'}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '8px 12px', minHeight: 32 }}>
        <SceneNodeBody data={data} />
      </div>

      {/* Input ports (left side) */}
      {data.inputPorts.map((port, i) => (
        <PortDot
          key={port.id}
          portId={port.id}
          type="target"
          position={Position.Left}
          label={port.name}
          color={colors.accent}
          index={i}
          total={data.inputPorts.length}
        />
      ))}

      {/* Output ports (right side) */}
      {data.outputPorts.map((port, i) => (
        <PortDot
          key={port.id}
          portId={port.id}
          type="source"
          position={Position.Right}
          label={port.name}
          color={colors.accent}
          index={i}
          total={data.outputPorts.length}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Type Icon
// ═══════════════════════════════════════════════════════════════════

const SceneTypeIcon: React.FC<{ type: SceneNodeType; color: string }> = ({ type, color }) => {
  const size = 10;
  const iconMap: Record<SceneNodeType, string> = {
    widget: '\u25A3',      // filled square with inner square
    sticker: '\u2B50',     // star (will render as text)
    docker: '\u25A1',      // empty square (container)
    group: '\u25CB',       // circle (group)
    'scene-input': '\u25B6',  // right triangle (input)
    'scene-output': '\u25C0', // left triangle (output)
  };

  return (
    <div style={{
      width: size + 4, height: size + 4,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size, color, lineHeight: 1, flexShrink: 0,
    }}>
      {iconMap[type] ?? '\u25C6'}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Node Body (type-specific content)
// ═══════════════════════════════════════════════════════════════════

const SceneNodeBody: React.FC<{ data: SceneNodeData }> = ({ data }) => {
  const monoStyle: React.CSSProperties = {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  switch (data.sceneType) {
    case 'widget':
      return (
        <div>
          {data.widgetId && (
            <div style={monoStyle}>{data.widgetId}</div>
          )}
          <div style={{ ...monoStyle, marginTop: 2 }}>
            {data.inputPorts.length} in / {data.outputPorts.length} out
          </div>
        </div>
      );

    case 'sticker':
      return (
        <div>
          {data.config.assetType && (
            <div style={monoStyle}>{String(data.config.assetType)}</div>
          )}
          {data.config.clickAction && (
            <div style={monoStyle}>
              action: {String((data.config.clickAction as Record<string, unknown>)?.type ?? 'none')}
            </div>
          )}
        </div>
      );

    case 'docker':
      return (
        <div>
          <div style={monoStyle}>
            {data.children?.length ?? 0} children
          </div>
          {data.config.layout && (
            <div style={monoStyle}>layout: {String(data.config.layout)}</div>
          )}
        </div>
      );

    case 'group':
      return (
        <div style={monoStyle}>
          {data.children?.length ?? 0} items
        </div>
      );

    case 'scene-input':
    case 'scene-output':
      return (
        <div style={monoStyle}>
          {data.outputPorts.length + data.inputPorts.length} channels
        </div>
      );

    default:
      return null;
  }
};
