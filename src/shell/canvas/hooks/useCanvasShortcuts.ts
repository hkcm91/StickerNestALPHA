/**
 * useCanvasShortcuts — production keyboard shortcut handler for canvas.
 *
 * Attach via `onKeyDown` on a container with `tabIndex={0}`.
 * Handles entity manipulation, z-order, tool switching, and
 * group/duplicate/crop shortcuts.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import { useCallback } from 'react';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import type { SceneGraph } from '../../../canvas/core';
import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import type { CanvasToolId } from './useActiveTool';
import type { ViewportStore } from './useViewport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CanvasShortcutDeps {
  /** Scene graph reference for entity lookups */
  sceneGraph: SceneGraph | null;
  /** Currently selected entity IDs */
  selectedIds: Set<string>;
  /** Whether the canvas is in edit mode */
  isEditMode: boolean;
  /** Replace the full selection set */
  selectIds: (ids: Set<string>) => void;
  /** Clear the selection */
  clearSelection: () => void;
  /** Set the active tool */
  setTool: (tool: CanvasToolId) => void;
  /** Viewport store for zoom shortcuts */
  viewportStore?: ViewportStore;
  /** Last known cursor position in screen-space (relative to canvas container) */
  lastCursorScreen?: React.RefObject<{ x: number; y: number } | null>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IGNORED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const NUDGE_SMALL = 10;
const NUDGE_LARGE = 50;
const ZOOM_FACTOR = 1.25;

/** Single-key tool switching map */
const TOOL_KEYS: Record<string, CanvasToolId> = {
  v: 'select',
  h: 'pan',  // hand/pan tool
  m: 'pathfinder',
  t: 'text',
  r: 'rect',
  p: 'pen',
  e: 'ellipse',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEditable(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (IGNORED_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Production canvas keyboard shortcut hook.
 *
 * Returns an `onKeyDown` handler to attach to the workspace container.
 * All mutations go through the event bus — no direct scene graph writes.
 */
export function useCanvasShortcuts(deps: CanvasShortcutDeps) {
  const {
    sceneGraph,
    selectedIds,
    isEditMode,
    selectIds,
    clearSelection,
    setTool,
    viewportStore,
    lastCursorScreen,
  } = deps;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isEditMode) return;
      if (isEditable(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const key = e.key;
      const hasSelection = selectedIds.size > 0;

      // ----- Delete / Backspace — remove selected entities -----
      if ((key === 'Delete' || key === 'Backspace') && !mod && !shift && hasSelection) {
        e.preventDefault();
        for (const id of selectedIds) {
          bus.emit(CanvasEvents.ENTITY_DELETED, { id });
        }
        clearSelection();
        return;
      }

      // ----- Escape — deselect all + reset tool to select -----
      if (key === 'Escape' && !mod && !shift) {
        e.preventDefault();
        clearSelection();
        setTool('select');
        return;
      }

      // ----- Ctrl+A — select all -----
      if (key === 'a' && mod && !shift) {
        e.preventDefault();
        if (sceneGraph) {
          const allIds = new Set(sceneGraph.getAllEntities().map((ent) => ent.id));
          selectIds(allIds);
        }
        return;
      }

      // ----- Arrow keys — nudge selected entities -----
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key) && !mod && hasSelection) {
        e.preventDefault();
        const amount = shift ? NUDGE_LARGE : NUDGE_SMALL;
        let dx = 0;
        let dy = 0;
        switch (key) {
          case 'ArrowUp': dy = -amount; break;
          case 'ArrowDown': dy = amount; break;
          case 'ArrowLeft': dx = -amount; break;
          case 'ArrowRight': dx = amount; break;
        }
        if (!sceneGraph) return;
        for (const id of selectedIds) {
          const entity = sceneGraph.getEntity(id);
          if (!entity) continue;
          bus.emit(CanvasEvents.ENTITY_UPDATED, {
            id,
            updates: {
              transform: {
                ...entity.transform,
                position: {
                  x: entity.transform.position.x + dx,
                  y: entity.transform.position.y + dy,
                },
              },
            },
          });
        }
        return;
      }

      // ----- Ctrl+] — bring forward -----
      if (key === ']' && mod && !shift && hasSelection) {
        e.preventDefault();
        for (const id of selectedIds) {
          sceneGraph?.bringForward(id);
        }
        return;
      }

      // ----- Ctrl+[ — send backward -----
      if (key === '[' && mod && !shift && hasSelection) {
        e.preventDefault();
        for (const id of selectedIds) {
          sceneGraph?.sendBackward(id);
        }
        return;
      }

      // ----- Ctrl+Shift+] — bring to front -----
      if (key === ']' && mod && shift && hasSelection) {
        e.preventDefault();
        for (const id of selectedIds) {
          sceneGraph?.bringToFront(id);
        }
        return;
      }

      // ----- Ctrl+Shift+[ — send to back -----
      if (key === '[' && mod && shift && hasSelection) {
        e.preventDefault();
        for (const id of selectedIds) {
          sceneGraph?.sendToBack(id);
        }
        return;
      }

      // ----- Ctrl+D — duplicate selected entities -----
      if (key === 'd' && mod && !shift && hasSelection) {
        e.preventDefault();
        if (!sceneGraph) return;
        const newIds = new Set<string>();
        for (const id of selectedIds) {
          const entity = sceneGraph.getEntity(id);
          if (!entity) continue;
          const newId = crypto.randomUUID();
          const duplicated: CanvasEntity = {
            ...entity,
            id: newId,
            name: entity.name ? `${entity.name} copy` : undefined,
            transform: {
              ...entity.transform,
              position: {
                x: entity.transform.position.x + 20,
                y: entity.transform.position.y + 20,
              },
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          bus.emit(CanvasEvents.ENTITY_CREATED, duplicated);
          newIds.add(newId);
        }
        // Select the duplicates
        selectIds(newIds);
        return;
      }

      // ----- Ctrl+G — group selected entities (2+) -----
      if (key === 'g' && mod && !shift && selectedIds.size >= 2) {
        e.preventDefault();
        bus.emit('canvas.entity.group', { entityIds: Array.from(selectedIds) });
        return;
      }

      // ----- Ctrl+Shift+G — ungroup selected group -----
      if (key === 'g' && mod && shift && hasSelection) {
        e.preventDefault();
        bus.emit('canvas.entity.ungroup', { entityIds: Array.from(selectedIds) });
        return;
      }

      // ----- C — enter/exit crop mode -----
      if (key === 'c' && !mod && !shift && hasSelection) {
        e.preventDefault();
        bus.emit('canvas.crop.toggle', { entityIds: Array.from(selectedIds) });
        return;
      }

      // ----- Ctrl+= / Ctrl++ — zoom in at cursor (or viewport center) -----
      if ((key === '=' || key === '+') && mod && !shift && viewportStore) {
        e.preventDefault();
        const vp = viewportStore.getState();
        const newZoom = vp.zoom * ZOOM_FACTOR;
        const anchor = lastCursorScreen?.current
          ?? { x: vp.viewportWidth / 2, y: vp.viewportHeight / 2 };
        viewportStore.zoom(newZoom, anchor);
        return;
      }

      // ----- Ctrl+- — zoom out at cursor (or viewport center) -----
      if (key === '-' && mod && !shift && viewportStore) {
        e.preventDefault();
        const vp = viewportStore.getState();
        const newZoom = vp.zoom / ZOOM_FACTOR;
        const anchor = lastCursorScreen?.current
          ?? { x: vp.viewportWidth / 2, y: vp.viewportHeight / 2 };
        viewportStore.zoom(newZoom, anchor);
        return;
      }

      // ----- Ctrl+0 — reset zoom to 100% -----
      if (key === '0' && mod && !shift && viewportStore) {
        e.preventDefault();
        viewportStore.reset();
        return;
      }

      // ----- F — enter focus mode on selected entities -----
      if (key === 'f' && !mod && !shift && hasSelection) {
        e.preventDefault();
        const focusMode = useUIStore.getState().focusMode;
        if (!focusMode?.active) {
          useUIStore.getState().enterFocusMode(Array.from(selectedIds));
        }
        return;
      }

      // ----- Single-key tool switching (V, H, T, R, P, E) -----
      const toolKey = TOOL_KEYS[key.toLowerCase()];
      if (toolKey && !mod && !shift && !hasSelection) {
        e.preventDefault();
        setTool(toolKey);
        return;
      }
    },
    [isEditMode, selectedIds, sceneGraph, selectIds, clearSelection, setTool, viewportStore, lastCursorScreen],
  );

  return { onKeyDown };
}
