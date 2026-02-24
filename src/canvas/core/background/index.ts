/**
 * Background Module
 *
 * Provides background rendering for canvas documents.
 *
 * @module canvas/core/background
 * @layer L4A-1
 */

export {
  createBackgroundRenderer,
  parseColor,
  rgbaToString,
  backgroundSpecToCSS,
  getBackgroundCSSProperties,
} from './background-renderer';

export type { BackgroundRenderer } from './background-renderer';
