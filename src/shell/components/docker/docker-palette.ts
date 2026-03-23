/**
 * Docker palette — glass surface constants for shell-level docker panels.
 *
 * Re-exports shared palette from L2 (shell can import from any layer)
 * plus docker-specific layout/animation constants.
 *
 * @module shell/components/docker
 * @layer L6
 */

export { labPalette as palette, HEX, hexToRgb, SPRING, STAGGER_MS } from '../../../lab/components/shared/palette';

// =============================================================================
// Docker Layout Constants
// =============================================================================

/** Minimum docker panel dimensions */
export const MIN_WIDTH = 220;
export const MIN_HEIGHT = 160;

/** Default size for new floating dockers */
export const DEFAULT_WIDTH = 320;
export const DEFAULT_HEIGHT = 400;

/** Width of docked panels */
export const DOCKED_WIDTH = 320;

/** Snap threshold — distance from edge to trigger dock zone highlight */
export const SNAP_THRESHOLD = 60;

/** Drag threshold before undock starts (px) */
export const UNDOCK_DRAG_THRESHOLD = 8;

// =============================================================================
// Docker Animation Constants
// =============================================================================

/** Spring transition for all dock mode changes */
export const DOCK_TRANSITION = 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)';

/** Faster transition for hover states */
export const HOVER_TRANSITION = 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)';

/** Open animation duration (ms) */
export const OPEN_DURATION = 200;

/** Content fade-in delay after container opens (ms) */
export const CONTENT_DELAY = 150;

// =============================================================================
// Docker Surface Styles (glass treatment)
// =============================================================================

/** Storm color RGB components for glow calculations */
export const STORM_RGB = { r: 78, g: 123, b: 142 };

/** Ember color RGB for active/pin states */
export const EMBER_RGB = { r: 232, g: 128, b: 108 };

/** Glass background with frosted effect */
export const GLASS_BG = `
  linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%),
  var(--sn-surface-glass, rgba(20,17,24,0.75))
`;

/** Standard backdrop filter */
export const GLASS_BLUR = 'blur(16px) saturate(1.2)';

/** Glass border color */
export const GLASS_BORDER = `rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},0.08)`;

/** 3-layer bioluminescent box shadow */
export const GLASS_SHADOW = [
  `0 0 1px rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},0.08)`,
  `0 0 8px rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},0.04)`,
  `0 0 24px rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},0.02)`,
  '0 2px 8px rgba(0,0,0,0.3)',
  '0 8px 32px rgba(0,0,0,0.15)',
].join(', ');

/** Docked panel shadow (less dramatic, one side only) */
export const DOCKED_SHADOW = [
  '0 0 1px rgba(0,0,0,0.3)',
  '4px 0 16px rgba(0,0,0,0.15)',
].join(', ');

/** Inset top highlight for glass surfaces */
export const GLASS_INSET = 'inset 0 1px 0 rgba(255,255,255,0.04)';
