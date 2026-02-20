/**
 * Shell Initialization
 *
 * Applies initial theme, wires up keyboard shortcuts,
 * and subscribes shortcut bus events to store actions.
 *
 * @module shell/init
 * @layer L6
 */

import { bus } from '../kernel/bus';
import { useHistoryStore } from '../kernel/stores/history/history.store';
import { useUIStore } from '../kernel/stores/ui/ui.store';

import { createShortcutRegistry, registerDefaultShortcuts } from './shortcuts/shortcut-registry';
import type { ShortcutRegistry } from './shortcuts/shortcut-registry';
import { applyThemeTokens, emitThemeChange } from './theme/theme-provider';

let initialized = false;
let registry: ShortcutRegistry | null = null;
const busUnsubscribes: Array<() => void> = [];

/**
 * Initialize the shell layer.
 * Call once at app startup after initKernel() and initRuntime().
 */
export function initShell(): void {
  if (initialized) return;

  // 1. Apply initial theme CSS vars
  const theme = useUIStore.getState().theme;
  applyThemeTokens(theme);

  // 2. Emit initial theme event so runtime/lab pick up tokens
  emitThemeChange(theme);

  // 3. Create shortcut registry, register defaults, attach
  registry = createShortcutRegistry();
  registerDefaultShortcuts(registry);
  registry.setActiveScope('canvas');
  registry.attach();

  // 4. Wire shortcut bus events to store actions
  busUnsubscribes.push(
    bus.subscribe('shell.shortcut.undo', () => {
      useHistoryStore.getState().undo();
    }),
  );
  busUnsubscribes.push(
    bus.subscribe('shell.shortcut.redo', () => {
      useHistoryStore.getState().redo();
    }),
  );
  busUnsubscribes.push(
    bus.subscribe('shell.shortcut.toggle-sidebar-left', () => {
      useUIStore.getState().toggleSidebarLeft();
    }),
  );
  busUnsubscribes.push(
    bus.subscribe('shell.shortcut.toggle-sidebar-right', () => {
      useUIStore.getState().toggleSidebarRight();
    }),
  );

  initialized = true;
}

/**
 * Tear down the shell layer. Used for testing.
 */
export function teardownShell(): void {
  if (!initialized) return;

  for (const unsub of busUnsubscribes) {
    unsub();
  }
  busUnsubscribes.length = 0;

  registry?.detach();
  registry = null;

  initialized = false;
}

/**
 * Check if the shell has been initialized.
 */
export function isShellInitialized(): boolean {
  return initialized;
}

/**
 * Get the shortcut registry (for scope changes from router).
 */
export function getShortcutRegistry(): ShortcutRegistry | null {
  return registry;
}
