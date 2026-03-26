/**
 * GroupRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { GroupEntity } from '@sn/types';

import { GroupRenderer } from './GroupRenderer';

function makeGroup(overrides: Partial<GroupEntity> = {}): GroupEntity {
  return {
    id: 'group-1',
    type: 'group',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 150, y: 150 },
      size: { width: 200, height: 200 },
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
    childIds: ['child-1', 'child-2'],
    ...overrides,
  } as GroupEntity;
}

describe('GroupRenderer', () => {
  it('renders a div with data-entity-type group', () => {
    const entity = makeGroup();
    const { container } = render(<GroupRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('[data-entity-type="group"]')).not.toBeNull();
  });

  it('renders differently when selected vs not selected', () => {
    const entity = makeGroup();
    const { container: c1 } = render(<GroupRenderer entity={entity} isSelected={true} />);
    const { container: c2 } = render(<GroupRenderer entity={entity} isSelected={false} />);
    const sel = c1.querySelector('[data-entity-type="group"]') as HTMLElement;
    const unsel = c2.querySelector('[data-entity-type="group"]') as HTMLElement;
    expect(sel.outerHTML).not.toBe(unsel.outerHTML);
  });

  it('has transparent background when not selected', () => {
    const entity = makeGroup();
    const { container } = render(<GroupRenderer entity={entity} isSelected={false} />);
    const el = container.querySelector('[data-entity-type="group"]') as HTMLElement;
    expect(el.style.background).toBe('transparent');
  });

  it('has a tinted background when selected', () => {
    const entity = makeGroup();
    const { container } = render(<GroupRenderer entity={entity} isSelected={true} />);
    const el = container.querySelector('[data-entity-type="group"]') as HTMLElement;
    expect(el.style.background).toContain('rgba');
  });

  it('sets data-entity-id', () => {
    const entity = makeGroup({ id: 'grp-7' });
    const { container } = render(<GroupRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('[data-entity-id="grp-7"]')).not.toBeNull();
  });

  it('applies position from entity transform', () => {
    const entity = makeGroup({
      transform: {
        position: { x: 300, y: 400 },
        size: { width: 100, height: 80 },
        rotation: 0,
        scale: 1,
      },
    } as any);
    const { container } = render(<GroupRenderer entity={entity} isSelected={false} />);
    const el = container.querySelector('[data-entity-type="group"]') as HTMLElement;
    // Center-based: left = 300 - 50 = 250
    expect(el.style.left).toBe('250px');
    expect(el.style.top).toBe('360px'); // 400 - 40
  });
});
