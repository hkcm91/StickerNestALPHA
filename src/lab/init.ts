/**
 * Lab Initialization
 *
 * Entry point for the Widget Lab layer.
 * Sets up bus subscriptions and initializes lab services.
 *
 * @module lab
 * @layer L2
 */

import { ShellEvents } from '@sn/types';

import { bus } from '../kernel/bus';

let initialized = false;
const unsubscribers: Array<() => void> = [];

/**
 * Initialize the Lab layer.
 * Idempotent — safe to call multiple times.
 */
export function initLab(): void {
  if (initialized) return;

  // Subscribe to theme changes so preview can receive updated tokens
  const unsubTheme = bus.subscribe(ShellEvents.THEME_CHANGED, (event) => {
    bus.emit('lab.theme.updated', event.payload);
  });
  unsubscribers.push(unsubTheme);

  initialized = true;
}

/**
 * Tear down the Lab layer.
 * Cleans up bus subscriptions and internal state.
 */
export function teardownLab(): void {
  if (!initialized) return;

  for (const unsub of unsubscribers) {
    unsub();
  }
  unsubscribers.length = 0;

  initialized = false;
}

/**
 * Check if the Lab layer is initialized.
 */
export function isLabInitialized(): boolean {
  return initialized;
}
