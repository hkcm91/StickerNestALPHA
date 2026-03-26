/**
 * PathRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PathEntity } from '@sn/types';

// Mock the canvas core anchorsToSvgPath utility
vi.mock('../../../canvas/core', () => ({
  anchorsToSvgPath: vi.fn(
    (anchors: any[], closed: boolean) =>
      anchors.length > 0
        ? `M${anchors[0].position.x},${anchors[0].position.y}` +
          anchors.slice(1).map((a: any) => ` L${a.position.x},${a.position.y}`).join('') +
          (closed ? ' Z' : '')
        : '',
  ),
}));

import { PathRenderer } from './PathRenderer';

function makePath(overrides: Partial<PathEntity> = {}): PathEntity {
  return {
    id: 'path-1',
    type: 'path',
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
    anchors: [
      { position: { x: 10, y: 10 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 5, y: 0 } },
      { position: { x: 100, y: 80 }, handleIn: { x: -5, y: 0 }, handleOut: { x: 0, y: 0 } },
    ],
    closed: false,
    fill: 'none',
    stroke: '#000000',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...overrides,
  } as PathEntity;
}

describe('PathRenderer', () => {
  it('renders an SVG with a path element', () => {
    const entity = makePath();
    const { container } = render(<PathRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('applies stroke and fill properties', () => {
    const entity = makePath({ stroke: '#ff0000', fill: '#00ff00', strokeWidth: 4 });
    const { container } = render(<PathRenderer entity={entity} isSelected={false} />);
    const path = container.querySelector('path')!;
    expect(path.getAttribute('stroke')).toBe('#ff0000');
    expect(path.getAttribute('fill')).toBe('#00ff00');
    expect(path.getAttribute('stroke-width')).toBe('4');
  });

  it('sets data-entity-id and data-entity-type', () => {
    const entity = makePath({ id: 'path-99' });
    const { container } = render(<PathRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('[data-entity-id="path-99"]')).not.toBeNull();
    expect(container.querySelector('[data-entity-type="path"]')).not.toBeNull();
  });

  it('renders without crashing when selected', () => {
    const entity = makePath();
    const { container } = render(<PathRenderer entity={entity} isSelected={true} />);
    expect(container.querySelector('[data-entity-type="path"]')).not.toBeNull();
  });

  it('sets SVG viewBox from entity size', () => {
    const entity = makePath({
      transform: {
        position: { x: 0, y: 0 },
        size: { width: 300, height: 200 },
        rotation: 0,
        scale: 1,
      },
    } as any);
    const { container } = render(<PathRenderer entity={entity} isSelected={false} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 300 200');
  });
});
