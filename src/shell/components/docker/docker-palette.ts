/**
 * Docker palette — glass surface constants for shell-level docker panels.
 *
 * Re-exports shared palette from L2 (shell can import from any layer)
 * plus docker-specific layout/animation constants.
 *
 * @module shell/components/docker
 * @layer L6
 */

// Inline palette constants — Shell (L6) must not import from Lab (L2).
// These mirror the values in src/lab/components/shared/palette.ts.

export const palette = {
  storm: 'var(--sn-storm, #4E7B8E)',
  stormLight: 'var(--sn-storm-light, #6A95A6)',
  ember: 'var(--sn-ember, #E8806C)',
  emberLight: 'var(--sn-ember-light, #F09A88)',
  opal: 'var(--sn-opal, #B0D0D8)',
  moss: 'var(--sn-moss, #5AA878)',
  violet: 'var(--sn-violet, #B8A0D8)',
  success: 'var(--sn-success, #5AA878)',
  warning: 'var(--sn-warning, #D4A04C)',
  error: 'var(--sn-error, #C85858)',
  bg: 'var(--sn-bg, #0A0A0E)',
  bgGround: 'var(--sn-bg-ground, #110E14)',
  surface: 'var(--sn-surface, #131317)',
  surfaceRaised: 'var(--sn-surface-raised, #1A1A1F)',
  surfaceGlass: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
  surfaceGlassLight: 'var(--sn-surface-glass-light, rgba(20,17,24,0.65))',
  text: 'var(--sn-text, #E8E6ED)',
  textSoft: 'var(--sn-text-soft, #B8B5C0)',
  textMuted: 'var(--sn-text-muted, #7A7784)',
  textFaint: 'var(--sn-text-faint, #4A4754)',
  border: 'var(--sn-border, rgba(255,255,255,0.06))',
  borderHover: 'var(--sn-border-hover, rgba(255,255,255,0.12))',
  accent: 'var(--sn-accent, #3E7D94)',
  accentLight: 'var(--sn-accent-light, #5A9DB0)',
} as const;

export const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const STAGGER_MS = 70;

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export const HEX = {
  storm: '#4E7B8E',
  stormLight: '#6A95A6',
  ember: '#E8806C',
  emberLight: '#F09A88',
  opal: '#B0D0D8',
  moss: '#5AA878',
  violet: '#B8A0D8',
  warning: '#D4A04C',
  error: '#C85858',
} as const;

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
