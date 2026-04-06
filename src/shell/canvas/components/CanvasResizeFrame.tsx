/**
 * CanvasResizeFrame — double-click-activated resize overlay for bounded canvases.
 *
 * Renders 8 drag handles around the canvas container and supports drag-to-move.
 * Emits bus events on resize/move completion so CanvasPage state stays in sync.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { CanvasDocumentEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { getResizeHandles } from '../utils/resize';
import type { HandlePosition } from '../utils/resize';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CanvasResizeFrameProps {
  /** Whether the resize frame is visible */
  isActive: boolean;
  /** Current canvas width (px) */
  width: number;
  /** Current canvas height (px) */
  height: number;
  /** Called when the frame should close (Escape / click-outside) */
  onDismiss: () => void;
  /** Ref to the bounded canvas container element */
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HANDLE_SIZE = 10;
const MIN_CANVAS_SIZE = 100;
const FRAME_Z = 55; // above canvas (2), below toolbar (60)

/** Spring easing — Principle 4 */
const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

// ---------------------------------------------------------------------------
// Handle position → CSS placement
// ---------------------------------------------------------------------------

function handleStyle(pos: HandlePosition, cursor: string): React.CSSProperties {
  const half = HANDLE_SIZE / 2;
  const base: React.CSSProperties = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 2,
    background: 'var(--sn-accent, #6366f1)',
    border: '1px solid var(--sn-bg, #0C0C10)',
    cursor,
    zIndex: 2,
    pointerEvents: 'auto',
    boxShadow: '0 0 6px var(--sn-accent, #6366f1)',
  };

  switch (pos) {
    case 'top-left':
      return { ...base, top: -half, left: -half };
    case 'top':
      return { ...base, top: -half, left: '50%', marginLeft: -half };
    case 'top-right':
      return { ...base, top: -half, right: -half };
    case 'right':
      return { ...base, top: '50%', right: -half, marginTop: -half };
    case 'bottom-right':
      return { ...base, bottom: -half, right: -half };
    case 'bottom':
      return { ...base, bottom: -half, left: '50%', marginLeft: -half };
    case 'bottom-left':
      return { ...base, bottom: -half, left: -half };
    case 'left':
      return { ...base, top: '50%', left: -half, marginTop: -half };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CanvasResizeFrame: React.FC<CanvasResizeFrameProps> = ({
  isActive,
  width,
  height,
  onDismiss,
  canvasRef,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);

  // Live dimensions during drag (local state for smooth preview)
  const [liveWidth, setLiveWidth] = useState(width);
  const [liveHeight, setLiveHeight] = useState(height);
  // Position of the frame relative to the canvas ref's offset parent
  const [framePos, setFramePos] = useState<{ top: number; left: number } | null>(null);

  // Ref to track latest live dimensions for use in pointer event closures
  const latestSize = useRef({ w: width, h: height });

  // Sync live dimensions when props change (e.g. external resize via settings)
  useEffect(() => {
    setLiveWidth(width);
    setLiveHeight(height);
    latestSize.current = { w: width, h: height };
  }, [width, height]);


  // Escape key dismissal
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isActive, onDismiss]);

  // Click-outside dismissal
  useEffect(() => {
    if (!isActive) return;
    const handleClick = (e: MouseEvent) => {
      const frame = frameRef.current;
      const canvas = canvasRef.current;
      if (
        frame && !frame.contains(e.target as Node) &&
        canvas && !canvas.contains(e.target as Node)
      ) {
        onDismiss();
      }
    };
    // Use setTimeout so the double-click that opened us doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isActive, onDismiss, canvasRef]);

  // --- Resize handle drag ---
  const handleResizeStart = useCallback(
    (handle: HandlePosition, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = latestSize.current.w;
      const startH = latestSize.current.h;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        let nextW = startW;
        let nextH = startH;

        // Apply delta based on handle position
        if (handle.includes('right')) nextW = startW + dx;
        if (handle.includes('left')) nextW = startW - dx;
        if (handle === 'bottom' || handle.includes('bottom')) nextH = startH + dy;
        if (handle === 'top' || handle.includes('top')) nextH = startH - dy;

        // Edge-only handles
        if (handle === 'left' || handle === 'right') nextH = startH;
        if (handle === 'top' || handle === 'bottom') nextW = startW;

        nextW = Math.max(MIN_CANVAS_SIZE, Math.round(nextW));
        nextH = Math.max(MIN_CANVAS_SIZE, Math.round(nextH));

        setLiveWidth(nextW);
        setLiveHeight(nextH);
        latestSize.current = { w: nextW, h: nextH };
      };

      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Emit final size via bus (read from ref to avoid stale closure)
        const { w, h } = latestSize.current;
        bus.emit(CanvasDocumentEvents.VIEWPORT_CHANGED, {
          canvasId: '',
          viewport: { width: w, height: h },
        });
      };

      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [],
  );

  // Compute position relative to canvas ref within the shared parent
  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updatePos = () => {
      const parent = canvas.offsetParent as HTMLElement | null;
      if (parent) {
        setFramePos({
          top: canvas.offsetTop,
          left: canvas.offsetLeft,
        });
      }
    };
    updatePos();

    // Re-measure on resize
    const observer = new ResizeObserver(updatePos);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [isActive, canvasRef]);

  if (!isActive || !framePos) return null;

  const handles = getResizeHandles();

  return (
    <div
      ref={frameRef}
      data-testid="canvas-resize-frame"
      style={{
        position: 'absolute',
        top: framePos.top,
        left: framePos.left,
        width: liveWidth,
        height: liveHeight,
        zIndex: FRAME_Z,
        pointerEvents: 'none',
      }}
    >
      {/* Dashed border frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '2px dashed var(--sn-accent, #6366f1)',
          borderRadius: 'inherit',
          boxShadow: '0 0 12px rgba(99, 102, 241, 0.25), inset 0 0 12px rgba(99, 102, 241, 0.08)',
          pointerEvents: 'none',
        }}
      />

      {/* Size label */}
      <div
        style={{
          position: 'absolute',
          bottom: -28,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '2px 8px',
          borderRadius: 4,
          background: 'var(--sn-surface-glass, rgba(20,17,24,0.85))',
          backdropFilter: 'blur(12px)',
          color: 'var(--sn-text-muted, #8b8b9e)',
          fontSize: '11px',
          fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
        }}
      >
        {liveWidth} × {liveHeight}
      </div>

      {/* Resize handles */}
      {handles.map((h) => (
        <div
          key={h.position}
          data-testid={`resize-handle-${h.position}`}
          style={handleStyle(h.position, h.cursor)}
          onPointerDown={(e) => handleResizeStart(h.position, e)}
        />
      ))}
    </div>
  );
};
