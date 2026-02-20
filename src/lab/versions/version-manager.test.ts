import { describe, it, expect } from 'vitest';

import type { WidgetManifest } from '@sn/types';

import { createVersionManager } from './version-manager';

function makeManifest(): WidgetManifest {
  return {
    id: 'test-widget',
    name: 'Test',
    version: '1.0.0',
    license: 'MIT',
    tags: [],
    category: 'other',
    permissions: [],
    events: { emits: [], subscribes: [] },
    config: { fields: [] },
    size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
    entry: 'index.html',
    spatialSupport: false,
  };
}

describe('createVersionManager', () => {
  it('starts with no snapshots', () => {
    const vm = createVersionManager('widget-1');
    expect(vm.list()).toEqual([]);
  });

  it('saves a snapshot with label, html, and manifest', () => {
    const vm = createVersionManager('widget-1');
    const snap = vm.save('v1', '<div>Hello</div>', makeManifest());
    expect(snap.label).toBe('v1');
    expect(snap.html).toBe('<div>Hello</div>');
    expect(snap.widgetId).toBe('widget-1');
    expect(snap.id).toBeTruthy();
    expect(snap.createdAt).toBeTruthy();
  });

  it('lists saved snapshots', () => {
    const vm = createVersionManager('widget-1');
    vm.save('v1', '<div>1</div>', makeManifest());
    vm.save('v2', '<div>2</div>', makeManifest());
    expect(vm.list()).toHaveLength(2);
  });

  it('restores a snapshot by id', () => {
    const vm = createVersionManager('widget-1');
    const snap = vm.save('v1', '<div>1</div>', makeManifest());
    const restored = vm.restore(snap.id);
    expect(restored).toEqual(snap);
  });

  it('returns null for unknown snapshot id', () => {
    const vm = createVersionManager('widget-1');
    expect(vm.restore('unknown-id')).toBeNull();
  });

  it('deletes a snapshot', () => {
    const vm = createVersionManager('widget-1');
    const snap = vm.save('v1', '<div>1</div>', makeManifest());
    expect(vm.delete(snap.id)).toBe(true);
    expect(vm.list()).toHaveLength(0);
  });

  it('returns false when deleting unknown snapshot', () => {
    const vm = createVersionManager('widget-1');
    expect(vm.delete('unknown')).toBe(false);
  });

  it('destroy clears all snapshots', () => {
    const vm = createVersionManager('widget-1');
    vm.save('v1', '<div>1</div>', makeManifest());
    vm.destroy();
    expect(vm.list()).toEqual([]);
  });

  it('returns a copy of the list (not a reference)', () => {
    const vm = createVersionManager('widget-1');
    vm.save('v1', '<div>1</div>', makeManifest());
    const list1 = vm.list();
    const list2 = vm.list();
    expect(list1).not.toBe(list2);
  });
});
