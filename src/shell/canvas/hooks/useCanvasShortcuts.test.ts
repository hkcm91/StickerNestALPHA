/**
 * useCanvasShortcuts — production hook tests
 *
 * @module shell/canvas/hooks
 * @layer L6
 * @vitest-environment happy-dom
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { useCanvasShortcuts, type CanvasShortcutDeps } from './useCanvasShortcuts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKeyEvent(overrides: Partial<React.KeyboardEvent> = {}): React.KeyboardEvent {
  return {
    key: '',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    target: document.createElement('div'),
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as React.KeyboardEvent;
}

const ENTITY_A = {
  id: 'ent-a',
  type: 'sticker' as const,
  name: 'Sticker A',
  transform: { position: { x: 100, y: 200 }, rotation: 0, scale: { x: 1, y: 1 } },
  size: { width: 80, height: 80 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const ENTITY_B = {
  id: 'ent-b',
  type: 'text' as const,
  name: 'Text B',
  transform: { position: { x: 300, y: 400 }, rotation: 0, scale: { x: 1, y: 1 } },
  size: { width: 120, height: 60 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function mockSceneGraph(entities = [ENTITY_A, ENTITY_B]) {
  return {
    getAllEntities: vi.fn().mockReturnValue(entities),
    getEntity: vi.fn().mockImplementation((id: string) =>
      entities.find((e) => e.id === id),
    ),
    bringForward: vi.fn(),
    sendBackward: vi.fn(),
    bringToFront: vi.fn(),
    sendToBack: vi.fn(),
    addEntity: vi.fn(),
    removeEntity: vi.fn(),
    updateEntity: vi.fn(),
    getEntitiesByZOrder: vi.fn().mockReturnValue(entities),
    getChildren: vi.fn().mockReturnValue([]),
    getParent: vi.fn().mockReturnValue(undefined),
    getDescendants: vi.fn().mockReturnValue([]),
    queryRegion: vi.fn().mockReturnValue([]),
    queryPoint: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
  };
}

function mockViewportStore() {
  return {
    getState: vi.fn().mockReturnValue({
      zoom: 1,
      viewportWidth: 1024,
      viewportHeight: 768,
      panX: 0,
      panY: 0,
    }),
    zoom: vi.fn(),
    reset: vi.fn(),
    subscribe: vi.fn(),
    pan: vi.fn(),
    resize: vi.fn(),
  };
}

function makeDeps(overrides: Partial<CanvasShortcutDeps> = {}): CanvasShortcutDeps {
  return {
    sceneGraph: mockSceneGraph(),
    selectedIds: new Set<string>(),
    isEditMode: true,
    selectIds: vi.fn(),
    clearSelection: vi.fn(),
    setTool: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCanvasShortcuts (production)', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
  });

  // ---- Mode gating ----

  it('ignores all shortcuts in preview mode', () => {
    const deps = makeDeps({ isEditMode: false, selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    const e = makeKeyEvent({ key: 'Delete' });
    result.current.onKeyDown(e);

    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when target is an input element', () => {
    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    const input = document.createElement('input');
    const e = makeKeyEvent({ key: 'Delete', target: input });
    result.current.onKeyDown(e);

    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when target is a textarea', () => {
    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    const textarea = document.createElement('textarea');
    const e = makeKeyEvent({ key: 'Delete', target: textarea });
    result.current.onKeyDown(e);

    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when target is contentEditable', () => {
    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    const div = document.createElement('div');
    div.contentEditable = 'true';
    const e = makeKeyEvent({ key: 'Delete', target: div });
    result.current.onKeyDown(e);

    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  // ---- Delete / Backspace ----

  it('emits ENTITY_DELETED on Delete key with selection', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_DELETED, handler);

    const deps = makeDeps({ selectedIds: new Set(['ent-a', 'ent-b']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    const e = makeKeyEvent({ key: 'Delete' });
    result.current.onKeyDown(e);

    expect(e.preventDefault).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(2);
    expect(deps.clearSelection).toHaveBeenCalled();
  });

  it('emits ENTITY_DELETED on Backspace key with selection', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_DELETED, handler);

    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'Backspace' }));
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      payload: { id: 'ent-a' },
    }));
  });

  it('does not delete without selection', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_DELETED, handler);

    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'Delete' }));
    expect(handler).not.toHaveBeenCalled();
  });

  // ---- Escape ----

  it('clears selection and resets tool on Escape', () => {
    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    const e = makeKeyEvent({ key: 'Escape' });
    result.current.onKeyDown(e);

    expect(e.preventDefault).toHaveBeenCalled();
    expect(deps.clearSelection).toHaveBeenCalled();
    expect(deps.setTool).toHaveBeenCalledWith('select');
  });

  // ---- Ctrl+A — Select All ----

  it('selects all entities on Ctrl+A', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    const e = makeKeyEvent({ key: 'a', ctrlKey: true });
    result.current.onKeyDown(e);

    expect(e.preventDefault).toHaveBeenCalled();
    expect(deps.selectIds).toHaveBeenCalledWith(new Set(['ent-a', 'ent-b']));
  });

  // ---- Arrow key nudging ----

  it('nudges selected entity by 10px on ArrowUp', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);

    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowUp' }));

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0].payload;
    expect(payload.id).toBe('ent-a');
    expect(payload.updates.transform.position).toEqual({ x: 100, y: 190 });
  });

  it('nudges by 50px on Shift+ArrowRight', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);

    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowRight', shiftKey: true }));

    const payload = handler.mock.calls[0][0].payload;
    expect(payload.updates.transform.position).toEqual({ x: 150, y: 200 });
  });

  it('does not nudge without selection', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);

    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowUp' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('nudges all four directions correctly', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);

    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowDown' }));
    expect(handler.mock.calls[0][0].payload.updates.transform.position).toEqual({ x: 100, y: 210 });

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowLeft' }));
    expect(handler.mock.calls[1][0].payload.updates.transform.position).toEqual({ x: 90, y: 200 });
  });

  // ---- Z-order ----

  it('calls bringForward on Ctrl+]', () => {
    const sg = mockSceneGraph();
    const deps = makeDeps({ sceneGraph: sg, selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: ']', ctrlKey: true }));
    expect(sg.bringForward).toHaveBeenCalledWith('ent-a');
  });

  it('calls sendBackward on Ctrl+[', () => {
    const sg = mockSceneGraph();
    const deps = makeDeps({ sceneGraph: sg, selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: '[', ctrlKey: true }));
    expect(sg.sendBackward).toHaveBeenCalledWith('ent-a');
  });

  it('calls bringToFront on Ctrl+Shift+]', () => {
    const sg = mockSceneGraph();
    const deps = makeDeps({ sceneGraph: sg, selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: ']', ctrlKey: true, shiftKey: true }));
    expect(sg.bringToFront).toHaveBeenCalledWith('ent-a');
  });

  it('calls sendToBack on Ctrl+Shift+[', () => {
    const sg = mockSceneGraph();
    const deps = makeDeps({ sceneGraph: sg, selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: '[', ctrlKey: true, shiftKey: true }));
    expect(sg.sendToBack).toHaveBeenCalledWith('ent-a');
  });

  it('does not z-order without selection', () => {
    const sg = mockSceneGraph();
    const deps = makeDeps({ sceneGraph: sg });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: ']', ctrlKey: true }));
    expect(sg.bringForward).not.toHaveBeenCalled();
  });

  // ---- Ctrl+D — Duplicate ----

  it('emits ENTITY_CREATED for each selected entity on Ctrl+D', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_CREATED, handler);

    // Mock crypto.randomUUID
    const origRandomUUID = crypto.randomUUID;
    let counter = 0;
    crypto.randomUUID = vi.fn(() => `new-id-${++counter}`) as unknown as typeof crypto.randomUUID;

    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'd', ctrlKey: true }));

    expect(handler).toHaveBeenCalledOnce();
    const created = handler.mock.calls[0][0].payload;
    expect(created.id).toMatch(/^new-id-/);
    expect(created.transform.position.x).toBe(120); // original 100 + 20
    expect(created.transform.position.y).toBe(220); // original 200 + 20
    expect(created.name).toBe('Sticker A copy');

    // Should select the duplicates
    expect(deps.selectIds).toHaveBeenCalled();

    crypto.randomUUID = origRandomUUID;
  });

  it('does not duplicate without selection', () => {
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_CREATED, handler);

    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'd', ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  // ---- Ctrl+G / Ctrl+Shift+G — Group / Ungroup ----

  it('emits group event on Ctrl+G with 2+ entities', () => {
    const handler = vi.fn();
    bus.subscribe('canvas.entity.group', handler);

    const deps = makeDeps({ selectedIds: new Set(['ent-a', 'ent-b']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'g', ctrlKey: true }));

    expect(handler).toHaveBeenCalledOnce();
    const ids = handler.mock.calls[0][0].payload.entityIds;
    expect(ids).toContain('ent-a');
    expect(ids).toContain('ent-b');
  });

  it('does not group with only 1 entity selected', () => {
    const handler = vi.fn();
    bus.subscribe('canvas.entity.group', handler);

    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'g', ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('emits ungroup event on Ctrl+Shift+G', () => {
    const handler = vi.fn();
    bus.subscribe('canvas.entity.ungroup', handler);

    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'g', ctrlKey: true, shiftKey: true }));
    expect(handler).toHaveBeenCalledOnce();
  });

  // ---- C — Crop toggle ----

  it('emits crop toggle on C key with selection', () => {
    const handler = vi.fn();
    bus.subscribe('canvas.crop.toggle', handler);

    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'c' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not crop toggle without selection', () => {
    const handler = vi.fn();
    bus.subscribe('canvas.crop.toggle', handler);

    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'c' }));
    expect(handler).not.toHaveBeenCalled();
  });

  // ---- Zoom shortcuts ----

  it('zooms in on Ctrl+=', () => {
    const vp = mockViewportStore();
    const deps = makeDeps({ viewportStore: vp as unknown as CanvasShortcutDeps['viewportStore'] });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: '=', ctrlKey: true }));

    expect(vp.zoom).toHaveBeenCalledWith(
      1.25, // 1 * 1.25
      { x: 512, y: 384 }, // viewport center
    );
  });

  it('zooms out on Ctrl+-', () => {
    const vp = mockViewportStore();
    const deps = makeDeps({ viewportStore: vp as unknown as CanvasShortcutDeps['viewportStore'] });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: '-', ctrlKey: true }));

    expect(vp.zoom).toHaveBeenCalledWith(
      0.8, // 1 / 1.25
      { x: 512, y: 384 },
    );
  });

  it('resets zoom on Ctrl+0', () => {
    const vp = mockViewportStore();
    const deps = makeDeps({ viewportStore: vp as unknown as CanvasShortcutDeps['viewportStore'] });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: '0', ctrlKey: true }));
    expect(vp.reset).toHaveBeenCalledOnce();
  });

  it('zooms at cursor position when lastCursorScreen is available', () => {
    const vp = mockViewportStore();
    const cursorRef = { current: { x: 200, y: 300 } };
    const deps = makeDeps({
      viewportStore: vp as unknown as CanvasShortcutDeps['viewportStore'],
      lastCursorScreen: cursorRef as React.RefObject<{ x: number; y: number } | null>,
    });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: '=', ctrlKey: true }));

    expect(vp.zoom).toHaveBeenCalledWith(1.25, { x: 200, y: 300 });
  });

  // ---- Tool switching ----

  it('switches to select tool on V key (no selection)', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'v' }));
    expect(deps.setTool).toHaveBeenCalledWith('select');
  });

  it('switches to pan tool on H key (no selection)', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'h' }));
    expect(deps.setTool).toHaveBeenCalledWith('pan');
  });

  it('switches to text tool on T key (no selection)', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 't' }));
    expect(deps.setTool).toHaveBeenCalledWith('text');
  });

  it('switches to rect tool on R key (no selection)', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'r' }));
    expect(deps.setTool).toHaveBeenCalledWith('rect');
  });

  it('switches to pen tool on P key (no selection)', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'p' }));
    expect(deps.setTool).toHaveBeenCalledWith('pen');
  });

  it('switches to ellipse tool on E key (no selection)', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'e' }));
    expect(deps.setTool).toHaveBeenCalledWith('ellipse');
  });

  it('does NOT switch tool when entities are selected', () => {
    const deps = makeDeps({ selectedIds: new Set(['ent-a']) });
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'v' }));
    expect(deps.setTool).not.toHaveBeenCalled();
  });

  it('does NOT switch tool when modifier keys are held', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useCanvasShortcuts(deps));

    result.current.onKeyDown(makeKeyEvent({ key: 'v', ctrlKey: true }));
    expect(deps.setTool).not.toHaveBeenCalled();
  });
});
