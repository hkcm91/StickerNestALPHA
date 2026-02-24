/**
 * SessionBridge — renderless component that bridges XR session state to the event bus
 *
 * Must be placed inside a `<Canvas><XR>` tree so that `useXR()` resolves.
 * Listens for XR session lifecycle changes and emits corresponding
 * `spatial.session.*` bus events. Returns `null` — no visual output.
 *
 * @module spatial/session/SessionBridge
 * @layer L4B
 */

import { useXR } from '@react-three/xr';
import { useEffect, useRef } from 'react';


import { SpatialEvents } from '@sn/types';
import type { XRSessionMode } from '@sn/types';

import { bus } from '../../kernel/bus';

/**
 * Renderless React component that bridges @react-three/xr session
 * state changes to the StickerNest event bus.
 *
 * Events emitted:
 * - `spatial.session.started` when an XR session begins
 * - `spatial.session.ended` when an XR session ends
 * - `spatial.session.mode.changed` when the session mode changes
 * - `spatial.session.visibility.changed` when the session visibility state changes
 */
export function SessionBridge(): null {
  // Read the XR state slices we care about
  const session = useXR((s) => s.session);
  const mode = useXR((s) => s.mode);
  const visibilityState = useXR((s) => s.visibilityState);

  // Track previous values to detect transitions
  const prevSessionRef = useRef<XRSession | undefined>(undefined);
  const modeRef = useRef<XRSessionMode | null>(null);
  const prevModeRef = useRef<XRSessionMode | null>(null);
  const prevVisibilityRef = useRef<XRVisibilityState | undefined>(undefined);

  // Keep mode ref current without triggering session effect
  modeRef.current = mode;

  // Session start / end — mode intentionally excluded from deps
  useEffect(() => {
    const prevSession = prevSessionRef.current;
    prevSessionRef.current = session;

    if (session && !prevSession) {
      // Session just started
      bus.emit(SpatialEvents.SESSION_STARTED, {
        mode: modeRef.current ?? 'immersive-vr',
      });
    } else if (!session && prevSession) {
      // Session just ended
      bus.emit(SpatialEvents.SESSION_ENDED, {});
    }
  }, [session]);

  // Session mode change
  useEffect(() => {
    const prevMode = prevModeRef.current;
    prevModeRef.current = mode;

    // Only emit when mode changes to a non-null value and differs from previous
    if (mode !== null && mode !== prevMode && prevMode !== null) {
      bus.emit(SpatialEvents.SESSION_MODE_CHANGED, {
        previous: prevMode as XRSessionMode,
        current: mode as XRSessionMode,
      });
    }
  }, [mode]);

  // Visibility state change
  useEffect(() => {
    const prevVisibility = prevVisibilityRef.current;
    prevVisibilityRef.current = visibilityState;

    // Only emit when visibility changes and there was a previous value
    if (
      visibilityState !== undefined &&
      visibilityState !== prevVisibility &&
      prevVisibility !== undefined
    ) {
      bus.emit(SpatialEvents.SESSION_VISIBILITY_CHANGED, {
        previous: prevVisibility,
        current: visibilityState,
      });
    }
  }, [visibilityState]);

  return null;
}
