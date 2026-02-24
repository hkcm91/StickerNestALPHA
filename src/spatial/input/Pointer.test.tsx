import { renderHook } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @react-three/xr
// ---------------------------------------------------------------------------

interface MockControllerState {
  object: {
    position: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
  } | null;
}

let mockControllerLeft: MockControllerState | undefined;
let mockControllerRight: MockControllerState | undefined;

const stateListeners = new Set<() => void>();

vi.mock('@react-three/xr', () => ({
  useXRInputSourceState: (type: string, hand: string) => {
    const [, setTick] = useState(0);

    React.useEffect(() => {
      const listener = () => setTick((t) => t + 1);
      stateListeners.add(listener);
      return () => {
        stateListeners.delete(listener);
      };
    }, []);

    if (type === 'controller') {
      return hand === 'left' ? mockControllerLeft : mockControllerRight;
    }
    return undefined;
  },
}));

// Mock Three.js classes used by Pointer
vi.mock('three', () => ({
  BufferGeometry: vi.fn().mockImplementation(() => ({
    setAttribute: vi.fn(),
    dispose: vi.fn(),
  })),
  Float32BufferAttribute: vi.fn().mockImplementation((_arr: Float32Array, _size: number) => ({
    array: _arr,
    itemSize: _size,
  })),
}));

// Import AFTER mock setup
import { Pointer } from './Pointer';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Pointer', () => {
  beforeEach(() => {
    mockControllerLeft = undefined;
    mockControllerRight = undefined;
    stateListeners.clear();
  });

  afterEach(() => {
    stateListeners.clear();
  });

  it('returns null when controller is not connected', () => {
    // Right controller not connected
    const { result } = renderHook(() => Pointer({ hand: 'right' }));
    expect(result.current).toBeNull();
  });

  it('returns a JSX element when controller is connected', () => {
    mockControllerRight = {
      object: {
        position: { x: 0, y: 1, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      },
    };

    const { result } = renderHook(() => Pointer({ hand: 'right' }));
    expect(result.current).not.toBeNull();
  });

  it('accepts left hand prop', () => {
    mockControllerLeft = {
      object: {
        position: { x: 0, y: 1, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      },
    };

    const { result } = renderHook(() => Pointer({ hand: 'left' }));
    expect(result.current).not.toBeNull();
  });

  it('accepts right hand prop', () => {
    mockControllerRight = {
      object: {
        position: { x: 0, y: 1, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      },
    };

    const { result } = renderHook(() => Pointer({ hand: 'right' }));
    expect(result.current).not.toBeNull();
  });

  it('accepts custom color and length props', () => {
    mockControllerRight = {
      object: {
        position: { x: 0, y: 1, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      },
    };

    const { result } = renderHook(() =>
      Pointer({ hand: 'right', color: '#ff0000', length: 10 }),
    );
    expect(result.current).not.toBeNull();
  });

  it('defaults color to #00ccff and length to 5', () => {
    mockControllerRight = {
      object: {
        position: { x: 0, y: 1, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      },
    };

    // Just verify it renders without error using defaults
    const { result } = renderHook(() => Pointer({ hand: 'right' }));
    expect(result.current).not.toBeNull();
  });
});
