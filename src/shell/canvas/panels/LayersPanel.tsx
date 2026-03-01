/**
 * Layers Panel — z-order entity list, visibility toggles, lock toggles, rename.
 * Wraps the headless LayersController from L4A-4.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useMemo, useState } from 'react';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { useSelection } from '../hooks';

export interface LayersPanelProps {
  /** All current entities (from scene graph) */
  entities: CanvasEntity[];
}

interface LayerEntry {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

function entriesToLayers(entities: CanvasEntity[]): LayerEntry[] {
  return [...entities]
    .sort((a, b) => b.zIndex - a.zIndex)
    .map((e) => ({
      id: e.id,
      name: e.name ?? `${e.type}-${(e.id || 'unknown').slice(0, 8)}`,
      type: e.type,
      visible: e.visible,
      locked: e.locked,
      zIndex: e.zIndex,
    }));
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  sticker: 'STK',
  lottie: 'LOT',
  text: 'TXT',
  widget: 'WGT',
  shape: 'SHP',
  drawing: 'DRW',
  group: 'GRP',
  docker: 'DCK',
  audio: 'AUD',
  svg: 'SVG',
};

/**
 * Layers Panel — lists entities sorted by z-order with controls.
 * Hidden in preview mode.
 */
const EyeIcon = ({ visible }: { visible: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {visible ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const LockIcon = ({ locked }: { locked: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    {locked ? (
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    ) : (
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    )}
  </svg>
);

export const LayersPanel: React.FC<LayersPanelProps> = ({ entities }) => {
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const { selectedIds, select } = useSelection();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const layers = useMemo(() => entriesToLayers(entities), [entities]);

  const handleSelect = useCallback(
    (id: string) => {
      select(new Set([id]));
      bus.emit(CanvasEvents.ENTITY_SELECTED, { id });
    },
    [select],
  );

  const handleToggleVisibility = useCallback((id: string, currentlyVisible: boolean) => {
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id,
      updates: { visible: !currentlyVisible },
    });
  }, []);

  const handleToggleLock = useCallback((id: string, currentlyLocked: boolean) => {
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id,
      updates: { locked: !currentlyLocked },
    });
  }, []);

  const handleStartRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  }, []);

  const handleFinishRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        id: renamingId,
        updates: { name: renameValue.trim() },
      });
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renamingId, renameValue]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleFinishRename();
      } else if (e.key === 'Escape') {
        setRenamingId(null);
        setRenameValue('');
      }
    },
    [handleFinishRename],
  );

  // Hidden in preview mode
  if (mode !== 'edit') return null;

  return (
    <div
      data-testid="layers-panel"
      style={{
        fontFamily: 'var(--sn-font-family, system-ui)',
        fontSize: '13px',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          fontWeight: 600,
          fontSize: '12px',
          color: 'var(--sn-text-muted, #6b7280)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          borderBottom: '1px solid var(--sn-border, #e0e0e0)',
        }}
      >
        Layers ({layers.length})
      </div>

      {/* Layer rows */}
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {layers.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--sn-text-muted, #6b7280)',
              fontSize: '12px',
            }}
          >
            No entities on canvas
          </div>
        ) : (
          layers.map((layer) => {
            const isSelected = selectedIds.has(layer.id);
            const isRenaming = renamingId === layer.id;

            return (
              <div
                key={layer.id}
                data-testid={`layer-row-${layer.id}`}
                onClick={() => handleSelect(layer.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  background: isSelected
                    ? 'var(--sn-accent, #6366f1)15'
                    : 'transparent',
                  borderLeft: isSelected
                    ? '2px solid var(--sn-accent, #6366f1)'
                    : '2px solid transparent',
                  opacity: layer.visible ? 1 : 0.5,
                }}
              >
                {/* Type badge */}
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--sn-text-muted, #6b7280)',
                    background: 'var(--sn-bg, #f8f9fa)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    minWidth: '28px',
                    textAlign: 'center',
                  }}
                >
                  {ENTITY_TYPE_LABELS[layer.type] ?? (layer.type || '???').slice(0, 3).toUpperCase()}
                </span>

                {/* Name (or rename input) */}
                {isRenaming ? (
                  <input
                    data-testid={`layer-rename-${layer.id}`}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={handleRenameKeyDown}
                    autoFocus
                    style={{
                      flex: 1,
                      fontSize: '12px',
                      padding: '1px 4px',
                      border: '1px solid var(--sn-accent, #6366f1)',
                      borderRadius: '3px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(layer.id, layer.name);
                    }}
                    style={{
                      flex: 1,
                      fontSize: '12px',
                      color: 'var(--sn-text, #1a1a2e)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {layer.name}
                  </span>
                )}

                {/* Visibility toggle */}
                <button
                  data-testid={`layer-visibility-${layer.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleVisibility(layer.id, layer.visible);
                  }}
                  title={layer.visible ? 'Hide' : 'Show'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0 2px',
                    opacity: layer.visible ? 1 : 0.4,
                  }}
                >
                  <EyeIcon visible={layer.visible} />
                </button>

                {/* Lock toggle */}
                <button
                  data-testid={`layer-lock-${layer.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLock(layer.id, layer.locked);
                  }}
                  title={layer.locked ? 'Unlock' : 'Lock'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '0 2px',
                  }}
                >
                  <LockIcon locked={layer.locked} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
