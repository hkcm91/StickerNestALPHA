/**
 * CanvasEntityLayer component tests.
 *
 * @module shell/canvas
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CanvasEntity } from '@sn/types';

vi.mock('./renderers', () => ({
  EntityRenderer: ({ entity }: { entity: CanvasEntity }) => (
    <div data-testid={`entity-${entity.id}`}>{entity.name ?? entity.type}</div>
  ),
}));

import { CanvasEntityLayer } from './CanvasEntityLayer';

function makeEntity(overrides: Partial<CanvasEntity> = {}): CanvasEntity {
  return {
    id: `e-${Math.random().toString(36).slice(2, 8)}`,
    type: 'sticker',
    canvasId: 'c1',
    name: 'TestEntity',
    transform: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 },
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user',
    ...overrides,
  } as CanvasEntity;
}

describe('CanvasEntityLayer', () => {
  it('renders the entity layer container', () => {
    render(<CanvasEntityLayer entities={[]} selectedIds={new Set()} />);
    expect(screen.getByTestId('canvas-entity-layer')).toBeTruthy();
  });

  it('renders entity renderers for each visible entity', () => {
    const entities = [
      makeEntity({ id: 'ent-1', name: 'First' }),
      makeEntity({ id: 'ent-2', name: 'Second' }),
    ];
    render(<CanvasEntityLayer entities={entities} selectedIds={new Set()} />);
    expect(screen.getByTestId('entity-ent-1')).toBeTruthy();
    expect(screen.getByTestId('entity-ent-2')).toBeTruthy();
  });

  it('filters out entities with canvasVisibility "3d"', () => {
    const entities = [
      makeEntity({ id: 'vis-2d', name: 'Visible' }),
      makeEntity({ id: 'vis-3d', name: 'Hidden3D', canvasVisibility: '3d' as any }),
    ];
    render(<CanvasEntityLayer entities={entities} selectedIds={new Set()} />);
    expect(screen.getByTestId('entity-vis-2d')).toBeTruthy();
    expect(screen.queryByTestId('entity-vis-3d')).toBeNull();
  });

  it('hides child entities inside closed docker folders', () => {
    const parent = makeEntity({ id: 'docker-1', type: 'docker' as any, name: 'Folder' });
    const child = makeEntity({ id: 'child-1', name: 'Child', parentId: 'docker-1' } as any);
    // openFolderIds does not include 'docker-1' so child should be hidden
    render(
      <CanvasEntityLayer
        entities={[parent, child]}
        selectedIds={new Set()}
        openFolderIds={new Set()}
      />,
    );
    expect(screen.getByTestId('entity-docker-1')).toBeTruthy();
    expect(screen.queryByTestId('entity-child-1')).toBeNull();
  });
});
