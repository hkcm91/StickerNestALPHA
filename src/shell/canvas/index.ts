/**
 * Canvas Shell — barrel export.
 *
 * @module shell/canvas
 * @layer L6
 */

export { CanvasWorkspace } from './CanvasWorkspace';
export type { CanvasWorkspaceProps } from './CanvasWorkspace';

export { CanvasViewportLayer } from './CanvasViewportLayer';
export type { CanvasViewportLayerProps } from './CanvasViewportLayer';

export { CanvasEntityLayer } from './CanvasEntityLayer';
export type { CanvasEntityLayerProps } from './CanvasEntityLayer';

export { CanvasOverlayLayer } from './CanvasOverlayLayer';
export type { CanvasOverlayLayerProps } from './CanvasOverlayLayer';

export { CanvasToolLayer } from './CanvasToolLayer';
export type { CanvasToolLayerProps } from './CanvasToolLayer';

export { EntityRenderer } from './renderers';

export {
  useViewport,
  useSceneGraph,
  useActiveTool,
  setActiveTool,
  useCanvasInput,
  useSelection,
  getSelectionStore,
  usePersistence,
} from './hooks';
export type { ViewportStore, CanvasToolId, SelectionStore, SaveStatus, PersistenceState } from './hooks';

export { Toolbar, PropertiesPanel, LayersPanel, AssetPanel } from './panels';
export type { ToolbarProps, PropertiesPanelProps, LayersPanelProps, AssetPanelProps } from './panels';
