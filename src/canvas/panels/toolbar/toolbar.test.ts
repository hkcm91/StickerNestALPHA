import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import { createToolbarController } from './toolbar';

describe('ToolbarController', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    useUIStore.getState().reset();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('returns current state', () => {
    const toolbar = createToolbarController(() => 1);
    const state = toolbar.getState();
    expect(state.activeTool).toBe('select');
    expect(state.mode).toBe('edit');
    expect(state.zoom).toBe(1);
  });

  it('selectTool emits TOOL_CHANGED bus event', () => {
    const toolbar = createToolbarController(() => 1);
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.TOOL_CHANGED, handler);
    toolbar.selectTool('pen');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ tool: 'pen' });
  });

  it('toggleMode emits MODE_CHANGED bus event', () => {
    const toolbar = createToolbarController(() => 1);
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.MODE_CHANGED, handler);
    toolbar.toggleMode();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ mode: 'preview' });
  });

  it('setMode emits MODE_CHANGED with specific mode', () => {
    const toolbar = createToolbarController(() => 1);
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.MODE_CHANGED, handler);
    toolbar.setMode('preview');
    expect(handler.mock.calls[0][0].payload).toEqual({ mode: 'preview' });
  });

  it('zoomIn increases zoom', () => {
    const toolbar = createToolbarController(() => 1);
    const handler = vi.fn();
    bus.subscribe('canvas.viewport.zoom', handler);
    toolbar.zoomIn();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.zoom).toBeGreaterThan(1);
  });

  it('zoomOut decreases zoom', () => {
    const toolbar = createToolbarController(() => 1);
    const handler = vi.fn();
    bus.subscribe('canvas.viewport.zoom', handler);
    toolbar.zoomOut();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.zoom).toBeLessThan(1);
  });

  it('isActiveInMode always returns true', () => {
    const toolbar = createToolbarController(() => 1);
    expect(toolbar.isActiveInMode()).toBe(true);
    useUIStore.getState().setCanvasInteractionMode('preview');
    expect(toolbar.isActiveInMode()).toBe(true);
  });
});
