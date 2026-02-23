/**
 * CanvasContextMenu — touch-friendly context menu
 *
 * Triggered by right-click (mouse) or long-press (500ms touch).
 * Provides entity actions: Delete, Bring to Front, Send to Back.
 *
 * @module shell/dev/components
 * @layer L6
 */

import React, { useEffect, useRef, useCallback } from 'react';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

export interface CanvasContextMenuProps {
  /** Menu position in viewport pixels */
  x: number;
  y: number;
  /** Items to display */
  items: ContextMenuItem[];
  /** Called when the menu should close */
  onClose: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Clamp position to viewport bounds
  const clampedPos = useRef({ x, y });
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = x + rect.width > vw ? vw - rect.width - 8 : x;
    const cy = y + rect.height > vh ? vh - rect.height - 8 : y;
    clampedPos.current = { x: Math.max(8, cx), y: Math.max(8, cy) };
    el.style.left = `${clampedPos.current.x}px`;
    el.style.top = `${clampedPos.current.y}px`;
  }, [x, y]);

  // Close on click outside, Escape, or scroll
  const handleClose = useCallback(
    (e: MouseEvent | TouchEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') onClose();
        return;
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClose, true);
    document.addEventListener('touchstart', handleClose, true);
    document.addEventListener('keydown', handleClose, true);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', handleClose, true);
      document.removeEventListener('touchstart', handleClose, true);
      document.removeEventListener('keydown', handleClose, true);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [handleClose, onClose]);

  if (items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 10000,
        background: 'var(--sn-surface, #1f2937)',
        border: '1px solid var(--sn-border, #374151)',
        borderRadius: 'var(--sn-radius, 6px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: 140,
        padding: '4px 0',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            if (!item.disabled) {
              item.action();
              onClose();
            }
          }}
          disabled={item.disabled}
          style={{
            display: 'block',
            width: '100%',
            padding: '6px 12px',
            background: 'transparent',
            border: 'none',
            color: item.disabled
              ? 'var(--sn-text-muted, #6b7280)'
              : 'var(--sn-text, #e5e7eb)',
            cursor: item.disabled ? 'default' : 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
          onMouseEnter={(e) => {
            if (!item.disabled) {
              (e.target as HTMLButtonElement).style.background = 'var(--sn-accent, #3b82f6)';
              (e.target as HTMLButtonElement).style.color = '#fff';
            }
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = 'transparent';
            (e.target as HTMLButtonElement).style.color = item.disabled
              ? 'var(--sn-text-muted, #6b7280)'
              : 'var(--sn-text, #e5e7eb)';
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// useLongPress — long-press detection for touch context menu
// ============================================================================

export interface LongPressResult {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

const LONG_PRESS_DURATION = 500;
const LONG_PRESS_MOVE_THRESHOLD = 10;

export function useLongPress(
  onLongPress: (pos: { x: number; y: number }) => void,
  enabled = true,
): LongPressResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      // Only trigger on touch (not mouse — mouse uses right-click)
      if (e.pointerType !== 'touch') return;

      startPosRef.current = { x: e.clientX, y: e.clientY };
      clear();
      timerRef.current = setTimeout(() => {
        onLongPress({ x: e.clientX, y: e.clientY });
        timerRef.current = null;
      }, LONG_PRESS_DURATION);
    },
    [enabled, onLongPress, clear],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!timerRef.current) return;
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_THRESHOLD) {
        clear();
      }
    },
    [clear],
  );

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  return { onPointerDown, onPointerMove, onPointerUp };
}
