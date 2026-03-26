/**
 * ShapeRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ShapeEntity } from '@sn/types';

import { ShapeRenderer } from './ShapeRenderer';

function makeShape(overrides: Partial<ShapeEntity> = {}): ShapeEntity {
  return {
    id: 'shape-1',
    type: 'shape',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 100, y: 100 },
      size: { width: 120, height: 80 },
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
    shapeType: 'rectangle',
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    cornerRadius: 0,
    ...overrides,
  } as ShapeEntity;
}

describe('ShapeRenderer', () => {
  it('renders an SVG element', () => {
    const entity = makeShape();
    const { container } = render(<ShapeRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a rect for rectangle shape type', () => {
    const entity = makeShape({ shapeType: 'rectangle' });
    const { container } = render(<ShapeRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('rect')).not.toBeNull();
  });

  it('renders an ellipse for ellipse shape type', () => {
    const entity = makeShape({ shapeType: 'ellipse' });
    const { container } = render(<ShapeRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('ellipse')).not.toBeNull();
  });

  it('renders a line for line shape type', () => {
    const entity = makeShape({ shapeType: 'line' });
    const { container } = render(<ShapeRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('line')).not.toBeNull();
  });

  it('renders a polygon with points', () => {
    const entity = makeShape({
      shapeType: 'polygon',
      points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 25, y: 40 }],
    } as any);
    const { container } = render(<ShapeRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('polygon')).not.toBeNull();
  });

  it('applies selection outline when selected', () => {
    const entity = makeShape();
    const { container } = render(<ShapeRenderer entity={entity} isSelected={true} />);
    const el = container.querySelector('[data-entity-type="shape"]') as HTMLElement;
    expect(el.style.outline).toContain('2px solid');
  });

  it('sets data-entity-id and data-entity-type', () => {
    const entity = makeShape({ id: 'shp-99' });
    const { container } = render(<ShapeRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('[data-entity-id="shp-99"]')).not.toBeNull();
    expect(container.querySelector('[data-entity-type="shape"]')).not.toBeNull();
  });

  it('sets SVG viewBox from entity size', () => {
    const entity = makeShape({
      transform: {
        position: { x: 50, y: 50 },
        size: { width: 200, height: 150 },
        rotation: 0,
        scale: 1,
      },
    } as any);
    const { container } = render(<ShapeRenderer entity={entity} isSelected={false} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 150');
  });
});
