/**
 * XR Session Manager — WebXR session lifecycle
 *
 * @module spatial/xr-session
 * @layer L4B
 */

import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

export interface XRSessionManager {
  enterVR(): Promise<{ success: boolean; error?: string }>;
  exitVR(): Promise<void>;
  isInVR(): boolean;
  isXRSupported(): Promise<boolean>;
}

export function createXRSessionManager(): XRSessionManager {
  let session: unknown = null;
  let inVR = false;

  return {
    async enterVR() {
      try {
        const xr = (navigator as any).xr;
        if (!xr) {
          return { success: false, error: 'WebXR not available' };
        }

        const supported = await xr.isSessionSupported('immersive-vr');
        if (!supported) {
          return { success: false, error: 'Immersive VR not supported' };
        }

        session = await xr.requestSession('immersive-vr');
        inVR = true;
        bus.emit(SpatialEvents.SESSION_STARTED, {});
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    },

    async exitVR() {
      if (session && typeof (session as any).end === 'function') {
        await (session as any).end();
      }
      session = null;
      inVR = false;
      bus.emit(SpatialEvents.SESSION_ENDED, {});
    },

    isInVR() {
      return inVR;
    },

    async isXRSupported() {
      try {
        const xr = (navigator as any).xr;
        if (!xr) return false;
        return await xr.isSessionSupported('immersive-vr');
      } catch {
        return false;
      }
    },
  };
}
