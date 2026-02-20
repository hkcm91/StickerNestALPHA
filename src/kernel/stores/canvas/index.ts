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
