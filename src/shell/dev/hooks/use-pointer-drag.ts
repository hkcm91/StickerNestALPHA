/**
 * usePointerDrag — unified drag hook for mouse, touch, and stylus
 *
 * Uses Pointer Events API with setPointerCapture for reliable
 * tracking across all input types. 4px threshold matches
 * canvas core DragManager pattern.
 *
 * @module shell/dev/hooks
 * @layer L6
 */

import { useCallback, useRef } from 'react';

const DRAG_THRESHOLD = 4;

export interface PointerDragCallbacks {
  /** Called when drag starts (threshold exceeded) */
  onDragStart?: (id: string, pos: { x: number; y: number }) => void;
  /** Called on each pointer move while dragging */
  onDragMove?: (id: string, delta: { dx: number; dy: number }, pos: { x: number; y: number }) => void;
  /** Called when pointer is released after dragging */
  onDragEnd?: (id: string, pos: { x: number; y: number }) => void;
  /** Called on tap (pointer down + up without exceeding threshold) */
  onTap?: (id: string, pos: { x: number; y: number }) => void;
  /** Drag threshold in pixels (default: 4) */
  threshold?: number;
  /** Whether drag is enabled (default: true) */
  enabled?: boolean;
}

export interface PointerDragResult {
  /** Attach to the draggable element's onPointerDown */
  onPointerDown: (e: React.PointerEvent, entityId: string) => void;
  /** Attach to the container's onPointerMove */
  onPointerMove: (e: React.PointerEvent) => void;
  /** Attach to the container's onPointerUp */
  onPointerUp: (e: React.PointerEvent) => void;
  /** Whether a drag is currently active */
  isDragging: boolean;
  /** The entity ID currently being dragged (null if none) */
  dragEntityId: string | null;
}

type DragPhase = 'idle' | 'pending' | 'dragging';

interface DragInternalState {
  phase: DragPhase;
  entityId: string | null;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  pointerId: number | null;
  captureTarget: Element | null;
}

export function usePointerDrag(callbacks: PointerDragCallbacks): PointerDragResult {
  const {
    onDragStart,
    onDragMove,
    onDragEnd,
    onTap,
    threshold = DRAG_THRESHOLD,
    enabled = true,
  } = callbacks;

  const stateRef = useRef<DragInternalState>({
    phase: 'idle',
    entityId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    pointerId: null,
    captureTarget: null,
  });

  // Expose isDragging reactively via a ref that consumers can read
  const isDraggingRef = useRef(false);
  const dragEntityIdRef = useRef<string | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, entityId: string) => {
      if (!enabled) return;
      // Only handle primary button (left click / single touch)
      if (e.button !== 0) return;

      e.stopPropagation();

      const s = stateRef.current;
      s.phase = 'pending';
      s.entityId = entityId;
      s.startX = e.clientX;
      s.startY = e.clientY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.pointerId = e.pointerId;

      // Capture pointer on the target element for reliable tracking
      const target = e.currentTarget as Element;
      target.setPointerCapture(e.pointerId);
      s.captureTarget = target;

      dragEntityIdRef.current = entityId;
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current;
      if (s.phase === 'idle') return;
      if (s.pointerId !== null && e.pointerId !== s.pointerId) return;

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (s.phase === 'pending') {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < threshold) return;

        // Threshold exceeded — transition to dragging
        s.phase = 'dragging';
        isDraggingRef.current = true;
        onDragStart?.(s.entityId!, { x: s.startX, y: s.startY });
      }

      if (s.phase === 'dragging') {
        const moveDx = e.clientX - s.lastX;
        const moveDy = e.clientY - s.lastY;
        s.lastX = e.clientX;
        s.lastY = e.clientY;
        onDragMove?.(s.entityId!, { dx: moveDx, dy: moveDy }, { x: e.clientX, y: e.clientY });
      }
    },
    [threshold, onDragStart, onDragMove],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current;
      if (s.phase === 'idle') return;
      if (s.pointerId !== null && e.pointerId !== s.pointerId) return;

      // Release pointer capture
      if (s.captureTarget && s.pointerId !== null) {
        try {
          s.captureTarget.releasePointerCapture(s.pointerId);
        } catch {
          // Ignore — capture may have been released already
        }
      }

      if (s.phase === 'dragging') {
        onDragEnd?.(s.entityId!, { x: e.clientX, y: e.clientY });
      } else if (s.phase === 'pending') {
        // No drag threshold crossed — treat as tap
        onTap?.(s.entityId!, { x: e.clientX, y: e.clientY });
      }

      // Reset
      s.phase = 'idle';
      s.entityId = null;
      s.pointerId = null;
      s.captureTarget = null;
      isDraggingRef.current = false;
      dragEntityIdRef.current = null;
    },
    [onDragEnd, onTap],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    get isDragging() {
      return isDraggingRef.current;
    },
    get dragEntityId() {
      return dragEntityIdRef.current;
    },
  };
}
