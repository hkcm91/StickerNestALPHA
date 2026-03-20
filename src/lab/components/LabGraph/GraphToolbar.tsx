/**
 * GraphToolbar — Add node menu, compile, sync toggle for the graph editor.
 *
 * Dual-layer aware: shows scene node types (widget, sticker, docker, etc.)
 * at scene level, and SDK-call types (subscribe, emit, filter, etc.) at
 * widget level.
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import React, { useState } from 'react';

import type { WidgetManifest } from '@sn/types';

import type { WidgetRegistryEntry } from '../../../kernel/stores/widget/widget.store';
import type { NodeType } from '../../graph/graph-compiler';
import type { GraphLevel, SceneNodeType } from '../../graph/scene-types';
import { SCENE_NODE_COLORS } from '../../graph/scene-types';
import { labPalette, SPRING } from '../shared/palette';

import { WidgetLibraryPicker } from './WidgetLibraryPicker';

// ═══════════════════════════════════════════════════════════════════
// Node Type Groups — Widget Level (SDK calls)
// ═══════════════════════════════════════════════════════════════════

interface NodeOption {
  type: string;
  label: string;
  color: string;
}

const WIDGET_NODE_GROUPS: { group: string; items: NodeOption[] }[] = [
  {
    group: 'Events',
    items: [
      { type: 'subscribe', label: 'Subscribe', color: '#4E7B8E' },
      { type: 'emit', label: 'Emit', color: '#E8806C' },
    ],
  },
  {
    group: 'Transforms',
    items: [
      { type: 'filter', label: 'Filter', color: '#B8A0D8' },
      { type: 'map', label: 'Map', color: '#B8A0D8' },
      { type: 'transform', label: 'Transform', color: '#B8A0D8' },
    ],
  },
  {
    group: 'State',
    items: [
      { type: 'setState', label: 'Set State', color: '#B0D0D8' },
      { type: 'getState', label: 'Get State', color: '#B0D0D8' },
    ],
  },
  {
    group: 'Integration',
    items: [
      { type: 'integration.query', label: 'Query', color: '#5AA878' },
      { type: 'integration.mutate', label: 'Mutate', color: '#5AA878' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// Node Type Groups — Scene Level (canvas entities)
// ═══════════════════════════════════════════════════════════════════

const SCENE_NODE_GROUPS: { group: string; items: NodeOption[] }[] = [
  {
    group: 'Entities',
    items: [
      { type: 'widget', label: 'Widget', color: SCENE_NODE_COLORS.widget.accent },
      { type: 'sticker', label: 'Sticker', color: SCENE_NODE_COLORS.sticker.accent },
      { type: 'docker', label: 'Docker', color: SCENE_NODE_COLORS.docker.accent },
      { type: 'group', label: 'Group', color: SCENE_NODE_COLORS.group.accent },
    ],
  },
  {
    group: 'I/O',
    items: [
      { type: 'scene-input', label: 'Scene Input', color: SCENE_NODE_COLORS['scene-input'].accent },
      { type: 'scene-output', label: 'Scene Output', color: SCENE_NODE_COLORS['scene-output'].accent },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface GraphToolbarProps {
  onAddNode: (type: NodeType | SceneNodeType) => void;
  onAddWidgetFromLibrary?: (entry: WidgetRegistryEntry) => void;
  onDescribeWidget?: (manifest: WidgetManifest) => void;
  onCompile: () => void;
  syncMode: boolean;
  onSyncToggle: () => void;
  level: GraphLevel;
}

/** Types that should open the library picker instead of creating a blank node */
const PICKER_TYPES = new Set<string>(['widget', 'sticker']);

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  onAddNode,
  onAddWidgetFromLibrary,
  onDescribeWidget,
  onCompile,
  syncMode,
  onSyncToggle,
  level,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerType, setPickerType] = useState<'widget' | 'sticker' | null>(null);

  const nodeGroups = level === 'scene' ? SCENE_NODE_GROUPS : WIDGET_NODE_GROUPS;
  const isScene = level === 'scene';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 10px',
      background: 'rgba(0,0,0,0.3)',
      backdropFilter: 'blur(12px)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      {/* Level indicator */}
      <div style={{
        fontSize: 9, fontWeight: 600, color: labPalette.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        padding: '0 4px',
        fontFamily: 'var(--sn-font-family)',
      }}>
        {isScene ? 'Scene' : 'Widget'}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />

      {/* Add node */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={isScene ? 'Add scene entity' : 'Add node'}
          aria-expanded={menuOpen}
          style={{
            padding: '5px 12px', fontSize: 11, fontWeight: 500,
            fontFamily: 'var(--sn-font-family)', color: '#fff',
            background: labPalette.storm, border: 'none',
            borderRadius: 6, cursor: 'pointer',
            transition: `all 300ms ${SPRING}`,
          }}
        >
          {isScene ? '+ Add Entity' : '+ Add Node'}
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6,
            minWidth: 180, zIndex: 20,
            background: 'rgba(20,17,24,0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: `sn-unfold 250ms ${SPRING}`,
            overflow: 'hidden',
          }}>
            {nodeGroups.map((group) => (
              <div key={group.group}>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: labPalette.textMuted,
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  padding: '8px 12px 4px',
                }}>
                  {group.group}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => {
                      if (isScene && PICKER_TYPES.has(item.type) && onAddWidgetFromLibrary) {
                        setPickerType(item.type as 'widget' | 'sticker');
                        setMenuOpen(false);
                        return;
                      }
                      onAddNode(item.type as NodeType | SceneNodeType);
                      setMenuOpen(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '6px 12px',
                      background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'left', outline: 'none',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: item.color,
                      boxShadow: `0 0 4px ${item.color}44`,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 11, color: labPalette.textSoft,
                      fontFamily: 'var(--sn-font-family)',
                    }}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Widget/Sticker library picker */}
        {pickerType && onAddWidgetFromLibrary && (
          <WidgetLibraryPicker
            filterType={pickerType}
            onSelect={(entry) => {
              onAddWidgetFromLibrary(entry);
              setPickerType(null);
            }}
            onClose={() => setPickerType(null)}
            onDescribeWidget={onDescribeWidget}
          />
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />

      {/* Compile — context-aware label */}
      <button
        onClick={onCompile}
        aria-label={isScene ? 'Compile scene to pipeline' : 'Compile graph to HTML'}
        style={{
          padding: '5px 12px', fontSize: 11, fontWeight: 500,
          fontFamily: 'var(--sn-font-family)', color: labPalette.textSoft,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 6, cursor: 'pointer',
          transition: `all 300ms ${SPRING}`,
        }}
      >
        {isScene ? 'Build Pipeline' : 'Compile'}
      </button>

      {/* Sync toggle — only at widget level */}
      {!isScene && (
        <button
          onClick={onSyncToggle}
          aria-label={syncMode ? 'Graph synced with editor' : 'Text-only mode'}
          aria-pressed={syncMode}
          style={{
            padding: '5px 10px', fontSize: 10, fontWeight: 500,
            fontFamily: 'var(--sn-font-family)',
            color: syncMode ? labPalette.storm : labPalette.textMuted,
            background: syncMode ? 'rgba(78,123,142,0.08)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${syncMode ? 'rgba(78,123,142,0.15)' : 'rgba(255,255,255,0.04)'}`,
            borderRadius: 6, cursor: 'pointer',
            transition: `all 300ms ${SPRING}`,
          }}
        >
          {syncMode ? 'Synced' : 'Text Only'}
        </button>
      )}
    </div>
  );
};
