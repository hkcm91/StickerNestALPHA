/**
 * Slip Tool Tests
 *
 * @module canvas/tools/slip/slip-tool.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { useTimelineStore } from '../../../kernel/stores/timeline/timeline.store';
import type { CanvasPointerEvent } from '../registry';

import { createSlipTool } from './slip-tool';

function makePointerEvent(x: number, y = 0): CanvasPointerEvent {
  return {
    canvasPosition: { x, y },
    screenPosition: { x, y },
    entityId: null,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
  };
}

describe('SlipTool', () => {
  let tool: ReturnType<typeof createSlipTool>;

  beforeEach(() => {
    tool = createSlipTool();
    useTimelineStore.getState().reset();
    useTimelineStore.getState().enterTimelineMode();
    useTimelineStore.getState().setZoom(100); // 100 px/sec
  });

  afterEach(() => {
    useTimelineStore.getState().reset();
  });

  it('adjusts sourceIn without changing timeline position', () => {
    const store = useTimelineStore.getState();
    store.addClip({
      id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
      timelineIn: 2, timelineOut: 8, sourceIn: 0,
      speed: 1, muted: false, disabled: false, blendMode: 'normal',
    });

    // Start drag at x=500 (5s), move to x=700 (7s) = +2s delta
    tool.onPointerDown(makePointerEvent(500));
    tool.onPointerMove(makePointerEvent(700));
    tool.onPointerUp();

    const clip = useTimelineStore.getState().clips[0];
    expect(clip.timelineIn).toBe(2); // Unchanged
    expect(clip.timelineOut).toBe(8); // Unchanged
    expect(clip.sourceIn).toBeCloseTo(2, 1); // Shifted by 2s
  });

  it('clamps sourceIn to >= 0', () => {
    const store = useTimelineStore.getState();
    store.addClip({
      id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
      timelineIn: 0, timelineOut: 5, sourceIn: 1,
      speed: 1, muted: false, disabled: false, blendMode: 'normal',
    });

    // Drag left by 300px = -3s, would make sourceIn = 1 + (-3) = -2
    tool.onPointerDown(makePointerEvent(250));
    tool.onPointerMove(makePointerEvent(-50));
    tool.onPointerUp();

    const clip = useTimelineStore.getState().clips[0];
    expect(clip.sourceIn).toBe(0); // Clamped
  });

  it('cancel restores original sourceIn', () => {
    const store = useTimelineStore.getState();
    store.addClip({
      id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
      timelineIn: 0, timelineOut: 5, sourceIn: 3,
      speed: 1, muted: false, disabled: false, blendMode: 'normal',
    });

    tool.onPointerDown(makePointerEvent(250));
    tool.onPointerMove(makePointerEvent(500));
    // Cancel instead of releasing
    tool.cancel();

    const clip = useTimelineStore.getState().clips[0];
    expect(clip.sourceIn).toBe(3); // Restored
  });
});
