/**
 * Slip Tool — adjusts source in/out without moving clip on timeline
 *
 * @module canvas/tools/slip
 * @layer L4A-2
 *
 * @remarks
 * Dragging with the slip tool shifts the source media offset (sourceIn)
 * while keeping the clip's timeline position (timelineIn/timelineOut) fixed.
 * This changes WHAT part of the source media is shown, not WHERE it appears.
 */

import { bus } from '../../../kernel/bus';
import type { TimelineClip } from '../../../kernel/schemas/timeline';
import { useTimelineStore } from '../../../kernel/stores/timeline/timeline.store';
import type { Tool, CanvasPointerEvent } from '../registry';

export function createSlipTool(): Tool {
  let activeClip: TimelineClip | null = null;
  let startX = 0;
  let originalSourceIn = 0;

  return {
    name: 'slip',

    onActivate() {
      bus.emit('canvas.tool.cursor', { cursor: 'ew-resize' });
    },

    onDeactivate() {
      activeClip = null;
      bus.emit('canvas.tool.cursor', { cursor: 'default' });
    },

    onPointerDown(event: CanvasPointerEvent) {
      const store = useTimelineStore.getState();
      if (!store.isTimelineMode) return;

      const time = event.canvasPosition.x / store.pixelsPerSecond + store.scrollOffset;

      // Find clip under pointer
      const clip = store.clips.find((c: TimelineClip) =>
        !c.disabled && time >= c.timelineIn && time <= c.timelineOut,
      );

      if (clip) {
        activeClip = clip;
        startX = event.canvasPosition.x;
        originalSourceIn = clip.sourceIn;
      }
    },

    onPointerMove(event: CanvasPointerEvent) {
      if (!activeClip) return;

      const store = useTimelineStore.getState();
      const deltaX = event.canvasPosition.x - startX;
      const deltaTime = deltaX / store.pixelsPerSecond;

      // Calculate new sourceIn
      let newSourceIn = originalSourceIn + deltaTime * activeClip.speed;

      // Clamp: sourceIn must be >= 0
      if (newSourceIn < 0) newSourceIn = 0;

      store.updateClip(activeClip.id, { sourceIn: newSourceIn });
    },

    onPointerUp() {
      activeClip = null;
    },

    cancel() {
      if (activeClip) {
        // Restore original sourceIn
        useTimelineStore.getState().updateClip(activeClip.id, {
          sourceIn: originalSourceIn,
        });
        activeClip = null;
      }
    },
  };
}
