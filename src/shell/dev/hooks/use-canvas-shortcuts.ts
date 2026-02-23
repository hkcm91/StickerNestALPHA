/**
 * useCanvasShortcuts — panel-scoped keyboard shortcut handler
 *
 * Attach onKeyDown to a container with tabIndex={0} for
 * panel-local shortcuts that don't conflict with global shortcuts.
 *
 * @module shell/dev/hooks
 * @layer L6
 */

import { useCallback } from 'react';

const IGNORED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditable(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (IGNORED_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return false;
}

export interface CanvasShortcutActions {
  /** Remove the selected entity */
  onDelete?: () => void;
  /** Deselect all entities */
  onDeselect?: () => void;
  /** Select all entities */
  onSelectAll?: () => void;
  /** Nudge selected entity by delta */
  onNudge?: (dx: number, dy: number) => void;
  /** Bring selected entity one step forward in z-order */
  onBringForward?: () => void;
  /** Send selected entity one step backward in z-order */
  onSendBackward?: () => void;
  /** Bring selected entity to front */
  onBringToFront?: () => void;
  /** Send selected entity to back */
  onSendToBack?: () => void;
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
  /** Whether anything is currently selected */
  hasSelection?: boolean;
}

export interface CanvasShortcutsResult {
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const NUDGE_SMALL = 10;
const NUDGE_LARGE = 50;

export function useCanvasShortcuts(actions: CanvasShortcutActions): CanvasShortcutsResult {
  const {
    onDelete,
    onDeselect,
    onSelectAll,
    onNudge,
    onBringForward,
    onSendBackward,
    onBringToFront,
    onSendToBack,
    enabled = true,
    hasSelection = false,
  } = actions;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;
      if (isEditable(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const key = e.key;

      // Delete / Backspace — remove selected
      if ((key === 'Delete' || key === 'Backspace') && !mod && !shift && hasSelection) {
        e.preventDefault();
        onDelete?.();
        return;
      }

      // Escape — deselect
      if (key === 'Escape' && !mod && !shift) {
        e.preventDefault();
        onDeselect?.();
        return;
      }

      // Ctrl+A — select all
      if (key === 'a' && mod && !shift) {
        e.preventDefault();
        onSelectAll?.();
        return;
      }

      // Arrow keys — nudge
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key) && !mod && hasSelection) {
        e.preventDefault();
        const amount = shift ? NUDGE_LARGE : NUDGE_SMALL;
        switch (key) {
          case 'ArrowUp':    onNudge?.(0, -amount); break;
          case 'ArrowDown':  onNudge?.(0, amount); break;
          case 'ArrowLeft':  onNudge?.(-amount, 0); break;
          case 'ArrowRight': onNudge?.(amount, 0); break;
        }
        return;
      }

      // Ctrl+] — bring forward
      if (key === ']' && mod && !shift && hasSelection) {
        e.preventDefault();
        onBringForward?.();
        return;
      }

      // Ctrl+[ — send backward
      if (key === '[' && mod && !shift && hasSelection) {
        e.preventDefault();
        onSendBackward?.();
        return;
      }

      // Ctrl+Shift+] — bring to front
      if (key === ']' && mod && shift && hasSelection) {
        e.preventDefault();
        onBringToFront?.();
        return;
      }

      // Ctrl+Shift+[ — send to back
      if (key === '[' && mod && shift && hasSelection) {
        e.preventDefault();
        onSendToBack?.();
        return;
      }
    },
    [enabled, hasSelection, onDelete, onDeselect, onSelectAll, onNudge, onBringForward, onSendBackward, onBringToFront, onSendToBack],
  );

  return { onKeyDown };
}
