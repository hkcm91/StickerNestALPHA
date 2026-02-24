import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Mock @react-three/xr
//
// We simulate the useXR(selector) hook by storing a mutable state object
// that tests can update. Each call to useXR(selector) returns selector(state).
// ---------------------------------------------------------------------------

interface MockXRState {
  session: XRSession | undefined;
  mode: XRSessionMode | null;
  visibilityState: XRVisibilityState | undefined;
}

let mockXRState: MockXRState = {
  session: undefined,
  mode: null,
  visibilityState: undefined,
};

// Subscribers that want to re-render when state changes
const stateListeners = new Set<() => void>();

function setMockXRState(patch: Partial<MockXRState>): void {
  mockXRState = { ...mockXRState, ...patch };
  // Notify all listeners so components re-render
  for (const listener of stateListeners) {
    listener();
  }
}

vi.mock('@react-three/xr', () => ({
  useXR: (selector?: (s: MockXRState) => unknown) => {
    // Force re-render on state changes using a simple trigger
    const [, setTick] = useState(0);

    // Register a listener so we re-render when mockXRState changes
    React.useEffect(() => {
      const listener = () => setTick((t) => t + 1);
      stateListeners.add(listener);
      return () => {
        stateListeners.delete(listener);
      };
    }, []);

    return selector ? selector(mockXRState) : mockXRState;
  },
}));

// Import SessionBridge AFTER the mock is set up
import { SessionBridge } from './SessionBridge';

// ---------------------------------------------------------------------------
// Wrapper that renders SessionBridge and allows state updates
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionBridge', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    mockXRState = {
      session: undefined,
      mode: null,
      visibilityState: undefined,
    };
    stateListeners.clear();
  });

  afterEach(() => {
    bus.unsubscribeAll();
    stateListeners.clear();
  });

  it('renders null (no visual output)', () => {
    const { result } = renderHook(() => {
      // SessionBridge is a component, not a hook. Let's render it directly.
      return SessionBridge();
    });
    expect(result.current).toBeNull();
  });

  it('emits SESSION_STARTED when XR session starts', async () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.SESSION_STARTED, handler);

    const { unmount } = renderHook(() => SessionBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Simulate session starting
    act(() => {
      setMockXRState({
        session: {} as XRSession,
        mode: 'immersive-vr',
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.SESSION_STARTED,
        payload: { mode: 'immersive-vr' },
      }),
    );

    unmount();
  });

  it('emits SESSION_ENDED when XR session ends', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.SESSION_ENDED, handler);

    const { unmount } = renderHook(() => SessionBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Start session first
    act(() => {
      setMockXRState({
        session: {} as XRSession,
        mode: 'immersive-vr',
      });
    });

    // Then end it
    act(() => {
      setMockXRState({
        session: undefined,
        mode: null,
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.SESSION_ENDED,
        payload: {},
      }),
    );

    unmount();
  });

  it('emits SESSION_MODE_CHANGED when mode changes', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.SESSION_MODE_CHANGED, handler);

    const { unmount } = renderHook(() => SessionBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Set initial mode (session start)
    act(() => {
      setMockXRState({
        session: {} as XRSession,
        mode: 'immersive-vr',
      });
    });

    // Change mode
    act(() => {
      setMockXRState({
        mode: 'immersive-ar',
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.SESSION_MODE_CHANGED,
        payload: {
          previous: 'immersive-vr',
          current: 'immersive-ar',
        },
      }),
    );

    unmount();
  });

  it('emits SESSION_VISIBILITY_CHANGED when visibility changes', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.SESSION_VISIBILITY_CHANGED, handler);

    const { unmount } = renderHook(() => SessionBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Set initial visibility
    act(() => {
      setMockXRState({
        session: {} as XRSession,
        mode: 'immersive-vr',
        visibilityState: 'visible',
      });
    });

    // Change visibility
    act(() => {
      setMockXRState({
        visibilityState: 'visible-blurred',
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.SESSION_VISIBILITY_CHANGED,
        payload: {
          previous: 'visible',
          current: 'visible-blurred',
        },
      }),
    );

    unmount();
  });

  it('does not emit SESSION_ENDED if session was never started', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.SESSION_ENDED, handler);

    const { unmount } = renderHook(() => SessionBridge(), {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Session stays undefined
    act(() => {
      setMockXRState({ session: undefined });
    });

    expect(handler).not.toHaveBeenCalled();

    unmount();
  });
});
