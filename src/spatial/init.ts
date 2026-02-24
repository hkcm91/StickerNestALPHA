/**
 * Spatial -- initialization
 *
 * Provides programmatic control over the spatial layer for the shell to
 * call during application startup. The actual rendering is handled by
 * `<SpatialRoot>`, a React component that composes all spatial sub-modules.
 *
 * This module exposes imperative helpers for entering/exiting XR sessions
 * and checking WebXR availability. The heavy lifting is done declaratively
 * by the R3F component tree mounted via `<SpatialRoot>`.
 *
 * @module spatial/init
 * @layer L4B
 */

import { enterXR, exitXR } from './session/xr-store';
import type { ImmersiveXRMode } from './session/xr-store';

// ---------------------------------------------------------------------------
// WebXR feature detection
// ---------------------------------------------------------------------------

/**
 * Check whether the current browser supports a given XR session mode.
 *
 * @param mode - The XR session mode to check. Defaults to `'immersive-vr'`.
 * @returns A promise that resolves to `true` if supported, `false` otherwise.
 */
export async function isXRSupported(
  mode: ImmersiveXRMode = 'immersive-vr',
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.xr) {
    return false;
  }
  try {
    return await navigator.xr.isSessionSupported(mode);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session helpers (thin wrappers re-exported for convenience)
// ---------------------------------------------------------------------------

export { enterXR, exitXR };
export type { ImmersiveXRMode };

// ---------------------------------------------------------------------------
// Legacy compatibility -- remove after imperative callers are migrated
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `<SpatialRoot>` component instead.
 * Kept for backward compatibility during the migration period.
 * Returns a stub context -- the real spatial layer is managed by R3F.
 */
export function initSpatial(): { initialized: true } {
  // eslint-disable-next-line no-console
  console.warn(
    '[StickerNest] initSpatial() is deprecated. Use <SpatialRoot> component instead.',
  );
  return { initialized: true };
}

/**
 * @deprecated Use `exitXR()` instead or unmount `<SpatialRoot>`.
 */
export function teardownSpatial(): void {
  // eslint-disable-next-line no-console
  console.warn(
    '[StickerNest] teardownSpatial() is deprecated. Unmount <SpatialRoot> or call exitXR().',
  );
  exitXR();
}

/**
 * @deprecated The spatial layer is always available when `<SpatialRoot>` is mounted.
 * Returns `true` unconditionally.
 */
export function isSpatialInitialized(): boolean {
  return true;
}
