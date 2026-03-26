/**
 * Tooltip Content
 *
 * Contextual tooltip text for UI elements throughout the application.
 * Organized by feature area. Import and use with your tooltip component.
 *
 * @module content/tooltips
 */

/** Toolbar tool tooltips (shown on hover) */
export const TOOL_TOOLTIPS = {
  select: 'Select tool (V) — Click to select, drag to move, Shift+click for multi-select',
  move: 'Move tool (M) — Drag entities to reposition them',
  pen: 'Pen tool (B) — Freehand drawing',
  text: 'Text tool (T) — Click to place a text block',
  rectangle: 'Rectangle (R) — Click and drag to draw',
  ellipse: 'Ellipse (E) — Click and drag to draw',
  line: 'Line (L) — Click and drag to draw',
  sticker: 'Sticker tool (S) — Place stickers from your library',
  pipeline: 'Pipeline tool (W) — Connect widget ports',
} as const;

/** Toolbar action tooltips */
export const ACTION_TOOLTIPS = {
  undo: 'Undo (Cmd+Z)',
  redo: 'Redo (Cmd+Shift+Z)',
  zoomIn: 'Zoom in (Cmd+Plus)',
  zoomOut: 'Zoom out (Cmd+Minus)',
  zoomFit: 'Zoom to fit (Shift+1)',
  zoomReset: 'Reset zoom (Cmd+0)',
  modeToggle: 'Toggle edit/preview mode (P)',
  share: 'Share this canvas',
  save: 'Save (Cmd+S) — Canvases also auto-save',
} as const;

/** Sidebar and panel tooltips */
export const PANEL_TOOLTIPS = {
  assetPanel: 'Stickers and widgets (A)',
  layersPanel: 'Layers — reorder and toggle visibility',
  propertiesPanel: 'Properties — configure the selected entity',
  marketplace: 'Marketplace — browse and install widgets',
  toggleSidebarLeft: 'Toggle left sidebar ([)',
  toggleSidebarRight: 'Toggle right sidebar (])',
} as const;

/** Canvas entity context menu tooltips */
export const ENTITY_TOOLTIPS = {
  bringToFront: 'Bring to front — move above all other entities',
  sendToBack: 'Send to back — move behind all other entities',
  bringForward: 'Bring forward one level',
  sendBackward: 'Send backward one level',
  duplicate: 'Duplicate (Cmd+D)',
  delete: 'Delete (Del)',
  lock: 'Lock position — prevent accidental moves',
  unlock: 'Unlock position',
} as const;

/** Sharing panel tooltips */
export const SHARING_TOOLTIPS = {
  roleOwner: 'Full control — edit, share, delete',
  roleEditor: 'Can add, move, and configure everything',
  roleCommenter: 'Can view and leave annotations',
  roleViewer: 'Read-only access',
  copyLink: 'Copy a shareable link to this canvas',
  publish: 'Make this canvas publicly accessible at a custom URL',
} as const;

/** Widget-specific tooltips */
export const WIDGET_TOOLTIPS = {
  installWidget: 'Add this widget to your library',
  uninstallWidget: 'Remove from library (deletes all saved state)',
  configureWidget: 'Open widget settings in the properties panel',
  viewInMarketplace: 'View this widget in the Marketplace',
} as const;

/** Lab-specific tooltips */
export const LAB_TOOLTIPS = {
  runPreview: 'Run widget in live preview',
  previewMode2D: '2D isolated — widget in standalone frame',
  previewModeCanvas: '2D canvas — widget as if placed on a real canvas',
  previewModeSpatial: '3D spatial — widget in simulated VR environment',
  clearInspector: 'Clear event inspector logs',
  saveSnapshot: 'Save a named version snapshot',
  publishWidget: 'Start the publish pipeline',
  generateAI: 'Generate widget from a text prompt',
} as const;
