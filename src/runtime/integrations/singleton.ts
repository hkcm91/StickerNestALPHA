/**
 * Integration Proxy Singleton
 *
 * Shared instance of the integration proxy used by WidgetFrame
 * and registered with handlers during runtime init.
 *
 * @module runtime/integrations
 * @layer L3
 */

import { createIntegrationProxy } from './integration-proxy';
import type { IntegrationProxy } from './integration-proxy';

let instance: IntegrationProxy | null = null;

/**
 * Get the shared integration proxy singleton.
 * Creates the instance on first call.
 */
export function getIntegrationProxy(): IntegrationProxy {
  if (!instance) {
    instance = createIntegrationProxy();
  }
  return instance;
}

/**
 * Reset the singleton (for testing).
 */
export function resetIntegrationProxy(): void {
  instance = null;
}
