import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import { createContextMenuController } from './context-menu';

describe('ContextMenuController', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    useUIStore.getState().reset();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('getEntityMenuItems returns standard entity actions', () => {
    const ctrl = createContextMenuController();
    const items = ctrl.getEntityMenuItems('e1');
    expect(items.some((i) => i.action === 'delete')).toBe(true);
    expect(items.some((i) => i.action === 'bringToFront')).toBe(true);
    expect(items.some((i) => i.action === 'sendToBack')).toBe(true);
  });

  it('getCanvasMenuItems returns canvas actions', () => {
    const ctrl = createContextMenuController();
    const items = ctrl.getCanvasMenuItems();
    expect(items.some((i) => i.action === 'paste')).toBe(true);
    expect(items.some((i) => i.action === 'selectAll')).toBe(true);
  });

  it('executeAction delete emits ENTITY_DELETED', () => {
    const ctrl = createContextMenuController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_DELETED, handler);
    ctrl.executeAction('delete', 'e1');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ id: 'e1' });
  });

  it('executeAction lock emits ENTITY_UPDATED', () => {
    const ctrl = createContextMenuController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, handler);
    ctrl.executeAction('lock', 'e1');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ id: 'e1', updates: { locked: true } });
  });

  it('isActiveInMode returns false in preview mode', () => {
    const ctrl = createContextMenuController();
    expect(ctrl.isActiveInMode()).toBe(true);
    useUIStore.getState().setCanvasInteractionMode('preview');
    expect(ctrl.isActiveInMode()).toBe(false);
  });
});
