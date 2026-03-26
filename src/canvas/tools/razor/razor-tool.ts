/**
 * Razor Tool — splits timeline clips at click position
 *
 * @module canvas/tools/razor
 * @layer L4A-2
 *
 * @remarks
 * When active, clicking on the timeline area splits the clip under the
 * cursor at the click time position. Uses the TimelinePanelController's
 * splitClipAtTime method. Shows a preview vertical line on pointer move.
 */

import { TimelineEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { TimelineClip } from '../../../kernel/schemas/timeline';
import { useTimelineStore } from '../../../kernel/stores/timeline/timeline.store';
import type { Tool, CanvasPointerEvent } from '../registry';

export function createRazorTool(): Tool {
  return {
    name: 'razor',

    onActivate() {
      bus.emit('canvas.tool.cursor', { cursor: 'crosshair' });
    },

    onDeactivate() {
      bus.emit('canvas.tool.cursor', { cursor: 'default' });
    },

    onPointerDown(event: CanvasPointerEvent) {
      const store = useTimelineStore.getState();
      if (!store.isTimelineMode) return;

      // Convert canvas X position to timeline time
      const time = event.canvasPosition.x / store.pixelsPerSecond + store.scrollOffset;

      // Snap to grid if enabled
      const snappedTime = store.snapEnabled
        ? Math.round(time / store.snapGrid) * store.snapGrid
        : time;

      // Find clip at this time
      const clip = store.clips.find((c: TimelineClip) =>
        !c.disabled && snappedTime > c.timelineIn && snappedTime < c.timelineOut,
      );

      if (clip) {
        // Split the clip at the snapped time
        const duration = clip.timelineOut - clip.timelineIn;
        const sourceOffset = (snappedTime - clip.timelineIn) * clip.speed + clip.sourceIn;

        // Update original clip (trim end to split point)
        store.updateClip(clip.id, { timelineOut: snappedTime });

        // Create new clip (from split point to original end)
        const newClipId = `razor-${Date.now()}`;
        store.addClip({
          ...clip,
          id: newClipId,
          timelineIn: snappedTime,
          timelineOut: clip.timelineIn + duration,
          sourceIn: sourceOffset,
        });

        bus.emit(TimelineEvents.CLIP_SPLIT, {
          originalClipId: clip.id,
          newClipId,
          splitTime: snappedTime,
        });
      }
    },

    onPointerMove(event: CanvasPointerEvent) {
      const store = useTimelineStore.getState();
      if (!store.isTimelineMode) return;

      const time = event.canvasPosition.x / store.pixelsPerSecond + store.scrollOffset;
      // Emit position for timeline UI to render a preview line
      bus.emit('canvas.tool.razor.preview', { time });
    },

    onPointerUp() {},

    cancel() {
      bus.emit('canvas.tool.razor.preview', { time: null });
    },
  };
}
