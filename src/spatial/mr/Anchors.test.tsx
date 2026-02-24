/**
 * Tests for Anchors
 *
 * @module spatial/mr/Anchors.test
 * @layer L4B
 */

import { renderHook, act } from '@testing-library/react';
import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

// ---------------------------------------------------------------------------
// Mock RATK context via useRATK
// ---------------------------------------------------------------------------

const mockCreateAnchor = vi.fn();
const mockDeleteAnchor = vi.fn();

interface MockAnchor {
  anchorID: string;
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  isPersistent: boolean;
}

let mockRATKInstance: {
  createAnchor: typeof mockCreateAnchor;
  deleteAnchor: typeof mockDeleteAnchor;
  anchors: Set<MockAnchor>;
} | null = null;

vi.mock('./RATKProvider', () => ({
  useRATK: () => mockRATKInstance,
}));

// ---------------------------------------------------------------------------
// Mock @react-three/fiber
// ---------------------------------------------------------------------------

vi.mock('@react-three/fiber', () => ({
  useFrame: (_cb: (state: unknown, delta: number) => void) => {
    // Captured for test use if needed
  },
}));

// ---------------------------------------------------------------------------
// Mock crypto.randomUUID
// ---------------------------------------------------------------------------

let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `anchor-uuid-${++uuidCounter}`,
});

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { Anchors } from './Anchors';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Anchors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bus.unsubscribeAll();
    mockRATKInstance = null;
    uuidCounter = 0;
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('renders nothing when no RATK instance is available', () => {
    mockRATKInstance = null;

    const { result } = renderHook(() => Anchors());
    expect(result.current).toBeNull();
  });

  it('subscribes to ANCHOR_CREATED bus events', () => {
    const mockAnchor: MockAnchor = {
      anchorID: 'test-anchor-1',
      position: { x: 1, y: 2, z: 3 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      isPersistent: false,
    };

    mockCreateAnchor.mockResolvedValue(mockAnchor);

    mockRATKInstance = {
      createAnchor: mockCreateAnchor,
      deleteAnchor: mockDeleteAnchor,
      anchors: new Set(),
    };

    renderHook(() => Anchors());

    // Emit an ANCHOR_CREATED event to trigger the subscription
    act(() => {
      bus.emit(SpatialEvents.ANCHOR_CREATED, {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        persistent: false,
      });
    });

    expect(mockCreateAnchor).toHaveBeenCalledTimes(1);
  });

  it('subscribes to ANCHOR_DELETED bus events', async () => {
    const mockAnchor: MockAnchor = {
      anchorID: 'test-anchor-1',
      position: { x: 1, y: 2, z: 3 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      isPersistent: false,
    };

    mockCreateAnchor.mockResolvedValue(mockAnchor);
    mockDeleteAnchor.mockResolvedValue(undefined);

    mockRATKInstance = {
      createAnchor: mockCreateAnchor,
      deleteAnchor: mockDeleteAnchor,
      anchors: new Set(),
    };

    renderHook(() => Anchors());

    // First create an anchor
    await act(async () => {
      bus.emit(SpatialEvents.ANCHOR_CREATED, {
        id: 'my-anchor',
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        persistent: false,
      });
      // Wait for the promise to resolve
      await Promise.resolve();
    });

    // Then delete it
    act(() => {
      bus.emit(SpatialEvents.ANCHOR_DELETED, { id: 'my-anchor' });
    });

    expect(mockDeleteAnchor).toHaveBeenCalledTimes(1);
  });

  it('renders sphere indicators for anchors', async () => {
    const mockAnchor: MockAnchor = {
      anchorID: 'test-anchor',
      position: { x: 1, y: 2, z: 3 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      isPersistent: false,
    };

    mockCreateAnchor.mockResolvedValue(mockAnchor);

    mockRATKInstance = {
      createAnchor: mockCreateAnchor,
      deleteAnchor: mockDeleteAnchor,
      anchors: new Set(),
    };

    const { result } = renderHook(() => Anchors());

    // Create an anchor to populate the state
    await act(async () => {
      bus.emit(SpatialEvents.ANCHOR_CREATED, {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        persistent: false,
      });
      await Promise.resolve();
    });

    // After anchor is created, the component should render spheres
    const element = result.current as React.ReactElement | null;
    // The element should be a group with anchor spheres
    expect(element).not.toBeNull();
  });

  it('cleans up bus subscriptions on unmount', () => {
    mockRATKInstance = {
      createAnchor: mockCreateAnchor,
      deleteAnchor: mockDeleteAnchor,
      anchors: new Set(),
    };

    const { unmount } = renderHook(() => Anchors());

    unmount();

    // After unmount, emitting anchor events should not trigger RATK calls
    mockCreateAnchor.mockClear();
    bus.emit(SpatialEvents.ANCHOR_CREATED, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      persistent: false,
    });

    expect(mockCreateAnchor).not.toHaveBeenCalled();
  });

  it('renders nothing when visible is false', () => {
    mockRATKInstance = {
      createAnchor: mockCreateAnchor,
      deleteAnchor: mockDeleteAnchor,
      anchors: new Set(),
    };

    const { result } = renderHook(() => Anchors({ visible: false }));
    expect(result.current).toBeNull();
  });
});
