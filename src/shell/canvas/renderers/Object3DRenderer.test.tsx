/**
 * Object3DRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Object3DEntity } from '@sn/types';

import { Object3DRenderer } from './Object3DRenderer';

function makeObject3D(overrides: Partial<Object3DEntity> = {}): Object3DEntity {
  return {
    id: 'obj3d-1',
    type: 'object3d',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 100, y: 100 },
      size: { width: 100, height: 100 },
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
    primitive: 'cube',
    color: '#ff0000',
    ...overrides,
  } as Object3DEntity;
}

describe('Object3DRenderer', () => {
  it('renders a div with 3D label and primitive name', () => {
    const entity = makeObject3D({ primitive: 'cube' } as any);
    render(<Object3DRenderer entity={entity} />);
    expect(screen.getByText('3D cube')).toBeDefined();
  });

  it('applies background color from entity', () => {
    const entity = makeObject3D({ color: '#00ff00' } as any);
    const { container } = render(<Object3DRenderer entity={entity} />);
    const el = container.firstElementChild as HTMLElement;
    // happy-dom may normalize hex to rgb or keep as hex
    const bg = el.style.background;
    expect(bg === 'rgb(0, 255, 0)' || bg === '#00ff00').toBe(true);
  });

  it('applies border-radius 50% for sphere primitive', () => {
    const entity = makeObject3D({ primitive: 'sphere' } as any);
    const { container } = render(<Object3DRenderer entity={entity} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.borderRadius).toBe('50%');
  });

  it('applies 8px border-radius for non-sphere primitives', () => {
    const entity = makeObject3D({ primitive: 'cube' } as any);
    const { container } = render(<Object3DRenderer entity={entity} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.borderRadius).toBe('8px');
  });

  it('uses default color when entity has no color', () => {
    const entity = makeObject3D({ color: undefined } as any);
    const { container } = render(<Object3DRenderer entity={entity} />);
    const el = container.firstElementChild as HTMLElement;
    const bg = el.style.background;
    expect(bg === 'rgb(204, 204, 204)' || bg === '#cccccc').toBe(true);
  });
});
