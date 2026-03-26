/**
 * Shortcut registry tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { bus } from '../../kernel/bus';

import { createShortcutRegistry, registerDefaultShortcuts } from './shortcut-registry';
import type { ShortcutRegistry } from './shortcut-registry';

function fireKey(key: string, opts: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; metaKey?: boolean; target?: EventTarget } = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
    metaKey: opts.metaKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  // Override target if needed
  if (opts.target) {
    Object.defineProperty(event, 'target', { value: opts.target });
  }
  window.dispatchEvent(event);
  return event;
}

describe('ShortcutRegistry', () => {
  let registry: ShortcutRegistry;

  beforeEach(() => {
    registry = createShortcutRegistry();
    registerDefaultShortcuts(registry);
    registry.setActiveScope('canvas');
    registry.attach();

    return () => registry.detach();
  });

  it('Ctrl+Z in canvas scope emits shell.shortcut.undo', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.shortcut.undo', handler);

    fireKey('z', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('Ctrl+Z in lab scope does NOT emit undo (canvas-scoped shortcut)', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.shortcut.undo', handler);

    registry.setActiveScope('lab');
    fireKey('z', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
    unsub();
  });

  it('Ctrl+S emits shell.shortcut.save (global scope works everywhere)', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.shortcut.save', handler);

    registry.setActiveScope('lab');
    fireKey('s', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('Ctrl+Shift+Z emits shell.shortcut.redo', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.shortcut.redo', handler);

    fireKey('z', { ctrlKey: true, shiftKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('ignores keydown events targeting input elements', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.shortcut.undo', handler);

    const input = document.createElement('input');
    fireKey('z', { ctrlKey: true, target: input });

    expect(handler).not.toHaveBeenCalled();
    unsub();
  });

  it('ignores keydown events targeting textarea elements', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.shortcut.undo', handler);

    const textarea = document.createElement('textarea');
    fireKey('z', { ctrlKey: true, target: textarea });

    expect(handler).not.toHaveBeenCalled();
    unsub();
  });

  it('unregister removes a shortcut', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.shortcut.undo', handler);

    registry.unregister('undo');
    fireKey('z', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
    unsub();
  });

  it('detach stops listening', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.shortcut.undo', handler);

    registry.detach();
    fireKey('z', { ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
    unsub();
  });

  it('attach is idempotent — double-attach does not double-fire', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.shortcut.undo', handler);

    registry.attach(); // second attach
    fireKey('z', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
  });

  // ---- Spatial mode shortcuts ----

  it('Shift+# (Shift+3) emits shell.spatial.toggle3d in canvas scope', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.spatial.toggle3d', handler);

    fireKey('#', { shiftKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('Shift+V emits shell.spatial.enterVR in canvas scope', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.spatial.enterVR', handler);

    fireKey('V', { shiftKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('Shift+# does NOT fire in lab scope', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.spatial.toggle3d', handler);

    registry.setActiveScope('lab');
    fireKey('#', { shiftKey: true });

    expect(handler).not.toHaveBeenCalled();
    unsub();
  });

  it('Shift+V does NOT fire in lab scope', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('shell.spatial.enterVR', handler);

    registry.setActiveScope('lab');
    fireKey('V', { shiftKey: true });

    expect(handler).not.toHaveBeenCalled();
    unsub();
  });
});
