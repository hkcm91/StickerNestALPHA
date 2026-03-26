/**
 * SelectionOverlay component tests.
 *
 * @module shell/canvas/components
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CanvasEntity } from '@sn/types';

import type { SceneGraph } from '../../../canvas/core';

vi.mock('../../../canvas/core', () => ({
  resolveEntityTransform: vi.fn((entity: any) => entity.transform),
}));

vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

vi.mock('../../../kernel/stores/ui/ui.store', () => ({
  useUIStore: vi.fn((selector) => {
    const state: Record<string, unknown> = {
      canvasInteractionMode: 'edit',
      canvasPlatform: 'web',
    };
    return selector(state);
  }),
}));

vi.mock('../handlers', () => ({
  CropEvents: { APPLY: 'crop.apply', ENTER: 'crop.enter', EXIT: 'crop.exit' },
}));

vi.mock('../hooks', () => ({
  useCropMode: vi.fn(() => new Set<string>()),
}));

vi.mock('../renderers/entity-style', () => ({
  getEntityBoundingBox: vi.fn((entity: any) => ({
    x: entity.transform.position.x,
    y: entity.transform.position.y,
    width: entity.transform.size.width,
    height: entity.transform.size.height,
  })),
}));

vi.mock('../utils/resize', () => ({
  computeResize: vi.fn(),
  getResizeHandles: vi.fn(() => []),
  shouldLockAspectRatio: vi.fn(() => false),
}));

vi.mock('./EntityFloatingToolbar', () => ({
  EntityFloatingToolbar: () => <div data-testid="mock-floating-toolbar" />,
}));

import { SelectionOverlay } from './SelectionOverlay';

function makeEntity(overrides: Partial<CanvasEntity> = {}): CanvasEntity {
  return {
    id: 'sel-entity',
    type: 'sticker',
    canvasId: 'c1',
    name: 'Selected',
    transform: { position: { x: 100, y: 100 }, size: { width: 200, height: 150 }, rotation: 0, scale: 1 },
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

function makeMockSceneGraph(entities: CanvasEntity[] = []): SceneGraph {
  const byId = new Map(entities.map((e) => [e.id, e]));
  return {
    getEntities: vi.fn(() => entities),
    queryPoint: vi.fn(() => []),
    queryRegion: vi.fn(() => []),
    getEntity: vi.fn((id: string) => byId.get(id) ?? null),
    addEntity: vi.fn(),
    removeEntity: vi.fn(),
    updateEntity: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    getSnapshot: vi.fn(() => entities),
  } as unknown as SceneGraph;
}

describe('SelectionOverlay', () => {
  it('renders nothing when no entities are selected', () => {
    const { container } = render(
      <SelectionOverlay
        selectedIds={new Set()}
        sceneGraph={makeMockSceneGraph()}
        interactionMode="edit"
      />,
    );
    expect(screen.queryByTestId('selection-overlay')).toBeNull();
    // Should be empty or contain nothing visible
    expect(container.children.length).toBeLessThanOrEqual(1);
  });

  it('renders selection overlay when an entity is selected', () => {
    const entity = makeEntity({ id: 'e1' });
    render(
      <SelectionOverlay
        selectedIds={new Set(['e1'])}
        sceneGraph={makeMockSceneGraph([entity])}
        interactionMode="edit"
      />,
    );
    expect(screen.getByTestId('selection-overlay')).toBeTruthy();
  });

  it('does not render in preview mode', () => {
    const entity = makeEntity({ id: 'e1' });
    const { container } = render(
      <SelectionOverlay
        selectedIds={new Set(['e1'])}
        sceneGraph={makeMockSceneGraph([entity])}
        interactionMode="preview"
      />,
    );
    expect(screen.queryByTestId('selection-overlay')).toBeNull();
  });

  it('renders floating toolbar for single selection in edit mode', () => {
    const entity = makeEntity({ id: 'e1' });
    render(
      <SelectionOverlay
        selectedIds={new Set(['e1'])}
        sceneGraph={makeMockSceneGraph([entity])}
        interactionMode="edit"
      />,
    );
    expect(screen.getByTestId('mock-floating-toolbar')).toBeTruthy();
  });
});
