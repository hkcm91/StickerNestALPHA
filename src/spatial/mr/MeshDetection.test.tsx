/**
 * Tests for MeshDetection
 *
 * @module spatial/mr/MeshDetection.test
 * @layer L4B
 */

import { renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Mock RATK context via useRATK
// ---------------------------------------------------------------------------

interface MockRMesh {
  xrMesh: object;
  semanticLabel: string | undefined;
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  meshMesh: { geometry: object } | null;
  needsUpdate?: boolean;
}

let mockRATKInstance: {
  planes: Set<unknown>;
  meshes: Set<MockRMesh>;
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
// Mock crypto.randomUUID
// ---------------------------------------------------------------------------

let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `mesh-uuid-${++uuidCounter}`,
});

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { MeshDetection } from './MeshDetection';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MeshDetection', () => {
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

    const { result } = renderHook(() => MeshDetection());
    expect(result.current).toBeNull();
  });

  it('renders wireframe meshes for detected meshes', () => {
    const mesh: MockRMesh = {
      xrMesh: {},
      semanticLabel: 'global-mesh',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      meshMesh: { geometry: {} },
    };

    mockRATKInstance = {
      planes: new Set(),
      meshes: new Set([mesh]),
    };

    const { result } = renderHook(() => MeshDetection());
    expect(result.current).not.toBeNull();

    // Should render a group containing mesh visuals
    const element = result.current as React.ReactElement;
    expect(element).toBeDefined();
    expect(element.type).toBe('group');
  });

  it('renders nothing when visible is false', () => {
    const mesh: MockRMesh = {
      xrMesh: {},
      semanticLabel: 'table',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      meshMesh: { geometry: {} },
    };

    mockRATKInstance = {
      planes: new Set(),
      meshes: new Set([mesh]),
    };

    const { result } = renderHook(() => MeshDetection({ visible: false }));
    expect(result.current).toBeNull();
  });

  it('renders mesh elements for each detected mesh', () => {
    const mesh1: MockRMesh = {
      xrMesh: {},
      semanticLabel: 'table',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      meshMesh: { geometry: {} },
    };

    const mesh2: MockRMesh = {
      xrMesh: {},
      semanticLabel: 'couch',
      position: { x: 1, y: 0, z: 1 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      meshMesh: { geometry: {} },
    };

    mockRATKInstance = {
      planes: new Set(),
      meshes: new Set([mesh1, mesh2]),
    };

    const { result } = renderHook(() => MeshDetection());

    const element = result.current as React.ReactElement<{ children: unknown[] }>;
    expect(element.props.children).toHaveLength(2);
  });

  it('emits MESH_UPDATED bus event for meshes with needsUpdate', () => {
    const handler = vi.fn();
    bus.subscribe('spatial.mesh.updated', handler);

    const mesh: MockRMesh = {
      xrMesh: {},
      semanticLabel: 'table',
      position: { x: 1, y: 2, z: 3 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      meshMesh: { geometry: {} },
      needsUpdate: true,
    };

    mockRATKInstance = {
      planes: new Set(),
      meshes: new Set([mesh]),
    };

    renderHook(() => MeshDetection());

    // Simulate frame
    expect(mockUseFrameCallback).toBeDefined();
    mockUseFrameCallback!({}, 0.016);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'spatial.mesh.updated',
        payload: expect.objectContaining({
          semanticLabel: 'table',
          position: { x: 1, y: 2, z: 3 },
        }),
      }),
    );
  });

  it('does not emit MESH_UPDATED when needsUpdate is not set', () => {
    const handler = vi.fn();
    bus.subscribe('spatial.mesh.updated', handler);

    const mesh: MockRMesh = {
      xrMesh: {},
      semanticLabel: 'global-mesh',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      meshMesh: { geometry: {} },
      // needsUpdate not set
    };

    mockRATKInstance = {
      planes: new Set(),
      meshes: new Set([mesh]),
    };

    renderHook(() => MeshDetection());

    mockUseFrameCallback!({}, 0.016);

    expect(handler).not.toHaveBeenCalled();
  });

  it('accepts custom color and opacity props', () => {
    const mesh: MockRMesh = {
      xrMesh: {},
      semanticLabel: 'wall',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      meshMesh: { geometry: {} },
    };

    mockRATKInstance = {
      planes: new Set(),
      meshes: new Set([mesh]),
    };

    const { result } = renderHook(() =>
      MeshDetection({ color: '#ff0000', opacity: 0.5 }),
    );

    expect(result.current).not.toBeNull();
  });
});
