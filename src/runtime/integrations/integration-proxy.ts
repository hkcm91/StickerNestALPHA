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

/** Default timeout for handler calls (15 seconds) */
const DEFAULT_TIMEOUT_MS = 15_000;

/** Default TTL for cached query results (30 seconds) */
const DEFAULT_CACHE_TTL_MS = 30_000;

/**
 * Handler interface for a registered integration.
 * Each integration provides query (read) and mutate (write) methods.
 */
export interface IntegrationHandler {
  query(params: unknown): Promise<unknown>;
  mutate(params: unknown): Promise<unknown>;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
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
  /** Invalidate cache for a given integration (or all) */
  invalidateCache(name?: string): void;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Integration "${label}" timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/** Deterministic cache key — sorts object keys to avoid ordering mismatches. */
function stableStringify(val: unknown): string {
  if (val === null || val === undefined || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(val as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify((val as Record<string, unknown>)[k])).join(',') + '}';
}

function cacheKey(name: string, params: unknown): string {
  try {
    return `${name}:${stableStringify(params)}`;
  } catch {
    return `${name}:${String(params)}`;
  }
}

/**
 * Creates a new integration proxy instance with built-in timeout and TTL caching.
 *
 * @param options.timeoutMs - Timeout per handler call (default: 15000ms)
 * @param options.cacheTtlMs - TTL for cached query results (default: 30000ms, 0 = disabled)
 * @returns An IntegrationProxy for registering and invoking integration handlers
 */
export function createIntegrationProxy(options?: {
  timeoutMs?: number;
  cacheTtlMs?: number;
}): IntegrationProxy {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const handlers = new Map<string, IntegrationHandler>();
  const queryCache = new Map<string, CacheEntry>();

  function getFromCache(key: string): unknown | undefined {
    const entry = queryCache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      queryCache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function setInCache(key: string, value: unknown) {
    if (cacheTtlMs <= 0) return;
    queryCache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
  }

  function invalidateByPrefix(prefix: string) {
    queryCache.forEach((_value, key) => {
      if (key.startsWith(prefix)) {
        queryCache.delete(key);
      }
    });
  }

  return {
    register(name: string, handler: IntegrationHandler) {
      handlers.set(name, handler);
    },

    unregister(name: string) {
      handlers.delete(name);
      invalidateByPrefix(name + ':');
    },

    async query(name: string, params: unknown): Promise<unknown> {
      const handler = handlers.get(name);
      if (!handler) {
        throw new Error(`Integration "${name}" is not registered`);
      }
      const key = cacheKey(name, params);
      const cached = getFromCache(key);
      if (cached !== undefined) return cached;

      const result = await withTimeout(handler.query(params), timeoutMs, name);
      setInCache(key, result);
      return result;
    },

    async mutate(name: string, params: unknown): Promise<unknown> {
      const handler = handlers.get(name);
      if (!handler) {
        throw new Error(`Integration "${name}" is not registered`);
      }
      // Invalidate cache for this integration on any mutation
      invalidateByPrefix(name + ':');
      return withTimeout(handler.mutate(params), timeoutMs, name);
    },

    has(name: string): boolean {
      return handlers.has(name);
    },

    invalidateCache(name?: string) {
      if (name) {
        invalidateByPrefix(name + ':');
      } else {
        queryCache.clear();
      }
    },
  };
}
