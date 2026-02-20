import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import { createFloatingActionBarController } from './floating-action-bar';

describe('FloatingActionBarController', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
    useUIStore.getState().reset();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('returns no actions for empty selection', () => {
    const ctrl = createFloatingActionBarController();
    expect(ctrl.getActions(0)).toHaveLength(0);
  });

  it('returns standard actions for single selection', () => {
    const ctrl = createFloatingActionBarController();
    const actions = ctrl.getActions(1);
    expect(actions.some((a) => a.action === 'delete')).toBe(true);
    expect(actions.some((a) => a.action === 'duplicate')).toBe(true);
    expect(actions.some((a) => a.action === 'group')).toBe(false);
  });

  it('includes group action for multi-selection', () => {
    const ctrl = createFloatingActionBarController();
    const actions = ctrl.getActions(2);
    expect(actions.some((a) => a.action === 'group')).toBe(true);
  });

  it('executeAction delete emits ENTITY_DELETED for each entity', () => {
    const ctrl = createFloatingActionBarController();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.ENTITY_DELETED, handler);
    ctrl.executeAction('delete', ['e1', 'e2']);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('isActiveInMode returns false in preview mode', () => {
    const ctrl = createFloatingActionBarController();
    expect(ctrl.isActiveInMode()).toBe(true);
    useUIStore.getState().setCanvasInteractionMode('preview');
    expect(ctrl.isActiveInMode()).toBe(false);
  });
});
