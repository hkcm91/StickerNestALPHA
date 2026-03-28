/**
 * DockerHeader — glass title bar with drag handle, controls, and dock mode toggle.
 *
 * @remarks
 * Supports dragging in both floating AND docked modes. In docked mode,
 * dragging past the undock threshold triggers an undock + float transition.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

import type { DockerDockMode, Point2D } from '@sn/types';

import { HOVER_TRANSITION, EMBER_RGB, STORM_RGB } from './docker-palette';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerHeaderProps {
  name: string;
  dockMode: DockerDockMode;
  pinned: boolean;
  onDrag?: (delta: Point2D) => void;
  onDragStart?: () => void;
  onDragEnd?: (finalPos: Point2D) => void;
  onRename: (name: string) => void;
  onDockModeChange: (mode: DockerDockMode) => void;
  onTogglePin: () => void;
  onClose: () => void;
  /** Called to minimize the docker (floating mode only) */
  onMinimize?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 38;

// ---------------------------------------------------------------------------
// Icon Components (16px, stroke-based)
// ---------------------------------------------------------------------------

const PinIcon: React.FC<{ pinned: boolean }> = ({ pinned }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {pinned ? (
      <>
        <line x1="12" y1="17" x2="12" y2="22" />
        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
      </>
    ) : (
      <>
        <line x1="2" y1="2" x2="22" y2="22" />
        <line x1="12" y1="17" x2="12" y2="22" />
        <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H9.2" />
      </>
    )}
  </svg>
);

const DockLeftIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const DockRightIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

const FloatIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MinimizeIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ---------------------------------------------------------------------------
// Shared button style
// ---------------------------------------------------------------------------

const btnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'var(--sn-text-muted, #7A7784)',
  borderRadius: 6,
  cursor: 'pointer',
  transition: HOVER_TRANSITION,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerHeader: React.FC<DockerHeaderProps> = ({
  name,
  dockMode,
  pinned,
  onDrag,
  onDragStart,
  onDragEnd,
  onRename,
  onDockModeChange,
  onTogglePin,
  onClose,
  onMinimize,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const dragStart = useRef<Point2D | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle drag — works for both floating AND docked modes
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, input')) return;

      e.preventDefault();
      dragStart.current = { x: e.clientX, y: e.clientY };
      setIsGrabbing(true);
      onDragStart?.();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragStart.current) return;

        const totalDelta = {
          x: moveEvent.clientX - dragStart.current.x,
          y: moveEvent.clientY - dragStart.current.y,
        };

        onDrag?.(totalDelta);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        dragStart.current = null;
        setIsGrabbing(false);
        onDragEnd?.({ x: upEvent.clientX, y: upEvent.clientY });
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
    },
    [onDrag, onDragStart, onDragEnd]
  );

  // Handle name editing
  const handleDoubleClick = useCallback(() => {
    setEditValue(name);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [name]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== name) {
      onRename(editValue.trim());
    }
  }, [editValue, name, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleBlur();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditValue(name);
      }
    },
    [handleBlur, name]
  );

  // Dock mode cycle
  const cycleDockMode = useCallback(() => {
    const modes: DockerDockMode[] = ['floating', 'docked-left', 'docked-right'];
    const currentIndex = modes.indexOf(dockMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    onDockModeChange(modes[nextIndex]);
  }, [dockMode, onDockModeChange]);

  const DockIcon = dockMode === 'docked-left' ? DockLeftIcon :
                   dockMode === 'docked-right' ? DockRightIcon : FloatIcon;

  return (
    <div
      data-testid="docker-header"
      onMouseDown={handleMouseDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: HEADER_HEIGHT,
        padding: '0 8px 0 12px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: isGrabbing ? 'grabbing' : 'grab',
        userSelect: 'none',
        gap: 2,
        flexShrink: 0,
      }}
    >
      {/* Docker name */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '2px 6px',
              border: `1px solid rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},0.4)`,
              borderRadius: 4,
              fontSize: 13,
              fontFamily: 'var(--sn-font-family, "Outfit", system-ui)',
              fontWeight: 400,
              color: 'var(--sn-text, #E8E6ED)',
              background: 'rgba(255,255,255,0.06)',
              outline: 'none',
            }}
          />
        ) : (
          <span
            className="sn-chrome-text"
            onDoubleClick={handleDoubleClick}
            title="Double-click to rename"
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 400,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </span>
        )}
      </div>

      {/* Pin button */}
      <button
        data-testid="docker-header-pin"
        data-pinned={pinned ? 'true' : 'false'}
        onClick={onTogglePin}
        title={pinned ? 'Unpin' : 'Pin'}
        style={{
          ...btnBase,
          background: pinned
            ? `rgba(${EMBER_RGB.r},${EMBER_RGB.g},${EMBER_RGB.b},0.15)`
            : 'transparent',
          color: pinned
            ? `rgb(${EMBER_RGB.r},${EMBER_RGB.g},${EMBER_RGB.b})`
            : 'var(--sn-text-muted, #7A7784)',
          boxShadow: pinned
            ? `0 0 8px rgba(${EMBER_RGB.r},${EMBER_RGB.g},${EMBER_RGB.b},0.15)`
            : 'none',
        }}
        onMouseEnter={(e) => {
          if (!pinned) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--sn-text-soft, #B8B5C0)';
          }
        }}
        onMouseLeave={(e) => {
          if (!pinned) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--sn-text-muted, #7A7784)';
          }
        }}
      >
        <PinIcon pinned={pinned} />
      </button>

      {/* Dock mode button */}
      <button
        data-testid="docker-dock-mode"
        onClick={cycleDockMode}
        title={`Dock mode: ${dockMode}`}
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = 'var(--sn-text-soft, #B8B5C0)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--sn-text-muted, #7A7784)';
        }}
      >
        <DockIcon />
      </button>

      {/* Minimize button (floating mode only) */}
      {onMinimize && (
        <button
          data-testid="docker-header-minimize"
          onClick={onMinimize}
          title="Minimize to pill"
          style={btnBase}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--sn-text-soft, #B8B5C0)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--sn-text-muted, #7A7784)';
          }}
        >
          <MinimizeIcon />
        </button>
      )}

      {/* Close button */}
      <button
        data-testid="docker-header-close"
        onClick={onClose}
        title="Close"
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(200,88,88,0.15)';
          e.currentTarget.style.color = '#C85858';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--sn-text-muted, #7A7784)';
        }}
      >
        <CloseIcon />
      </button>
    </div>
  );
};
