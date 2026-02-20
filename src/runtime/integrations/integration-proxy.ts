/**
 * Integration Proxy Registry
 *
 * Host-side proxy that handles integration requests from widgets.
 * Widgets never receive credentials — the host proxies all external calls.
 *
 * @module runtime/integrations
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

/**
 * Handler interface for a registered integration.
 * Each integration provides query (read) and mutate (write) methods.
 */
export interface IntegrationHandler {
  query(params: unknown): Promise<unknown>;
  mutate(params: unknown): Promise<unknown>;
}

/**
 * The integration proxy API exposed to the WidgetFrame host.
 */
export interface IntegrationProxy {
  /** Register an integration handler by name */
  register(name: string, handler: IntegrationHandler): void;
  /** Unregister an integration handler by name */
  unregister(name: string): void;
  /** Execute a query (read) against a named integration */
  query(name: string, params: unknown): Promise<unknown>;
  /** Execute a mutation (write) against a named integration */
  mutate(name: string, params: unknown): Promise<unknown>;
  /** Check if an integration is registered */
  has(name: string): boolean;
}

/**
 * Creates a new integration proxy instance.
 *
 * @returns An IntegrationProxy for registering and invoking integration handlers
 */
export function createIntegrationProxy(): IntegrationProxy {
  const handlers = new Map<string, IntegrationHandler>();

  return {
    register(name: string, handler: IntegrationHandler) {
      handlers.set(name, handler);
    },

    unregister(name: string) {
      handlers.delete(name);
    },

    async query(name: string, params: unknown): Promise<unknown> {
      const handler = handlers.get(name);
      if (!handler) {
        throw new Error(`Integration "${name}" is not registered`);
      }
      return handler.query(params);
    },

    async mutate(name: string, params: unknown): Promise<unknown> {
      const handler = handlers.get(name);
      if (!handler) {
        throw new Error(`Integration "${name}" is not registered`);
      }
      return handler.mutate(params);
    },

    has(name: string): boolean {
      return handlers.has(name);
    },
  };
}
