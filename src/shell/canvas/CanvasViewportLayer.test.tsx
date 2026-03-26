/**
 * CanvasViewportLayer component tests.
 *
 * @module shell/canvas
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ViewportState } from '../../canvas/core';

import { CanvasViewportLayer } from './CanvasViewportLayer';

function makeViewport(overrides: Partial<ViewportState> = {}): ViewportState {
  return {
    zoom: 1,
    offset: { x: 0, y: 0 },
    viewportWidth: 1920,
    viewportHeight: 1080,
    ...overrides,
  };
}

describe('CanvasViewportLayer', () => {
  it('renders children inside the viewport layer', () => {
    render(
      <CanvasViewportLayer viewport={makeViewport()}>
        <div data-testid="child">Hello</div>
      </CanvasViewportLayer>,
    );
    expect(screen.getByTestId('canvas-viewport-layer')).toBeTruthy();
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('applies CSS transform based on viewport zoom and offset', () => {
    render(
      <CanvasViewportLayer viewport={makeViewport({ zoom: 2, offset: { x: 100, y: 50 } })}>
        <span>content</span>
      </CanvasViewportLayer>,
    );
    const layer = screen.getByTestId('canvas-viewport-layer');
    expect(layer.style.transform).toBe('scale(2) translate(100px, 50px)');
  });

  it('merges additional style overrides', () => {
    render(
      <CanvasViewportLayer viewport={makeViewport()} style={{ pointerEvents: 'none', zIndex: 5 }}>
        <span>content</span>
      </CanvasViewportLayer>,
    );
    const layer = screen.getByTestId('canvas-viewport-layer');
    expect(layer.style.pointerEvents).toBe('none');
  });

  it('applies transformOrigin 0 0', () => {
    render(
      <CanvasViewportLayer viewport={makeViewport()}>
        <span>content</span>
      </CanvasViewportLayer>,
    );
    const layer = screen.getByTestId('canvas-viewport-layer');
    expect(layer.style.transformOrigin).toBe('0 0');
  });
});
