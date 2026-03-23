/**
 * DockerContent — scrollable content area with drop zone for docking widgets.
 *
 * @remarks
 * Accepts drops of canvas entities via HTML5 drag-and-drop.
 * Also accepts entities docked via bus event (right-click / toolbar).
 * Shows a glass-styled empty state invitation when no widgets are docked.
 *
 * Moveable dividers between adjacent widget slots allow users to
 * redistribute vertical space by dragging.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { DockerTab, DockerWidgetSlot as DockerWidgetSlotType } from '@sn/types';

import { HOVER_TRANSITION, STORM_RGB } from './docker-palette';
import { DockerWidgetSlot, DEFAULT_MIN_HEIGHT } from './DockerWidgetSlot';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerContentProps {
  tab: DockerTab;
  onWidgetResize: (widgetInstanceId: string, height: number | undefined) => void;
  onWidgetRemove: (widgetInstanceId: string) => void;
  renderWidget: (widgetInstanceId: string) => React.ReactNode;
  /** Called when an entity is dropped into this docker */
  onWidgetDrop?: (entityId: string) => void;
}

// ---------------------------------------------------------------------------
// DockerDivider — draggable divider between two widget slots
// ---------------------------------------------------------------------------

const { r: sr, g: sg, b: sb } = STORM_RGB;

interface DockerDividerProps {
  topSlot: DockerWidgetSlotType;
  bottomSlot: DockerWidgetSlotType;
  topHeight: number;
  bottomHeight: number;
  onResize: (topId: string, topH: number, bottomId: string, bottomH: number) => void;
}

const DIVIDER_HIT_AREA = 8;

const DockerDivider: React.FC<DockerDividerProps> = ({
  topSlot,
  bottomSlot,
  topHeight,
  bottomHeight,
  onResize,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startTopH: number; startBottomH: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dividerRef.current?.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      dragState.current = {
        startY: e.clientY,
        startTopH: topHeight,
        startBottomH: bottomHeight,
      };
    },
    [topHeight, bottomHeight],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      const delta = e.clientY - dragState.current.startY;
      const combined = dragState.current.startTopH + dragState.current.startBottomH;

      let newTopH = dragState.current.startTopH + delta;
      let newBottomH = dragState.current.startBottomH - delta;

      // Clamp both to min height
      if (newTopH < DEFAULT_MIN_HEIGHT) {
        newTopH = DEFAULT_MIN_HEIGHT;
        newBottomH = combined - DEFAULT_MIN_HEIGHT;
      }
      if (newBottomH < DEFAULT_MIN_HEIGHT) {
        newBottomH = DEFAULT_MIN_HEIGHT;
        newTopH = combined - DEFAULT_MIN_HEIGHT;
      }

      onResize(topSlot.widgetInstanceId, newTopH, bottomSlot.widgetInstanceId, newBottomH);
    },
    [topSlot.widgetInstanceId, bottomSlot.widgetInstanceId, onResize],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      dividerRef.current?.releasePointerCapture?.(e.pointerId);
      setIsDragging(false);
      dragState.current = null;
    },
    [],
  );

  const handleDoubleClick = useCallback(() => {
    const combined = topHeight + bottomHeight;
    const half = Math.floor(combined / 2);
    onResize(topSlot.widgetInstanceId, half, bottomSlot.widgetInstanceId, combined - half);
  }, [topHeight, bottomHeight, topSlot.widgetInstanceId, bottomSlot.widgetInstanceId, onResize]);

  const lineColor = isDragging
    ? `rgba(${sr},${sg},${sb},0.4)`
    : isHovered
      ? 'rgba(255,255,255,0.15)'
      : 'rgba(255,255,255,0.06)';

  const dotOpacity = isDragging || isHovered ? 1 : 0;

  return (
    <div
      ref={dividerRef}
      data-testid="docker-divider"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Drag to resize, double-click to equalize"
      style={{
        height: DIVIDER_HIT_AREA,
        flexShrink: 0,
        cursor: 'row-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* Visible line */}
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          height: 1,
          background: lineColor,
          transition: HOVER_TRANSITION,
        }}
      />
      {/* Grabber dot */}
      <div
        style={{
          width: 24,
          height: 3,
          borderRadius: 2,
          background: isDragging
            ? `rgba(${sr},${sg},${sb},0.5)`
            : `rgba(${sr},${sg},${sb},0.35)`,
          opacity: dotOpacity,
          transition: HOVER_TRANSITION,
          position: 'relative',
          zIndex: 1,
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// DockerContent
// ---------------------------------------------------------------------------

export const DockerContent: React.FC<DockerContentProps> = ({
  tab,
  onWidgetResize,
  onWidgetRemove,
  renderWidget,
  onWidgetDrop,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Initialize slot heights when any are undefined and we have 2+ widgets
  useEffect(() => {
    if (initializedRef.current) return;
    if (tab.widgets.length < 2) return;

    const hasUndefined = tab.widgets.some((w) => w.height == null);
    if (!hasUndefined) return;

    const el = contentRef.current;
    if (!el) return;

    // Measure available height and distribute equally
    const availableHeight = el.clientHeight - (tab.widgets.length - 1) * DIVIDER_HIT_AREA;
    const perSlot = Math.max(DEFAULT_MIN_HEIGHT, Math.floor(availableHeight / tab.widgets.length));

    for (const w of tab.widgets) {
      if (w.height == null) {
        onWidgetResize(w.widgetInstanceId, perSlot);
      }
    }
    initializedRef.current = true;
  }, [tab.widgets, onWidgetResize]);

  // Reset initialization flag when widget count changes
  useEffect(() => {
    initializedRef.current = false;
  }, [tab.widgets.length]);

  const handleDividerResize = useCallback(
    (topId: string, topH: number, bottomId: string, bottomH: number) => {
      onWidgetResize(topId, topH);
      onWidgetResize(bottomId, bottomH);
    },
    [onWidgetResize],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const entityId = e.dataTransfer.getData('application/sn-entity-id');
    if (entityId && onWidgetDrop) {
      onWidgetDrop(entityId);
    }
  }, [onWidgetDrop]);

  const dropZoneStyle: React.CSSProperties = isDragOver ? {
    outline: `2px dashed rgba(${sr},${sg},${sb},0.4)`,
    outlineOffset: -4,
    background: `rgba(${sr},${sg},${sb},0.06)`,
  } : {};

  if (tab.widgets.length === 0) {
    return (
      <div
        data-testid="docker-content-empty"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: 24,
          textAlign: 'center',
          transition: HOVER_TRANSITION,
          borderRadius: 8,
          margin: 4,
          ...dropZoneStyle,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDragOver ? `rgba(${sr},${sg},${sb},0.7)` : `rgba(${sr},${sg},${sb},0.35)`}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: HOVER_TRANSITION }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <span
          style={{
            color: isDragOver ? `rgb(${sr},${sg},${sb})` : 'var(--sn-text-muted, #7A7784)',
            fontSize: 13,
            lineHeight: 1.4,
            maxWidth: 200,
            transition: HOVER_TRANSITION,
          }}
        >
          {isDragOver ? 'Drop to dock' : 'Drag widgets here or use the context menu'}
        </span>
      </div>
    );
  }

  // Build interleaved list of slots and dividers
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < tab.widgets.length; i++) {
    const slot = tab.widgets[i];
    const effectiveHeight = slot.height ?? DEFAULT_MIN_HEIGHT;

    elements.push(
      <DockerWidgetSlot
        key={slot.widgetInstanceId}
        slot={slot}
        onRemove={onWidgetRemove}
        effectiveHeight={tab.widgets.length > 1 ? effectiveHeight : undefined}
      >
        {renderWidget(slot.widgetInstanceId)}
      </DockerWidgetSlot>,
    );

    // Insert divider between adjacent slots (not after the last one)
    if (i < tab.widgets.length - 1) {
      const nextSlot = tab.widgets[i + 1];
      elements.push(
        <DockerDivider
          key={`divider-${slot.widgetInstanceId}-${nextSlot.widgetInstanceId}`}
          topSlot={slot}
          bottomSlot={nextSlot}
          topHeight={effectiveHeight}
          bottomHeight={nextSlot.height ?? DEFAULT_MIN_HEIGHT}
          onResize={handleDividerResize}
        />,
      );
    }
  }

  return (
    <div
      ref={contentRef}
      data-testid="docker-content"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        transition: HOVER_TRANSITION,
        ...dropZoneStyle,
      }}
    >
      {elements}
    </div>
  );
};
