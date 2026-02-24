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
export { createSocialHandler } from './social-handler';
export {
  createNotionHandler,
  checkNotionConnection,
  getWidgetNotionPermissions,
} from './notion-handler';
export type { NotionHandlerContext } from './notion-handler';
