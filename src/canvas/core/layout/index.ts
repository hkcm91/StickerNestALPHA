/**
 * Layout Mode Module
 *
 * Provides layout strategies for canvas entity positioning and sizing.
 *
 * @module canvas/core/layout
 * @layer L4A-1
 */

// Types and interfaces
export type {
  LayoutMode,
  ConstraintContext,
  ConstraintResult,
  SnapPoint,
  SnapPointType,
} from './layout-mode';
export { SnapPointSchema } from './layout-mode';

// Freeform layout
export { freeformLayout, createFreeformLayout, findNearestSnap } from './freeform';

// Bento layout
export {
  bentoLayout,
  createBentoLayout,
  DEFAULT_BENTO_CONFIG,
  bentoPositionToCell,
  bentoCellToPosition,
  bentoCellSpanToSize,
  bentoSizeToCellSpan,
} from './bento';
export type { BentoConfig } from './bento';

// Desktop layout
export {
  desktopLayout,
  createDesktopLayout,
  DEFAULT_DESKTOP_CONFIG,
  getCascadedPosition,
  detectDockingZone,
  getDockedBounds,
} from './desktop';
export type { DesktopConfig, DockingZone } from './desktop';

// Artboard layout
export { artboardLayout, createArtboardLayout } from './artboard';

// Registry
export {
  registerLayoutMode,
  getLayoutMode,
  hasLayoutMode,
  unregisterLayoutMode,
  getRegisteredLayoutModes,
  getAllLayoutModes,
  clearLayoutModes,
  initializeDefaultLayoutModes,
  getDefaultLayoutMode,
} from './layout-registry';
