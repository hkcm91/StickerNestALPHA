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

  // -----------------------------------------------------------------------
  // Canvas navigation shortcuts
  // -----------------------------------------------------------------------

  registry.register({
    id: 'zoom-in',
    key: '=',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.zoomIn',
  });

  registry.register({
    id: 'zoom-in-plus',
    key: '+',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.zoomIn',
  });

  registry.register({
    id: 'zoom-out',
    key: '-',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.zoomOut',
  });

  registry.register({
    id: 'reset-zoom',
    key: '0',
    ctrl: true,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.resetZoom',
  });

  registry.register({
    id: 'zoom-to-fit',
    key: '1',
    ctrl: true,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.zoomToFit',
  });

  registry.register({
    id: 'viewport-reset',
    key: 'Home',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.reset',
  });

  // Arrow key panning
  registry.register({
    id: 'pan-up',
    key: 'ArrowUp',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.panStep',
    payload: { dx: 0, dy: 50 },
  });

  registry.register({
    id: 'pan-down',
    key: 'ArrowDown',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.panStep',
    payload: { dx: 0, dy: -50 },
  });

  registry.register({
    id: 'pan-left',
    key: 'ArrowLeft',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.panStep',
    payload: { dx: 50, dy: 0 },
  });

  registry.register({
    id: 'pan-right',
    key: 'ArrowRight',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.panStep',
    payload: { dx: -50, dy: 0 },
  });

  // Shift+Arrow: fast pan
  registry.register({
    id: 'pan-up-fast',
    key: 'ArrowUp',
    ctrl: false,
    shift: true,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.panStep',
    payload: { dx: 0, dy: 200 },
  });

  registry.register({
    id: 'pan-down-fast',
    key: 'ArrowDown',
    ctrl: false,
    shift: true,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.panStep',
    payload: { dx: 0, dy: -200 },
  });

  registry.register({
    id: 'pan-left-fast',
    key: 'ArrowLeft',
    ctrl: false,
    shift: true,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.panStep',
    payload: { dx: 200, dy: 0 },
  });

  registry.register({
    id: 'pan-right-fast',
    key: 'ArrowRight',
    ctrl: false,
    shift: true,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.viewport.panStep',
    payload: { dx: -200, dy: 0 },
  });

  // -----------------------------------------------------------------------
  // Timeline shortcuts (canvas scope, active when timeline mode is on)
  // -----------------------------------------------------------------------

  registry.register({
    id: 'timeline-toggle-play',
    key: ' ',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'timeline.transport.play',
  });

  registry.register({
    id: 'timeline-razor',
    key: 'c',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.tool.changed',
    payload: { tool: 'razor' },
  });

  registry.register({
    id: 'timeline-slip',
    key: 'y',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'canvas.tool.changed',
    payload: { tool: 'slip' },
  });

  registry.register({
    id: 'timeline-add-marker',
    key: 'm',
    ctrl: false,
    shift: false,
    alt: false,
    scope: 'canvas',
    busEvent: 'timeline.marker.added',
    payload: {},
  });
}
