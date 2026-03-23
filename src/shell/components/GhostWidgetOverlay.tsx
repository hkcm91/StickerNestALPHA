/**
 * Ghost Widget Overlay — renders a faint, glowy widget preview that
 * follows the cursor during invite placement.
 *
 * Shows a placement banner immediately on activation. Once the user
 * moves their mouse over the canvas, the ghost follows the cursor.
 * Click to place the widget.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { BusEvent, Point2D } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { palette } from '../theme/theme-vars';

interface GhostState {
  active: boolean;
  widgetId: string | null;
  widgetName: string | null;
  inviteId: string | null;
  position: Point2D | null;
}

const INITIAL: GhostState = {
  active: false,
  widgetId: null,
  widgetName: null,
  inviteId: null,
  position: null,
};

export const GhostWidgetOverlay: React.FC = () => {
  const [ghost, setGhost] = useState<GhostState>(INITIAL);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleActivated = useCallback((event: BusEvent) => {
    const p = event.payload as {
      widgetId: string;
      inviteId?: string;
      widgetManifestSnapshot?: { name?: string };
    };
    setGhost({
      active: true,
      widgetId: p.widgetId,
      widgetName: p.widgetManifestSnapshot?.name ?? p.widgetId,
      inviteId: p.inviteId ?? null,
      position: null,
    });
  }, []);

  const handleDeactivated = useCallback(() => setGhost(INITIAL), []);
  const handlePlaced = useCallback(() => setGhost(INITIAL), []);

  const handlePositionUpdate = useCallback((event: BusEvent) => {
    const p = event.payload as { position: Point2D };
    setGhost((prev) => ({ ...prev, position: p.position }));
  }, []);

  // Subscribe to ghost tool bus events
  useEffect(() => {
    const unsubs = [
      bus.subscribe(CanvasEvents.GHOST_ACTIVATED, handleActivated),
      bus.subscribe(CanvasEvents.GHOST_DEACTIVATED, handleDeactivated),
      bus.subscribe(CanvasEvents.GHOST_POSITION_UPDATE, handlePositionUpdate),
      bus.subscribe(CanvasEvents.GHOST_PLACED, handlePlaced),
    ];
    return () => unsubs.forEach((u) => u());
  }, [handleActivated, handleDeactivated, handlePositionUpdate, handlePlaced]);

  // Track mouse position when ghost is active (for cursor-follow)
  useEffect(() => {
    if (!ghost.active) return;

    const onMouseMove = (e: MouseEvent) => {
      setGhost((prev) => ({
        ...prev,
        position: { x: e.clientX, y: e.clientY },
      }));
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [ghost.active]);

  // Handle click to place
  useEffect(() => {
    if (!ghost.active) return;

    const onClick = (e: MouseEvent) => {
      // Only place if clicking on canvas area (not on UI panels)
      const target = e.target as HTMLElement;
      if (target.closest('[data-testid="notification-panel"]')
        || target.closest('[data-testid="global-nav"]')
        || target.closest('nav')) return;

      // Derive cross-canvas channel from invite
      const crossCanvasChannel = ghost.inviteId ? `chat.invite-${ghost.inviteId}` : undefined;

      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'widget',
        transform: {
          position: { x: e.clientX - 150, y: e.clientY - 100 },
          size: { width: 300, height: 200 },
          rotation: 0,
          scale: 1,
        },
        zIndex: 0,
        visible: true,
        locked: false,
        widgetId: ghost.widgetId,
        widgetInstanceId: ghost.inviteId ? `inst-invite-${ghost.inviteId}` : crypto.randomUUID(),
        config: crossCanvasChannel ? { crossCanvasChannel } : {},
      });

      bus.emit(CanvasEvents.GHOST_PLACED, {
        inviteId: ghost.inviteId,
        position: { x: e.clientX, y: e.clientY },
      });

      // Clear URL params so ghost doesn't re-activate on re-render
      const url = new URL(window.location.href);
      url.searchParams.delete('ghostWidget');
      url.searchParams.delete('inviteId');
      window.history.replaceState({}, '', url.pathname);
    };

    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [ghost.active, ghost.widgetId, ghost.inviteId]);

  // Handle Escape to cancel
  useEffect(() => {
    if (!ghost.active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGhost(INITIAL);
        // Clear URL params
        const url = new URL(window.location.href);
        url.searchParams.delete('ghostWidget');
        url.searchParams.delete('inviteId');
        window.history.replaceState({}, '', url.pathname);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ghost.active]);

  if (!ghost.active) return null;

  const name = ghost.widgetName ?? ghost.widgetId ?? 'Widget';

  // Phase 1: banner shown before cursor moves onto canvas
  if (!ghost.position) {
    return (
      <div
        data-testid="ghost-widget-banner"
        style={{
          position: 'fixed',
          top: 56,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          padding: '12px 24px',
          borderRadius: '12px',
          background: palette.surfaceGlass,
          border: `2px solid ${palette.opal}`,
          backdropFilter: 'blur(16px)',
          boxShadow: `0 0 20px ${palette.opal}40, 0 8px 32px rgba(0,0,0,0.2)`,
          color: palette.text,
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'var(--sn-font-family)',
          animation: 'ghostPulse 2s ease-in-out infinite',
        }}
      >
        <style>{`
          @keyframes ghostPulse {
            0%, 100% { box-shadow: 0 0 20px ${palette.opal}40, 0 8px 32px rgba(0,0,0,0.2); }
            50% { box-shadow: 0 0 30px ${palette.opal}80, 0 8px 32px rgba(0,0,0,0.3); }
          }
        `}</style>
        Click anywhere on the canvas to place <strong>{name}</strong>
        <span style={{ marginLeft: 12, opacity: 0.5, fontSize: 12 }}>ESC to cancel</span>
      </div>
    );
  }

  // Phase 2: ghost follows cursor
  return (
    <div
      ref={overlayRef}
      data-testid="ghost-widget-overlay"
      style={{
        position: 'fixed',
        left: ghost.position.x,
        top: ghost.position.y,
        width: 300,
        height: 200,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 10000,
        borderRadius: '12px',
        background: palette.surfaceGlass,
        border: `2px solid ${palette.opal}`,
        backdropFilter: 'blur(8px)',
        opacity: 0.65,
        filter: `drop-shadow(0 0 16px ${palette.opal}) drop-shadow(0 0 32px ${palette.opal}60)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: palette.text,
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'var(--sn-font-family)',
        gap: 6,
        animation: 'ghostGlow 1.5s ease-in-out infinite alternate',
      }}
    >
      <style>{`
        @keyframes ghostGlow {
          from { opacity: 0.5; filter: drop-shadow(0 0 12px ${palette.opal}) drop-shadow(0 0 24px ${palette.opal}40); }
          to { opacity: 0.75; filter: drop-shadow(0 0 20px ${palette.opal}) drop-shadow(0 0 40px ${palette.opal}80); }
        }
      `}</style>
      <span style={{ fontSize: 24, opacity: 0.6 }}>&#9670;</span>
      {name}
      <span style={{ fontSize: 11, opacity: 0.5 }}>click to place</span>
    </div>
  );
};
