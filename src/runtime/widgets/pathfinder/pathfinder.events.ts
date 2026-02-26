/**
 * Pathfinder Widget - Event Type Definitions
 *
 * Defines the event contract for this widget:
 * - Events the widget emits
 * - Events the widget subscribes to
 *
 * All events use the StickerNest event bus.
 *
 * @module runtime/widgets/pathfinder
 */

/**
 * Event type constants for the Pathfinder widget.
 *
 * Events follow the naming convention: widget.pathfinder.{action}
 */
export const PATHFINDER_EVENTS = {
  /**
   * Events this widget emits to the bus.
   */
  emits: {
    /** Emitted when the widget is ready and initialized */
    READY: 'widget.pathfinder.ready',
    /** Emitted when the user performs an action */
    ACTION: 'widget.pathfinder.action',
    /** Emitted when widget state changes */
    STATE_CHANGED: 'widget.pathfinder.state-changed',
    /** Emitted when an error occurs */
    ERROR: 'widget.pathfinder.error',

    /** Pathfinder Operations */
    UNION: 'widget.pathfinder.union',
    SUBTRACT: 'widget.pathfinder.subtract',
    INTERSECT: 'widget.pathfinder.intersect',
    EXCLUDE: 'widget.pathfinder.exclude',
    DIVIDE: 'widget.pathfinder.divide',
    SHAPE_BUILDER_TOGGLE: 'widget.pathfinder.shape-builder-toggle',
    HOVER_REGION: 'widget.pathfinder.hover-region',
  },

  /**
   * Events this widget subscribes to from the bus.
   */
  subscribes: {
    /** Received when external config update is requested */
    CONFIG_UPDATE: 'widget.pathfinder.config-update',
    /** Received when widget should refresh its data */
    REFRESH: 'widget.pathfinder.refresh',
    /** Received when widget should reset to initial state */
    RESET: 'widget.pathfinder.reset',
    /** Received when selection changes on the canvas */
    SELECTION_CHANGED: 'canvas.selection.changed',
  },
} as const;

/**
 * Payload types for emitted events.
 */
export interface PathfinderEmitPayloads {
  /** Payload for READY event */
  ['widget.pathfinder.ready']: {
    instanceId: string;
    timestamp: number;
  };

  /** Payload for ACTION event */
  ['widget.pathfinder.action']: {
    instanceId: string;
    action: string;
    data: Record<string, unknown>;
    timestamp: number;
  };

  /** Payload for STATE_CHANGED event */
  ['widget.pathfinder.state-changed']: {
    instanceId: string;
    previousState: Record<string, unknown>;
    currentState: Record<string, unknown>;
    timestamp: number;
  };

  /** Payload for ERROR event */
  ['widget.pathfinder.error']: {
    instanceId: string;
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: number;
  };

  ['widget.pathfinder.union']: { instanceId: string };
  ['widget.pathfinder.subtract']: { instanceId: string };
  ['widget.pathfinder.intersect']: { instanceId: string };
  ['widget.pathfinder.exclude']: { instanceId: string };
  ['widget.pathfinder.divide']: { instanceId: string };
  ['widget.pathfinder.shape-builder-toggle']: { instanceId: string; active: boolean };
  ['widget.pathfinder.hover-region']: {
    instanceId: string;
    pathData?: string; // SVG path data for the hovered region
    bounds?: { x: number; y: number; width: number; height: number };
  };
}

/**
 * Payload types for subscribed events.
 */
export interface PathfinderSubscribePayloads {
  /** Payload for CONFIG_UPDATE event */
  ['widget.pathfinder.config-update']: {
    config: Record<string, unknown>;
    source: 'user' | 'pipeline' | 'api';
  };

  /** Payload for REFRESH event */
  ['widget.pathfinder.refresh']: {
    force?: boolean;
  };

  /** Payload for RESET event */
  ['widget.pathfinder.reset']: {
    preserveConfig?: boolean;
  };

  ['canvas.selection.changed']: {
    selectedIds: string[];
  };
}

/**
 * Combined event payloads type for use in widget props.
 */
export interface PathfinderEventPayloads {
  emits: PathfinderEmitPayloads;
  subscribes: PathfinderSubscribePayloads;
}

/**
 * Type helper: Extract all emit event types.
 */
export type PathfinderEmitEventType = typeof PATHFINDER_EVENTS.emits[keyof typeof PATHFINDER_EVENTS.emits];

/**
 * Type helper: Extract all subscribe event types.
 */
export type PathfinderSubscribeEventType = typeof PATHFINDER_EVENTS.subscribes[keyof typeof PATHFINDER_EVENTS.subscribes];

/**
 * Type helper: All event types (emit + subscribe).
 */
export type PathfinderEventType = PathfinderEmitEventType | PathfinderSubscribeEventType;
