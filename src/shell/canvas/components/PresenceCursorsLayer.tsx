/**
 * Presence Cursors Layer — renders remote user cursors on the canvas
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React, { useMemo } from 'react';

import { useSocialStore } from '../../../kernel/stores/social/social.store';

/** Local user ID that should not be rendered */
const LOCAL_USER_ID = 'local';

export interface PresenceCursorsLayerProps {
  /** Current viewport zoom level for scaling cursor size */
  zoom?: number;
}

/**
 * Renders cursor indicators for all remote users in the canvas.
 * Cursors are positioned in canvas space (the parent ViewportLayer handles transform).
 */
export const PresenceCursorsLayer: React.FC<PresenceCursorsLayerProps> = ({
  zoom = 1,
}) => {
  const presenceMap = useSocialStore((s) => s.presenceMap);

  // Filter out local user and users without cursor positions
  const remoteCursors = useMemo(() => {
    return Object.values(presenceMap).filter(
      (user) =>
        user.userId !== LOCAL_USER_ID &&
        user.cursorPosition !== null &&
        user.cursorPosition !== undefined
    );
  }, [presenceMap]);

  if (remoteCursors.length === 0) {
    return null;
  }

  // Scale cursor size inversely with zoom so they remain readable
  const cursorScale = Math.max(0.5, Math.min(1.5, 1 / zoom));

  return (
    <div
      data-testid="presence-cursors-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {remoteCursors.map((user) => (
        <RemoteCursor
          key={user.userId}
          x={user.cursorPosition!.x}
          y={user.cursorPosition!.y}
          color={user.color}
          displayName={user.displayName}
          scale={cursorScale}
        />
      ))}
    </div>
  );
};

interface RemoteCursorProps {
  x: number;
  y: number;
  color: string;
  displayName: string;
  scale: number;
}

/**
 * Individual remote cursor with pointer icon and name label
 */
const RemoteCursor: React.FC<RemoteCursorProps> = ({
  x,
  y,
  color,
  displayName,
  scale,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'left 50ms linear, top 50ms linear',
      }}
    >
      {/* Cursor pointer SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.76a.5.5 0 0 0-.85.45Z"
          fill={color}
          stroke="#fff"
          strokeWidth="1.5"
        />
      </svg>

      {/* User name label */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 16,
          background: color,
          color: getContrastColor(color),
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 500,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      >
        {displayName}
      </div>
    </div>
  );
};

/**
 * Returns white or black depending on background color luminance
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}
