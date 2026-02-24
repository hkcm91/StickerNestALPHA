/**
 * XR Store — singleton @react-three/xr v6 store for WebXR session management
 *
 * Wraps `createXRStore()` from @react-three/xr and provides helpers
 * to enter/exit XR sessions. This is the R3F-based replacement for
 * the imperative `createXRSessionManager()` in `../xr-session/`.
 *
 * @module spatial/session/xr-store
 * @layer L4B
 */

import { createXRStore } from '@react-three/xr';

/**
 * Supported immersive XR session modes.
 * `inline` is excluded — it is a non-immersive mode that does not
 * require `enterVR()` or `enterAR()`.
 */
export type ImmersiveXRMode = 'immersive-vr' | 'immersive-ar';

/**
 * Singleton XR store configured for Quest 3 mixed-reality features.
 *
 * `requiredFeatures` ensure the session fails if the runtime cannot
 * provide a floor-relative reference space.
 *
 * `optionalFeatures` are best-effort: the session starts even if the
 * runtime does not support hand-tracking, plane detection, etc.
 */
export const xrStore = createXRStore({
  handTracking: true,
  planeDetection: true,
  meshDetection: true,
  anchors: true,
  hitTest: true,
  customSessionInit: {
    requiredFeatures: ['local-floor'],
  },
});

/**
 * Enter an XR session.
 *
 * @param mode - The immersive XR session mode. Defaults to `'immersive-vr'`.
 *               Pass `'immersive-ar'` for passthrough mixed reality.
 */
export function enterXR(mode: ImmersiveXRMode = 'immersive-vr'): void {
  if (mode === 'immersive-ar') {
    xrStore.enterAR();
  } else {
    xrStore.enterVR();
  }
}

/**
 * Exit the current XR session, if any.
 *
 * This is a no-op when no session is active.
 */
export function exitXR(): void {
  // XRStore exposes session on its state; end it if present
  const state = xrStore.getState();
  const session = state?.session;
  if (session) {
    void session.end();
  }
}
