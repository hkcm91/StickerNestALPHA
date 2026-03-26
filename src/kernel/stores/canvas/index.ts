/**
 * Canvas Store — Barrel Export
 * @module kernel/stores/canvas
 */

export {
  useCanvasStore,
  setupCanvasBusSubscriptions,
} from './canvas.store';

export type {
  CanvasMeta,
  CanvasSharingSettings,
  CanvasRole,
  CanvasState,
  CanvasActions,
  CanvasStore,
} from './canvas.store';

export {
  useAnimationOverlayStore,
} from './animation-overlay.store';

export type {
  AnimationOverlayState,
  AnimationOverlayActions,
  AnimationOverlayStore,
} from './animation-overlay.store';

export {
  useCompositingStore,
} from './compositing.store';

export type {
  MaskConfig,
  CompositingState,
  CompositingActions,
  CompositingStore,
} from './compositing.store';
