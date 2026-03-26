/**
 * DrawingRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { DrawingEntity } from '@sn/types';

import { DrawingRenderer } from './DrawingRenderer';

function makeDrawing(overrides: Partial<DrawingEntity> = {}): DrawingEntity {
  return {
    id: 'drawing-1',
    type: 'drawing',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 100, y: 100 },
      size: { width: 200, height: 150 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: 'user-1',
    points: [
      { x: 10, y: 10 },
      { x: 50, y: 30 },
      { x: 100, y: 20 },
    ],
    stroke: '#ff0000',
    strokeWidth: 3,
    smoothing: 0.5,
    ...overrides,
  } as DrawingEntity;
}

describe('DrawingRenderer', () => {
  it('renders an SVG with a path element', () => {
    const entity = makeDrawing();
    const { container } = render(<DrawingRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('applies stroke properties from entity', () => {
    const entity = makeDrawing({ stroke: '#00ff00', strokeWidth: 5 });
    const { container } = render(<DrawingRenderer entity={entity} isSelected={false} />);
    const path = container.querySelector('path')!;
    expect(path.getAttribute('stroke')).toBe('#00ff00');
    expect(path.getAttribute('stroke-width')).toBe('5');
  });

  it('generates a path d attribute from points', () => {
    const entity = makeDrawing();
    const { container } = render(<DrawingRenderer entity={entity} isSelected={false} />);
    const path = container.querySelector('path')!;
    const d = path.getAttribute('d')!;
    // Should start with M for moveto at first point
    expect(d.startsWith('M10,10')).toBe(true);
  });

  it('renders differently when selected vs not selected', () => {
    const entity = makeDrawing();
    const { container: c1 } = render(<DrawingRenderer entity={entity} isSelected={true} />);
    const { container: c2 } = render(<DrawingRenderer entity={entity} isSelected={false} />);
    const sel = c1.querySelector('[data-entity-type="drawing"]') as HTMLElement;
    const unsel = c2.querySelector('[data-entity-type="drawing"]') as HTMLElement;
    expect(sel.outerHTML).not.toBe(unsel.outerHTML);
  });

  it('sets data-entity-id', () => {
    const entity = makeDrawing({ id: 'drw-7' });
    const { container } = render(<DrawingRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('[data-entity-id="drw-7"]')).not.toBeNull();
  });

  it('handles empty points array gracefully', () => {
    const entity = makeDrawing({ points: [] });
    const { container } = render(<DrawingRenderer entity={entity} isSelected={false} />);
    const path = container.querySelector('path')!;
    expect(path.getAttribute('d')).toBe('');
  });
});
