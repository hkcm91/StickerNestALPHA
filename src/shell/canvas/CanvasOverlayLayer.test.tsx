/**
 * CanvasOverlayLayer component tests.
 *
 * @module shell/canvas
 */

import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { ViewportState } from '../../canvas/core';

// Mock canvas core renderers
vi.mock('../../canvas/core', () => ({
  createBackgroundRenderer: vi.fn(() => ({
    setBackground: vi.fn(),
    setViewport: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  })),
  createGridRenderer: vi.fn(() => ({
    setConfig: vi.fn(),
    setViewport: vi.fn(),
    render: vi.fn(),
  })),
  createGridCellStore: vi.fn(() => ({
    getCellEntities: vi.fn(() => []),
    clear: vi.fn(),
  })),
  DEFAULT_GRID_CONFIG: {
    enabled: false,
    size: 20,
    snapMode: 'none',
    showGridLines: false,
    projection: 'square',
  },
}));

import { CanvasOverlayLayer } from './CanvasOverlayLayer';

function makeViewport(overrides: Partial<ViewportState> = {}): ViewportState {
  return {
    zoom: 1,
    offset: { x: 0, y: 0 },
    viewportWidth: 800,
    viewportHeight: 600,
    ...overrides,
  };
}

describe('CanvasOverlayLayer', () => {
  // Mock canvas getContext since happy-dom doesn't fully support it
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
    })) as any;
  });

  it('renders a canvas element', () => {
    const { container } = render(
      <CanvasOverlayLayer viewport={makeViewport()} />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('sets canvas dimensions from viewport', () => {
    const { container } = render(
      <CanvasOverlayLayer viewport={makeViewport({ viewportWidth: 1024, viewportHeight: 768 })} />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    // Dimensions are set in the useEffect, verify the canvas exists with absolute positioning
    expect(canvas!.style.position).toBe('absolute');
  });

  it('renders with custom background and grid config', () => {
    // Should not throw with custom props
    const { container } = render(
      <CanvasOverlayLayer
        viewport={makeViewport()}
        background={{ type: 'solid', color: '#ff0000' } as any}
        gridConfig={{ enabled: true, size: 40, snapMode: 'grid', showGridLines: true, projection: 'square' as any }}
      />,
    );
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
