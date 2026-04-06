/**
 * Tests for SpatialEnvironment
 *
 * @module spatial/components/SpatialEnvironment.test
 * @layer L4B
 */

import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { BusEvent, ThemeName } from '@sn/types';
import { ShellEvents } from '@sn/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Track useFrame callbacks
let frameCallback: ((state: unknown, delta: number) => void) | null = null;

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: (state: unknown, delta: number) => void) => {
    frameCallback = cb;
  },
  extend: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  shaderMaterial: (uniforms: Record<string, unknown>) => {
    return class MockShaderMaterial {
      static uniforms = uniforms;
    };
  },
}));

// Track bus subscriptions
type BusHandler = (event: BusEvent) => void;
const busSubscriptions = new Map<string, BusHandler>();
const unsubscribeSpy = vi.fn();

vi.mock('../../kernel/bus', () => ({
  bus: {
    subscribe: vi.fn((type: string, handler: BusHandler) => {
      busSubscriptions.set(type, handler);
      return unsubscribeSpy;
    }),
    emit: vi.fn(),
  },
}));

vi.mock('../../kernel/stores/ui/ui.store', () => ({
  useUIStore: {
    getState: () => ({ theme: 'midnight-aurora' as ThemeName }),
  },
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { SpatialEnvironment } from './SpatialEnvironment';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpatialEnvironment', () => {
  beforeEach(() => {
    busSubscriptions.clear();
    unsubscribeSpy.mockClear();
    frameCallback = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders floor mesh with circleGeometry', () => {
    const { container } = render(<SpatialEnvironment />);
    const circle = container.querySelector('circlegeometry');
    expect(circle).not.toBeNull();
  });

  it('renders dome mesh with sphereGeometry', () => {
    const { container } = render(<SpatialEnvironment />);
    const sphere = container.querySelector('spheregeometry');
    expect(sphere).not.toBeNull();
  });

  it('renders fog element', () => {
    const { container } = render(<SpatialEnvironment />);
    const fog = container.querySelector('fog');
    expect(fog).not.toBeNull();
  });

  it('renders floor with correct default radius', () => {
    const { container } = render(<SpatialEnvironment />);
    const circle = container.querySelector('circlegeometry');
    // args are serialized as "radius,segments"
    const args = circle?.getAttribute('args');
    expect(args).toContain('50');
  });

  it('renders dome with correct default radius', () => {
    const { container } = render(<SpatialEnvironment />);
    const sphere = container.querySelector('spheregeometry');
    const args = sphere?.getAttribute('args');
    expect(args).toContain('60');
  });

  it('accepts custom floor and dome radii', () => {
    const { container } = render(
      <SpatialEnvironment floorRadius={30} domeRadius={40} />,
    );
    const circle = container.querySelector('circlegeometry');
    expect(circle?.getAttribute('args')).toContain('30');

    const sphere = container.querySelector('spheregeometry');
    expect(sphere?.getAttribute('args')).toContain('40');
  });

  it('returns null when enabled={false}', () => {
    const { container } = render(<SpatialEnvironment enabled={false} />);
    // Should render nothing
    expect(container.querySelector('mesh')).toBeNull();
    expect(container.querySelector('fog')).toBeNull();
  });

  it('subscribes to THEME_CHANGED bus event on mount', () => {
    render(<SpatialEnvironment />);
    expect(busSubscriptions.has(ShellEvents.THEME_CHANGED)).toBe(true);
  });

  it('calls unsubscribe on unmount', () => {
    const { unmount } = render(<SpatialEnvironment />);
    unmount();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('registers a useFrame callback for animation', () => {
    render(<SpatialEnvironment />);
    expect(frameCallback).toBeTypeOf('function');
  });

  it('renders meshStandardMaterial on floor', () => {
    const { container } = render(<SpatialEnvironment />);
    const standardMat = container.querySelector('meshstandardmaterial');
    expect(standardMat).not.toBeNull();
  });

  it('renders breathingDomeMaterial on dome', () => {
    const { container } = render(<SpatialEnvironment />);
    const domeMat = container.querySelector('breathingdomematerial');
    expect(domeMat).not.toBeNull();
  });
});
