/**
 * Tests for TeleportProvider
 *
 * @module spatial/locomotion/TeleportProvider.test
 * @layer L4B
 */

import { renderHook, act } from '@testing-library/react';
import React, { useEffect, useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Mock @react-three/fiber
// ---------------------------------------------------------------------------

let mockUseFrameCallback: ((state: unknown, delta: number) => void) | null = null;

const mockScene = {
  position: { x: 0, y: 0, z: 0, set: vi.fn() },
  rotation: { x: 0, y: 0, z: 0, set: vi.fn() },
};

vi.mock('@react-three/fiber', () => ({
  useThree: () => ({
    scene: mockScene,
  }),
  useFrame: (cb: (state: unknown, delta: number) => void) => {
    mockUseFrameCallback = cb;
  },
}));

// ---------------------------------------------------------------------------
// Mock @react-three/xr
// ---------------------------------------------------------------------------

interface MockXRState {
  session: object | undefined;
}

let mockXRState: MockXRState = { session: undefined };
const stateListeners = new Set<() => void>();

function setMockXRState(patch: Partial<MockXRState>): void {
  mockXRState = { ...mockXRState, ...patch };
  for (const listener of stateListeners) {
    listener();
  }
}

vi.mock('@react-three/xr', () => ({
  useXR: (selector?: (s: MockXRState) => unknown) => {
    const [, setTick] = useState(0);

    useEffect(() => {
      const listener = () => setTick((t) => t + 1);
      stateListeners.add(listener);
      return () => { stateListeners.delete(listener); };
    }, []);

    return selector ? selector(mockXRState) : mockXRState;
  },
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { TeleportProvider } from './TeleportProvider';

// ---------------------------------------------------------------------------
// Helper wrapper
// ---------------------------------------------------------------------------

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <TeleportProvider>{children}</TeleportProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TeleportProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bus.unsubscribeAll();
    mockXRState = { session: undefined };
    mockUseFrameCallback = null;
    mockScene.position.set.mockClear();
    mockScene.rotation.set.mockClear();
    stateListeners.clear();
  });

  afterEach(() => {
    bus.unsubscribeAll();
    stateListeners.clear();
  });

  it('renders children', () => {
    let childRendered = false;

    function Child() {
      childRendered = true;
      return null;
    }

    renderHook(() => null, {
      wrapper: ({ children }) => (
        <TeleportProvider>
          <Child />
          {children}
        </TeleportProvider>
      ),
    });

    expect(childRendered).toBe(true);
  });

  it('subscribes to TELEPORT_REQUESTED on mount', () => {
    const subscribeSpy = vi.spyOn(bus, 'subscribe');

    renderHook(() => null, { wrapper: TestWrapper });

    // Verify the component subscribed to TELEPORT_REQUESTED
    expect(subscribeSpy).toHaveBeenCalledWith(
      SpatialEvents.TELEPORT_REQUESTED,
      expect.any(Function),
    );

    subscribeSpy.mockRestore();
  });

  it('moves scene origin on teleport request with zero fade', () => {
    renderHook(() => null, {
      wrapper: ({ children }) => (
        <TeleportProvider fadeDuration={0}>
          {children}
        </TeleportProvider>
      ),
    });

    // Start a session so originRef is set
    act(() => {
      setMockXRState({ session: {} });
    });

    // Emit teleport request
    act(() => {
      bus.emit(SpatialEvents.TELEPORT_REQUESTED, {
        position: { x: 1, y: 0, z: -3 },
      });
    });

    // Should negate position (moving origin is inverse of moving camera)
    expect(mockScene.position.set).toHaveBeenCalledWith(-1, -0, 3);
  });

  it('applies Y rotation on teleport request', () => {
    renderHook(() => null, {
      wrapper: ({ children }) => (
        <TeleportProvider fadeDuration={0}>
          {children}
        </TeleportProvider>
      ),
    });

    act(() => {
      setMockXRState({ session: {} });
    });

    act(() => {
      bus.emit(SpatialEvents.TELEPORT_REQUESTED, {
        position: { x: 0, y: 0, z: 0 },
        rotationY: Math.PI / 2,
      });
    });

    expect(mockScene.rotation.set).toHaveBeenCalledWith(0, -Math.PI / 2, 0);
  });

  it('does not teleport when disabled', () => {
    renderHook(() => null, {
      wrapper: ({ children }) => (
        <TeleportProvider enabled={false}>
          {children}
        </TeleportProvider>
      ),
    });

    act(() => {
      setMockXRState({ session: {} });
    });

    act(() => {
      bus.emit(SpatialEvents.TELEPORT_REQUESTED, {
        position: { x: 5, y: 0, z: 5 },
      });
    });

    expect(mockScene.position.set).not.toHaveBeenCalled();
  });

  it('executes delayed teleport after fade duration via useFrame', () => {
    renderHook(() => null, {
      wrapper: ({ children }) => (
        <TeleportProvider fadeDuration={0.2}>
          {children}
        </TeleportProvider>
      ),
    });

    act(() => {
      setMockXRState({ session: {} });
    });

    // Emit teleport request
    act(() => {
      bus.emit(SpatialEvents.TELEPORT_REQUESTED, {
        position: { x: 2, y: 0, z: -1 },
      });
    });

    // Position should NOT be set yet (waiting for fade)
    expect(mockScene.position.set).not.toHaveBeenCalled();

    // Simulate frames until fade completes
    expect(mockUseFrameCallback).toBeDefined();
    act(() => {
      mockUseFrameCallback!({}, 0.1); // 0.1s elapsed
    });
    expect(mockScene.position.set).not.toHaveBeenCalled();

    act(() => {
      mockUseFrameCallback!({}, 0.15); // 0.25s elapsed — past 0.2s fade
    });
    expect(mockScene.position.set).toHaveBeenCalledWith(-2, -0, 1);
  });

  it('cleans up bus subscription on unmount', () => {
    // Emit should be handled while mounted
    const { unmount } = renderHook(() => null, {
      wrapper: ({ children }) => (
        <TeleportProvider fadeDuration={0}>
          {children}
        </TeleportProvider>
      ),
    });

    act(() => {
      setMockXRState({ session: {} });
    });

    // Teleport should work while mounted
    act(() => {
      bus.emit(SpatialEvents.TELEPORT_REQUESTED, {
        position: { x: 1, y: 0, z: 0 },
      });
    });
    expect(mockScene.position.set).toHaveBeenCalledTimes(1);

    mockScene.position.set.mockClear();

    // After unmount, teleport events should have no effect
    unmount();

    act(() => {
      bus.emit(SpatialEvents.TELEPORT_REQUESTED, {
        position: { x: 5, y: 0, z: 5 },
      });
    });
    expect(mockScene.position.set).not.toHaveBeenCalled();
  });
});
