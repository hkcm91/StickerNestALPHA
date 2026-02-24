import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SpatialEvents } from '@sn/types';
import type { SpatialContext } from '@sn/types';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Mock @react-three/xr
//
// Simulate useXRInputSourceState('hand', hand) by storing mutable state.
// When state is non-undefined for a hand, hand tracking is considered active.
// ---------------------------------------------------------------------------

interface MockHandJointObject {
  position: { x: number; y: number; z: number };
}

interface MockHandState {
  inputSource: {
    hand: unknown; // Truthy = XRHand available
  } | null;
  object: {
    getObjectByName: (name: string) => MockHandJointObject | undefined;
  } | null;
}

interface MockHandInputState {
  left: MockHandState | undefined;
  right: MockHandState | undefined;
}

let mockHandState: MockHandInputState = {
  left: undefined,
  right: undefined,
};

const stateListeners = new Set<() => void>();

function setMockHandState(patch: Partial<MockHandInputState>): void {
  mockHandState = { ...mockHandState, ...patch };
  for (const listener of stateListeners) {
    listener();
  }
}

/**
 * Create a mock hand state with optional pinch configuration.
 *
 * @param pinchDistance Distance between thumb-tip and index-finger-tip (meters).
 *   Values < 0.025 indicate an active pinch gesture.
 */
function createMockHandState(pinchDistance = 0.1): MockHandState {
  const thumbPos = { x: 0, y: 0, z: 0 };
  const indexPos = { x: pinchDistance, y: 0, z: 0 };

  return {
    inputSource: {
      hand: {}, // truthy = hand tracking active
    },
    object: {
      getObjectByName: (name: string): MockHandJointObject | undefined => {
        if (name === 'thumb-tip') return { position: thumbPos };
        if (name === 'index-finger-tip') return { position: indexPos };
        return undefined;
      },
    },
  };
}

vi.mock('@react-three/xr', () => ({
  useXRInputSourceState: (type: string, hand: string) => {
    // Force re-render on state changes
    const [, setTick] = useState(0);

    React.useEffect(() => {
      const listener = () => setTick((t) => t + 1);
      stateListeners.add(listener);
      return () => {
        stateListeners.delete(listener);
      };
    }, []);

    if (type === 'hand') {
      return hand === 'left' ? mockHandState.left : mockHandState.right;
    }
    return undefined;
  },
}));

// Import AFTER mock setup
import { HandBridge, processHandState, buildPinchSpatialContext } from './HandBridge';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HandBridge', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    mockHandState = { left: undefined, right: undefined };
    stateListeners.clear();
  });

  afterEach(() => {
    bus.unsubscribeAll();
    stateListeners.clear();
  });

  it('renders null (no visual output)', () => {
    const { result } = renderHook(() => HandBridge());
    expect(result.current).toBeNull();
  });

  it('emits HAND_TRACKING_STARTED when hand tracking becomes available', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_TRACKING_STARTED, handler);

    const { unmount } = renderHook(() => HandBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Hand tracking starts on right hand
    act(() => {
      setMockHandState({
        right: createMockHandState(0.1), // not pinching
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.HAND_TRACKING_STARTED,
        payload: { hand: 'right' },
      }),
    );

    unmount();
  });

  it('emits HAND_TRACKING_ENDED when hand tracking is lost', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_TRACKING_ENDED, handler);

    const { unmount } = renderHook(() => HandBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Start hand tracking
    act(() => {
      setMockHandState({
        left: createMockHandState(0.1),
      });
    });

    // Lose hand tracking
    act(() => {
      setMockHandState({
        left: undefined,
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.HAND_TRACKING_ENDED,
        payload: { hand: 'left' },
      }),
    );

    unmount();
  });

  it('emits HAND_PINCH and HAND_GRAB when pinch gesture is detected', () => {
    const pinchHandler = vi.fn();
    const grabHandler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_PINCH, pinchHandler);
    bus.subscribe(SpatialEvents.HAND_GRAB, grabHandler);

    const { unmount } = renderHook(() => HandBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Start hand tracking (not pinching)
    act(() => {
      setMockHandState({
        right: createMockHandState(0.1),
      });
    });

    // Pinch (distance below threshold of 0.025)
    act(() => {
      setMockHandState({
        right: createMockHandState(0.01),
      });
    });

    expect(pinchHandler).toHaveBeenCalledTimes(1);
    expect(pinchHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.HAND_PINCH,
        payload: { hand: 'right' },
      }),
    );

    expect(grabHandler).toHaveBeenCalledTimes(1);
    expect(grabHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.HAND_GRAB,
        payload: { hand: 'right' },
      }),
    );

    unmount();
  });

  it('emits HAND_RELEASE when pinch gesture ends', () => {
    const releaseHandler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_RELEASE, releaseHandler);

    const { unmount } = renderHook(() => HandBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Start hand tracking (not pinching)
    act(() => {
      setMockHandState({
        right: createMockHandState(0.1),
      });
    });

    // Pinch
    act(() => {
      setMockHandState({
        right: createMockHandState(0.01),
      });
    });

    // Release pinch
    act(() => {
      setMockHandState({
        right: createMockHandState(0.1),
      });
    });

    expect(releaseHandler).toHaveBeenCalledTimes(1);
    expect(releaseHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.HAND_RELEASE,
        payload: { hand: 'right' },
      }),
    );

    unmount();
  });

  it('populates spatial context on pinch events from joint positions', () => {
    const pinchHandler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_PINCH, pinchHandler);

    const { unmount } = renderHook(() => HandBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Start hand tracking (not pinching)
    act(() => {
      setMockHandState({
        right: createMockHandState(0.1),
      });
    });

    // Pinch -- the mock creates thumb at (0,0,0) and index at (distance,0,0)
    act(() => {
      setMockHandState({
        right: createMockHandState(0.01),
      });
    });

    expect(pinchHandler).toHaveBeenCalledTimes(1);
    const event = pinchHandler.mock.calls[0][0];
    expect(event.spatial).toBeDefined();
    // Midpoint of (0,0,0) and (0.01,0,0) = (0.005,0,0)
    expect(event.spatial.position.x).toBeCloseTo(0.005);
    expect(event.spatial.position.y).toBeCloseTo(0);
    expect(event.spatial.position.z).toBeCloseTo(0);

    unmount();
  });

  it('does not emit events when no hands are tracked', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_TRACKING_STARTED, handler);
    bus.subscribe(SpatialEvents.HAND_PINCH, handler);

    const { unmount } = renderHook(() => HandBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // No hands connected
    act(() => {
      setMockHandState({ left: undefined, right: undefined });
    });

    expect(handler).not.toHaveBeenCalled();

    unmount();
  });
});

// ---------------------------------------------------------------------------
// Unit tests for extracted functions
// ---------------------------------------------------------------------------

describe('processHandState', () => {
  const testSpatial: SpatialContext = {
    position: { x: 0.5, y: 0.5, z: 0.5 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    normal: { x: 0, y: 1, z: 0 },
  };

  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  it('emits HAND_TRACKING_STARTED on tracking start transition', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_TRACKING_STARTED, handler);

    processHandState('left', true, false, false, false, undefined);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ hand: 'left' });
  });

  it('emits HAND_TRACKING_ENDED on tracking end transition', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_TRACKING_ENDED, handler);

    processHandState('right', false, false, true, false, undefined);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ hand: 'right' });
  });

  it('emits HAND_PINCH and HAND_GRAB on pinch start transition', () => {
    const pinchHandler = vi.fn();
    const grabHandler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_PINCH, pinchHandler);
    bus.subscribe(SpatialEvents.HAND_GRAB, grabHandler);

    processHandState('right', true, true, true, false, testSpatial);

    expect(pinchHandler).toHaveBeenCalledTimes(1);
    expect(pinchHandler.mock.calls[0][0].spatial).toEqual(testSpatial);
    expect(grabHandler).toHaveBeenCalledTimes(1);
  });

  it('emits HAND_RELEASE on pinch end transition', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_RELEASE, handler);

    processHandState('left', true, false, true, true, testSpatial);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ hand: 'left' });
  });

  it('does not emit when there is no state transition', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.HAND_TRACKING_STARTED, handler);
    bus.subscribe(SpatialEvents.HAND_TRACKING_ENDED, handler);
    bus.subscribe(SpatialEvents.HAND_PINCH, handler);
    bus.subscribe(SpatialEvents.HAND_RELEASE, handler);

    // Tracking stays active, not pinching stays not-pinching
    processHandState('right', true, false, true, false, undefined);

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('buildPinchSpatialContext', () => {
  it('computes midpoint between thumb and index positions', () => {
    const ctx = buildPinchSpatialContext(
      { x: 0, y: 2, z: 4 },
      { x: 2, y: 4, z: 6 },
    );

    expect(ctx.position).toEqual({ x: 1, y: 3, z: 5 });
  });

  it('returns identity rotation and up normal', () => {
    const ctx = buildPinchSpatialContext(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    );

    expect(ctx.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    expect(ctx.normal).toEqual({ x: 0, y: 1, z: 0 });
  });
});
