/**
 * DockerWidgetSlot — renders a single widget within a docker tab.
 *
 * @remarks
 * Each slot displays a widget instance with an optional resize handle
 * at the bottom border for adjusting the widget's height.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

import type { DockerWidgetSlot as DockerWidgetSlotType } from '@sn/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerWidgetSlotProps {
  /** Widget slot data */
  slot: DockerWidgetSlotType;
  /** Called when the widget height is resized */
  onResize: (widgetInstanceId: string, height: number | undefined) => void;
  /** Called to remove the widget from the docker */
  onRemove: (widgetInstanceId: string) => void;
  /** Widget content to render (provided by parent) */
  children: React.ReactNode;
  /** Minimum height for the slot */
  minHeight?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MIN_HEIGHT = 60;
const RESIZE_HANDLE_HEIGHT = 6;

// ---------------------------------------------------------------------------
// Icon Components (Improved SVGs)
// ---------------------------------------------------------------------------

const UndockIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="M10 14L21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerWidgetSlot: React.FC<DockerWidgetSlotProps> = ({
  slot,
  onResize,
  onRemove,
  children,
  minHeight = DEFAULT_MIN_HEIGHT,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const startHeight = useRef<number>(0);

  // Handle resize drag start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsResizing(true);
      startY.current = e.clientY;
      startHeight.current = slot.height ?? containerRef.current?.offsetHeight ?? 150;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientY - startY.current;
        const newHeight = Math.max(minHeight, startHeight.current + delta);
        onResize(slot.widgetInstanceId, newHeight);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
    },
    [slot.widgetInstanceId, slot.height, minHeight, onResize]
  );

  // Reset to auto height on double-click
  const handleDoubleClick = useCallback(() => {
    onResize(slot.widgetInstanceId, undefined);
  }, [slot.widgetInstanceId, onResize]);

  return (
    <div
      ref={containerRef}
      data-testid={`docker-widget-slot-${slot.widgetInstanceId}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        height: slot.height ?? 'auto',
        minHeight,
        borderBottom: '1px solid var(--sn-border, #e0e0e0)',
        background: isDragOver ? 'var(--sn-bg, #f8f9fa)' : 'transparent',
        transition: 'background 0.2s',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => setIsDragOver(false)}
    >
      {/* Widget content */}
      <div
        style={{
          height: '100%',
          overflow: 'hidden',
          padding: '4px',
        }}
      >
        {children}
      </div>

      {/* Undock button (shown on hover) */}
      <button
        data-testid={`docker-widget-remove-${slot.widgetInstanceId}`}
        onClick={() => onRemove(slot.widgetInstanceId)}
        title="Undock to canvas"
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          border: 'none',
          background: 'rgba(31, 41, 55, 0.8)',
          color: '#fff',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '10px',
          fontWeight: 500,
          opacity: isHovered ? 1 : 0,
          pointerEvents: isHovered ? 'auto' : 'none',
          transition: 'opacity 0.2s, background 0.2s',
          zIndex: 20,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(31, 41, 55, 1)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(31, 41, 55, 0.8)')}
      >
        <UndockIcon />
        <span>Undock</span>
      </button>

      {/* Resize handle */}
      <div
        data-testid={`docker-widget-resize-${slot.widgetInstanceId}`}
        onMouseDown={handleResizeStart}
        onDoubleClick={handleDoubleClick}
        title="Drag to resize, double-click for auto height"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: RESIZE_HANDLE_HEIGHT,
          cursor: 'ns-resize',
          background: isResizing ? 'var(--sn-accent, #3b82f6)' : 'transparent',
          zIndex: 15,
        }}
        onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; }}
        onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = 'transparent'; }}
      />
    </div>
  );
};
