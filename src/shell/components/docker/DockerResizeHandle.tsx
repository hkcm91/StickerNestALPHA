/**
 * DockerResizeHandle — glass-styled resize handles with storm-colored hover.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

import type { Point2D } from '@sn/types';

import { STORM_RGB, HOVER_TRANSITION } from './docker-palette';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResizeDirection =
  | 'n' | 's' | 'e' | 'w'
  | 'ne' | 'nw' | 'se' | 'sw';

export interface DockerResizeHandleProps {
  direction: ResizeDirection;
  onResize: (totalDeltaX: number, totalDeltaY: number, direction: ResizeDirection) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
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

// Which axis the handle affects — used for visual indicator direction
const isCorner = (d: ResizeDirection) => d.length === 2;

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
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      startPos.current = { x: e.clientX, y: e.clientY };
      setIsActive(true);
      onResizeStart?.();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!startPos.current) return;

        const totalDeltaX = moveEvent.clientX - startPos.current.x;
        const totalDeltaY = moveEvent.clientY - startPos.current.y;

        onResize(totalDeltaX, totalDeltaY, direction);
      };

      const handleMouseUp = () => {
        startPos.current = null;
        setIsActive(false);
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

  const showIndicator = isHovered || isActive;
  const indicatorAlpha = isActive ? 0.5 : 0.25;

  return (
    <div
      data-testid={`docker-resize-${direction}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        ...positionStyles[direction],
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Visual indicator — line for edges, dot for corners */}
      {showIndicator && (
        isCorner(direction) ? (
          <div
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: `rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},${indicatorAlpha})`,
              transition: HOVER_TRANSITION,
            }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: direction === 'n' || direction === 's' ? 24 : 2,
              height: direction === 'n' || direction === 's' ? 2 : 24,
              borderRadius: 1,
              background: `rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},${indicatorAlpha})`,
              transition: HOVER_TRANSITION,
            }}
          />
        )
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// All Handles Component
// ---------------------------------------------------------------------------

export interface DockerResizeHandlesProps {
  onResize: (deltaX: number, deltaY: number, direction: ResizeDirection) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  enabledDirections?: ResizeDirection[];
}

const ALL_DIRECTIONS: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

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
