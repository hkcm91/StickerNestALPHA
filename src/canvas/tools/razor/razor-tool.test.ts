/**
 * Razor Tool Tests
 *
 * @module canvas/tools/razor/razor-tool.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { useTimelineStore } from '../../../kernel/stores/timeline/timeline.store';
import type { CanvasPointerEvent } from '../registry';

import { createRazorTool } from './razor-tool';

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

describe('RazorTool', () => {
  let tool: ReturnType<typeof createRazorTool>;

  beforeEach(() => {
    tool = createRazorTool();
    useTimelineStore.getState().reset();
    useTimelineStore.getState().enterTimelineMode();
    useTimelineStore.getState().setZoom(100); // 100 px/sec
  });

  afterEach(() => {
    useTimelineStore.getState().reset();
  });

  it('splits clip at click position', () => {
    const store = useTimelineStore.getState();
    store.addTrack({
      id: 'track-1', name: 'Track 1', type: 'entity',
      order: 0, locked: false, visible: true, volume: 1, solo: false, height: 40,
    });
    store.addClip({
      id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
      timelineIn: 0, timelineOut: 10, sourceIn: 0,
      speed: 1, muted: false, disabled: false, blendMode: 'normal',
    });

    // Click at x=500 with 100px/sec = 5.0 seconds
    tool.onPointerDown(makePointerEvent(500));

    const clips = useTimelineStore.getState().clips;
    expect(clips.length).toBe(2);

    // Original clip should be trimmed to end at 5s
    const original = clips.find((c) => c.id === 'clip-1');
    expect(original?.timelineOut).toBe(5);

    // New clip should start at 5s
    const newClip = clips.find((c) => c.id !== 'clip-1');
    expect(newClip?.timelineIn).toBe(5);
  });

  it('does not split when not in timeline mode', () => {
    const store = useTimelineStore.getState();
    store.exitTimelineMode();

    store.addClip({
      id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
      timelineIn: 0, timelineOut: 10, sourceIn: 0,
      speed: 1, muted: false, disabled: false, blendMode: 'normal',
    });

    tool.onPointerDown(makePointerEvent(500));

    expect(useTimelineStore.getState().clips.length).toBe(1);
  });

  it('does not split when clicking outside any clip', () => {
    const store = useTimelineStore.getState();
    store.addClip({
      id: 'clip-1', trackId: 'track-1', entityId: 'entity-1',
      timelineIn: 0, timelineOut: 5, sourceIn: 0,
      speed: 1, muted: false, disabled: false, blendMode: 'normal',
    });

    // Click at x=800 = 8.0 seconds, outside clip range (0-5)
    tool.onPointerDown(makePointerEvent(800));

    expect(useTimelineStore.getState().clips.length).toBe(1);
  });
});
