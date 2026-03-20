/**
 * Scene Graph Types — Dual-layer graph type system.
 *
 * Scene level: widgets, stickers, dockers, groups wired via event ports.
 * Widget level: SDK-call nodes (subscribe, emit, filter, etc.) for internals.
 *
 * @module lab/graph
 * @layer L2
 */

import type { NodeType } from './graph-compiler';

// ═══════════════════════════════════════════════════════════════════
// Scene-Level Node Types
// ═══════════════════════════════════════════════════════════════════

export type SceneNodeType =
  | 'widget'
  | 'sticker'
  | 'docker'
  | 'group'
  | 'scene-input'
  | 'scene-output';

/** Port direction on a node */
export type PortDirection = 'input' | 'output';

/** A typed port on a scene or widget node */
export interface Port {
  id: string;
  name: string;
  direction: PortDirection;
  /** Event type this port handles */
  eventType?: string;
  /** JSON Schema for type compatibility checking */
  schema?: Record<string, unknown>;
}

/** A scene-level node (widget, sticker, docker, group, etc.) */
export interface SceneNode {
  id: string;
  type: SceneNodeType;
  /** Display label */
  label: string;
  /** Input ports (left side) */
  inputPorts: Port[];
  /** Output ports (right side) */
  outputPorts: Port[];
  /** Configuration / metadata */
  config: Record<string, unknown>;
  /** Child node IDs (for docker, group) */
  children?: string[];
  /** Widget manifest ID (for widget nodes) */
  widgetId?: string;
  /** Widget HTML source (for widget nodes with internals) */
  widgetHtml?: string;
}

/** A scene-level edge connecting ports between nodes */
export interface SceneEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  /** Optional channel name for the connection */
  channelName?: string;
}

// ═══════════════════════════════════════════════════════════════════
// Graph Depth / Navigation
// ═══════════════════════════════════════════════════════════════════

export type GraphLevel = 'scene' | 'widget';

/** Breadcrumb segment for depth navigation */
export interface BreadcrumbSegment {
  id: string;
  label: string;
  level: GraphLevel;
  /** The node ID at this depth (null for scene root) */
  nodeId: string | null;
}

/** Full graph navigation state */
export interface GraphNavigation {
  /** Current depth level */
  level: GraphLevel;
  /** Breadcrumb trail from scene root to current position */
  breadcrumbs: BreadcrumbSegment[];
  /** If at widget level, which widget node we're inside */
  currentWidgetNodeId: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// Color Maps
// ═══════════════════════════════════════════════════════════════════

export const SCENE_NODE_COLORS: Record<SceneNodeType, { accent: string; rgb: string }> = {
  widget:         { accent: '#4E7B8E', rgb: '78,123,142' },   // Storm
  sticker:        { accent: '#E8806C', rgb: '232,128,108' },   // Ember
  docker:         { accent: '#B0D0D8', rgb: '176,208,216' },   // Opal
  group:          { accent: '#B8A0D8', rgb: '184,160,216' },   // Violet
  'scene-input':  { accent: '#5AA878', rgb: '90,168,120' },    // Moss
  'scene-output': { accent: '#5AA878', rgb: '90,168,120' },    // Moss
};

export const SCENE_NODE_LABELS: Record<SceneNodeType, string> = {
  widget: 'Widget',
  sticker: 'Sticker',
  docker: 'Docker',
  group: 'Group',
  'scene-input': 'Input',
  'scene-output': 'Output',
};

// ═══════════════════════════════════════════════════════════════════
// Unified Node Type (scene + widget levels)
// ═══════════════════════════════════════════════════════════════════

/** Combined type covering both scene-level and widget-level nodes */
export type AnyNodeType = SceneNodeType | NodeType | 'child-widget';

// ═══════════════════════════════════════════════════════════════════
// Port Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Checks if two ports are type-compatible for connection.
 * Both must have schemas; if either lacks a schema, they're considered compatible.
 */
export function arePortsCompatible(source: Port, target: Port): boolean {
  // Direction check: source must be output, target must be input
  if (source.direction !== 'output' || target.direction !== 'input') return false;

  // If either port has no schema, allow connection (permissive)
  if (!source.schema || !target.schema) return true;

  // If both have event types, they must match (or target must be wildcard '*')
  if (source.eventType && target.eventType) {
    if (target.eventType === '*') return true;
    return source.eventType === target.eventType;
  }

  return true;
}

/**
 * Derives ports from a widget manifest's event contract.
 */
export function portsFromManifest(manifest: {
  events?: {
    emits?: Array<{ name: string; description?: string; schema?: Record<string, unknown> }>;
    subscribes?: Array<{ name: string; description?: string; schema?: Record<string, unknown> }>;
  };
}): { inputPorts: Port[]; outputPorts: Port[] } {
  const events = manifest.events ?? { emits: [], subscribes: [] };

  const outputPorts: Port[] = (events.emits ?? []).map((e, i) => ({
    id: `emit-${i}`,
    name: e.name,
    direction: 'output' as const,
    eventType: e.name,
    schema: e.schema,
  }));

  const inputPorts: Port[] = (events.subscribes ?? []).map((e, i) => ({
    id: `sub-${i}`,
    name: e.name,
    direction: 'input' as const,
    eventType: e.name,
    schema: e.schema,
  }));

  return { inputPorts, outputPorts };
}

/**
 * Derives ports from a sticker's click action.
 */
export function portsFromStickerAction(clickAction?: {
  type?: string;
  eventType?: string;
  widgetId?: string;
}): { inputPorts: Port[]; outputPorts: Port[] } {
  if (!clickAction) return { inputPorts: [], outputPorts: [] };

  const outputPorts: Port[] = [];

  if (clickAction.type === 'emit-event' && clickAction.eventType) {
    outputPorts.push({
      id: 'click-emit',
      name: clickAction.eventType,
      direction: 'output',
      eventType: clickAction.eventType,
    });
  } else if (clickAction.type === 'launch-widget' && clickAction.widgetId) {
    outputPorts.push({
      id: 'click-launch',
      name: 'launch',
      direction: 'output',
    });
  }

  return { inputPorts: [], outputPorts };
}
