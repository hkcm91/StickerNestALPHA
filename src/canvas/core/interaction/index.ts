/**
 * Canvas Interaction Module
 *
 * Manages canvas interaction modes and derived state.
 *
 * @module canvas/core/interaction
 * @layer L4A-1
 */

export {
  useInteractionStore,
  canManipulateEntities,
  areToolsEnabled,
  areWidgetsInteractive,
  setupInteractionBusSubscriptions,
} from './interaction-store';

export type {
  InteractionMode,
  InteractionState,
  InteractionActions,
  InteractionStore,
} from './interaction-store';
