/**
 * DockerContainer — bioluminescent glass panel with iPad Stage Manager feel.
 *
 * @remarks
 * Full visual treatment matching the StickerNest design language:
 * - Proximity-based glow that tracks cursor (P17: bioluminescent, not LED)
 * - Flashlight border effect on cursor position
 * - Grain texture overlay (P18: physical texture beneath digital surfaces)
 * - Breathing idle animation (P2: idle is alive)
 * - Two-phase open/close animation (P9: widgets open like unfolding)
 * - Minimize to pill with spring animation
 * - Spring physics on all transitions (P4)
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Docker, Point2D, Size2D, DockerDockMode } from '@sn/types';

import {
  MIN_WIDTH,
  MIN_HEIGHT,
  DOCK_TRANSITION,
  GLASS_INSET,
  SNAP_THRESHOLD,
  UNDOCK_DRAG_THRESHOLD,
  STORM_RGB,
} from './docker-palette';
import { DockerContent } from './DockerContent';
import { DockerHeader } from './DockerHeader';
import { DockerResizeHandles, type ResizeDirection } from './DockerResizeHandle';
import { DockerTabBar } from './DockerTabBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerContainerProps {
  docker: Docker;
  zIndex?: number;
  onPositionChange: (id: string, position: Point2D) => void;
  onSizeChange: (id: string, size: Size2D) => void;
  onDockModeChange: (id: string, mode: DockerDockMode) => void;
  onClose: (id: string) => void;
  onTogglePin: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onTabClick: (id: string, index: number) => void;
  onAddTab: (id: string) => void;
  onRenameTab: (id: string, index: number, name: string) => void;
  onRemoveTab: (id: string, index: number) => void;
  onWidgetResize: (id: string, widgetInstanceId: string, height: number | undefined) => void;
  onWidgetRemove: (id: string, widgetInstanceId: string) => void;
  renderWidget: (widgetInstanceId: string) => React.ReactNode;
  onFocus?: (id: string) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  /** Called when a canvas entity is dropped onto this docker */
  onWidgetDrop?: (dockerId: string, entityId: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { r: sr, g: sg, b: sb } = STORM_RGB;
const PILL_WIDTH = 140;
const PILL_HEIGHT = 32;

// Grain SVG as inline data URI (P18: physical texture beneath digital surfaces)
const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.06'/%3E%3C/svg%3E")`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerContainer: React.FC<DockerContainerProps> = ({
  docker,
  zIndex = 100,
  onPositionChange,
  onSizeChange,
  onDockModeChange,
  onClose,
  onTogglePin,
  onRename,
  onTabClick,
  onAddTab,
  onRenameTab,
  onRemoveTab,
  onWidgetResize,
  onWidgetRemove,
  renderWidget,
  onFocus,
  onDragStateChange,
  onWidgetDrop,
}) => {
  const { id, name, dockMode, position, size, pinned, tabs, activeTabIndex } = docker;

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartState = useRef<{ position: Point2D; size: Size2D } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [animPhase, setAnimPhase] = useState<'entering' | 'ready'>('entering');
  const [isMinimized, setIsMinimized] = useState(false);

  // Proximity glow tracking (P17: bioluminescent glow)
  const [proximity, setProximity] = useState(0);
  const [mouseXY, setMouseXY] = useState({ x: 0, y: 0 });
  const lastGlowUpdate = useRef(0);

  const activeTab = tabs[activeTabIndex] ?? tabs[0];

  // Two-phase entrance animation (P9)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimPhase('ready'));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Proximity glow handler — 30fps throttled
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isMinimized) return;
      const now = performance.now();
      if (now - lastGlowUpdate.current < 33) return;
      lastGlowUpdate.current = now;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      const maxDist = Math.max(rect.width, rect.height) * 1.2;
      setProximity(Math.max(0, 1 - dist / maxDist));
      setMouseXY({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [isMinimized]
  );

  const handleMouseLeave = useCallback(() => {
    setProximity(0);
    setMouseXY({ x: 0, y: 0 });
  }, []);

  // Resize directions
  const enabledResizeDirections = useMemo<ResizeDirection[]>(() => {
    if (isMinimized) return [];
    switch (dockMode) {
      case 'docked-left': return ['e'];
      case 'docked-right': return ['w'];
      default: return ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    }
  }, [dockMode, isMinimized]);

  // --- Drag handlers ---
  const handleDragStart = useCallback(() => {
    dragStartState.current = { position: position || { x: 100, y: 100 }, size };
    setIsDragging(true);
    onDragStateChange?.(true);
    onFocus?.(id);
  }, [id, position, size, onFocus, onDragStateChange]);

  const handleDrag = useCallback(
    (totalDelta: Point2D) => {
      if (!dragStartState.current) return;
      if (dockMode !== 'floating') {
        const dist = Math.hypot(totalDelta.x, totalDelta.y);
        if (dist < UNDOCK_DRAG_THRESHOLD) return;
        onDockModeChange(id, 'floating');
        const currentX = dockMode === 'docked-left' ? size.width / 2 : window.innerWidth - size.width / 2;
        dragStartState.current = { position: { x: currentX - size.width / 2, y: 100 }, size };
        return;
      }
      onPositionChange(id, {
        x: Math.max(0, dragStartState.current.position.x + totalDelta.x),
        y: Math.max(0, dragStartState.current.position.y + totalDelta.y),
      });
    },
    [id, dockMode, size, onPositionChange, onDockModeChange]
  );

  const handleDragEnd = useCallback(
    (finalMousePos: Point2D) => {
      dragStartState.current = null;
      setIsDragging(false);
      onDragStateChange?.(false);
      if (dockMode !== 'floating') return;
      const screenWidth = window.innerWidth;
      if (finalMousePos.x < SNAP_THRESHOLD) onDockModeChange(id, 'docked-left');
      else if (finalMousePos.x > screenWidth - SNAP_THRESHOLD) onDockModeChange(id, 'docked-right');
    },
    [id, dockMode, onDockModeChange, onDragStateChange]
  );

  // --- Resize handlers ---
  const handleResizeStart = useCallback(() => {
    dragStartState.current = { position: position || { x: 100, y: 100 }, size };
    setIsResizing(true);
    onFocus?.(id);
  }, [id, position, size, onFocus]);

  const handleResize = useCallback(
    (totalDeltaX: number, totalDeltaY: number, direction: ResizeDirection) => {
      if (!dragStartState.current) return;
      const { size: ss, position: sp } = dragStartState.current;
      let w = ss.width, h = ss.height, x = sp.x, y = sp.y;

      if (direction.includes('e')) w = Math.max(MIN_WIDTH, ss.width + totalDeltaX);
      if (direction.includes('w')) {
        const wd = Math.min(totalDeltaX, ss.width - MIN_WIDTH);
        w = ss.width - wd;
        if (dockMode === 'floating') x = sp.x + wd;
      }
      if (direction.includes('s')) h = Math.max(MIN_HEIGHT, ss.height + totalDeltaY);
      if (direction.includes('n')) {
        const hd = Math.min(totalDeltaY, ss.height - MIN_HEIGHT);
        h = ss.height - hd;
        if (dockMode === 'floating') y = sp.y + hd;
      }
      onSizeChange(id, { width: w, height: h });
      if (dockMode === 'floating' && (direction.includes('n') || direction.includes('w'))) {
        onPositionChange(id, { x, y });
      }
    },
    [id, dockMode, onSizeChange, onPositionChange]
  );

  const handleResizeEnd = useCallback(() => {
    dragStartState.current = null;
    setIsResizing(false);
  }, []);

  const handleWidgetResize = useCallback(
    (wid: string, h: number | undefined) => onWidgetResize(id, wid, h),
    [id, onWidgetResize]
  );

  const handleWidgetRemove = useCallback(
    (wid: string) => onWidgetRemove(id, wid),
    [id, onWidgetRemove]
  );

  // Minimize toggle
  const handleMinimize = useCallback(() => setIsMinimized((v) => !v), []);

  // --- Dynamic glow styles ---
  const glowBlur = Math.round(16 + proximity * 12);
  const glowSat = (1.2 + proximity * 0.15).toFixed(2);
  const borderAlpha = (0.06 + proximity * 0.14).toFixed(2);

  const dynamicShadow = [
    // 4-layer bioluminescent phosphorescent halos (P17)
    `0 0 ${Math.round(1 + proximity * 3)}px rgba(${sr},${sg},${sb},${(0.06 + proximity * 0.2).toFixed(2)})`,
    `0 0 ${Math.round(4 + proximity * 10)}px rgba(${sr},${sg},${sb},${(0.03 + proximity * 0.1).toFixed(2)})`,
    `0 0 ${Math.round(12 + proximity * 28)}px rgba(${sr},${sg},${sb},${(0.02 + proximity * 0.06).toFixed(2)})`,
    `0 0 ${Math.round(24 + proximity * 48)}px rgba(${sr},${sg},${sb},${(proximity * 0.03).toFixed(2)})`,
    // Structural shadows
    '0 2px 8px rgba(0,0,0,0.3)',
    '0 8px 32px rgba(0,0,0,0.15)',
    // Inset top highlight
    GLASS_INSET,
  ].join(', ');

  const dockedShadow = [
    `0 0 ${Math.round(1 + proximity * 2)}px rgba(${sr},${sg},${sb},${(proximity * 0.15).toFixed(2)})`,
    '0 0 1px rgba(0,0,0,0.3)',
    '4px 0 16px rgba(0,0,0,0.15)',
    GLASS_INSET,
  ].join(', ');

  // --- Container styles ---
  const containerStyle = useMemo<React.CSSProperties>(() => {
    const isInteracting = isDragging || isResizing;
    const isEntering = animPhase === 'entering';

    // Minimized pill state
    if (isMinimized && dockMode === 'floating') {
      return {
        position: 'absolute',
        top: position?.y ?? 100,
        left: position?.x ?? 100,
        width: PILL_WIDTH,
        height: PILL_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%), var(--sn-surface-glass, rgba(20,17,24,0.85))`,
        backdropFilter: `blur(${glowBlur}px) saturate(${glowSat})`,
        WebkitBackdropFilter: `blur(${glowBlur}px) saturate(${glowSat})`,
        border: `1px solid rgba(${sr},${sg},${sb},${borderAlpha})`,
        borderRadius: 16,
        boxShadow: dynamicShadow,
        overflow: 'hidden',
        zIndex,
        transition: DOCK_TRANSITION,
        opacity: isEntering ? 0 : 1,
        cursor: 'pointer',
      };
    }

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      display: 'flex',
      flexDirection: 'column',
      background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%), var(--sn-surface-glass, rgba(20,17,24,0.75))`,
      backdropFilter: `blur(${glowBlur}px) saturate(${glowSat})`,
      WebkitBackdropFilter: `blur(${glowBlur}px) saturate(${glowSat})`,
      border: `1px solid rgba(${sr},${sg},${sb},${borderAlpha})`,
      overflow: 'hidden',
      zIndex,
      transition: isInteracting ? 'none' : DOCK_TRANSITION,
      opacity: isEntering ? 0 : 1,
      transform: isEntering ? 'scale(0.95)' : 'scale(1)',
    };

    switch (dockMode) {
      case 'docked-left':
        return {
          ...baseStyle,
          top: 0, left: 0, bottom: 0, width: size.width,
          borderRadius: '0 14px 14px 0',
          borderLeft: 'none',
          boxShadow: dockedShadow,
        };
      case 'docked-right':
        return {
          ...baseStyle,
          top: 0, right: 0, bottom: 0, width: size.width,
          borderRadius: '14px 0 0 14px',
          borderRight: 'none',
          boxShadow: dockedShadow.replace('4px', '-4px'),
        };
      default:
        return {
          ...baseStyle,
          top: position?.y ?? 100, left: position?.x ?? 100,
          width: size.width, height: size.height,
          borderRadius: 14,
          boxShadow: dynamicShadow,
        };
    }
  }, [dockMode, position, size, zIndex, isDragging, isResizing, animPhase, isMinimized, glowBlur, glowSat, borderAlpha, dynamicShadow, dockedShadow]);

  const handleContainerClick = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false);
      return;
    }
    onFocus?.(id);
  }, [id, onFocus, isMinimized]);

  if (!activeTab) return null;

  // Minimized pill rendering
  if (isMinimized && dockMode === 'floating') {
    return (
      <div
        data-testid={`docker-container-${id}`}
        ref={containerRef}
        style={containerStyle}
        onClick={handleContainerClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Flashlight border */}
        {proximity > 0 && (
          <div aria-hidden style={{
            position: 'absolute', inset: -1, borderRadius: 17,
            pointerEvents: 'none', zIndex: 2,
            background: `radial-gradient(200px circle at ${mouseXY.x}px ${mouseXY.y}px, rgba(${sr},${sg},${sb},${(proximity * 0.35).toFixed(2)}), transparent 50%)`,
            padding: 1,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude' as React.CSSProperties['maskComposite'],
          }} />
        )}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', height: '100%',
          padding: '0 12px', gap: 6,
        }}>
          {/* Breathing dot (P2: idle is alive) */}
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: `rgb(${sr},${sg},${sb})`,
            boxShadow: `0 0 6px rgba(${sr},${sg},${sb},0.5)`,
            animation: 'sn-docker-breathe 3s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 12, fontWeight: 400, letterSpacing: '0.01em',
            color: 'var(--sn-text-soft, #B8B5C0)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {name}
          </span>
          <span style={{
            fontSize: 10, color: 'var(--sn-text-muted, #7A7784)',
            marginLeft: 'auto', flexShrink: 0,
          }}>
            {tabs[activeTabIndex]?.widgets.length ?? 0}
          </span>
        </div>
        {/* Grain texture */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, borderRadius: 16,
          backgroundImage: GRAIN_SVG, backgroundSize: '128px 128px',
          pointerEvents: 'none', zIndex: 3, mixBlendMode: 'overlay',
        }} />
      </div>
    );
  }

  return (
    <div
      data-testid={`docker-container-${id}`}
      ref={containerRef}
      style={containerStyle}
      onMouseDown={handleContainerClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Flashlight border — cursor-tracked radial glow on border edge (P17) */}
      {proximity > 0 && (
        <div aria-hidden style={{
          position: 'absolute', inset: -1,
          borderRadius: dockMode === 'docked-left' ? '0 15px 15px 0'
            : dockMode === 'docked-right' ? '15px 0 0 15px' : 15,
          pointerEvents: 'none', zIndex: 4,
          background: `radial-gradient(300px circle at ${mouseXY.x}px ${mouseXY.y}px, rgba(${sr},${sg},${sb},${(proximity * 0.3).toFixed(2)}), transparent 50%)`,
          padding: 1,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude' as React.CSSProperties['maskComposite'],
          transition: 'opacity 200ms ease-out',
        }} />
      )}

      {/* Grain texture overlay (P18: physical texture) */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        borderRadius: dockMode === 'floating' ? 14 : undefined,
        backgroundImage: GRAIN_SVG, backgroundSize: '128px 128px',
        pointerEvents: 'none', zIndex: 3, mixBlendMode: 'overlay',
      }} />

      {/* Content stack */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <DockerHeader
          name={name}
          dockMode={dockMode}
          pinned={pinned}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onRename={(newName) => onRename(id, newName)}
          onDockModeChange={(mode) => onDockModeChange(id, mode)}
          onTogglePin={() => onTogglePin(id)}
          onClose={() => onClose(id)}
          onMinimize={dockMode === 'floating' ? handleMinimize : undefined}
        />

        <DockerTabBar
          tabs={tabs}
          activeTabIndex={activeTabIndex}
          onTabClick={(index) => onTabClick(id, index)}
          onAddTab={() => onAddTab(id)}
          onRenameTab={(index, tabName) => onRenameTab(id, index, tabName)}
          onRemoveTab={(index) => onRemoveTab(id, index)}
        />

        <DockerContent
          tab={activeTab}
          onWidgetResize={handleWidgetResize}
          onWidgetRemove={handleWidgetRemove}
          renderWidget={renderWidget}
          onWidgetDrop={onWidgetDrop ? (entityId) => onWidgetDrop(id, entityId) : undefined}
        />
      </div>

      <DockerResizeHandles
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
        enabledDirections={enabledResizeDirections}
      />

      {/* Keyframe injection for breathing animation */}
      <style>{`
        @keyframes sn-docker-breathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};
