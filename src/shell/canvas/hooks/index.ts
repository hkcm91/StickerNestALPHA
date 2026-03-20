/**
 * Canvas hooks barrel export.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

export { useViewport } from './useViewport';
export type { ViewportStore } from './useViewport';

export { useSceneGraph } from './useSceneGraph';

export { useActiveTool, setActiveTool } from './useActiveTool';
export type { CanvasToolId } from './useActiveTool';

export { useCanvasInput } from './useCanvasInput';

export { useSelection, getSelectionStore } from './useSelection';
export type { SelectionStore } from './useSelection';

export {
  usePersistence,
  createLocalCanvas,
  deleteLocalCanvas,
  duplicateLocalCanvas,
  renameLocalCanvas,
  ensureLocalCanvas,
  getLocalCanvasBySlug,
  listLocalCanvases,
  slugifyCanvasName,
} from './usePersistence';
export type { SaveStatus, PersistenceState, LocalCanvasSummary } from './usePersistence';

export { useCanvasShortcuts } from './useCanvasShortcuts';
export type { CanvasShortcutDeps } from './useCanvasShortcuts';

export { useCropMode } from './useCropMode';
