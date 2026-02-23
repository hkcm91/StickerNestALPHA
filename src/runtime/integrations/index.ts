/**
 * Integration Proxy — Public API
 *
 * @module runtime/integrations
 * @layer L3
 */

export { createIntegrationProxy } from './integration-proxy';
export type { IntegrationHandler, IntegrationProxy } from './integration-proxy';
export { getIntegrationProxy, resetIntegrationProxy } from './singleton';
export { createAiHandler } from './ai-handler';
