/**
 * useCropMode — React hook for subscribing to crop mode state.
 *
 * Wraps the module-scoped crop mode state from cropHandler with
 * useSyncExternalStore for safe React integration.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import { useSyncExternalStore } from 'react';

import { getCropModeIds, subscribeCropMode } from '../handlers';

/**
 * Returns the current set of entity IDs that are in crop mode.
 * Re-renders when crop mode state changes.
 */
export function useCropMode(): Set<string> {
  return useSyncExternalStore(subscribeCropMode, getCropModeIds, getCropModeIds);
}
