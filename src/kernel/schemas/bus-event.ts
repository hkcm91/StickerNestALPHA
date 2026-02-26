/**
 * Event Bus schemas
 * @module @sn/types/bus-event
 */

import { z } from 'zod';

import { SpatialContextSchema } from './spatial';

/**
 * Base BusEvent schema
 *
 * @remarks
 * All events on the StickerNest event bus must conform to this shape.
 * The `spatial` field is ALWAYS optional and should only be populated
 * for events originating from VR/3D interactions.
 *
 * Event types use dot-namespaced strings:
 * - `widget.*` - Widget lifecycle and interaction events
 * - `social.*` - Presence, cursor, collaboration events (Layer 1 only)
 * - `canvas.*` - Canvas manipulation events
 * - `spatial.*` - VR/3D specific events
 * - `shell.*` - Application shell events
 */
export const BusEventSchema = z.object({
  /** Dot-namespaced event type (e.g., 'widget.mounted', 'social.cursor.moved') */
  type: z.string().min(1),
  /** Event payload - shape varies by event type */
  payload: z.unknown(),
  /**
   * Spatial context for VR/3D events.
   * ALWAYS optional. Only populate for spatial interactions.
   * Never default to zero vectors.
   */
  spatial: SpatialContextSchema.optional(),
});

/**
 * Base BusEvent type inferred from schema.
 * Generic parameter T allows typed payloads for specific events.
 */
export type BusEvent<T = unknown> = Omit<z.infer<typeof BusEventSchema>, 'payload'> & {
  payload: T;
};

/**
 * Typed BusEvent factory for creating type-safe events
 */
export function createBusEvent<T>(
  type: string,
  payload: T,
  spatial?: z.infer<typeof SpatialContextSchema>
): BusEvent<T> {
  return { type, payload, spatial };
}

/**
 * Event type constants for Layer 0 (Kernel)
 * Other layers define their own namespaces in their respective modules.
 */
export const KernelEvents = {
  // Auth events
  AUTH_STATE_CHANGED: 'kernel.auth.stateChanged',
  AUTH_SESSION_EXPIRED: 'kernel.auth.sessionExpired',

  // DataSource events
  DATASOURCE_CREATED: 'kernel.datasource.created',
  DATASOURCE_UPDATED: 'kernel.datasource.updated',
  DATASOURCE_DELETED: 'kernel.datasource.deleted',

  // Store sync events (internal)
  STORE_SYNC_REQUEST: 'kernel.store.syncRequest',
} as const;

/**
 * Event type constants for Layer 1 (Social)
 * Social layer owns the `social.*` namespace exclusively.
 */
export const SocialEvents = {
  PRESENCE_JOINED: 'social.presence.joined',
  PRESENCE_LEFT: 'social.presence.left',
  CURSOR_MOVED: 'social.cursor.moved',
  ENTITY_TRANSFORMED: 'social.entity.transformed',
  DATASOURCE_UPDATED: 'social.datasource.updated',
  CONFLICT_REJECTED: 'social.conflict.rejected',
} as const;

/**
 * Event type constants for Canvas layer
 */
export const CanvasEvents = {
  ENTITY_CREATED: 'canvas.entity.created',
  ENTITY_UPDATED: 'canvas.entity.updated',
  ENTITY_DELETED: 'canvas.entity.deleted',
  ENTITY_MOVED: 'canvas.entity.moved',
  ENTITY_RESIZED: 'canvas.entity.resized',
  ENTITY_CONFIG_UPDATED: 'canvas.entity.config.updated',
  MODE_CHANGED: 'canvas.mode.changed',
  TOOL_CHANGED: 'canvas.tool.changed',
  ENTITY_SELECTED: 'canvas.entity.selected',
  ENTITY_DESELECTED: 'canvas.entity.deselected',
  SELECTION_CLEARED: 'canvas.selection.cleared',
  PIPELINE_INVALID: 'canvas.pipeline.invalid',
  PIPELINE_EDGE_CREATED: 'canvas.pipeline.edge.created',
  PIPELINE_EDGE_DELETED: 'canvas.pipeline.edge.deleted',
  PIPELINE_NODE_ADDED: 'canvas.pipeline.node.added',
  PIPELINE_NODE_REMOVED: 'canvas.pipeline.node.removed',
  ENTITY_GROUPED: 'canvas.entity.grouped',
  ENTITY_UNGROUPED: 'canvas.entity.ungrouped',
  GROUP_CHILDREN_CHANGED: 'canvas.group.children.changed',
  PATH_POINT_ADDED: 'canvas.path.point.added',
  PATH_CLOSED: 'canvas.path.closed',
  PATH_POINT_CONVERTED: 'canvas.path.point.converted',
} as const;

/**
 * Event type constants for Widget layer
 */
export const WidgetEvents = {
  MOUNTED: 'widget.mounted',
  UNMOUNTED: 'widget.unmounted',
  READY: 'widget.ready',
  ERROR: 'widget.error',
  STATE_CHANGED: 'widget.state.changed',
} as const;

/**
 * Event type constants for Shell layer
 */
export const ShellEvents = {
  THEME_CHANGED: 'shell.theme.changed',
  ROUTE_CHANGED: 'shell.route.changed',
} as const;

/**
 * Event type constants for Spatial/VR layer
 */
export const SpatialEvents = {
  // Session lifecycle
  SESSION_STARTED: 'spatial.session.started',
  SESSION_ENDED: 'spatial.session.ended',

  // Session mode events
  SESSION_MODE_CHANGED: 'spatial.session.mode.changed',
  SESSION_VISIBILITY_CHANGED: 'spatial.session.visibility.changed',

  // Controller events
  CONTROLLER_SELECT: 'spatial.controller.select',
  CONTROLLER_GRAB: 'spatial.controller.grab',
  CONTROLLER_RELEASE: 'spatial.controller.release',

  // Hand tracking events
  HAND_TRACKING_STARTED: 'spatial.hand.tracking.started',
  HAND_TRACKING_ENDED: 'spatial.hand.tracking.ended',
  HAND_PINCH: 'spatial.hand.pinch',
  HAND_GRAB: 'spatial.hand.grab',
  HAND_RELEASE: 'spatial.hand.release',

  // MR plane detection events
  PLANE_DETECTED: 'spatial.plane.detected',
  PLANE_UPDATED: 'spatial.plane.updated',
  PLANE_REMOVED: 'spatial.plane.removed',

  // MR mesh detection events
  MESH_DETECTED: 'spatial.mesh.detected',
  MESH_UPDATED: 'spatial.mesh.updated',
  MESH_REMOVED: 'spatial.mesh.removed',

  // Spatial anchor events
  ANCHOR_CREATED: 'spatial.anchor.created',
  ANCHOR_DELETED: 'spatial.anchor.deleted',

  // Hit test events
  HIT_TEST_RESULT: 'spatial.hitTest.result',

  // Entity events (spatial-specific)
  ENTITY_PLACED: 'spatial.entity.placed',
  ENTITY_TRANSFORMED: 'spatial.entity.transformed',
  ENTITY_REMOVED: 'spatial.entity.removed',

  // Locomotion events
  TELEPORT_REQUESTED: 'spatial.teleport.requested',
} as const;

/**
 * Event type constants for Marketplace layer (Layer 5)
 * Marketplace owns the `marketplace.*` namespace.
 */
export const MarketplaceEvents = {
  WIDGET_INSTALLED: 'marketplace.widget.installed',
  WIDGET_UNINSTALLED: 'marketplace.widget.uninstalled',
  WIDGET_UPDATED: 'marketplace.widget.updated',
  WIDGET_PUBLISHED: 'marketplace.widget.published',
  WIDGET_DEPRECATED: 'marketplace.widget.deprecated',
  PUBLISH_REQUEST: 'marketplace.publish.request',
  PUBLISH_RESPONSE: 'marketplace.publish.response',
} as const;

/**
 * Event type constants for Grid layer (Canvas Core - L4A-1)
 * Grid events are canvas-level, prefixed with `canvas.grid.*`
 */
export const GridEvents = {
  /** A single cell was painted */
  CELL_PAINTED: 'canvas.grid.cell.painted',
  /** A single cell was cleared */
  CELL_CLEARED: 'canvas.grid.cell.cleared',
  /** Multiple cells were painted in a batch (stroke) */
  CELLS_BATCH_PAINTED: 'canvas.grid.cells.batchPainted',
  /** Grid configuration was changed */
  CONFIG_CHANGED: 'canvas.grid.config.changed',
  /** Grid was toggled on/off */
  TOGGLED: 'canvas.grid.toggled',
  /** All grid cells were cleared */
  CLEARED: 'canvas.grid.cleared',
} as const;

/**
 * Event type constants for Canvas Document (persistence)
 * These events are emitted when canvas document state changes.
 */
export const CanvasDocumentEvents = {
  /** Canvas document was loaded */
  LOADED: 'canvas.document.loaded',
  /** Canvas document was saved */
  SAVED: 'canvas.document.saved',
  /** Canvas document metadata was updated */
  META_UPDATED: 'canvas.document.meta.updated',
  /** Canvas viewport configuration changed */
  VIEWPORT_CHANGED: 'canvas.document.viewport.changed',
  /** Canvas background changed */
  BACKGROUND_CHANGED: 'canvas.document.background.changed',
  /** Canvas layout mode changed */
  LAYOUT_MODE_CHANGED: 'canvas.document.layoutMode.changed',
  /** Canvas document version migrated */
  MIGRATED: 'canvas.document.migrated',
} as const;

/**
 * Event type constants for Interaction Mode
 * Controls how the canvas responds to user input.
 */
export const InteractionModeEvents = {
  /** Interaction mode changed (edit/play) */
  MODE_CHANGED: 'canvas.interaction.mode.changed',
  /** Chrome mode changed (editor/clean) */
  CHROME_MODE_CHANGED: 'canvas.interaction.chrome.changed',
} as const;

/**
 * Event type constants for Input Layer
 * Normalized input events from various input sources.
 */
export const InputEvents = {
  // Pointer events (normalized from mouse/touch)
  POINTER_DOWN: 'canvas.input.pointer.down',
  POINTER_MOVE: 'canvas.input.pointer.move',
  POINTER_UP: 'canvas.input.pointer.up',
  POINTER_CANCEL: 'canvas.input.pointer.cancel',
  // Gesture events (interpreted from touch)
  GESTURE_PINCH: 'canvas.input.gesture.pinch',
  GESTURE_PAN: 'canvas.input.gesture.pan',
  GESTURE_DOUBLE_TAP: 'canvas.input.gesture.doubleTap',
  GESTURE_LONG_PRESS: 'canvas.input.gesture.longPress',
} as const;

/**
 * Event type constants for Layout Mode
 * Events related to layout constraint system.
 */
export const LayoutModeEvents = {
  /** Layout constraints were applied during move */
  MOVE_CONSTRAINED: 'canvas.layout.move.constrained',
  /** Layout constraints were applied during resize */
  RESIZE_CONSTRAINED: 'canvas.layout.resize.constrained',
  /** Snap points were calculated */
  SNAP_POINTS_UPDATED: 'canvas.layout.snapPoints.updated',
} as const;

/**
 * Event type constants for Background System
 */
export const BackgroundEvents = {
  /** Background was rendered */
  RENDERED: 'canvas.background.rendered',
  /** Background was invalidated */
  INVALIDATED: 'canvas.background.invalidated',
} as const;

/**
 * Event type constants for Data Manager (Layer 0 - Kernel infrastructure)
 * Database management operations: table ops, AI operations, Notion sync.
 */
export const DataManagerEvents = {
  // Column operations
  COLUMN_ADDED: 'kernel.datamanager.column.added',
  COLUMN_UPDATED: 'kernel.datamanager.column.updated',
  COLUMN_REMOVED: 'kernel.datamanager.column.removed',
  COLUMN_REORDERED: 'kernel.datamanager.column.reordered',

  // Row operations
  ROW_ADDED: 'kernel.datamanager.row.added',
  ROW_UPDATED: 'kernel.datamanager.row.updated',
  ROW_DELETED: 'kernel.datamanager.row.deleted',
  ROWS_BATCH_ADDED: 'kernel.datamanager.rows.batchAdded',

  // View operations
  VIEW_CREATED: 'kernel.datamanager.view.created',
  VIEW_UPDATED: 'kernel.datamanager.view.updated',
  VIEW_DELETED: 'kernel.datamanager.view.deleted',

  // AI operations
  AI_OPERATION_STARTED: 'kernel.datamanager.ai.started',
  AI_OPERATION_COMPLETED: 'kernel.datamanager.ai.completed',
  AI_OPERATION_FAILED: 'kernel.datamanager.ai.failed',

  // Notion sync
  NOTION_SYNC_STARTED: 'kernel.datamanager.notion.syncStarted',
  NOTION_SYNC_COMPLETED: 'kernel.datamanager.notion.syncCompleted',
  NOTION_SYNC_FAILED: 'kernel.datamanager.notion.syncFailed',

  // Template applied
  TEMPLATE_APPLIED: 'kernel.datamanager.template.applied',
} as const;

/**
 * Event type constants for Social Graph (Layer 0 - Kernel infrastructure)
 * The social graph is persistent data that widgets render via integration.
 * NOT the same as SocialEvents (Layer 1 real-time collaboration).
 */
export const SocialGraphEvents = {
  // Profile events
  PROFILE_CREATED: 'kernel.socialgraph.profile.created',
  PROFILE_UPDATED: 'kernel.socialgraph.profile.updated',

  // Follow events
  FOLLOW_CREATED: 'kernel.socialgraph.follow.created',
  FOLLOW_DELETED: 'kernel.socialgraph.follow.deleted',
  FOLLOW_ACCEPTED: 'kernel.socialgraph.follow.accepted',
  FOLLOW_REJECTED: 'kernel.socialgraph.follow.rejected',

  // Post events
  POST_CREATED: 'kernel.socialgraph.post.created',
  POST_UPDATED: 'kernel.socialgraph.post.updated',
  POST_DELETED: 'kernel.socialgraph.post.deleted',

  // Reaction events
  REACTION_ADDED: 'kernel.socialgraph.reaction.added',
  REACTION_REMOVED: 'kernel.socialgraph.reaction.removed',

  // Comment events
  COMMENT_CREATED: 'kernel.socialgraph.comment.created',
  COMMENT_UPDATED: 'kernel.socialgraph.comment.updated',
  COMMENT_DELETED: 'kernel.socialgraph.comment.deleted',

  // Notification events
  NOTIFICATION_CREATED: 'kernel.socialgraph.notification.created',
  NOTIFICATION_READ: 'kernel.socialgraph.notification.read',
  NOTIFICATIONS_ALL_READ: 'kernel.socialgraph.notifications.allRead',

  // Block events
  USER_BLOCKED: 'kernel.socialgraph.user.blocked',
  USER_UNBLOCKED: 'kernel.socialgraph.user.unblocked',

  // Message events
  MESSAGE_SENT: 'kernel.socialgraph.message.sent',
} as const;

/**
 * JSON Schema export for external validation
 */
export const BusEventJSONSchema = BusEventSchema.toJSONSchema();
