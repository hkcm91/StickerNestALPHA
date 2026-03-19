import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createMinimapController } from './minimap';

// Mock the uiStore
vi.mock('../../../kernel/stores/ui/ui.store', () => ({
  useUIStore: {
    getState: vi.fn(() => ({ canvasInteractionMode: 'edit' })),
  },
}));

describe('MinimapController', () => {
  let ctrl: ReturnType<typeof createMinimapController>;

  beforeEach(() => {
    ctrl = createMinimapController(200, 150);
  });

  // -----------------------------------------------------------------------
  // Entity management
  // -----------------------------------------------------------------------

  it('starts with empty state', () => {
    const state = ctrl.getState();
    expect(state.entities).toHaveLength(0);
    expect(state.worldBounds).toBeNull();
    expect(state.collapsed).toBe(false);
  });

  it('upserts entities', () => {
    ctrl.upsertEntity('e1', { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    ctrl.upsertEntity('e2', { min: { x: 200, y: 200 }, max: { x: 300, y: 300 } });

    const state = ctrl.getState();
    expect(state.entities).toHaveLength(2);
  });

  it('updates existing entity on re-upsert', () => {
    ctrl.upsertEntity('e1', { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    ctrl.upsertEntity('e1', { min: { x: 50, y: 50 }, max: { x: 150, y: 150 } });

    const state = ctrl.getState();
    expect(state.entities).toHaveLength(1);
    expect(state.entities[0].bounds.min.x).toBe(50);
  });

  it('removes entity', () => {
    ctrl.upsertEntity('e1', { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    ctrl.removeEntity('e1');

    expect(ctrl.getState().entities).toHaveLength(0);
  });

  it('clears all entities', () => {
    ctrl.upsertEntity('e1', { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } });
    ctrl.upsertEntity('e2', { min: { x: 200, y: 200 }, max: { x: 300, y: 300 } });
    ctrl.clearEntities();

    expect(ctrl.getState().entities).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // World bounds
  // -----------------------------------------------------------------------

  it('computes world bounds from entities', () => {
    ctrl.upsertEntity('e1', { min: { x: 0, y: 10 }, max: { x: 100, y: 110 } });
    ctrl.upsertEntity('e2', { min: { x: 200, y: 5 }, max: { x: 300, y: 300 } });

    const state = ctrl.getState();
    expect(state.worldBounds).toEqual({
      min: { x: 0, y: 5 },
      max: { x: 300, y: 300 },
    });
  });

  // -----------------------------------------------------------------------
  // Click to teleport
  // -----------------------------------------------------------------------

  it('handleClick returns canvas-space point', () => {
    ctrl.upsertEntity('e1', { min: { x: 0, y: 0 }, max: { x: 1000, y: 1000 } });
    ctrl.updateViewport({ min: { x: 0, y: 0 }, max: { x: 1920, y: 1080 } });

    const result = ctrl.handleClick({ x: 100, y: 75 });
    expect(result).not.toBeNull();
    // The exact values depend on the transform, but they should be in canvas space
    expect(typeof result!.x).toBe('number');
    expect(typeof result!.y).toBe('number');
  });

  it('handleClick returns null when no entities', () => {
    const result = ctrl.handleClick({ x: 100, y: 75 });
    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Viewport drag
  // -----------------------------------------------------------------------

  it('handleViewportDrag converts minimap delta to canvas space', () => {
    ctrl.upsertEntity('e1', { min: { x: 0, y: 0 }, max: { x: 1000, y: 1000 } });
    ctrl.updateViewport({ min: { x: 0, y: 0 }, max: { x: 1920, y: 1080 } });

    const delta = ctrl.handleViewportDrag({ x: 10, y: 5 });
    expect(delta).not.toBeNull();
    // Canvas delta should be larger than minimap delta (minimap is scaled down)
    expect(Math.abs(delta!.x)).toBeGreaterThan(10);
    expect(Math.abs(delta!.y)).toBeGreaterThan(5);
  });

  it('handleViewportDrag returns null when no entities', () => {
    const delta = ctrl.handleViewportDrag({ x: 10, y: 5 });
    expect(delta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Collapsed state
  // -----------------------------------------------------------------------

  it('toggleCollapsed toggles state', () => {
    expect(ctrl.getState().collapsed).toBe(false);
    ctrl.toggleCollapsed();
    expect(ctrl.getState().collapsed).toBe(true);
    ctrl.toggleCollapsed();
    expect(ctrl.getState().collapsed).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Mode visibility
  // -----------------------------------------------------------------------

  it('isActiveInMode returns true in edit mode', () => {
    expect(ctrl.isActiveInMode()).toBe(true);
  });

  it('isActiveInMode returns false in preview mode', async () => {
    const { useUIStore } = await import('../../../kernel/stores/ui/ui.store');
    (useUIStore.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      canvasInteractionMode: 'preview',
    });
    expect(ctrl.isActiveInMode()).toBe(false);
  });
});
