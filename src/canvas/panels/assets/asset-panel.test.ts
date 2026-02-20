import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import { createAssetPanelController } from './asset-panel';
import type { AssetItem } from './asset-panel';

const sampleAssets: AssetItem[] = [
  { id: 's1', name: 'Cat Sticker', type: 'sticker', metadata: { url: 'cat.png' } },
  { id: 's2', name: 'Dog Sticker', type: 'sticker', metadata: { url: 'dog.png' } },
  { id: 'w1', name: 'Clock Widget', type: 'widget', metadata: {} },
  { id: 'w2', name: 'Counter Widget', type: 'widget', metadata: {} },
];

describe('AssetPanelController', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    useUIStore.getState().reset();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('startDrag sticker emits TOOL_CHANGED with sticker tool', () => {
    const ctrl = createAssetPanelController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.TOOL_CHANGED, handler);
    ctrl.startDrag(sampleAssets[0]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.tool).toBe('sticker');
  });

  it('startDrag widget emits TOOL_CHANGED with widget tool', () => {
    const ctrl = createAssetPanelController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.TOOL_CHANGED, handler);
    ctrl.startDrag(sampleAssets[2]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload.tool).toBe('widget');
  });

  it('search filters by name', () => {
    const ctrl = createAssetPanelController();
    const results = ctrl.search('cat', sampleAssets);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('s1');
  });

  it('search with empty query returns all', () => {
    const ctrl = createAssetPanelController();
    const results = ctrl.search('', sampleAssets);
    expect(results).toHaveLength(4);
  });

  it('paginate returns correct page', () => {
    const ctrl = createAssetPanelController();
    const result = ctrl.paginate(sampleAssets, 1, 2);
    expect(result.items).toHaveLength(2);
    expect(result.totalPages).toBe(2);
  });

  it('paginate clamps page number', () => {
    const ctrl = createAssetPanelController();
    const result = ctrl.paginate(sampleAssets, 99, 2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('w1');
  });

  it('isActiveInMode returns false in preview mode', () => {
    const ctrl = createAssetPanelController();
    expect(ctrl.isActiveInMode()).toBe(true);
    useUIStore.getState().setCanvasInteractionMode('preview');
    expect(ctrl.isActiveInMode()).toBe(false);
  });
});
