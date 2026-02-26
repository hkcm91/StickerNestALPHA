/**
 * Keyboard Shortcut Registry
 *
 * Central keydown handler that maps key combos to bus events.
 * Scoped: canvas shortcuts don't fire in Lab and vice versa.
 *
 * @module shell/shortcuts
 * @layer L6
 */

import { bus } from '../../kernel/bus';

export type ShortcutScope = 'global' | 'canvas' | 'lab';

export interface ShortcutDefinition {
  id: string;
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  scope: ShortcutScope;
  busEvent: string;
  payload?: unknown;
}

export interface ShortcutRegistry {
  register(def: ShortcutDefinition): void;
  unregister(id: string): void;
  setActiveScope(scope: ShortcutScope): void;
  getActiveScope(): ShortcutScope;
  attach(): void;
  detach(): void;
  getAll(): ReadonlyArray<ShortcutDefinition>;
}

const IGNORED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditable(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (IGNORED_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return false;
}

export function createShortcutRegistry(): ShortcutRegistry {
  const shortcuts = new Map<string, ShortcutDefinition>();
  let activeScope: ShortcutScope = 'global';
  let listener: ((e: KeyboardEvent) => void) | null = null;

  function handleKeydown(e: KeyboardEvent): void {
    if (isEditable(e.target)) return;

    const mod = e.metaKey || e.ctrlKey;

    for (const def of shortcuts.values()) {
      if (def.key.toLowerCase() !== e.key.toLowerCase()) continue;
      if (def.ctrl !== mod) continue;
      if (def.shift !== e.shiftKey) continue;
      if (def.alt !== e.altKey) continue;

      // Check scope match
      if (def.scope !== 'global' && def.scope !== activeScope) continue;

      e.preventDefault();
      bus.emit(def.busEvent, def.payload ?? {});
      return;
    }
  }

  return {
    register(def) {
      shortcuts.set(def.id, def);
    },

    unregister(id) {
      shortcuts.delete(id);
    },

    setActiveScope(scope) {
      activeScope = scope;
    },

    getActiveScope() {
      return activeScope;
    },

    attach() {
      if (listener) return; // idempotent
      listener = handleKeydown;
      window.addEventListener('keydown', listener);
    },

    detach() {
      if (!listener) return;
      window.removeEventListener('keydown', listener);
      listener = null;
    },

    getAll() {
      return [...shortcuts.values()];
    },
  };
}

/**
 * Default shortcuts for the shell.
 */
export function registerDefaultShortcuts(registry: ShortcutRegistry): void {
  registry.register({
    id: 'undo',
    key: 'z',
    ctrl: true,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'shell.shortcut.undo',
  });

  registry.register({
    id: 'redo',
    key: 'z',
    ctrl: true,
    shift: true,
    alt: false,
    scope: 'canvas',
    busEvent: 'shell.shortcut.redo',
  });

  registry.register({
    id: 'redo-alt',
    key: 'z',
    ctrl: true,
    shift: false,
    alt: true,
    scope: 'canvas',
    busEvent: 'shell.shortcut.redo',
  });

  registry.register({
    id: 'save',
    key: 's',
    ctrl: true,
    shift: false,
    alt: false,
    scope: 'global',
    busEvent: 'shell.shortcut.save',
  });

  // NOTE: Ctrl+[ and Ctrl+] are reserved for z-order control in canvas.
  // Sidebar toggles moved to Alt+[ and Alt+] to avoid conflict.
  registry.register({
    id: 'toggle-sidebar-left',
    key: '[',
    ctrl: false,
    shift: false,
    alt: true,
    scope: 'canvas',
    busEvent: 'shell.shortcut.toggle-sidebar-left',
  });

  registry.register({
    id: 'toggle-sidebar-right',
    key: ']',
    ctrl: false,
    shift: false,
    alt: true,
    scope: 'canvas',
    busEvent: 'shell.shortcut.toggle-sidebar-right',
  });

  registry.register({
    id: 'toggle-mode',
    key: 'e',
    ctrl: true,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.mode.changed',
    payload: {},
  });
}
