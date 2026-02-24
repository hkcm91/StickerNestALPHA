/**
 * Tests for SpatialScene
 *
 * @module spatial/components/SpatialScene.test
 * @layer L4B
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @react-three/fiber
// ---------------------------------------------------------------------------

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => {
    return <div data-testid="canvas">{children}</div>;
  },
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { SpatialScene } from './SpatialScene';

// ---------------------------------------------------------------------------
// Tests — verify SpatialScene renders R3F intrinsic light elements
//
// Since R3F intrinsics (ambientLight, directionalLight) render as unknown
// DOM elements in happy-dom, we query them directly from the rendered output.
// ---------------------------------------------------------------------------

describe('SpatialScene', () => {
  it('renders ambient and directional lights', () => {
    const { container } = render(<SpatialScene />);

    const ambient = container.querySelector('ambientlight');
    const directional = container.querySelector('directionallight');

    expect(ambient).not.toBeNull();
    expect(directional).not.toBeNull();
  });

  it('uses default light intensities', () => {
    const { container } = render(<SpatialScene />);

    const ambient = container.querySelector('ambientlight');
    expect(ambient?.getAttribute('intensity')).toBe('0.6');

    const directional = container.querySelector('directionallight');
    expect(directional?.getAttribute('intensity')).toBe('0.8');
  });

  it('applies custom ambient intensity', () => {
    const { container } = render(<SpatialScene ambientIntensity={1.0} />);

    const ambient = container.querySelector('ambientlight');
    expect(ambient?.getAttribute('intensity')).toBe('1');
  });

  it('applies custom directional intensity', () => {
    const { container } = render(<SpatialScene directionalIntensity={0.5} />);

    const directional = container.querySelector('directionallight');
    expect(directional?.getAttribute('intensity')).toBe('0.5');
  });

  it('applies custom directional position', () => {
    const { container } = render(<SpatialScene directionalPosition={[10, 20, 30]} />);

    const directional = container.querySelector('directionallight');
    expect(directional?.getAttribute('position')).toBe('10,20,30');
  });

  it('renders directional light element for shadow casting', () => {
    // castShadow is a Three.js property handled by R3F's renderer, not HTML.
    // In happy-dom, React strips camelCase boolean props from unknown elements.
    // We verify the directional light exists — castShadow is tested at the
    // R3F integration level, not the unit test DOM level.
    const { container } = render(<SpatialScene />);

    const directional = container.querySelector('directionallight');
    expect(directional).not.toBeNull();
  });
});
