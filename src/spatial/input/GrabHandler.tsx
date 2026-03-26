/**
 * GrabHandler — bridges VR controller grip events to spatial panel grab/move/release.
 *
 * Listens for `spatial.controller.grab` and `spatial.controller.release` events
 * from the ControllerBridge. When a grab targets a spatial panel (detected via
 * raycasting against panel handle meshes), emits `spatial.panel.grabbed` /
 * `spatial.panel.released` events to drive the panel grab-to-move flow.
 *
 * Renderless component — returns null.
 *
 * @module spatial/input/GrabHandler
 * @layer L4B
 */

import { useEffect, useRef } from 'react';

import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

/**
 * Tracks active grab state: which panel is being held by which hand.
 */
interface ActiveGrab {
  panelId: string;
  hand: 'left' | 'right';
}

/**
 * GrabHandler — renderless component that translates controller grab/release
 * events into panel-level grab/release events.
 *
 * For VR: listens to grip (squeeze) button events from ControllerBridge.
 * Panel identification happens via the entityId field on controller events,
 * which is populated when the controller ray intersects a panel handle mesh.
 */
export function GrabHandler(): null {
  const activeGrab = useRef<ActiveGrab | null>(null);

  useEffect(() => {
    const unsubGrab = bus.subscribe(SpatialEvents.CONTROLLER_GRAB, (event: any) => {
      const { hand, entityId } = event.payload ?? {};
      if (!entityId) return; // No panel under the controller ray

      // Check if the entityId corresponds to a panel (panels use 'panel:' prefix)
      if (typeof entityId === 'string' && entityId.startsWith('panel:')) {
        const panelId = entityId.slice('panel:'.length);
        activeGrab.current = { panelId, hand };
        bus.emit(SpatialEvents.PANEL_GRABBED, { panelId, hand });
      }
    });

    const unsubRelease = bus.subscribe(SpatialEvents.CONTROLLER_RELEASE, (event: any) => {
      const { hand } = event.payload ?? {};
      if (!activeGrab.current) return;
      if (activeGrab.current.hand !== hand) return;

      const { panelId } = activeGrab.current;
      activeGrab.current = null;
      bus.emit(SpatialEvents.PANEL_RELEASED, { panelId, hand });
    });

    return () => {
      unsubGrab();
      unsubRelease();
    };
  }, []);

  return null;
}
