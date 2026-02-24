/**
 * Canvas utilities barrel export.
 *
 * @module shell/canvas/utils
 * @layer L6
 */

export { computeResize, getResizeHandles } from './resize';
export type { HandlePosition, ResizeHandle } from './resize';

export {
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignCenterH,
  alignCenterV,
  distributeH,
  distributeV,
} from './align';
export type { AlignableEntity, AlignmentResult } from './align';
