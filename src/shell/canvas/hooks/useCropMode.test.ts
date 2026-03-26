/**
 * useCropMode — unit tests
 *
 * @module shell/canvas/hooks
 * @layer L6
 * @vitest-environment happy-dom
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { bus } from '../../../kernel/bus';
import { CropEvents, initCropHandler, getCropModeIds } from '../handlers';

import { useCropMode } from './useCropMode';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSceneGraph(entities: Record<string, any> = {}) {
  return {
    getEntity: (id: string) => entities[id],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCropMode', () => {
  let teardown: () => void;

  beforeEach(() => {
    // Init the crop handler so bus subscriptions are active
    teardown = initCropHandler(() => mockSceneGraph() as any);
  });

  // Clean up after each test to reset module-scoped crop state
  beforeEach(() => {
    return () => teardown();
  });

  it('returns an empty set by default', () => {
    const { result } = renderHook(() => useCropMode());
    expect(result.current.size).toBe(0);
  });

  it('reflects crop mode after TOGGLE event for a single entity', () => {
    const { result } = renderHook(() => useCropMode());

    act(() => {
      bus.emit(CropEvents.TOGGLE, { entityIds: ['ent-1'] });
    });

    expect(result.current.has('ent-1')).toBe(true);
    expect(result.current.size).toBe(1);
  });

  it('toggles crop mode off when same entity toggled again', () => {
    const { result } = renderHook(() => useCropMode());

    act(() => {
      bus.emit(CropEvents.TOGGLE, { entityIds: ['ent-1'] });
    });
    expect(result.current.has('ent-1')).toBe(true);

    act(() => {
      bus.emit(CropEvents.TOGGLE, { entityIds: ['ent-1'] });
    });
    expect(result.current.has('ent-1')).toBe(false);
    expect(result.current.size).toBe(0);
  });

  it('does not enter crop mode for multi-entity selection', () => {
    const { result } = renderHook(() => useCropMode());

    act(() => {
      bus.emit(CropEvents.TOGGLE, { entityIds: ['a', 'b'] });
    });

    // Multi-entity toggle doesn't enter crop mode (single entity only)
    expect(result.current.size).toBe(0);
  });
});
