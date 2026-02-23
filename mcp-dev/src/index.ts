#!/usr/bin/env node
/**
 * StickerNest MCP Development Server
 *
 * Provides tools for testing the event bus, canvas core, and widget systems
 * without requiring the full browser/React environment.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// ============================================================================
// Event Bus Implementation
// ============================================================================

interface BusEvent {
  type: string;
  payload: unknown;
  timestamp: string;
  id: number;
}

interface BusSubscription {
  id: number;
  pattern: string;
  isWildcard: boolean;
}

class EventBus {
  private events: BusEvent[] = [];
  private subscriptions: BusSubscription[] = [];
  private eventId = 0;
  private subId = 0;
  private maxHistory = 1000;

  emit(type: string, payload: unknown): BusEvent {
    const event: BusEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      id: ++this.eventId,
    };
    this.events.push(event);
    if (this.events.length > this.maxHistory) {
      this.events = this.events.slice(-this.maxHistory);
    }
    return event;
  }

  subscribe(pattern: string): BusSubscription {
    const sub: BusSubscription = {
      id: ++this.subId,
      pattern,
      isWildcard: pattern.includes('*'),
    };
    this.subscriptions.push(sub);
    return sub;
  }

  unsubscribe(id: number): boolean {
    const idx = this.subscriptions.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.subscriptions.splice(idx, 1);
      return true;
    }
    return false;
  }

  getHistory(filter?: string, limit = 100): BusEvent[] {
    let result = this.events;
    if (filter) {
      const regex = new RegExp(filter.replace('*', '.*'));
      result = result.filter(e => regex.test(e.type));
    }
    return result.slice(-limit);
  }

  getSubscriptions(): BusSubscription[] {
    return [...this.subscriptions];
  }

  bench(iterations = 10000): { avgLatencyUs: number; p99LatencyUs: number; eventsPerSecond: number } {
    const latencies: number[] = [];
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      this.emit('bench.event', { i });
      latencies.push((performance.now() - t0) * 1000); // Convert to microseconds
    }

    const totalMs = performance.now() - start;
    latencies.sort((a, b) => a - b);

    return {
      avgLatencyUs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p99LatencyUs: latencies[Math.floor(latencies.length * 0.99)],
      eventsPerSecond: Math.round((iterations / totalMs) * 1000),
    };
  }

  clear(): void {
    this.events = [];
  }

  stats(): { totalEvents: number; subscriptions: number; oldestEvent: string | null } {
    return {
      totalEvents: this.events.length,
      subscriptions: this.subscriptions.length,
      oldestEvent: this.events[0]?.timestamp ?? null,
    };
  }
}

// ============================================================================
// Canvas Core Implementation
// ============================================================================

interface Point2D {
  x: number;
  y: number;
}

interface Size2D {
  width: number;
  height: number;
}

interface Transform2D {
  position: Point2D;
  size: Size2D;
  rotation: number;
  scale: number;
}

interface CanvasEntity {
  id: string;
  type: 'sticker' | 'text' | 'shape' | 'widget';
  name: string;
  transform: Transform2D;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface ViewportState {
  offset: Point2D;
  zoom: number;
  width: number;
  height: number;
}

class SceneGraph {
  private entities: Map<string, CanvasEntity> = new Map();
  private nextZIndex = 1;

  addEntity(entity: Omit<CanvasEntity, 'zIndex' | 'createdAt'>): CanvasEntity {
    const full: CanvasEntity = {
      ...entity,
      zIndex: this.nextZIndex++,
      createdAt: new Date().toISOString(),
    };
    this.entities.set(full.id, full);
    return full;
  }

  getEntity(id: string): CanvasEntity | null {
    return this.entities.get(id) ?? null;
  }

  updateEntity(id: string, updates: Partial<CanvasEntity>): CanvasEntity | null {
    const entity = this.entities.get(id);
    if (!entity) return null;
    const updated = { ...entity, ...updates };
    this.entities.set(id, updated);
    return updated;
  }

  removeEntity(id: string): boolean {
    return this.entities.delete(id);
  }

  getAllEntities(): CanvasEntity[] {
    return Array.from(this.entities.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  bringToFront(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    entity.zIndex = this.nextZIndex++;
    return true;
  }

  sendToBack(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    // Shift all z-indices up and set this one to 0
    for (const e of this.entities.values()) {
      if (e.id !== id) e.zIndex++;
    }
    entity.zIndex = 0;
    return true;
  }

  hitTest(point: Point2D): CanvasEntity[] {
    return this.getAllEntities()
      .filter(e => {
        const { position, size } = e.transform;
        return (
          point.x >= position.x &&
          point.x <= position.x + size.width &&
          point.y >= position.y &&
          point.y <= position.y + size.height
        );
      })
      .sort((a, b) => b.zIndex - a.zIndex); // Topmost first
  }

  clear(): void {
    this.entities.clear();
    this.nextZIndex = 1;
  }

  stats(): { entityCount: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const e of this.entities.values()) {
      byType[e.type] = (byType[e.type] || 0) + 1;
    }
    return { entityCount: this.entities.size, byType };
  }
}

class Viewport {
  private state: ViewportState;

  constructor(width = 800, height = 600) {
    this.state = { offset: { x: 0, y: 0 }, zoom: 1, width, height };
  }

  getState(): ViewportState {
    return { ...this.state };
  }

  pan(dx: number, dy: number): ViewportState {
    this.state.offset.x += dx;
    this.state.offset.y += dy;
    return this.getState();
  }

  zoom(factor: number, center?: Point2D): ViewportState {
    const c = center ?? { x: this.state.width / 2, y: this.state.height / 2 };
    const oldZoom = this.state.zoom;
    this.state.zoom = Math.max(0.1, Math.min(10, factor));

    // Adjust offset to zoom toward center
    const zoomRatio = this.state.zoom / oldZoom;
    this.state.offset.x = c.x - (c.x - this.state.offset.x) * zoomRatio;
    this.state.offset.y = c.y - (c.y - this.state.offset.y) * zoomRatio;

    return this.getState();
  }

  reset(): ViewportState {
    this.state = { offset: { x: 0, y: 0 }, zoom: 1, width: this.state.width, height: this.state.height };
    return this.getState();
  }

  canvasToScreen(point: Point2D): Point2D {
    return {
      x: (point.x + this.state.offset.x) * this.state.zoom,
      y: (point.y + this.state.offset.y) * this.state.zoom,
    };
  }

  screenToCanvas(point: Point2D): Point2D {
    return {
      x: point.x / this.state.zoom - this.state.offset.x,
      y: point.y / this.state.zoom - this.state.offset.y,
    };
  }
}

// ============================================================================
// Widget Registry
// ============================================================================

interface WidgetInstance {
  id: string;
  widgetId: string;
  config: Record<string, unknown>;
  state: Record<string, unknown>;
  createdAt: string;
}

class WidgetRegistry {
  private instances: Map<string, WidgetInstance> = new Map();

  createInstance(widgetId: string, config: Record<string, unknown> = {}): WidgetInstance {
    const instance: WidgetInstance = {
      id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      widgetId,
      config,
      state: {},
      createdAt: new Date().toISOString(),
    };
    this.instances.set(instance.id, instance);
    return instance;
  }

  getInstance(id: string): WidgetInstance | null {
    return this.instances.get(id) ?? null;
  }

  setState(instanceId: string, key: string, value: unknown): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    instance.state[key] = value;
    return true;
  }

  getState(instanceId: string, key: string): unknown {
    return this.instances.get(instanceId)?.state[key];
  }

  removeInstance(id: string): boolean {
    return this.instances.delete(id);
  }

  listInstances(): WidgetInstance[] {
    return Array.from(this.instances.values());
  }

  clear(): void {
    this.instances.clear();
  }
}

// ============================================================================
// MCP Server
// ============================================================================

const bus = new EventBus();
const scene = new SceneGraph();
const viewport = new Viewport();
const widgets = new WidgetRegistry();

const server = new Server(
  {
    name: 'stickernest-dev',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Event Bus Tools
    {
      name: 'bus_emit',
      description: 'Emit an event on the event bus',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Event type (e.g., "widget.mounted", "canvas.entity.created")' },
          payload: { type: 'object', description: 'Event payload' },
        },
        required: ['type'],
      },
    },
    {
      name: 'bus_history',
      description: 'Get event history from the bus',
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Filter pattern (supports * wildcard)' },
          limit: { type: 'number', description: 'Max events to return (default 100)' },
        },
      },
    },
    {
      name: 'bus_subscribe',
      description: 'Create a subscription pattern',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Event pattern to subscribe to' },
        },
        required: ['pattern'],
      },
    },
    {
      name: 'bus_bench',
      description: 'Run event bus performance benchmark',
      inputSchema: {
        type: 'object',
        properties: {
          iterations: { type: 'number', description: 'Number of events to emit (default 10000)' },
        },
      },
    },
    {
      name: 'bus_stats',
      description: 'Get event bus statistics',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'bus_clear',
      description: 'Clear event history',
      inputSchema: { type: 'object', properties: {} },
    },
    // Canvas Tools
    {
      name: 'canvas_add_entity',
      description: 'Add an entity to the canvas',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Entity ID' },
          type: { type: 'string', enum: ['sticker', 'text', 'shape', 'widget', 'lottie'] },
          name: { type: 'string', description: 'Display name' },
          x: { type: 'number', description: 'X position' },
          y: { type: 'number', description: 'Y position' },
          width: { type: 'number', description: 'Width (default 100)' },
          height: { type: 'number', description: 'Height (default 100)' },
        },
        required: ['id', 'type'],
      },
    },
    {
      name: 'canvas_get_entity',
      description: 'Get an entity by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'canvas_move_entity',
      description: 'Move an entity',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
        },
        required: ['id', 'x', 'y'],
      },
    },
    {
      name: 'canvas_remove_entity',
      description: 'Remove an entity',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'canvas_list_entities',
      description: 'List all entities',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'canvas_hit_test',
      description: 'Find entities at a point',
      inputSchema: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
        },
        required: ['x', 'y'],
      },
    },
    {
      name: 'canvas_reorder',
      description: 'Change entity z-order',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          action: { type: 'string', enum: ['bringToFront', 'sendToBack'] },
        },
        required: ['id', 'action'],
      },
    },
    {
      name: 'canvas_stats',
      description: 'Get canvas statistics',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'canvas_clear',
      description: 'Clear all entities',
      inputSchema: { type: 'object', properties: {} },
    },
    // Viewport Tools
    {
      name: 'viewport_get',
      description: 'Get current viewport state',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'viewport_pan',
      description: 'Pan the viewport',
      inputSchema: {
        type: 'object',
        properties: {
          dx: { type: 'number' },
          dy: { type: 'number' },
        },
        required: ['dx', 'dy'],
      },
    },
    {
      name: 'viewport_zoom',
      description: 'Set viewport zoom level',
      inputSchema: {
        type: 'object',
        properties: {
          level: { type: 'number', description: 'Zoom level (0.1 to 10)' },
        },
        required: ['level'],
      },
    },
    {
      name: 'viewport_reset',
      description: 'Reset viewport to default',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'viewport_transform',
      description: 'Transform coordinates between canvas and screen space',
      inputSchema: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          direction: { type: 'string', enum: ['canvasToScreen', 'screenToCanvas'] },
        },
        required: ['x', 'y', 'direction'],
      },
    },
    // Widget Tools
    {
      name: 'widget_create',
      description: 'Create a widget instance',
      inputSchema: {
        type: 'object',
        properties: {
          widgetId: { type: 'string', description: 'Widget type ID' },
          config: { type: 'object', description: 'Widget configuration' },
        },
        required: ['widgetId'],
      },
    },
    {
      name: 'widget_set_state',
      description: 'Set widget instance state',
      inputSchema: {
        type: 'object',
        properties: {
          instanceId: { type: 'string' },
          key: { type: 'string' },
          value: { type: 'object' },
        },
        required: ['instanceId', 'key', 'value'],
      },
    },
    {
      name: 'widget_get_state',
      description: 'Get widget instance state',
      inputSchema: {
        type: 'object',
        properties: {
          instanceId: { type: 'string' },
          key: { type: 'string' },
        },
        required: ['instanceId', 'key'],
      },
    },
    {
      name: 'widget_list',
      description: 'List all widget instances',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'widget_remove',
      description: 'Remove a widget instance',
      inputSchema: {
        type: 'object',
        properties: {
          instanceId: { type: 'string' },
        },
        required: ['instanceId'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Ensure args is defined (provide empty object as fallback)
  const a = args ?? {};

  try {
    switch (name) {
      // Event Bus
      case 'bus_emit': {
        const event = bus.emit(a.type as string, a.payload ?? {});
        return { content: [{ type: 'text', text: JSON.stringify(event, null, 2) }] };
      }
      case 'bus_history': {
        const events = bus.getHistory(a.filter as string | undefined, a.limit as number | undefined);
        return { content: [{ type: 'text', text: JSON.stringify(events, null, 2) }] };
      }
      case 'bus_subscribe': {
        const sub = bus.subscribe(a.pattern as string);
        return { content: [{ type: 'text', text: JSON.stringify(sub, null, 2) }] };
      }
      case 'bus_bench': {
        const result = bus.bench(a.iterations as number | undefined);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'bus_stats': {
        return { content: [{ type: 'text', text: JSON.stringify(bus.stats(), null, 2) }] };
      }
      case 'bus_clear': {
        bus.clear();
        return { content: [{ type: 'text', text: 'Event history cleared' }] };
      }

      // Canvas
      case 'canvas_add_entity': {
        const entity = scene.addEntity({
          id: a.id as string,
          type: a.type as CanvasEntity['type'],
          name: (a.name as string) ?? a.id,
          transform: {
            position: { x: (a.x as number) ?? 0, y: (a.y as number) ?? 0 },
            size: { width: (a.width as number) ?? 100, height: (a.height as number) ?? 100 },
            rotation: 0,
            scale: 1,
          },
          visible: true,
          locked: false,
          metadata: {},
        });
        bus.emit('canvas.entity.created', { entity });
        return { content: [{ type: 'text', text: JSON.stringify(entity, null, 2) }] };
      }
      case 'canvas_get_entity': {
        const entity = scene.getEntity(a.id as string);
        return { content: [{ type: 'text', text: entity ? JSON.stringify(entity, null, 2) : 'Entity not found' }] };
      }
      case 'canvas_move_entity': {
        const entity = scene.getEntity(a.id as string);
        if (!entity) return { content: [{ type: 'text', text: 'Entity not found' }] };
        entity.transform.position = { x: a.x as number, y: a.y as number };
        const updated = scene.updateEntity(a.id as string, entity);
        bus.emit('canvas.entity.moved', { entityId: a.id, position: entity.transform.position });
        return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
      }
      case 'canvas_remove_entity': {
        const removed = scene.removeEntity(a.id as string);
        if (removed) bus.emit('canvas.entity.deleted', { entityId: a.id });
        return { content: [{ type: 'text', text: removed ? 'Entity removed' : 'Entity not found' }] };
      }
      case 'canvas_list_entities': {
        return { content: [{ type: 'text', text: JSON.stringify(scene.getAllEntities(), null, 2) }] };
      }
      case 'canvas_hit_test': {
        const hits = scene.hitTest({ x: a.x as number, y: a.y as number });
        return { content: [{ type: 'text', text: JSON.stringify(hits.map(e => ({ id: e.id, type: e.type, zIndex: e.zIndex })), null, 2) }] };
      }
      case 'canvas_reorder': {
        const action = a.action as string;
        const success = action === 'bringToFront'
          ? scene.bringToFront(a.id as string)
          : scene.sendToBack(a.id as string);
        if (success) bus.emit('canvas.entity.reordered', { entityId: a.id, action });
        return { content: [{ type: 'text', text: success ? 'Reordered' : 'Entity not found' }] };
      }
      case 'canvas_stats': {
        return { content: [{ type: 'text', text: JSON.stringify(scene.stats(), null, 2) }] };
      }
      case 'canvas_clear': {
        scene.clear();
        bus.emit('canvas.cleared', {});
        return { content: [{ type: 'text', text: 'Canvas cleared' }] };
      }

      // Viewport
      case 'viewport_get': {
        return { content: [{ type: 'text', text: JSON.stringify(viewport.getState(), null, 2) }] };
      }
      case 'viewport_pan': {
        const state = viewport.pan(a.dx as number, a.dy as number);
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'viewport_zoom': {
        const state = viewport.zoom(a.level as number);
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'viewport_reset': {
        return { content: [{ type: 'text', text: JSON.stringify(viewport.reset(), null, 2) }] };
      }
      case 'viewport_transform': {
        const point = { x: a.x as number, y: a.y as number };
        const result = a.direction === 'canvasToScreen'
          ? viewport.canvasToScreen(point)
          : viewport.screenToCanvas(point);
        return { content: [{ type: 'text', text: JSON.stringify({ input: point, output: result, direction: a.direction }, null, 2) }] };
      }

      // Widgets
      case 'widget_create': {
        const instance = widgets.createInstance(a.widgetId as string, a.config as Record<string, unknown>);
        bus.emit('widget.mounted', { instanceId: instance.id, widgetId: instance.widgetId });
        return { content: [{ type: 'text', text: JSON.stringify(instance, null, 2) }] };
      }
      case 'widget_set_state': {
        const success = widgets.setState(a.instanceId as string, a.key as string, a.value);
        if (success) bus.emit('widget.state.changed', { instanceId: a.instanceId, key: a.key });
        return { content: [{ type: 'text', text: success ? 'State updated' : 'Instance not found' }] };
      }
      case 'widget_get_state': {
        const value = widgets.getState(a.instanceId as string, a.key as string);
        return { content: [{ type: 'text', text: JSON.stringify({ key: a.key, value }, null, 2) }] };
      }
      case 'widget_list': {
        return { content: [{ type: 'text', text: JSON.stringify(widgets.listInstances(), null, 2) }] };
      }
      case 'widget_remove': {
        const removed = widgets.removeInstance(a.instanceId as string);
        if (removed) bus.emit('widget.unmounted', { instanceId: a.instanceId });
        return { content: [{ type: 'text', text: removed ? 'Widget removed' : 'Instance not found' }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
  }
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'stickernest://bus/stats',
      name: 'Event Bus Stats',
      description: 'Current event bus statistics',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://canvas/stats',
      name: 'Canvas Stats',
      description: 'Current canvas statistics',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://viewport/state',
      name: 'Viewport State',
      description: 'Current viewport state',
      mimeType: 'application/json',
    },
  ],
}));

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'stickernest://bus/stats':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(bus.stats(), null, 2) }] };
    case 'stickernest://canvas/stats':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(scene.stats(), null, 2) }] };
    case 'stickernest://viewport/state':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(viewport.getState(), null, 2) }] };
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('StickerNest MCP Dev Server running on stdio');
}

main().catch(console.error);
