/**
 * CanvasToolLayer component tests.
 *
 * @module shell/canvas
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ViewportState, SceneGraph } from '../../canvas/core';

vi.mock('../../canvas/core', () => ({
  screenToCanvas: vi.fn((p: any) => p),
  anchorsToSvgPath: vi.fn(() => ''),
  resolveEntityTransform: vi.fn((e: any) => e.transform),
  setEntityPlatformTransform: vi.fn((e: any) => e),
}));

vi.mock('../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

vi.mock('../../kernel/stores/ui/ui.store', () => ({
  useUIStore: vi.fn((selector) => {
    const state: Record<string, unknown> = {
      canvasInteractionMode: 'edit',
      activeTool: 'select',
      pendingToolData: null,
    };
    return selector(state);
  }),
}));

vi.mock('./CanvasViewportLayer', () => ({
  CanvasViewportLayer: ({ children }: any) => <div data-testid="mock-viewport-layer">{children}</div>,
}));

vi.mock('./hooks', () => ({
  createLocalCanvas: vi.fn(),
  slugifyCanvasName: vi.fn((s: string) => s),
}));

import { CanvasToolLayer } from './CanvasToolLayer';

function makeViewport(): ViewportState {
  return { zoom: 1, offset: { x: 0, y: 0 }, viewportWidth: 1920, viewportHeight: 1080 };
}

function makeMockSceneGraph(entities: any[] = []): SceneGraph {
  return {
    getEntities: vi.fn(() => entities),
    getEntitiesByZOrder: vi.fn(() => entities),
    queryPoint: vi.fn(() => []),
    queryRegion: vi.fn(() => []),
    getEntity: vi.fn(() => null),
    addEntity: vi.fn(),
    removeEntity: vi.fn(),
    updateEntity: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    getSnapshot: vi.fn(() => entities),
  } as unknown as SceneGraph;
}

describe('CanvasToolLayer', () => {
  it('renders the tool layer', () => {
    render(
      <CanvasToolLayer
        viewport={makeViewport()}
        sceneGraph={makeMockSceneGraph()}
        activeTool="select"
        toolsEnabled={true}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('canvas-tool-layer')).toBeTruthy();
  });

  it('renders without a background portal by default', () => {
    const { container } = render(
      <CanvasToolLayer
        viewport={makeViewport()}
        sceneGraph={makeMockSceneGraph()}
        activeTool="select"
        toolsEnabled={true}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    // Tool layer renders within the container
    expect(container.querySelector('[data-testid="canvas-tool-layer"]')).toBeTruthy();
  });

  it('renders hit-boxes for entities in the scene graph', () => {
    const entity = {
      id: 'e1',
      type: 'sticker',
      canvasId: 'c1',
      transform: { position: { x: 50, y: 50 }, size: { width: 100, height: 80 }, rotation: 0, scale: 1 },
      zIndex: 1,
      visible: true,
      locked: false,
      opacity: 1,
      borderRadius: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      createdBy: 'user',
    };
    const sg = makeMockSceneGraph([entity]);

    render(
      <CanvasToolLayer
        viewport={makeViewport()}
        sceneGraph={sg}
        activeTool="select"
        toolsEnabled={true}
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('hit-box-e1')).toBeTruthy();
  });
});
