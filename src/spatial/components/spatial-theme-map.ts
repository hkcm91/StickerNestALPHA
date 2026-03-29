/**
 * Spatial Theme Map -- maps ThemeName to colors for the 3D environment
 *
 * Pure data module. No side effects, no imports beyond types.
 *
 * @module spatial/components/spatial-theme-map
 * @layer L4B
 */

import type { ThemeName } from '@sn/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Color set for the spatial environment dome and floor */
export interface SpatialThemeColors {
  /** Floor color and fog near color (darkest) */
  ground: string;
  /** Dome lower-mid band (primary cool) */
  storm: string;
  /** Dome upper-mid band (soft neutral) */
  opal: string;
  /** Dome top accent (warm highlight) */
  ember: string;
}

// ---------------------------------------------------------------------------
// Theme Map
// ---------------------------------------------------------------------------

const SPATIAL_THEME_MAP: Record<ThemeName, SpatialThemeColors> = {
  'midnight-aurora': {
    ground: '#110E14',
    storm: '#6BA4B8',
    opal: '#B8D4DE',
    ember: '#ECA080',
  },
  'crystal-light': {
    ground: '#1A1820',
    storm: '#5A92A8',
    opal: '#C8DDE6',
    ember: '#F0B098',
  },
  'bubbles-sky': {
    ground: '#0C1420',
    storm: '#4E8CA0',
    opal: '#A0D0E0',
    ember: '#80C0D0',
  },
  'autumn-fireflies': {
    ground: '#14100C',
    storm: '#B8946A',
    opal: '#D4B88C',
    ember: '#E8A060',
  },
  'high-contrast': {
    ground: '#000000',
    storm: '#4488AA',
    opal: '#88BBDD',
    ember: '#EE9966',
  },
  ember: {
    ground: '#140E0C',
    storm: '#B87A5A',
    opal: '#DEBBAA',
    ember: '#ECA080',
  },
};

/** Default spatial colors (midnight-aurora) */
const DEFAULT_COLORS: SpatialThemeColors = SPATIAL_THEME_MAP['midnight-aurora'];

/**
 * Get spatial environment colors for a given theme.
 * Falls back to midnight-aurora if the theme is not found.
 */
export function getSpatialThemeColors(theme: ThemeName): SpatialThemeColors {
  return SPATIAL_THEME_MAP[theme] ?? DEFAULT_COLORS;
}
