/**
 * Entity Provider Registry
 *
 * Allows canvas core (L4A) to register a callback that provides
 * the current entity list. This lets kernel-level AI modules and
 * built-in widgets (L3) access canvas entities without importing
 * from L4A directly.
 *
 * @module kernel/ai
 * @layer L0
 */

import type { CanvasEntity } from '@sn/types';

type EntityProvider = () => CanvasEntity[];

let _provider: EntityProvider | null = null;

/**
 * Register the entity provider (called by canvas core during init).
 */
export function registerEntityProvider(provider: EntityProvider): void {
  _provider = provider;
}

/**
 * Unregister the entity provider (called during teardown).
 */
export function unregisterEntityProvider(): void {
  _provider = null;
}

/**
 * Get the current canvas entities via the registered provider.
 * Returns an empty array if no provider is registered.
 */
export function getCanvasEntities(): CanvasEntity[] {
  return _provider ? _provider() : [];
}
