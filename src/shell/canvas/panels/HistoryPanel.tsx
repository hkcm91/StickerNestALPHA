/**
 * History Panel — displays the undo/redo stack.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React from 'react';

import { CanvasEvents } from '@sn/types';

import { useHistoryStore } from '../../../kernel/stores/history/history.store';
import { themeVar } from '../../theme/theme-vars';

const EVENT_LABELS: Record<string, string> = {
  [CanvasEvents.ENTITY_CREATED]: 'Create Entity',
  [CanvasEvents.ENTITY_DELETED]: 'Delete Entity',
  [CanvasEvents.ENTITY_MOVED]: 'Move Entity',
  [CanvasEvents.ENTITY_UPDATED]: 'Update Entity',
  'canvas.entity.group': 'Group Entities',
  'canvas.entity.ungroup': 'Ungroup Entities',
};

function getEntryLabel(type: string): string {
  return EVENT_LABELS[type] || type.split('.').pop()?.replace(/_/g, ' ') || 'Action';
}

export const HistoryPanel: React.FC = () => {
  const undoStack = useHistoryStore((s) => s.undoStack);
  const redoStack = useHistoryStore((s) => s.redoStack);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const clear = useHistoryStore((s) => s.clear);

  const entries = [
    ...undoStack.map((e) => ({ ...e, type: 'undo' as const })),
    ...[...redoStack].reverse().map((e) => ({ ...e, type: 'redo' as const })),
  ];

  return (
    <div
      data-testid="history-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: themeVar('--sn-surface'),
        color: themeVar('--sn-text'),
        fontFamily: themeVar('--sn-font-family'),
        fontSize: '13px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: `1px solid ${themeVar('--sn-border')}`,
          background: themeVar('--sn-surface'),
        }}
      >
        <span className="sn-chrome-text" style={{ fontWeight: 600 }}>History</span>
        <button
          onClick={clear}
          style={{
            border: 'none',
            background: 'transparent',
            color: themeVar('--sn-text-muted'),
            fontSize: '11px',
            cursor: 'pointer',
            padding: '2px 4px',
          }}
        >
          Clear
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
        }}
      >
        {entries.length === 0 ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: themeVar('--sn-text-muted'),
              fontStyle: 'italic',
            }}
          >
            No history yet
          </div>
        ) : (
          entries.map((entry, i) => {
            const isRedo = entry.type === 'redo';
            return (
              <div
                key={`${entry.timestamp}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  opacity: isRedo ? 0.5 : 1,
                  background: !isRedo && i === undoStack.length - 1 ? 'var(--sn-accent-soft, #6366f120)' : 'transparent',
                  borderBottom: `1px solid ${themeVar('--sn-border')}`,
                  cursor: 'default',
                  transition: 'background 0.2s',
                }}
              >
                <span style={{ marginRight: '8px', fontSize: '14px' }}>
                  {isRedo ? '\u21b7' : '\u2713'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: !isRedo && i === undoStack.length - 1 ? 600 : 400 }}>
                    {getEntryLabel(entry.event.type)}
                  </div>
                  <div style={{ fontSize: '10px', color: themeVar('--sn-text-muted') }}>
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px',
          borderTop: `1px solid ${themeVar('--sn-border')}`,
          background: themeVar('--sn-surface'),
        }}
      >
        <button
          onClick={() => undo()}
          disabled={undoStack.length === 0}
          style={{
            flex: 1,
            padding: '6px',
            borderRadius: '4px',
            border: `1px solid ${themeVar('--sn-border')}`,
            background: themeVar('--sn-surface'),
            color: themeVar('--sn-text'),
            cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
            opacity: undoStack.length === 0 ? 0.5 : 1,
            fontSize: '12px',
          }}
        >
          Undo
        </button>
        <button
          onClick={() => redo()}
          disabled={redoStack.length === 0}
          style={{
            flex: 1,
            padding: '6px',
            borderRadius: '4px',
            border: `1px solid ${themeVar('--sn-border')}`,
            background: themeVar('--sn-surface'),
            color: themeVar('--sn-text'),
            cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
            opacity: redoStack.length === 0 ? 0.5 : 1,
            fontSize: '12px',
          }}
        >
          Redo
        </button>
      </div>
    </div>
  );
};
