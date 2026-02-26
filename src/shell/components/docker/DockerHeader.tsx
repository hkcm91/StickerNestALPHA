/**
 * DockerHeader — title bar with drag handle, controls, and dock mode toggle.
 *
 * @remarks
 * Features:
 * - Drag handle for moving floating dockers
 * - Docker name (editable)
 * - Pin toggle button
 * - Dock mode selector (floating / left / right)
 * - Close button
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

import type { DockerDockMode, Point2D } from '@sn/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerHeaderProps {
  /** Docker name */
  name: string;
  /** Current dock mode */
  dockMode: DockerDockMode;
  /** Whether docker is pinned */
  pinned: boolean;
  /** Called when dragging (floating mode only). Passes total delta from start. */
  onDrag?: (delta: Point2D) => void;
  /** Called when drag starts */
  onDragStart?: () => void;
  /** Called when drag ends. Passes final mouse position for snap-to-dock. */
  onDragEnd?: (finalPos: Point2D) => void;
  /** Called to rename the docker */
  onRename: (name: string) => void;
  /** Called to change dock mode */
  onDockModeChange: (mode: DockerDockMode) => void;
  /** Called to toggle pin state */
  onTogglePin: () => void;
  /** Called to close/hide the docker */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 36;

// ---------------------------------------------------------------------------
// Icon Components (Improved SVGs)
// ---------------------------------------------------------------------------

const PinIcon: React.FC<{ pinned: boolean }> = ({ pinned }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v2a2 2 0 0 0 1 1.73L12 17l8-5.27A2 2 0 0 0 21 10z" fill={pinned ? 'currentColor' : 'none'} />
    <path d="M12 22v-5" />
  </svg>
);

const DockLeftIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const DockRightIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

const FloatIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

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
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const dragStart = useRef<Point2D | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle drag for floating mode
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't start drag if clicking on buttons or input
      if ((e.target as HTMLElement).closest('button, input')) return;
      if (dockMode !== 'floating') return;

      e.preventDefault();
      dragStart.current = { x: e.clientX, y: e.clientY };
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
        onDragEnd?.({ x: upEvent.clientX, y: upEvent.clientY });
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
    },
    [dockMode, onDrag, onDragStart, onDragEnd]
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
        padding: '0 8px',
        background: 'var(--sn-surface, #fff)',
        borderBottom: '1px solid var(--sn-border, #e0e0e0)',
        cursor: dockMode === 'floating' ? 'move' : 'default',
        userSelect: 'none',
        gap: '4px',
        flexShrink: 0,
      }}
    >
      {/* Docker name */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
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
              padding: '2px 4px',
              border: '1px solid var(--sn-accent, #3b82f6)',
              borderRadius: '3px',
              fontSize: '13px',
              fontFamily: 'var(--sn-font-family, system-ui)',
              outline: 'none',
            }}
          />
        ) : (
          <span
            onDoubleClick={handleDoubleClick}
            title="Double-click to rename"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--sn-text, #1f2937)',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          padding: 0,
          border: 'none',
          background: pinned ? 'var(--sn-accent, #3b82f6)' : 'transparent',
          color: pinned ? '#fff' : 'var(--sn-text-muted, #6b7280)',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <PinIcon pinned={pinned} />
      </button>

      {/* Dock mode button */}
      <button
        data-testid="docker-dock-mode"
        onClick={cycleDockMode}
        title={`Dock mode: ${dockMode}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: 'var(--sn-text-muted, #6b7280)',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <DockIcon />
      </button>

      {/* Close button */}
      <button
        data-testid="docker-header-close"
        onClick={onClose}
        title="Close"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: 'var(--sn-text-muted, #6b7280)',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <CloseIcon />
      </button>
    </div>
  );
};
