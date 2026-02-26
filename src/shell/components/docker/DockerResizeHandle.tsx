/**
 * DockerResizeHandle — handles for resizing docker containers.
 *
 * @remarks
 * Provides resize handles for all 8 positions (corners + edges).
 * For floating dockers: all handles are active.
 * For docked dockers: only relevant handles are active.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useRef } from 'react';

import type { Point2D } from '@sn/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResizeDirection =
  | 'n' | 's' | 'e' | 'w'
  | 'ne' | 'nw' | 'se' | 'sw';

export interface DockerResizeHandleProps {
  /** Direction this handle controls */
  direction: ResizeDirection;
  /** Called during resize with total delta values from start */
  onResize: (totalDeltaX: number, totalDeltaY: number, direction: ResizeDirection) => void;
  /** Called when resize starts */
  onResizeStart?: () => void;
  /** Called when resize ends */
  onResizeEnd?: () => void;
  /** Whether the handle is disabled */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HANDLE_SIZE = 8;
const CORNER_SIZE = 12;

const positionStyles: Record<ResizeDirection, React.CSSProperties> = {
  n: { top: 0, left: CORNER_SIZE, right: CORNER_SIZE, height: HANDLE_SIZE, cursor: 'ns-resize' },
  s: { bottom: 0, left: CORNER_SIZE, right: CORNER_SIZE, height: HANDLE_SIZE, cursor: 'ns-resize' },
  e: { right: 0, top: CORNER_SIZE, bottom: CORNER_SIZE, width: HANDLE_SIZE, cursor: 'ew-resize' },
  w: { left: 0, top: CORNER_SIZE, bottom: CORNER_SIZE, width: HANDLE_SIZE, cursor: 'ew-resize' },
  ne: { top: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE, cursor: 'nesw-resize' },
  nw: { top: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE, cursor: 'nwse-resize' },
  se: { bottom: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE, cursor: 'nwse-resize' },
  sw: { bottom: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE, cursor: 'nesw-resize' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerResizeHandle: React.FC<DockerResizeHandleProps> = ({
  direction,
  onResize,
  onResizeStart,
  onResizeEnd,
  disabled = false,
}) => {
  const startPos = useRef<Point2D | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      startPos.current = { x: e.clientX, y: e.clientY };
      onResizeStart?.();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!startPos.current) return;

        const totalDeltaX = moveEvent.clientX - startPos.current.x;
        const totalDeltaY = moveEvent.clientY - startPos.current.y;

        onResize(totalDeltaX, totalDeltaY, direction);
      };

      const handleMouseUp = () => {
        startPos.current = null;
        onResizeEnd?.();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
    },
    [direction, onResize, onResizeStart, onResizeEnd, disabled]
  );

  if (disabled) return null;

  return (
    <div
      data-testid={`docker-resize-${direction}`}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        ...positionStyles[direction],
        zIndex: 10,
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// All Handles Component
// ---------------------------------------------------------------------------

export interface DockerResizeHandlesProps {
  /** Called during resize */
  onResize: (deltaX: number, deltaY: number, direction: ResizeDirection) => void;
  /** Called when resize starts */
  onResizeStart?: () => void;
  /** Called when resize ends */
  onResizeEnd?: () => void;
  /** Which handles to show (default: all) */
  enabledDirections?: ResizeDirection[];
}

const ALL_DIRECTIONS: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

/**
 * Renders all resize handles for a docker container.
 */
export const DockerResizeHandles: React.FC<DockerResizeHandlesProps> = ({
  onResize,
  onResizeStart,
  onResizeEnd,
  enabledDirections = ALL_DIRECTIONS,
}) => {
  return (
    <>
      {ALL_DIRECTIONS.map((direction) => (
        <DockerResizeHandle
          key={direction}
          direction={direction}
          onResize={onResize}
          onResizeStart={onResizeStart}
          onResizeEnd={onResizeEnd}
          disabled={!enabledDirections.includes(direction)}
        />
      ))}
    </>
  );
};
