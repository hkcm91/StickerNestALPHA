import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SpatialEvents } from '@sn/types';
import type { SpatialContext } from '@sn/types';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Mock @react-three/xr
//
// We simulate useXRInputSourceState(type, hand) by storing mutable state
// that tests can update. Each call returns the mock controller state for
// the requested hand, or undefined if not connected.
// ---------------------------------------------------------------------------

interface MockGamepadComponentState {
  state: 'default' | 'touched' | 'pressed';
  button?: number;
  xAxis?: number;
  yAxis?: number;
}

interface MockControllerState {
  gamepad: Record<string, MockGamepadComponentState | undefined> | null;
  inputSource: {
    gripSpace: unknown;
    targetRaySpace: unknown;
    hand: null;
  } | null;
  object: {
    position: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
  } | null;
}

interface MockXRInputState {
  left: MockControllerState | undefined;
  right: MockControllerState | undefined;
}

let mockInputState: MockXRInputState = {
  left: undefined,
  right: undefined,
};

const stateListeners = new Set<() => void>();

function setMockInputState(patch: Partial<MockXRInputState>): void {
  mockInputState = { ...mockInputState, ...patch };
  for (const listener of stateListeners) {
    listener();
  }
}

function createMockControllerState(
  selectPressed = false,
  squeezePressed = false,
  position = { x: 1, y: 2, z: 3 },
): MockControllerState {
  return {
    gamepad: {
      'xr-standard-trigger': { state: selectPressed ? 'pressed' : 'default' },
      'xr-standard-squeeze': { state: squeezePressed ? 'pressed' : 'default' },
    },
    inputSource: {
      gripSpace: {},
      targetRaySpace: {},
      hand: null,
    },
    object: {
      position,
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
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

    if (type === 'controller') {
      return hand === 'left' ? mockInputState.left : mockInputState.right;
    }
    return undefined;
  },
}));

// Import AFTER mock setup
import { ControllerBridge, processControllerButtons } from './ControllerBridge';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ControllerBridge', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    mockInputState = { left: undefined, right: undefined };
    stateListeners.clear();
  });

  afterEach(() => {
    bus.unsubscribeAll();
    stateListeners.clear();
  });

  it('renders null (no visual output)', () => {
    const { result } = renderHook(() => ControllerBridge());
    expect(result.current).toBeNull();
  });

  it('emits CONTROLLER_SELECT when trigger is pressed on right controller', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_SELECT, handler);

    const { unmount } = renderHook(() => ControllerBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Connect right controller with trigger not pressed
    act(() => {
      setMockInputState({
        right: createMockControllerState(false, false),
      });
    });

    // Press trigger
    act(() => {
      setMockInputState({
        right: createMockControllerState(true, false),
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.CONTROLLER_SELECT,
        payload: { hand: 'right', entityId: null },
      }),
    );

    unmount();
  });

  it('emits CONTROLLER_SELECT when trigger is pressed on left controller', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_SELECT, handler);

    const { unmount } = renderHook(() => ControllerBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Connect left controller
    act(() => {
      setMockInputState({
        left: createMockControllerState(false, false),
      });
    });

    // Press trigger on left
    act(() => {
      setMockInputState({
        left: createMockControllerState(true, false),
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.hand).toBe('left');

    unmount();
  });

  it('emits CONTROLLER_GRAB when grip is pressed', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_GRAB, handler);

    const { unmount } = renderHook(() => ControllerBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Connect right controller with grip not pressed
    act(() => {
      setMockInputState({
        right: createMockControllerState(false, false),
      });
    });

    // Press grip
    act(() => {
      setMockInputState({
        right: createMockControllerState(false, true),
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.CONTROLLER_GRAB,
        payload: { hand: 'right', entityId: null },
      }),
    );

    unmount();
  });

  it('emits CONTROLLER_RELEASE when grip is released', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_RELEASE, handler);

    const { unmount } = renderHook(() => ControllerBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Connect right controller with grip pressed
    act(() => {
      setMockInputState({
        right: createMockControllerState(false, true),
      });
    });

    // Release grip
    act(() => {
      setMockInputState({
        right: createMockControllerState(false, false),
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.CONTROLLER_RELEASE,
        payload: { hand: 'right', entityId: null },
      }),
    );

    unmount();
  });

  it('populates spatial context from controller object position', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_SELECT, handler);

    const { unmount } = renderHook(() => ControllerBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    const position = { x: 0.5, y: 1.2, z: -0.3 };

    // Connect then press trigger
    act(() => {
      setMockInputState({
        right: createMockControllerState(false, false, position),
      });
    });

    act(() => {
      setMockInputState({
        right: createMockControllerState(true, false, position),
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0];
    expect(event.spatial).toBeDefined();
    expect(event.spatial.position).toEqual(position);
    expect(event.spatial.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });

    unmount();
  });

  it('does not emit events when controller is not connected', () => {
    const selectHandler = vi.fn();
    const grabHandler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_SELECT, selectHandler);
    bus.subscribe(SpatialEvents.CONTROLLER_GRAB, grabHandler);

    const { unmount } = renderHook(() => ControllerBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // No controller connected -- trigger a re-render
    act(() => {
      setMockInputState({ left: undefined, right: undefined });
    });

    expect(selectHandler).not.toHaveBeenCalled();
    expect(grabHandler).not.toHaveBeenCalled();

    unmount();
  });
});

// ---------------------------------------------------------------------------
// Unit tests for the extracted processControllerButtons function
// ---------------------------------------------------------------------------

describe('processControllerButtons', () => {
  const testSpatial: SpatialContext = {
    position: { x: 1, y: 2, z: 3 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    normal: { x: 0, y: 0, z: -1 },
  };

  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => bus.unsubscribeAll());

  it('emits CONTROLLER_SELECT on select press transition', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_SELECT, handler);

    processControllerButtons('right', true, false, false, false, testSpatial);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ hand: 'right', entityId: null });
    expect(handler.mock.calls[0][0].spatial).toEqual(testSpatial);
  });

  it('does not emit CONTROLLER_SELECT when select is held (no transition)', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_SELECT, handler);

    processControllerButtons('right', true, false, true, false, testSpatial);

    expect(handler).not.toHaveBeenCalled();
  });

  it('emits CONTROLLER_GRAB on squeeze press transition', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_GRAB, handler);

    processControllerButtons('left', false, true, false, false, testSpatial);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.hand).toBe('left');
  });

  it('emits CONTROLLER_RELEASE on squeeze release transition', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_RELEASE, handler);

    processControllerButtons('right', false, false, false, true, testSpatial);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.hand).toBe('right');
  });

  it('passes spatial context as undefined when not provided', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.CONTROLLER_SELECT, handler);

    processControllerButtons('right', true, false, false, false, undefined);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].spatial).toBeUndefined();
  });
});
