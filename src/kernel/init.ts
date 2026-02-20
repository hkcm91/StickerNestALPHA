/**
 * Kernel Initialization
 *
 * Wires all store bus subscriptions and sets up auth listener.
 * Call `initKernel()` once at application startup from the Shell layer.
 *
 * @module kernel/init
 */

import { initAuthListener } from './auth';
import { setupAuthBusSubscriptions } from './stores/auth';
import { setupCanvasBusSubscriptions } from './stores/canvas';
import { setupHistoryBusSubscriptions } from './stores/history';
import { setupSocialBusSubscriptions } from './stores/social';
import { setupUIBusSubscriptions } from './stores/ui';
import { setupWidgetBusSubscriptions } from './stores/widget';
import { setupWorkspaceBusSubscriptions } from './stores/workspace';

let initialized = false;
let authUnsubscribe: (() => void) | null = null;

/**
 * Initialize the kernel. Sets up all store bus subscriptions and auth listener.
 * Safe to call multiple times — only initializes once.
 */
export function initKernel(): void {
  if (initialized) {
    return;
  }

  // Wire up all store bus subscriptions
  setupAuthBusSubscriptions();
  setupWorkspaceBusSubscriptions();
  setupCanvasBusSubscriptions();
  setupHistoryBusSubscriptions();
  setupWidgetBusSubscriptions();
  setupSocialBusSubscriptions();
  setupUIBusSubscriptions();

  // Set up auth state listener
  const { unsubscribe } = initAuthListener();
  authUnsubscribe = unsubscribe;

  initialized = true;
}

/**
 * Tear down the kernel. Used for testing.
 */
export function teardownKernel(): void {
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }
  initialized = false;
}

/**
 * Check if the kernel has been initialized.
 */
export function isKernelInitialized(): boolean {
  return initialized;
}
