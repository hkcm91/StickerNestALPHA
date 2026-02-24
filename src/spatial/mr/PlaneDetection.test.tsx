/**
 * Tests for PlaneDetection
 *
 * @module spatial/mr/PlaneDetection.test
 * @layer L4B
 */

import { renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Mock RATK context via useRATK
// ---------------------------------------------------------------------------

interface MockPlane {
  xrPlane: { polygon: Array<{ x: number; y: number; z: number }> };
  semanticLabel: string | undefined;
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  planeMesh: { geometry: object } | null;
  boundingRectangleWidth: number;
  boundingRectangleHeight: number;
  needsUpdate?: boolean;
}

let mockRATKInstance: {
  planes: Set<MockPlane>;
  meshes: Set<unknown>;
} | null = null;

vi.mock('./RATKProvider', () => ({
  useRATK: () => mockRATKInstance,
}));

// ---------------------------------------------------------------------------
// Mock @react-three/fiber
// ---------------------------------------------------------------------------

let mockUseFrameCallback: ((state: unknown, delta: number) => void) | null = null;

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: (state: unknown, delta: number) => void) => {
    mockUseFrameCallback = cb;
  },
}));

// ---------------------------------------------------------------------------
// Mock Three.js DoubleSide constant
// ---------------------------------------------------------------------------

vi.mock('three', () => ({
  DoubleSide: 2,
}));

// ---------------------------------------------------------------------------
// Mock crypto.randomUUID
// ---------------------------------------------------------------------------

let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `plane-uuid-${++uuidCounter}`,
});

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { PlaneDetection } from './PlaneDetection';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlaneDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bus.unsubscribeAll();
    mockRATKInstance = null;
    mockUseFrameCallback = null;
    uuidCounter = 0;
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('renders nothing when no RATK instance is available', () => {
    mockRATKInstance = null;

    const { result } = renderHook(() => PlaneDetection());
    expect(result.current).toBeNull();
  });

  it('renders plane meshes for detected planes', () => {
    const plane: MockPlane = {
      xrPlane: { polygon: [] },
      semanticLabel: 'floor',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      planeMesh: null,
      boundingRectangleWidth: 2,
      boundingRectangleHeight: 3,
    };

    mockRATKInstance = {
      planes: new Set([plane]),
      meshes: new Set(),
    };

    const { result } = renderHook(() => PlaneDetection());
    expect(result.current).not.toBeNull();

    // Should render a group containing plane visuals
    const element = result.current as React.ReactElement;
    expect(element).toBeDefined();
    expect(element.type).toBe('group');
  });

  it('renders nothing when visible is false', () => {
    const plane: MockPlane = {
      xrPlane: { polygon: [] },
      semanticLabel: 'floor',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      planeMesh: null,
      boundingRectangleWidth: 2,
      boundingRectangleHeight: 3,
    };

    mockRATKInstance = {
      planes: new Set([plane]),
      meshes: new Set(),
    };

    const { result } = renderHook(() => PlaneDetection({ visible: false }));
    expect(result.current).toBeNull();
  });

  it('color-codes planes by semantic label', () => {
    const floorPlane: MockPlane = {
      xrPlane: { polygon: [] },
      semanticLabel: 'floor',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      planeMesh: null,
      boundingRectangleWidth: 2,
      boundingRectangleHeight: 3,
    };

    const wallPlane: MockPlane = {
      xrPlane: { polygon: [] },
      semanticLabel: 'wall',
      position: { x: 1, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      planeMesh: null,
      boundingRectangleWidth: 1,
      boundingRectangleHeight: 2,
    };

    mockRATKInstance = {
      planes: new Set([floorPlane, wallPlane]),
      meshes: new Set(),
    };

    const { result } = renderHook(() => PlaneDetection());

    // Verify both planes are rendered
    const element = result.current as React.ReactElement;
    expect(element).not.toBeNull();
    expect(element.props.children).toHaveLength(2);
  });

  it('emits PLANE_UPDATED bus event for planes with needsUpdate', () => {
    const handler = vi.fn();
    bus.subscribe('spatial.plane.updated', handler);

    const plane: MockPlane = {
      xrPlane: { polygon: [{ x: 0, y: 0, z: 0 }] },
      semanticLabel: 'table',
      position: { x: 1, y: 2, z: 3 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      planeMesh: null,
      boundingRectangleWidth: 1,
      boundingRectangleHeight: 1,
      needsUpdate: true,
    };

    mockRATKInstance = {
      planes: new Set([plane]),
      meshes: new Set(),
    };

    renderHook(() => PlaneDetection());

    // Simulate frame
    expect(mockUseFrameCallback).toBeDefined();
    mockUseFrameCallback!({}, 0.016);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'spatial.plane.updated',
        payload: expect.objectContaining({
          semanticLabel: 'table',
          position: { x: 1, y: 2, z: 3 },
        }),
      }),
    );
  });

  it('does not emit PLANE_UPDATED when needsUpdate is not set', () => {
    const handler = vi.fn();
    bus.subscribe('spatial.plane.updated', handler);

    const plane: MockPlane = {
      xrPlane: { polygon: [] },
      semanticLabel: 'floor',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      planeMesh: null,
      boundingRectangleWidth: 1,
      boundingRectangleHeight: 1,
      // needsUpdate not set
    };

    mockRATKInstance = {
      planes: new Set([plane]),
      meshes: new Set(),
    };

    renderHook(() => PlaneDetection());

    mockUseFrameCallback!({}, 0.016);

    expect(handler).not.toHaveBeenCalled();
  });
});
