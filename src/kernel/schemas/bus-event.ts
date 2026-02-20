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
  SESSION_STARTED: 'spatial.session.started',
  SESSION_ENDED: 'spatial.session.ended',
  CONTROLLER_SELECT: 'spatial.controller.select',
  CONTROLLER_GRAB: 'spatial.controller.grab',
  CONTROLLER_RELEASE: 'spatial.controller.release',
  ENTITY_PLACED: 'spatial.entity.placed',
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
 * JSON Schema export for external validation
 */
export const BusEventJSONSchema = BusEventSchema.toJSONSchema();
