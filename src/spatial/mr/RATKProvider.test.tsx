/**
 * Tests for RATKProvider
 *
 * @module spatial/mr/RATKProvider.test
 * @layer L4B
 */

import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Interfaces (type-only, no runtime effect)
// ---------------------------------------------------------------------------

interface MockPlane {
  xrPlane: object;
  semanticLabel: string | undefined;
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  planeMesh: null;
  boundingRectangleWidth: number;
  boundingRectangleHeight: number;
}

interface MockRMesh {
  xrMesh: object;
  semanticLabel: string | undefined;
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  meshMesh: null;
}

// ---------------------------------------------------------------------------
// Hoisted RATK mock — vi.hoisted runs before vi.mock factories
// ---------------------------------------------------------------------------

const {
  MockRealityAccelerator,
  mockRoot,
  mockState,
} = vi.hoisted(() => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const mockState = {
    onPlaneAdded: undefined as ((plane: any) => void) | undefined,
    onPlaneDeleted: undefined as ((plane: any) => void) | undefined,
    onMeshAdded: undefined as ((mesh: any) => void) | undefined,
    onMeshDeleted: undefined as ((mesh: any) => void) | undefined,
    updateCalled: 0,
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const mockRoot = { uuid: 'mock-root' };

  const MockRealityAccelerator = vi.fn().mockImplementation(() => {
    const instance = {
      root: mockRoot,
      planes: new Set(),
      meshes: new Set(),
      anchors: new Set(),
      hitTestTargets: new Set(),
      update: vi.fn(() => { mockState.updateCalled++; }),
      createAnchor: vi.fn(),
      deleteAnchor: vi.fn(),
      createHitTestTargetFromViewerSpace: vi.fn(),
      createHitTestTargetFromControllerSpace: vi.fn(),
      deleteHitTestTarget: vi.fn(),
      get onPlaneAdded() { return mockState.onPlaneAdded; },
      set onPlaneAdded(fn: ((p: unknown) => void) | undefined) { mockState.onPlaneAdded = fn; },
      get onPlaneDeleted() { return mockState.onPlaneDeleted; },
      set onPlaneDeleted(fn: ((p: unknown) => void) | undefined) { mockState.onPlaneDeleted = fn; },
      get onMeshAdded() { return mockState.onMeshAdded; },
      set onMeshAdded(fn: ((m: unknown) => void) | undefined) { mockState.onMeshAdded = fn; },
      get onMeshDeleted() { return mockState.onMeshDeleted; },
      set onMeshDeleted(fn: ((m: unknown) => void) | undefined) { mockState.onMeshDeleted = fn; },
    };
    return instance;
  });

  return { MockRealityAccelerator, mockRoot, mockState };
});

vi.mock('ratk', () => ({
  RealityAccelerator: MockRealityAccelerator,
}));

// ---------------------------------------------------------------------------
// Mock @react-three/fiber (lazy references — safe without hoisting)
// ---------------------------------------------------------------------------

let mockUseFrameCallback: ((state: unknown, delta: number) => void) | null = null;

const mockScene = {
  add: vi.fn(),
  remove: vi.fn(),
};

const mockGl = {
  xr: { getSession: vi.fn() },
};

vi.mock('@react-three/fiber', () => ({
  useThree: () => ({
    gl: mockGl,
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

    React.useEffect(() => {
      const listener = () => setTick((t) => t + 1);
      stateListeners.add(listener);
      return () => { stateListeners.delete(listener); };
    }, []);

    return selector ? selector(mockXRState) : mockXRState;
  },
}));

// ---------------------------------------------------------------------------
// Mock crypto.randomUUID
// ---------------------------------------------------------------------------

let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `mock-uuid-${++uuidCounter}`,
});

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { RATKProvider, useRATK } from './RATKProvider';

// ---------------------------------------------------------------------------
// Helper wrapper
// ---------------------------------------------------------------------------

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <RATKProvider>{children}</RATKProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RATKProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bus.unsubscribeAll();
    mockXRState = { session: undefined };
    mockState.onPlaneAdded = undefined;
    mockState.onPlaneDeleted = undefined;
    mockState.onMeshAdded = undefined;
    mockState.onMeshDeleted = undefined;
    mockState.updateCalled = 0;
    mockUseFrameCallback = null;
    uuidCounter = 0;
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
        <RATKProvider>
          <Child />
          {children}
        </RATKProvider>
      ),
    });

    expect(childRendered).toBe(true);
  });

  it('provides null via useRATK when no session is active', () => {
    const { result } = renderHook(() => useRATK(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeNull();
  });

  it('creates RealityAccelerator when session starts', () => {
    renderHook(() => useRATK(), { wrapper: TestWrapper });

    act(() => {
      setMockXRState({ session: {} });
    });

    expect(MockRealityAccelerator).toHaveBeenCalledWith(mockGl.xr);
  });

  it('adds ratk.root to scene on session start', () => {
    renderHook(() => useRATK(), { wrapper: TestWrapper });

    act(() => {
      setMockXRState({ session: {} });
    });

    expect(mockScene.add).toHaveBeenCalledWith(mockRoot);
  });

  it('emits PLANE_DETECTED on onPlaneAdded callback', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.PLANE_DETECTED, handler);

    renderHook(() => useRATK(), { wrapper: TestWrapper });

    act(() => {
      setMockXRState({ session: {} });
    });

    // Trigger the plane added callback
    expect(mockState.onPlaneAdded).toBeDefined();

    const fakePlane: MockPlane = {
      xrPlane: { polygon: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] },
      semanticLabel: 'floor',
      position: { x: 1, y: 2, z: 3 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      planeMesh: null,
      boundingRectangleWidth: 2,
      boundingRectangleHeight: 3,
    };

    act(() => {
      mockState.onPlaneAdded!(fakePlane);
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.PLANE_DETECTED,
        payload: expect.objectContaining({
          id: expect.any(String),
          semanticLabel: 'floor',
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          polygon: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        }),
      }),
    );
  });

  it('emits PLANE_REMOVED on onPlaneDeleted callback', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.PLANE_REMOVED, handler);

    renderHook(() => useRATK(), { wrapper: TestWrapper });

    act(() => {
      setMockXRState({ session: {} });
    });

    const xrPlaneObj = {};
    const fakePlane: MockPlane = {
      xrPlane: xrPlaneObj,
      semanticLabel: 'wall',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      planeMesh: null,
      boundingRectangleWidth: 1,
      boundingRectangleHeight: 1,
    };

    // First add to assign an ID
    act(() => {
      mockState.onPlaneAdded!(fakePlane);
    });

    // Then remove
    act(() => {
      mockState.onPlaneDeleted!(fakePlane);
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.PLANE_REMOVED,
        payload: expect.objectContaining({
          id: expect.any(String),
        }),
      }),
    );
  });

  it('emits MESH_DETECTED on onMeshAdded callback', () => {
    const handler = vi.fn();
    bus.subscribe(SpatialEvents.MESH_DETECTED, handler);

    renderHook(() => useRATK(), { wrapper: TestWrapper });

    act(() => {
      setMockXRState({ session: {} });
    });

    const fakeMesh: MockRMesh = {
      xrMesh: {},
      semanticLabel: 'global-mesh',
      position: { x: 0, y: 1, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      meshMesh: null,
    };

    act(() => {
      mockState.onMeshAdded!(fakeMesh);
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SpatialEvents.MESH_DETECTED,
        payload: expect.objectContaining({
          id: expect.any(String),
          semanticLabel: 'global-mesh',
          position: { x: 0, y: 1, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        }),
      }),
    );
  });

  it('cleans up on session end', () => {
    renderHook(() => useRATK(), { wrapper: TestWrapper });

    // Start session
    act(() => {
      setMockXRState({ session: {} });
    });

    expect(mockScene.add).toHaveBeenCalled();

    // End session
    act(() => {
      setMockXRState({ session: undefined });
    });

    expect(mockScene.remove).toHaveBeenCalledWith(mockRoot);
  });

  it('calls ratk.update() via useFrame', () => {
    renderHook(() => useRATK(), { wrapper: TestWrapper });

    act(() => {
      setMockXRState({ session: {} });
    });

    // Simulate a frame
    expect(mockUseFrameCallback).toBeDefined();
    mockUseFrameCallback!({}, 0.016);

    expect(mockState.updateCalled).toBeGreaterThan(0);
  });
});
