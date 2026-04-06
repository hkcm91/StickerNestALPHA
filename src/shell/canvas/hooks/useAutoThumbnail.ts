/**
 * useAutoThumbnail — periodically captures the canvas viewport as a thumbnail.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import { useCallback, useEffect, useRef } from 'react';

import { updateCanvasThumbnail } from '../../../kernel/social-graph/canvases';
import { useAuthStore } from '../../../kernel/stores/auth/auth.store';
import { useCanvasStore } from '../../../kernel/stores/canvas/canvas.store';
import { captureAndUploadThumbnail } from '../utils/thumbnail-capture';

/** Minimum time between captures (ms) */
const COOLDOWN_MS = 60_000;

export interface UseAutoThumbnailOptions {
  canvasId: string | null;
  viewportRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  intervalMinutes?: number;
}

/**
 * Periodically captures the canvas viewport and uploads it as a thumbnail.
 * Returns a manual `captureNow` function for on-demand use.
 */
export function useAutoThumbnail({
  canvasId,
  viewportRef,
  enabled,
  intervalMinutes = 5,
}: UseAutoThumbnailOptions) {
  const lastCaptureRef = useRef(0);
  const capturingRef = useRef(false);

  const captureNow = useCallback(async () => {
    const el = viewportRef.current;
    if (!el || !canvasId || capturingRef.current) return;

    // Cooldown check
    if (Date.now() - lastCaptureRef.current < COOLDOWN_MS) return;

    capturingRef.current = true;
    try {
      const url = await captureAndUploadThumbnail(el, canvasId);
      lastCaptureRef.current = Date.now();

      // Update local store
      useCanvasStore.getState().setCanvasThumbnail(url);

      // Persist to DB
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        await updateCanvasThumbnail(canvasId, url, userId);
      }
    } catch {
      // Thumbnail capture is best-effort; don't block the user
    } finally {
      capturingRef.current = false;
    }
  }, [canvasId, viewportRef]);

  // Periodic auto-capture
  useEffect(() => {
    if (!enabled || !canvasId) return;

    const intervalMs = intervalMinutes * 60_000;

    const tick = () => {
      // Skip if tab is hidden
      if (document.hidden) return;
      captureNow();
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [enabled, canvasId, intervalMinutes, captureNow]);

  return { captureNow, lastCaptureRef };
}
