/**
 * Canvas Core — barrel export
 *
 * @module canvas/core
 * @layer L4A-1
 */

// Viewport
export { createViewport, canvasToScreen, screenToCanvas, panBy, zoomTo, getVisibleBounds } from './viewport';
export type { ViewportState } from './viewport';

// Scene graph
export { createSceneGraph } from './scene';
export type { SceneGraph } from './scene';
export { createSpatialIndex } from './scene';
export type { SpatialIndex } from './scene';

// Hit-testing
export { hitTestPoint, hitTestRegion, entityBounds, pointInEntity } from './hittest';

// Renderer
export { createDirtyTracker } from './renderer';
export type { DirtyTracker } from './renderer';
export { createRenderLoop } from './renderer';
export type { RenderLoop, FrameCallback } from './renderer';

// Drag
export { createDragManager, DRAG_THRESHOLD } from './drag';
export type { DragManager, DragState } from './drag';

// Init
export { initCanvasCore, teardownCanvasCore, isCanvasCoreInitialized, getCanvasCoreContext } from './init';
export type { CanvasCoreContext } from './init';

// Grid Layer
export {
  createGridCellStore,
  cellKey,
  parseKey,
  positionToCell,
  cellToPosition,
  getCellBounds,
  cellCenter,
  getVisibleCellBounds,
  createGridRenderer,
  countVisibleCells,
  areGridLinesVisible,
  createGridLayer,
  connectToRenderLoop,
  DEFAULT_GRID_CONFIG,
} from './grid';
export type {
  GridCellStore,
  CellBounds,
  GridRenderer,
  GridLayer,
} from './grid';

// Interaction Mode
export {
  useInteractionStore,
  canManipulateEntities,
  areToolsEnabled,
  areWidgetsInteractive,
  setupInteractionBusSubscriptions,
} from './interaction';
export type {
  InteractionMode,
  InteractionState,
  InteractionActions,
  InteractionStore,
} from './interaction';

// Persistence
export {
  // Version
  CURRENT_VERSION,
  MIN_SUPPORTED_VERSION,
  isVersionSupported,
  needsMigration,
  getMigrationPath,
  // Serialization
  serialize,
  serializeToJSON,
  createEmptyDocument,
  extractMetadata,
  extractEntityIds,
  countEntitiesByType,
  // Deserialization
  deserialize,
  deserializeToSceneGraph,
  looksLikeCanvasDocument,
  peekEntityCount,
  peekVersion,
  // Migrations
  registerMigration,
  getMigration,
  hasMigration,
  migrate,
  getRegisteredMigrations,
  clearMigrations,
} from './persistence';
export type {
  SerializeContext,
  SerializeOptions,
  DeserializeResult,
  DeserializeOptions,
  MigrationFn,
} from './persistence';

// Layout Mode
export {
  // Types
  SnapPointSchema,
  // Freeform
  freeformLayout,
  createFreeformLayout,
  findNearestSnap,
  // Bento
  bentoLayout,
  createBentoLayout,
  DEFAULT_BENTO_CONFIG,
  bentoPositionToCell,
  bentoCellToPosition,
  bentoCellSpanToSize,
  bentoSizeToCellSpan,
  // Desktop
  desktopLayout,
  createDesktopLayout,
  DEFAULT_DESKTOP_CONFIG,
  getCascadedPosition,
  detectDockingZone,
  getDockedBounds,
  // Registry
  registerLayoutMode,
  getLayoutMode,
  hasLayoutMode,
  unregisterLayoutMode,
  getRegisteredLayoutModes,
  getAllLayoutModes,
  clearLayoutModes,
  initializeDefaultLayoutModes,
  getDefaultLayoutMode,
} from './layout';
export type {
  LayoutMode,
  ConstraintContext,
  ConstraintResult,
  SnapPoint,
  SnapPointType,
  BentoConfig,
  DesktopConfig,
  DockingZone,
} from './layout';

// Background
export {
  createBackgroundRenderer,
  parseColor,
  rgbaToString,
  backgroundSpecToCSS,
  getBackgroundCSSProperties,
} from './background';
export type { BackgroundRenderer } from './background';

// Input
export type {
  InputSource,
  PointerButton,
  ModifierKeys,
  BaseInputEvent,
  PointerDownEvent,
  PointerMoveEvent,
  PointerUpEvent,
  PointerCancelEvent,
  PointerEnterEvent,
  PointerLeaveEvent,
  WheelEvent,
  GestureState,
  GesturePinchEvent,
  GesturePanEvent,
  GestureDoubleTapEvent,
  GestureLongPressEvent,
  GestureSwipeEvent,
  PointerEvent,
  GestureEvent,
  InputEvent,
  InputEventType,
  InputEventHandler,
  InputAdapter,
  InputAdapterConfig,
  GestureConfig,
  GestureEventHandler,
  TouchAdapterConfig,
} from './input';
export {
  ModifierKeysSchema,
  InputSourceSchema,
  PointerButtonSchema,
  GestureStateSchema,
  createDefaultModifiers,
  extractModifiers,
  getInputSource,
  mapMouseButton,
  getButtonsHeld,
  BaseInputAdapter,
  DEFAULT_INPUT_CONFIG,
  PointerAdapter,
  createPointerAdapter,
  GestureInterpreter,
  createGestureInterpreter,
  DEFAULT_GESTURE_CONFIG,
  TouchAdapter,
  createTouchAdapter,
} from './input';
