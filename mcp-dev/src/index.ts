#!/usr/bin/env node
/**
 * StickerNest MCP Development Server
 *
 * Provides tools for testing the event bus, canvas core, widget systems,
 * billing/quota, and creator commerce without requiring the full browser
 * or React environment.
 *
 * Updated to match current kernel schemas from @sn/types.
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
import { ARTIFACT_TOOL_DEFS, isArtifactTool, handleArtifactTool } from './artifact-tools.js';
import * as marketplaceDb from './marketplace-supabase.js';

// ============================================================================
// Type Definitions (matching kernel schemas)
// ============================================================================

/** Entity type enum — mirrors CanvasEntityTypeSchema */
type CanvasEntityType =
  | 'sticker'
  | 'text'
  | 'widget'
  | 'shape'
  | 'drawing'
  | 'group'
  | 'docker'
  | 'lottie'
  | 'audio'
  | 'svg'
  | 'path'
  | 'object3d';

const ENTITY_TYPES: CanvasEntityType[] = [
  'sticker', 'text', 'widget', 'shape', 'drawing', 'group',
  'docker', 'lottie', 'audio', 'svg', 'path', 'object3d',
];

// ============================================================================
// Event Constants (from bus-event.ts)
// ============================================================================

const KernelEvents = {
  AUTH_STATE_CHANGED: 'kernel.auth.stateChanged',
  AUTH_SESSION_EXPIRED: 'kernel.auth.sessionExpired',
  DATASOURCE_CREATED: 'kernel.datasource.created',
  DATASOURCE_UPDATED: 'kernel.datasource.updated',
  DATASOURCE_DELETED: 'kernel.datasource.deleted',
  STORE_SYNC_REQUEST: 'kernel.store.syncRequest',
} as const;

const SocialEvents = {
  PRESENCE_JOINED: 'social.presence.joined',
  PRESENCE_LEFT: 'social.presence.left',
  CURSOR_MOVED: 'social.cursor.moved',
  ENTITY_TRANSFORMED: 'social.entity.transformed',
  DATASOURCE_UPDATED: 'social.datasource.updated',
  CONFLICT_REJECTED: 'social.conflict.rejected',
} as const;

const CanvasEvents = {
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
  ENTITY_GROUPED: 'canvas.entity.grouped',
  ENTITY_UNGROUPED: 'canvas.entity.ungrouped',
  GROUP_CHILDREN_CHANGED: 'canvas.group.children.changed',
  PATH_POINT_ADDED: 'canvas.path.point.added',
  PATH_CLOSED: 'canvas.path.closed',
  TOOL_INPUT_DOWN: 'canvas.tool.input.down',
  TOOL_INPUT_MOVE: 'canvas.tool.input.move',
  TOOL_INPUT_UP: 'canvas.tool.input.up',
  // Document events
  DOCUMENT_UPDATED: 'canvas.document.updated',
  // History events
  HISTORY_UNDO: 'canvas.history.undo',
  HISTORY_REDO: 'canvas.history.redo',
  HISTORY_CLEARED: 'canvas.history.cleared',
  HISTORY_PUSHED: 'canvas.history.pushed',
} as const;

const WidgetEvents = {
  MOUNTED: 'widget.mounted',
  UNMOUNTED: 'widget.unmounted',
  READY: 'widget.ready',
  ERROR: 'widget.error',
  STATE_CHANGED: 'widget.state.changed',
} as const;

const ShellEvents = {
  THEME_CHANGED: 'shell.theme.changed',
  ROUTE_CHANGED: 'shell.route.changed',
  CHROME_MODE_CHANGED: 'shell.chrome.mode.changed',
  SIDEBAR_TOGGLED: 'shell.sidebar.toggled',
  PANEL_TOGGLED: 'shell.panel.toggled',
} as const;

const SpatialEvents = {
  SESSION_STARTED: 'spatial.session.started',
  SESSION_ENDED: 'spatial.session.ended',
  CONTROLLER_SELECT: 'spatial.controller.select',
  CONTROLLER_GRAB: 'spatial.controller.grab',
  ENTITY_PLACED: 'spatial.entity.placed',
  MODE_CHANGED: 'spatial.mode.changed',
} as const;

const GridEvents = {
  CELL_PAINTED: 'canvas.grid.cell.painted',
  CELL_CLEARED: 'canvas.grid.cell.cleared',
  CONFIG_CHANGED: 'canvas.grid.config.changed',
  TOGGLED: 'canvas.grid.toggled',
  CLEARED: 'canvas.grid.cleared',
} as const;

const CanvasDocumentEvents = {
  LOADED: 'canvas.document.loaded',
  SAVED: 'canvas.document.saved',
  BACKGROUND_CHANGED: 'canvas.document.background.changed',
  LAYOUT_MODE_CHANGED: 'canvas.document.layoutMode.changed',
} as const;

const DockerEvents = {
  CREATED: 'docker.created',
  DELETED: 'docker.deleted',
  UPDATED: 'docker.updated',
  TAB_ADDED: 'docker.tab.added',
  TAB_REMOVED: 'docker.tab.removed',
  WIDGET_ADDED: 'docker.widget.added',
  WIDGET_REMOVED: 'docker.widget.removed',
} as const;

// All event constants for resource export
const ALL_EVENT_CONSTANTS = {
  KernelEvents,
  SocialEvents,
  CanvasEvents,
  WidgetEvents,
  ShellEvents,
  SpatialEvents,
  GridEvents,
  CanvasDocumentEvents,
  DockerEvents,
};

// ============================================================================
// Event Bus Implementation
// ============================================================================

interface SpatialContext {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  normal: { x: number; y: number; z: number };
}

interface BusEvent {
  type: string;
  payload: unknown;
  timestamp: string;
  id: number;
  spatial?: SpatialContext;
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

  emit(type: string, payload: unknown, spatial?: SpatialContext): BusEvent {
    const event: BusEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      id: ++this.eventId,
      spatial,
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
      const regex = new RegExp(filter.replace(/\*/g, '.*'));
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
      latencies.push((performance.now() - t0) * 1000);
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

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface Transform2D {
  position: Point2D;
  size: Size2D;
  rotation: number;
  scale: number;
}

interface Transform3D {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

interface CropRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Full canvas entity structure matching CanvasEntityBaseSchema */
interface CanvasEntity {
  id: string;
  type: CanvasEntityType;
  canvasId: string;
  transform: Transform2D;
  spatialTransform?: Transform3D;
  zIndex: number;
  visible: boolean;
  canvasVisibility: '2d' | '3d' | 'both';
  locked: boolean;
  flipH: boolean;
  flipV: boolean;
  opacity: number;
  borderRadius: number;
  cropRect?: CropRect;
  parentId?: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata: Record<string, unknown>;
  // Type-specific fields
  children?: string[]; // For group, docker
  assetUrl?: string; // For sticker, lottie, audio, svg, object3d
  content?: string; // For text
  points?: Point2D[]; // For drawing, shape
  anchors?: unknown[]; // For path
  widgetInstanceId?: string; // For widget
  widgetId?: string; // For widget, docker
  config?: Record<string, unknown>; // For widget, docker
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
  private canvasId = 'default-canvas-' + Date.now().toString(36);

  addEntity(partial: Partial<CanvasEntity> & { id: string; type: CanvasEntityType }): CanvasEntity {
    const now = new Date().toISOString();
    const entity: CanvasEntity = {
      id: partial.id,
      type: partial.type,
      canvasId: partial.canvasId ?? this.canvasId,
      transform: partial.transform ?? {
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        rotation: 0,
        scale: 1,
      },
      zIndex: this.nextZIndex++,
      visible: partial.visible ?? true,
      canvasVisibility: partial.canvasVisibility ?? 'both',
      locked: partial.locked ?? false,
      flipH: partial.flipH ?? false,
      flipV: partial.flipV ?? false,
      opacity: partial.opacity ?? 1,
      borderRadius: partial.borderRadius ?? 0,
      cropRect: partial.cropRect,
      parentId: partial.parentId,
      name: partial.name ?? partial.id,
      createdAt: now,
      updatedAt: now,
      createdBy: partial.createdBy ?? 'mcp-dev-user',
      metadata: partial.metadata ?? {},
      // Type-specific
      children: partial.children,
      assetUrl: partial.assetUrl,
      content: partial.content,
      points: partial.points,
      anchors: partial.anchors,
      widgetInstanceId: partial.widgetInstanceId,
      widgetId: partial.widgetId,
      config: partial.config,
    };
    this.entities.set(entity.id, entity);
    return entity;
  }

  getEntity(id: string): CanvasEntity | null {
    return this.entities.get(id) ?? null;
  }

  updateEntity(id: string, updates: Partial<CanvasEntity>): CanvasEntity | null {
    const entity = this.entities.get(id);
    if (!entity) return null;
    const updated = { ...entity, ...updates, updatedAt: new Date().toISOString() };
    this.entities.set(id, updated);
    return updated;
  }

  removeEntity(id: string): boolean {
    return this.entities.delete(id);
  }

  getAllEntities(): CanvasEntity[] {
    return Array.from(this.entities.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  getEntitiesByType(type: CanvasEntityType): CanvasEntity[] {
    return this.getAllEntities().filter(e => e.type === type);
  }

  getEntitiesByParent(parentId: string): CanvasEntity[] {
    return this.getAllEntities().filter(e => e.parentId === parentId);
  }

  bringToFront(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    entity.zIndex = this.nextZIndex++;
    entity.updatedAt = new Date().toISOString();
    return true;
  }

  sendToBack(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    for (const e of this.entities.values()) {
      if (e.id !== id) e.zIndex++;
    }
    entity.zIndex = 0;
    entity.updatedAt = new Date().toISOString();
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
      .sort((a, b) => b.zIndex - a.zIndex);
  }

  regionSelect(rect: { x: number; y: number; width: number; height: number }): CanvasEntity[] {
    return this.getAllEntities().filter(e => {
      const { position, size } = e.transform;
      return (
        position.x < rect.x + rect.width &&
        position.x + size.width > rect.x &&
        position.y < rect.y + rect.height &&
        position.y + size.height > rect.y
      );
    });
  }

  createGroup(entityIds: string[], groupId?: string): CanvasEntity | null {
    const children = entityIds.filter(id => this.entities.has(id));
    if (children.length < 2) return null;

    const childEntities = children.map(id => this.entities.get(id)!);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of childEntities) {
      const { position, size } = e.transform;
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + size.width);
      maxY = Math.max(maxY, position.y + size.height);
    }

    const group = this.addEntity({
      id: groupId ?? `group-${Date.now().toString(36)}`,
      type: 'group',
      transform: {
        position: { x: minX, y: minY },
        size: { width: maxX - minX, height: maxY - minY },
        rotation: 0,
        scale: 1,
      },
      children,
    });

    // Set parentId on children
    for (const id of children) {
      const e = this.entities.get(id);
      if (e) {
        e.parentId = group.id;
        e.updatedAt = new Date().toISOString();
      }
    }

    return group;
  }

  ungroup(groupId: string): string[] {
    const group = this.entities.get(groupId);
    if (!group || group.type !== 'group' || !group.children) return [];

    const childIds = [...group.children];
    for (const id of childIds) {
      const e = this.entities.get(id);
      if (e) {
        e.parentId = undefined;
        e.updatedAt = new Date().toISOString();
      }
    }

    this.entities.delete(groupId);
    return childIds;
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
// Billing & Quota Simulation
// ============================================================================

type UserTier = 'free' | 'creator' | 'pro' | 'enterprise';

interface TierQuota {
  tier: UserTier;
  maxCanvases: number;
  maxStorageMb: number;
  maxWidgetsPerCanvas: number;
  maxCollaboratorsPerCanvas: number;
  canSell: boolean;
  applicationFeePct: number;
}

const TIER_QUOTAS: Record<UserTier, TierQuota> = {
  free:       { tier: 'free',       maxCanvases: 3,   maxStorageMb: 100,    maxWidgetsPerCanvas: 10,  maxCollaboratorsPerCanvas: 3,   canSell: false, applicationFeePct: 0 },
  creator:    { tier: 'creator',    maxCanvases: 25,  maxStorageMb: 5000,   maxWidgetsPerCanvas: 50,  maxCollaboratorsPerCanvas: 10,  canSell: true,  applicationFeePct: 12 },
  pro:        { tier: 'pro',        maxCanvases: -1,  maxStorageMb: 50000,  maxWidgetsPerCanvas: -1,  maxCollaboratorsPerCanvas: 50,  canSell: true,  applicationFeePct: 8 },
  enterprise: { tier: 'enterprise', maxCanvases: -1,  maxStorageMb: -1,     maxWidgetsPerCanvas: -1,  maxCollaboratorsPerCanvas: -1,  canSell: true,  applicationFeePct: 5 },
};

interface SimUser {
  id: string;
  email: string;
  tier: UserTier;
  stripeCustomerId: string | null;
  stripeConnectAccountId: string | null;
  connectOnboardingComplete: boolean;
  chargesEnabled: boolean;
}

class BillingSimulation {
  private users: Map<string, SimUser> = new Map();

  constructor() {
    // Seed a default test user
    this.users.set('user-1', {
      id: 'user-1',
      email: 'test@stickernest.com',
      tier: 'free',
      stripeCustomerId: null,
      stripeConnectAccountId: null,
      connectOnboardingComplete: false,
      chargesEnabled: false,
    });
  }

  getUser(userId: string): SimUser | null {
    return this.users.get(userId) ?? null;
  }

  createUser(email: string, tier: UserTier = 'free'): SimUser {
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const user: SimUser = {
      id,
      email,
      tier,
      stripeCustomerId: null,
      stripeConnectAccountId: null,
      connectOnboardingComplete: false,
      chargesEnabled: false,
    };
    this.users.set(id, user);
    return user;
  }

  setTier(userId: string, tier: UserTier): SimUser | null {
    const user = this.users.get(userId);
    if (!user) return null;
    user.tier = tier;
    user.stripeCustomerId = tier !== 'free' ? `cus_sim_${userId}` : user.stripeCustomerId;
    return user;
  }

  getQuota(tier: UserTier): TierQuota {
    return TIER_QUOTAS[tier];
  }

  checkQuota(userId: string, resource: string, currentUsage: number): { allowed: boolean; limit: number; current: number; nextTier: UserTier | null } {
    const user = this.users.get(userId);
    if (!user) return { allowed: false, limit: 0, current: currentUsage, nextTier: 'free' };
    const q = TIER_QUOTAS[user.tier];
    let limit = 0;
    switch (resource) {
      case 'canvas_count': limit = q.maxCanvases; break;
      case 'storage_mb': limit = q.maxStorageMb; break;
      case 'widgets_per_canvas': limit = q.maxWidgetsPerCanvas; break;
      case 'collaborators_per_canvas': limit = q.maxCollaboratorsPerCanvas; break;
      default: return { allowed: false, limit: 0, current: currentUsage, nextTier: null };
    }
    const allowed = limit === -1 || currentUsage < limit;
    const tiers: UserTier[] = ['free', 'creator', 'pro', 'enterprise'];
    const idx = tiers.indexOf(user.tier);
    const nextTier = !allowed && idx < tiers.length - 1 ? tiers[idx + 1] : null;
    return { allowed, limit, current: currentUsage, nextTier };
  }

  connectOnboard(userId: string): { url: string } | null {
    const user = this.users.get(userId);
    if (!user) return null;
    const q = TIER_QUOTAS[user.tier];
    if (!q.canSell) return null;
    user.stripeConnectAccountId = `acct_sim_${userId}`;
    user.connectOnboardingComplete = true;
    user.chargesEnabled = true;
    return { url: `https://connect.stripe.com/setup/sim/${userId}` };
  }

  listUsers(): SimUser[] {
    return Array.from(this.users.values());
  }

  stats(): { totalUsers: number; byTier: Record<string, number>; connectedCreators: number } {
    const byTier: Record<string, number> = {};
    let connected = 0;
    for (const u of this.users.values()) {
      byTier[u.tier] = (byTier[u.tier] || 0) + 1;
      if (u.chargesEnabled) connected++;
    }
    return { totalUsers: this.users.size, byTier, connectedCreators: connected };
  }
}

// ============================================================================
// Creator Commerce Simulation
// ============================================================================

interface SubscriptionTier {
  id: string;
  canvasId: string;
  creatorId: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  description: string | null;
  benefits: string[];
  isActive: boolean;
  sortOrder: number;
}

interface ShopItem {
  id: string;
  canvasId: string;
  creatorId: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  itemType: 'digital' | 'physical' | 'service';
  fulfillment: 'auto' | 'manual' | 'shipping';
  thumbnailUrl: string | null;
  downloadUrl: string | null;
  stockCount: number | null;
  requiresShipping: boolean;
  shippingNote: string | null;
  isActive: boolean;
}

interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  itemId: string;
  amountCents: number;
  platformFeeCents: number;
  currency: string;
  status: 'paid' | 'fulfilled' | 'refunded' | 'disputed';
  type: 'subscription' | 'shop_item';
  createdAt: string;
}

class CommerceSimulation {
  private tiers: Map<string, SubscriptionTier> = new Map();
  private items: Map<string, ShopItem> = new Map();
  private orders: Map<string, Order> = new Map();
  private nextId = 1;

  private genId(prefix: string): string {
    return `${prefix}-${this.nextId++}`;
  }

  // Subscription tiers
  createTier(canvasId: string, creatorId: string, data: { name: string; priceCents: number; currency?: string; interval?: string; description?: string; benefits?: string[] }): SubscriptionTier {
    const tier: SubscriptionTier = {
      id: this.genId('tier'),
      canvasId,
      creatorId,
      name: data.name,
      priceCents: data.priceCents,
      currency: data.currency ?? 'usd',
      interval: data.interval ?? 'month',
      description: data.description ?? null,
      benefits: data.benefits ?? [],
      isActive: true,
      sortOrder: this.listTiers(canvasId).length,
    };
    this.tiers.set(tier.id, tier);
    return tier;
  }

  getTier(id: string): SubscriptionTier | null {
    return this.tiers.get(id) ?? null;
  }

  listTiers(canvasId?: string): SubscriptionTier[] {
    const all = Array.from(this.tiers.values());
    return canvasId ? all.filter(t => t.canvasId === canvasId) : all;
  }

  updateTier(id: string, updates: Partial<Pick<SubscriptionTier, 'name' | 'priceCents' | 'description' | 'benefits' | 'isActive'>>): SubscriptionTier | null {
    const tier = this.tiers.get(id);
    if (!tier) return null;
    Object.assign(tier, updates);
    return tier;
  }

  deleteTier(id: string): boolean {
    return this.tiers.delete(id);
  }

  // Shop items
  createItem(canvasId: string, creatorId: string, data: {
    name: string; priceCents: number; itemType: ShopItem['itemType']; fulfillment?: ShopItem['fulfillment'];
    currency?: string; description?: string; stockCount?: number; requiresShipping?: boolean; shippingNote?: string;
  }): ShopItem {
    const item: ShopItem = {
      id: this.genId('item'),
      canvasId,
      creatorId,
      name: data.name,
      description: data.description ?? null,
      priceCents: data.priceCents,
      currency: data.currency ?? 'usd',
      itemType: data.itemType,
      fulfillment: data.fulfillment ?? 'auto',
      thumbnailUrl: null,
      downloadUrl: null,
      stockCount: data.stockCount ?? null,
      requiresShipping: data.requiresShipping ?? false,
      shippingNote: data.shippingNote ?? null,
      isActive: true,
    };
    this.items.set(item.id, item);
    return item;
  }

  getItem(id: string): ShopItem | null {
    return this.items.get(id) ?? null;
  }

  listItems(canvasId?: string): ShopItem[] {
    const all = Array.from(this.items.values());
    return canvasId ? all.filter(i => i.canvasId === canvasId) : all;
  }

  updateItem(id: string, updates: Partial<Pick<ShopItem, 'name' | 'priceCents' | 'description' | 'stockCount' | 'isActive'>>): ShopItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    Object.assign(item, updates);
    return item;
  }

  deleteItem(id: string): boolean {
    return this.items.delete(id);
  }

  // Orders
  createOrder(buyerId: string, itemId: string, type: Order['type'], applicationFeePct: number): Order | null {
    const item = type === 'shop_item' ? this.items.get(itemId) : null;
    const tier = type === 'subscription' ? this.tiers.get(itemId) : null;
    const source = item ?? tier;
    if (!source) return null;
    const amountCents = 'priceCents' in source ? source.priceCents : 0;
    const platformFeeCents = Math.round(amountCents * applicationFeePct / 100);
    const order: Order = {
      id: this.genId('order'),
      buyerId,
      sellerId: source.creatorId,
      itemId,
      amountCents,
      platformFeeCents,
      currency: source.currency,
      status: 'paid',
      type,
      createdAt: new Date().toISOString(),
    };
    this.orders.set(order.id, order);
    // Decrement stock for physical items
    if (item && item.stockCount !== null) {
      item.stockCount = Math.max(0, item.stockCount - 1);
    }
    return order;
  }

  getOrder(id: string): Order | null {
    return this.orders.get(id) ?? null;
  }

  listOrders(filter?: { buyerId?: string; sellerId?: string }): Order[] {
    let all = Array.from(this.orders.values());
    if (filter?.buyerId) all = all.filter(o => o.buyerId === filter.buyerId);
    if (filter?.sellerId) all = all.filter(o => o.sellerId === filter.sellerId);
    return all;
  }

  fulfillOrder(id: string): Order | null {
    const order = this.orders.get(id);
    if (!order) return null;
    order.status = 'fulfilled';
    return order;
  }

  stats(): {
    totalTiers: number; totalItems: number; totalOrders: number;
    revenueBySellerCents: Record<string, number>; platformFeeTotalCents: number;
  } {
    let platformFees = 0;
    const revBySeller: Record<string, number> = {};
    for (const o of this.orders.values()) {
      platformFees += o.platformFeeCents;
      revBySeller[o.sellerId] = (revBySeller[o.sellerId] || 0) + (o.amountCents - o.platformFeeCents);
    }
    return {
      totalTiers: this.tiers.size,
      totalItems: this.items.size,
      totalOrders: this.orders.size,
      revenueBySellerCents: revBySeller,
      platformFeeTotalCents: platformFees,
    };
  }

  clear(): void {
    this.tiers.clear();
    this.items.clear();
    this.orders.clear();
  }
}

// ============================================================================
// Selection Manager
// ============================================================================

class SelectionManager {
  private selectedIds: Set<string> = new Set();

  select(ids: string | string[]): string[] {
    const arr = Array.isArray(ids) ? ids : [ids];
    this.selectedIds.clear();
    for (const id of arr) {
      this.selectedIds.add(id);
    }
    return this.getSelected();
  }

  addToSelection(ids: string | string[]): string[] {
    const arr = Array.isArray(ids) ? ids : [ids];
    for (const id of arr) {
      this.selectedIds.add(id);
    }
    return this.getSelected();
  }

  removeFromSelection(ids: string | string[]): string[] {
    const arr = Array.isArray(ids) ? ids : [ids];
    for (const id of arr) {
      this.selectedIds.delete(id);
    }
    return this.getSelected();
  }

  toggleSelection(id: string): string[] {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    return this.getSelected();
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }

  getSelected(): string[] {
    return Array.from(this.selectedIds);
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }
}

// ============================================================================
// MCP Server
// ============================================================================

const bus = new EventBus();
const scene = new SceneGraph();
const viewport = new Viewport();
const widgets = new WidgetRegistry();
const billing = new BillingSimulation();
const commerce = new CommerceSimulation();
const selection = new SelectionManager();

// ============================================================================
// Canvas Document Management
// ============================================================================

type BackgroundType = 'solid' | 'gradient' | 'image';
type GradientType = 'linear' | 'radial';
type ImageBackgroundMode = 'cover' | 'contain' | 'tile';
type LayoutMode = 'freeform' | 'bento' | 'desktop' | 'artboard';
type CanvasPlatform = 'web' | 'mobile' | 'desktop';
type SpatialMode = '2d' | '3d' | 'vr';

interface GradientStop {
  offset: number;
  color: string;
}

interface BackgroundSpec {
  type: BackgroundType;
  color?: string;
  opacity?: number;
  gradientType?: GradientType;
  stops?: GradientStop[];
  angle?: number;
  url?: string;
  mode?: ImageBackgroundMode;
}

interface ViewportConfig {
  width?: number;
  height?: number;
  background: BackgroundSpec;
  isPreviewMode: boolean;
}

interface CanvasDocumentState {
  id: string;
  name: string;
  viewport: ViewportConfig;
  layoutMode: LayoutMode;
  platform: CanvasPlatform;
  spatialMode: SpatialMode;
  createdAt: string;
  updatedAt: string;
}

class CanvasDocument {
  private state: CanvasDocumentState;

  constructor() {
    const now = new Date().toISOString();
    this.state = {
      id: `doc-${Date.now().toString(36)}`,
      name: 'Untitled Canvas',
      viewport: {
        background: { type: 'solid', color: '#ffffff', opacity: 1 },
        isPreviewMode: false,
      },
      layoutMode: 'freeform',
      platform: 'web',
      spatialMode: '2d',
      createdAt: now,
      updatedAt: now,
    };
  }

  getState(): CanvasDocumentState {
    return { ...this.state };
  }

  setBackground(background: BackgroundSpec): CanvasDocumentState {
    this.state.viewport.background = background;
    this.state.updatedAt = new Date().toISOString();
    return this.getState();
  }

  setLayoutMode(mode: LayoutMode): CanvasDocumentState {
    this.state.layoutMode = mode;
    this.state.updatedAt = new Date().toISOString();
    return this.getState();
  }

  setViewportSize(width?: number, height?: number): CanvasDocumentState {
    this.state.viewport.width = width;
    this.state.viewport.height = height;
    this.state.updatedAt = new Date().toISOString();
    return this.getState();
  }

  setPreviewMode(isPreview: boolean): CanvasDocumentState {
    this.state.viewport.isPreviewMode = isPreview;
    this.state.updatedAt = new Date().toISOString();
    return this.getState();
  }

  setPlatform(platform: CanvasPlatform): CanvasDocumentState {
    this.state.platform = platform;
    this.state.updatedAt = new Date().toISOString();
    return this.getState();
  }

  setSpatialMode(mode: SpatialMode): CanvasDocumentState {
    this.state.spatialMode = mode;
    this.state.updatedAt = new Date().toISOString();
    return this.getState();
  }

  setName(name: string): CanvasDocumentState {
    this.state.name = name;
    this.state.updatedAt = new Date().toISOString();
    return this.getState();
  }
}

// ============================================================================
// History Manager (Undo/Redo)
// ============================================================================

interface HistoryEntry {
  event: BusEvent;
  inverseEvent: BusEvent | null;
  timestamp: number;
}

class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxSize = 100;

  push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new action
  }

  undo(): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push(entry);
    return entry;
  }

  redo(): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push(entry);
    return entry;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getStack(): { undoCount: number; redoCount: number; recentActions: string[] } {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      recentActions: this.undoStack.slice(-5).map(e => e.event.type),
    };
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

// ============================================================================
// UI State Manager
// ============================================================================

type InteractionMode = 'edit' | 'preview';
type ChromeMode = 'editor' | 'clean';
type Theme = 'light' | 'dark' | 'high-contrast';

interface UIState {
  canvasInteractionMode: InteractionMode;
  chromeMode: ChromeMode;
  activeTool: string;
  theme: Theme;
  sidebarLeftOpen: boolean;
  sidebarRightOpen: boolean;
  is3DMode: boolean;
  panels: Record<string, boolean>;
}

class UIManager {
  private state: UIState = {
    canvasInteractionMode: 'edit',
    chromeMode: 'editor',
    activeTool: 'select',
    theme: 'light',
    sidebarLeftOpen: true,
    sidebarRightOpen: true,
    is3DMode: false,
    panels: {},
  };

  getState(): UIState {
    return { ...this.state };
  }

  setInteractionMode(mode: InteractionMode): UIState {
    this.state.canvasInteractionMode = mode;
    return this.getState();
  }

  setChromeMode(mode: ChromeMode): UIState {
    this.state.chromeMode = mode;
    return this.getState();
  }

  setActiveTool(tool: string): UIState {
    this.state.activeTool = tool === 'move' ? 'select' : tool;
    return this.getState();
  }

  setTheme(theme: Theme): UIState {
    this.state.theme = theme;
    return this.getState();
  }

  toggleSidebarLeft(): UIState {
    this.state.sidebarLeftOpen = !this.state.sidebarLeftOpen;
    return this.getState();
  }

  toggleSidebarRight(): UIState {
    this.state.sidebarRightOpen = !this.state.sidebarRightOpen;
    return this.getState();
  }

  set3DMode(is3D: boolean): UIState {
    this.state.is3DMode = is3D;
    return this.getState();
  }

  setPanelOpen(panelId: string, open: boolean): UIState {
    this.state.panels[panelId] = open;
    return this.getState();
  }
}

// ============================================================================
// Docker Manager
// ============================================================================

type DockerDockMode = 'floating' | 'docked-left' | 'docked-right';

interface DockerWidgetSlot {
  widgetInstanceId: string;
  height?: number;
}

interface DockerTab {
  id: string;
  name: string;
  widgets: DockerWidgetSlot[];
}

interface Docker {
  id: string;
  name: string;
  dockMode: DockerDockMode;
  position?: Point2D;
  size: Size2D;
  visible: boolean;
  pinned: boolean;
  tabs: DockerTab[];
  activeTabIndex: number;
  createdAt: string;
  updatedAt: string;
}

class DockerManager {
  private dockers: Map<string, Docker> = new Map();
  private order: string[] = [];

  create(input: {
    name?: string;
    dockMode?: DockerDockMode;
    position?: Point2D;
    size?: Size2D;
    visible?: boolean;
    pinned?: boolean;
  }): Docker {
    const id = `docker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const docker: Docker = {
      id,
      name: input.name ?? 'Docker',
      dockMode: input.dockMode ?? 'floating',
      position: input.position,
      size: input.size ?? { width: 320, height: 400 },
      visible: input.visible ?? true,
      pinned: input.pinned ?? false,
      tabs: [{ id: `tab-${Date.now().toString(36)}`, name: 'Tab 1', widgets: [] }],
      activeTabIndex: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.dockers.set(id, docker);
    this.order.push(id);
    return docker;
  }

  get(id: string): Docker | null {
    return this.dockers.get(id) ?? null;
  }

  update(id: string, updates: Partial<Omit<Docker, 'id' | 'createdAt'>>): Docker | null {
    const docker = this.dockers.get(id);
    if (!docker) return null;
    const updated = { ...docker, ...updates, updatedAt: new Date().toISOString() };
    this.dockers.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    const deleted = this.dockers.delete(id);
    if (deleted) {
      this.order = this.order.filter(dId => dId !== id);
    }
    return deleted;
  }

  list(): Docker[] {
    return this.order.map(id => this.dockers.get(id)!).filter(Boolean);
  }

  addTab(dockerId: string, name?: string): DockerTab | null {
    const docker = this.dockers.get(dockerId);
    if (!docker) return null;
    const tab: DockerTab = {
      id: `tab-${Date.now().toString(36)}`,
      name: name ?? `Tab ${docker.tabs.length + 1}`,
      widgets: [],
    };
    docker.tabs.push(tab);
    docker.updatedAt = new Date().toISOString();
    return tab;
  }

  removeTab(dockerId: string, tabIndex: number): boolean {
    const docker = this.dockers.get(dockerId);
    if (!docker || docker.tabs.length <= 1 || tabIndex < 0 || tabIndex >= docker.tabs.length) {
      return false;
    }
    docker.tabs.splice(tabIndex, 1);
    docker.activeTabIndex = Math.min(docker.activeTabIndex, docker.tabs.length - 1);
    docker.updatedAt = new Date().toISOString();
    return true;
  }

  addWidgetToTab(dockerId: string, tabIndex: number, widgetInstanceId: string, height?: number): boolean {
    const docker = this.dockers.get(dockerId);
    if (!docker || tabIndex < 0 || tabIndex >= docker.tabs.length) return false;
    docker.tabs[tabIndex].widgets.push({ widgetInstanceId, height });
    docker.updatedAt = new Date().toISOString();
    return true;
  }

  removeWidgetFromTab(dockerId: string, tabIndex: number, widgetInstanceId: string): boolean {
    const docker = this.dockers.get(dockerId);
    if (!docker || tabIndex < 0 || tabIndex >= docker.tabs.length) return false;
    const tab = docker.tabs[tabIndex];
    const idx = tab.widgets.findIndex(w => w.widgetInstanceId === widgetInstanceId);
    if (idx < 0) return false;
    tab.widgets.splice(idx, 1);
    docker.updatedAt = new Date().toISOString();
    return true;
  }

  bringToFront(id: string): boolean {
    if (!this.dockers.has(id)) return false;
    this.order = this.order.filter(dId => dId !== id);
    this.order.push(id);
    return true;
  }

  clear(): void {
    this.dockers.clear();
    this.order = [];
  }
}

// ============================================================================
// Test User Manager (for multiuser testing)
// ============================================================================

interface TestUser {
  id: string;
  displayName: string;
  email: string;
  color: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  isOnline: boolean;
  joinedAt?: string;
  cursor?: { x: number; y: number };
  lastActivity?: string;
}

interface PresenceState {
  canvasId: string;
  users: Map<string, TestUser>;
  cursors: Map<string, { x: number; y: number; timestamp: string }>;
}

// Predefined colors for test users
const USER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky Blue
];

class TestUserManager {
  private users: Map<string, TestUser> = new Map();
  private presence: PresenceState = {
    canvasId: 'test-canvas',
    users: new Map(),
    cursors: new Map(),
  };
  private colorIndex = 0;

  constructor() {
    // Create default "self" user
    this.createUser({
      displayName: 'You (Local)',
      email: 'local@stickernest.dev',
      role: 'owner',
    });
  }

  private getNextColor(): string {
    const color = USER_COLORS[this.colorIndex % USER_COLORS.length];
    this.colorIndex++;
    return color;
  }

  createUser(input: {
    displayName: string;
    email?: string;
    role?: TestUser['role'];
    avatar?: string;
  }): TestUser {
    const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const user: TestUser = {
      id,
      displayName: input.displayName,
      email: input.email ?? `${input.displayName.toLowerCase().replace(/\s+/g, '.')}@test.stickernest.dev`,
      color: this.getNextColor(),
      avatar: input.avatar,
      role: input.role ?? 'editor',
      isOnline: false,
    };
    this.users.set(id, user);
    return user;
  }

  getUser(id: string): TestUser | null {
    return this.users.get(id) ?? null;
  }

  updateUser(id: string, updates: Partial<Omit<TestUser, 'id'>>): TestUser | null {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  removeUser(id: string): boolean {
    // Also remove from presence if online
    this.presence.users.delete(id);
    this.presence.cursors.delete(id);
    return this.users.delete(id);
  }

  listUsers(): TestUser[] {
    return Array.from(this.users.values());
  }

  // Presence management
  joinCanvas(userId: string, canvasId?: string): TestUser | null {
    const user = this.users.get(userId);
    if (!user) return null;

    user.isOnline = true;
    user.joinedAt = new Date().toISOString();
    user.lastActivity = user.joinedAt;
    this.presence.users.set(userId, user);

    if (canvasId) {
      this.presence.canvasId = canvasId;
    }

    return user;
  }

  leaveCanvas(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.isOnline = false;
    user.joinedAt = undefined;
    user.cursor = undefined;
    this.presence.users.delete(userId);
    this.presence.cursors.delete(userId);

    return true;
  }

  updateCursor(userId: string, x: number, y: number): { x: number; y: number; timestamp: string } | null {
    const user = this.presence.users.get(userId);
    if (!user) return null;

    const cursor = { x, y, timestamp: new Date().toISOString() };
    user.cursor = { x, y };
    user.lastActivity = cursor.timestamp;
    this.presence.cursors.set(userId, cursor);

    return cursor;
  }

  getPresence(): {
    canvasId: string;
    onlineUsers: TestUser[];
    cursors: Array<{ userId: string; x: number; y: number; timestamp: string }>;
  } {
    return {
      canvasId: this.presence.canvasId,
      onlineUsers: Array.from(this.presence.users.values()),
      cursors: Array.from(this.presence.cursors.entries()).map(([userId, cursor]) => ({
        userId,
        ...cursor,
      })),
    };
  }

  // Simulate cursor movement (for animation/testing)
  simulateCursorPath(userId: string, points: Array<{ x: number; y: number }>, intervalMs: number = 50): void {
    let index = 0;
    const interval = setInterval(() => {
      if (index >= points.length) {
        clearInterval(interval);
        return;
      }
      this.updateCursor(userId, points[index].x, points[index].y);
      index++;
    }, intervalMs);
  }

  clear(): void {
    this.users.clear();
    this.presence.users.clear();
    this.presence.cursors.clear();
    this.colorIndex = 0;
  }
}

// Instantiate new managers
const canvasDoc = new CanvasDocument();
const history = new HistoryManager();
const ui = new UIManager();
const dockers = new DockerManager();
const testUsers = new TestUserManager();

const server = new Server(
  {
    name: 'stickernest-dev',
    version: '2.2.0',
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
      description: 'Emit an event on the event bus. Use event constants from stickernest://events resource.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Event type (e.g., "widget.mounted", "canvas.entity.created")' },
          payload: { type: 'object', description: 'Event payload' },
          spatial: {
            type: 'object',
            description: 'Optional spatial context for VR events',
            properties: {
              position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
              rotation: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' }, w: { type: 'number' } } },
              normal: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
            },
          },
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
          filter: { type: 'string', description: 'Filter pattern (supports * wildcard, e.g., "canvas.*")' },
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
      description: 'Run event bus performance benchmark (target: <1ms latency)',
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

    // Canvas Entity Tools
    {
      name: 'canvas_add_entity',
      description: 'Add an entity to the canvas. Supports all 12 entity types from CanvasEntitySchema.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Entity ID (UUID format recommended)' },
          type: { type: 'string', enum: ENTITY_TYPES, description: 'Entity type' },
          name: { type: 'string', description: 'Display name for layers panel' },
          x: { type: 'number', description: 'X position in canvas space' },
          y: { type: 'number', description: 'Y position in canvas space' },
          width: { type: 'number', description: 'Width (default 100)' },
          height: { type: 'number', description: 'Height (default 100)' },
          rotation: { type: 'number', description: 'Rotation in degrees (default 0)' },
          opacity: { type: 'number', description: 'Opacity 0-1 (default 1)' },
          locked: { type: 'boolean', description: 'Lock from editing' },
          visible: { type: 'boolean', description: 'Visibility (default true)' },
          parentId: { type: 'string', description: 'Parent group ID' },
          // Type-specific
          assetUrl: { type: 'string', description: 'Asset URL (sticker, lottie, audio, svg)' },
          content: { type: 'string', description: 'Text content (text entity)' },
          children: { type: 'array', items: { type: 'string' }, description: 'Child IDs (group, docker)' },
          widgetId: { type: 'string', description: 'Widget definition ID (widget, docker)' },
          config: { type: 'object', description: 'Widget configuration' },
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
      name: 'canvas_update_entity',
      description: 'Update entity properties',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
          rotation: { type: 'number' },
          opacity: { type: 'number' },
          visible: { type: 'boolean' },
          locked: { type: 'boolean' },
          flipH: { type: 'boolean' },
          flipV: { type: 'boolean' },
          name: { type: 'string' },
        },
        required: ['id'],
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
      description: 'List all entities, optionally filtered by type',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ENTITY_TYPES, description: 'Filter by entity type' },
        },
      },
    },
    {
      name: 'canvas_hit_test',
      description: 'Find entities at a point (returns topmost first)',
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
      name: 'canvas_region_select',
      description: 'Find entities intersecting a rectangle',
      inputSchema: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
        required: ['x', 'y', 'width', 'height'],
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
      name: 'canvas_group',
      description: 'Create a group from selected entities',
      inputSchema: {
        type: 'object',
        properties: {
          entityIds: { type: 'array', items: { type: 'string' }, description: 'Entity IDs to group (min 2)' },
          groupId: { type: 'string', description: 'Optional custom group ID' },
        },
        required: ['entityIds'],
      },
    },
    {
      name: 'canvas_ungroup',
      description: 'Ungroup a group entity',
      inputSchema: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
        },
        required: ['groupId'],
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

    // Selection Tools
    {
      name: 'selection_select',
      description: 'Select entities (replaces current selection)',
      inputSchema: {
        type: 'object',
        properties: {
          ids: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
        },
        required: ['ids'],
      },
    },
    {
      name: 'selection_add',
      description: 'Add entities to selection',
      inputSchema: {
        type: 'object',
        properties: {
          ids: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
        },
        required: ['ids'],
      },
    },
    {
      name: 'selection_remove',
      description: 'Remove entities from selection',
      inputSchema: {
        type: 'object',
        properties: {
          ids: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
        },
        required: ['ids'],
      },
    },
    {
      name: 'selection_toggle',
      description: 'Toggle entity selection',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'selection_clear',
      description: 'Clear selection',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'selection_get',
      description: 'Get currently selected entity IDs',
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
      description: 'Set viewport zoom level (0.1 to 10)',
      inputSchema: {
        type: 'object',
        properties: {
          level: { type: 'number', description: 'Zoom level (0.1 to 10)' },
          centerX: { type: 'number', description: 'Zoom center X (optional)' },
          centerY: { type: 'number', description: 'Zoom center Y (optional)' },
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
          value: {},
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
    // Billing & Quota Tools
    {
      name: 'billing_create_user',
      description: 'Create a simulated user for billing testing',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'User email' },
          tier: { type: 'string', enum: ['free', 'creator', 'pro', 'enterprise'], description: 'Starting tier (default: free)' },
        },
        required: ['email'],
      },
    },
    {
      name: 'billing_get_user',
      description: 'Get a simulated user by ID',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId'],
      },
    },
    {
      name: 'billing_set_tier',
      description: 'Change a user\'s subscription tier (simulates checkout.session.completed)',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          tier: { type: 'string', enum: ['free', 'creator', 'pro', 'enterprise'] },
        },
        required: ['userId', 'tier'],
      },
    },
    {
      name: 'billing_get_quota',
      description: 'Get quota limits for a tier',
      inputSchema: {
        type: 'object',
        properties: {
          tier: { type: 'string', enum: ['free', 'creator', 'pro', 'enterprise'] },
        },
        required: ['tier'],
      },
    },
    {
      name: 'billing_check_quota',
      description: 'Check if a user can use more of a resource',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          resource: { type: 'string', enum: ['canvas_count', 'storage_mb', 'widgets_per_canvas', 'collaborators_per_canvas'] },
          currentUsage: { type: 'number', description: 'Current usage count' },
        },
        required: ['userId', 'resource', 'currentUsage'],
      },
    },
    {
      name: 'billing_connect_onboard',
      description: 'Simulate Stripe Connect onboarding for a creator',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId'],
      },
    },
    {
      name: 'billing_list_users',
      description: 'List all simulated users',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'billing_stats',
      description: 'Get billing simulation statistics',
      inputSchema: { type: 'object', properties: {} },
    },
    // Commerce Tools — Subscription Tiers
    {
      name: 'commerce_create_tier',
      description: 'Create a canvas subscription tier',
      inputSchema: {
        type: 'object',
        properties: {
          canvasId: { type: 'string', description: 'Canvas ID' },
          creatorId: { type: 'string', description: 'Creator user ID' },
          name: { type: 'string', description: 'Tier name (e.g., "Supporter", "VIP")' },
          priceCents: { type: 'number', description: 'Price in cents (e.g., 999 = $9.99)' },
          currency: { type: 'string', description: 'ISO 4217 currency (default: usd)' },
          interval: { type: 'string', enum: ['month', 'year'], description: 'Billing interval (default: month)' },
          description: { type: 'string' },
          benefits: { type: 'array', items: { type: 'string' }, description: 'List of benefit descriptions' },
        },
        required: ['canvasId', 'creatorId', 'name', 'priceCents'],
      },
    },
    {
      name: 'commerce_list_tiers',
      description: 'List subscription tiers, optionally filtered by canvas',
      inputSchema: {
        type: 'object',
        properties: {
          canvasId: { type: 'string', description: 'Filter by canvas ID' },
        },
      },
    },

    // Canvas Document Tools
    {
      name: 'document_get',
      description: 'Get the canvas document state (name, background, layout mode, viewport)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'document_set_name',
      description: 'Set the canvas document name',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Document name' },
        },
        required: ['name'],
      },
    },
    {
      name: 'document_set_background',
      description: 'Set the canvas background (solid color, gradient, or image)',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['solid', 'gradient', 'image'], description: 'Background type' },
          color: { type: 'string', description: 'CSS color for solid background' },
          opacity: { type: 'number', description: 'Opacity 0-1 (default 1)' },
          gradientType: { type: 'string', enum: ['linear', 'radial'], description: 'For gradient backgrounds' },
          stops: {
            type: 'array',
            items: { type: 'object', properties: { offset: { type: 'number' }, color: { type: 'string' } } },
            description: 'Gradient color stops',
          },
          angle: { type: 'number', description: 'Gradient angle in degrees (for linear)' },
          url: { type: 'string', description: 'Image URL (for image backgrounds)' },
          mode: { type: 'string', enum: ['cover', 'contain', 'tile'], description: 'Image display mode' },
        },
        required: ['type'],
      },
    },
    {
      name: 'document_set_layout_mode',
      description: 'Set the canvas layout mode',
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['freeform', 'bento', 'desktop', 'artboard'], description: 'Layout mode' },
        },
        required: ['mode'],
      },
    },
    {
      name: 'document_set_viewport_size',
      description: 'Set the canvas viewport dimensions (undefined = infinite)',
      inputSchema: {
        type: 'object',
        properties: {
          width: { type: 'number', description: 'Viewport width (or null for infinite)' },
          height: { type: 'number', description: 'Viewport height (or null for infinite)' },
        },
      },
    },
    {
      name: 'commerce_update_tier',
      description: 'Update a subscription tier',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          priceCents: { type: 'number' },
          description: { type: 'string' },
          benefits: { type: 'array', items: { type: 'string' } },
          isActive: { type: 'boolean' },
        },
        required: ['id'],
      },
    },
    {
      name: 'commerce_delete_tier',
      description: 'Delete a subscription tier',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    // Commerce Tools — Shop Items
    {
      name: 'commerce_create_item',
      description: 'Create a shop item on a canvas',
      inputSchema: {
        type: 'object',
        properties: {
          canvasId: { type: 'string' },
          creatorId: { type: 'string' },
          name: { type: 'string', description: 'Item name' },
          priceCents: { type: 'number', description: 'Price in cents' },
          itemType: { type: 'string', enum: ['digital', 'physical', 'service'] },
          fulfillment: { type: 'string', enum: ['auto', 'manual', 'shipping'] },
          currency: { type: 'string' },
          description: { type: 'string' },
          stockCount: { type: 'number', description: 'null for unlimited' },
          requiresShipping: { type: 'boolean' },
          shippingNote: { type: 'string' },
        },
        required: ['canvasId', 'creatorId', 'name', 'priceCents', 'itemType'],
      },
    },
    {
      name: 'commerce_list_items',
      description: 'List shop items, optionally filtered by canvas',
      inputSchema: {
        type: 'object',
        properties: {
          canvasId: { type: 'string' },
        },
      },
    },
    {
      name: 'commerce_update_item',
      description: 'Update a shop item',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          priceCents: { type: 'number' },
          description: { type: 'string' },
          stockCount: { type: 'number' },
          isActive: { type: 'boolean' },
        },
        required: ['id'],
      },
    },
    {
      name: 'commerce_delete_item',
      description: 'Delete a shop item',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    // Commerce Tools — Orders
    {
      name: 'commerce_buy',
      description: 'Simulate a purchase (subscription or shop item)',
      inputSchema: {
        type: 'object',
        properties: {
          buyerId: { type: 'string', description: 'Buyer user ID' },
          itemId: { type: 'string', description: 'Tier ID or Shop Item ID' },
          type: { type: 'string', enum: ['subscription', 'shop_item'] },
        },
        required: ['buyerId', 'itemId', 'type'],
      },
    },
    {
      name: 'commerce_list_orders',
      description: 'List orders, optionally filtered by buyer or seller',
      inputSchema: {
        type: 'object',
        properties: {
          buyerId: { type: 'string' },
          sellerId: { type: 'string' },
        },
      },
    },
    {
      name: 'commerce_fulfill_order',
      description: 'Mark an order as fulfilled',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    {
      name: 'commerce_stats',
      description: 'Get commerce statistics (tiers, items, orders, revenue)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'commerce_clear',
      description: 'Clear all commerce data (tiers, items, orders)',
      inputSchema: { type: 'object', properties: {} },
    },

    // ── Marketplace Tools (backed by cloud Supabase) ───────────────────
    {
      name: 'marketplace_publish',
      description: 'Publish a widget to the marketplace from HTML content + manifest',
      inputSchema: {
        type: 'object',
        properties: {
          authorId: { type: 'string', description: 'Author user ID' },
          htmlContent: { type: 'string', description: 'Widget HTML content (single-file HTML)' },
          manifest: {
            type: 'object',
            description: 'Widget manifest',
            properties: {
              id: { type: 'string', description: 'Widget identifier (alphanumeric, dashes, dots)' },
              name: { type: 'string', description: 'Widget display name (1-50 chars)' },
              version: { type: 'string', description: 'Semantic version (e.g. 1.0.0)' },
              description: { type: 'string' },
              author: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, url: { type: 'string' } } },
              license: { type: 'string', enum: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'proprietary', 'no-fork'] },
              tags: { type: 'array', items: { type: 'string' } },
              category: { type: 'string', enum: ['productivity', 'data', 'social', 'utilities', 'games', 'media', 'commerce', 'other'] },
              permissions: { type: 'array', items: { type: 'string' } },
              entry: { type: 'string' },
              spatialSupport: { type: 'boolean' },
            },
            required: ['id', 'name', 'version'],
          },
          isFree: { type: 'boolean', description: 'Whether widget is free (default: true)' },
          priceCents: { type: 'number', description: 'Price in cents for paid widgets' },
          currency: { type: 'string', description: 'ISO 4217 currency code (default: usd)' },
          thumbnailUrl: { type: 'string', description: 'Thumbnail URL for marketplace listing' },
          iconUrl: { type: 'string', description: 'Icon URL for marketplace listing' },
        },
        required: ['authorId', 'htmlContent', 'manifest'],
      },
    },
    {
      name: 'marketplace_list',
      description: 'List marketplace widgets with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter by category' },
          authorId: { type: 'string', description: 'Filter by author' },
          isPublished: { type: 'boolean', description: 'Filter by published status' },
          isDeprecated: { type: 'boolean', description: 'Filter by deprecated status' },
        },
      },
    },
    {
      name: 'marketplace_get',
      description: 'Get full marketplace widget details by ID (includes HTML content and manifest)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Widget ID' },
        },
        required: ['id'],
      },
    },
    {
      name: 'marketplace_get_by_slug',
      description: 'Get full marketplace widget details by slug',
      inputSchema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Widget slug' },
        },
        required: ['slug'],
      },
    },
    {
      name: 'marketplace_search',
      description: 'Search marketplace widgets (published, non-deprecated only)',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (matches name, description, tags)' },
          category: { type: 'string', description: 'Filter by category' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (OR match)' },
          sortBy: { type: 'string', enum: ['rating', 'installs', 'newest'], description: 'Sort order' },
          page: { type: 'number', description: 'Page number (default: 1)' },
          pageSize: { type: 'number', description: 'Page size (default: 20)' },
        },
      },
    },
    {
      name: 'marketplace_update',
      description: 'Update a marketplace widget with new HTML + manifest (creates a new version)',
      inputSchema: {
        type: 'object',
        properties: {
          widgetId: { type: 'string', description: 'Widget ID to update' },
          htmlContent: { type: 'string', description: 'Updated widget HTML content' },
          manifest: {
            type: 'object',
            description: 'Updated widget manifest',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              version: { type: 'string' },
              description: { type: 'string' },
              license: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              category: { type: 'string' },
              permissions: { type: 'array', items: { type: 'string' } },
            },
            required: ['id', 'name', 'version'],
          },
          changelog: { type: 'string', description: 'Changelog entry for this version' },
        },
        required: ['widgetId', 'htmlContent', 'manifest'],
      },
    },
    {
      name: 'marketplace_deprecate',
      description: 'Deprecate a marketplace widget (hide from discovery, existing installs still work)',
      inputSchema: {
        type: 'object',
        properties: {
          widgetId: { type: 'string', description: 'Widget ID to deprecate' },
        },
        required: ['widgetId'],
      },
    },
    {
      name: 'marketplace_delete',
      description: 'Delete a marketplace widget permanently',
      inputSchema: {
        type: 'object',
        properties: {
          widgetId: { type: 'string', description: 'Widget ID to delete' },
        },
        required: ['widgetId'],
      },
    },
    {
      name: 'marketplace_install',
      description: 'Install a marketplace widget for a user. Returns the widget HTML and manifest.',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID' },
          widgetId: { type: 'string', description: 'Widget ID to install' },
        },
        required: ['userId', 'widgetId'],
      },
    },
    {
      name: 'marketplace_uninstall',
      description: 'Uninstall a marketplace widget for a user',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID' },
          widgetId: { type: 'string', description: 'Widget ID to uninstall' },
        },
        required: ['userId', 'widgetId'],
      },
    },
    {
      name: 'marketplace_get_installed',
      description: 'Get all installed marketplace widgets for a user',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID' },
        },
        required: ['userId'],
      },
    },
    {
      name: 'marketplace_version_history',
      description: 'Get version history for a marketplace widget',
      inputSchema: {
        type: 'object',
        properties: {
          widgetId: { type: 'string', description: 'Widget ID' },
        },
        required: ['widgetId'],
      },
    },
    {
      name: 'marketplace_stats',
      description: 'Get marketplace statistics (total widgets, published, deprecated, installations)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'marketplace_clear',
      description: 'Clear all marketplace data — DISABLED when connected to cloud Supabase',
      inputSchema: { type: 'object', properties: {} },
    },

    // ── Universal Test Canvas ──────────────────────────────────────────
    {
      name: 'canvas_setup_commerce',
      description: 'Set up a universal test canvas with all commerce widgets placed. Creates creator, onboards, creates tiers/items, places all 7 commerce widgets on canvas in a grid layout.',
      inputSchema: {
        type: 'object',
        properties: {
          canvasId: { type: 'string', description: 'Canvas ID (default: "test-commerce-canvas")' },
          creatorEmail: { type: 'string', description: 'Creator email (default: "creator@test.canvas")' },
        },
      },
    },
    {
      name: 'document_set_platform',
      description: 'Set the target platform for the canvas',
      inputSchema: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['web', 'mobile', 'desktop'] },
        },
        required: ['platform'],
      },
    },
    {
      name: 'document_set_spatial_mode',
      description: 'Set the spatial visualization mode',
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['2d', '3d', 'vr'] },
        },
        required: ['mode'],
      },
    },

    // History/Undo-Redo Tools
    {
      name: 'history_undo',
      description: 'Undo the last action',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'history_redo',
      description: 'Redo the last undone action',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'history_get_stack',
      description: 'Get the current undo/redo stack status',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'history_clear',
      description: 'Clear the history stack',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'history_push',
      description: 'Push an action to the history stack (for undoable operations)',
      inputSchema: {
        type: 'object',
        properties: {
          eventType: { type: 'string', description: 'Event type that was performed' },
          payload: { type: 'object', description: 'Event payload' },
          inverseEventType: { type: 'string', description: 'Event type to emit on undo' },
          inversePayload: { type: 'object', description: 'Payload for undo event' },
        },
        required: ['eventType', 'payload'],
      },
    },

    // UI State Tools
    {
      name: 'ui_get',
      description: 'Get the current UI state (interaction mode, theme, sidebars, etc.)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'ui_set_interaction_mode',
      description: 'Set the canvas interaction mode (edit or preview)',
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['edit', 'preview'] },
        },
        required: ['mode'],
      },
    },
    {
      name: 'ui_set_chrome_mode',
      description: 'Set the UI chrome mode (editor = full UI, clean = minimal)',
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['editor', 'clean'] },
        },
        required: ['mode'],
      },
    },
    {
      name: 'ui_set_tool',
      description: 'Set the active tool',
      inputSchema: {
        type: 'object',
        properties: {
          tool: { type: 'string', description: 'Tool name (select, pen, text, shape, sticker, widget, etc.)' },
        },
        required: ['tool'],
      },
    },
    {
      name: 'ui_set_theme',
      description: 'Set the UI theme',
      inputSchema: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['light', 'dark', 'high-contrast'] },
        },
        required: ['theme'],
      },
    },
    {
      name: 'ui_toggle_sidebar',
      description: 'Toggle a sidebar',
      inputSchema: {
        type: 'object',
        properties: {
          side: { type: 'string', enum: ['left', 'right'] },
        },
        required: ['side'],
      },
    },
    {
      name: 'ui_set_3d_mode',
      description: 'Enable or disable 3D mode',
      inputSchema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
        },
        required: ['enabled'],
      },
    },
    {
      name: 'ui_set_panel',
      description: 'Set a panel open/closed state',
      inputSchema: {
        type: 'object',
        properties: {
          panelId: { type: 'string', description: 'Panel identifier' },
          open: { type: 'boolean' },
        },
        required: ['panelId', 'open'],
      },
    },

    // Docker Tools
    {
      name: 'docker_create',
      description: 'Create a new docker container (floating panel)',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Docker name' },
          dockMode: { type: 'string', enum: ['floating', 'docked-left', 'docked-right'] },
          x: { type: 'number', description: 'X position (for floating)' },
          y: { type: 'number', description: 'Y position (for floating)' },
          width: { type: 'number', description: 'Width' },
          height: { type: 'number', description: 'Height' },
          visible: { type: 'boolean' },
          pinned: { type: 'boolean' },
        },
        required: ['width', 'height'],
      },
    },
    {
      name: 'docker_get',
      description: 'Get a docker by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'docker_update',
      description: 'Update docker properties',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          dockMode: { type: 'string', enum: ['floating', 'docked-left', 'docked-right'] },
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
          visible: { type: 'boolean' },
          pinned: { type: 'boolean' },
          activeTabIndex: { type: 'number' },
        },
        required: ['id'],
      },
    },
    {
      name: 'docker_remove',
      description: 'Remove a docker',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'docker_list',
      description: 'List all dockers',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'docker_add_tab',
      description: 'Add a tab to a docker',
      inputSchema: {
        type: 'object',
        properties: {
          dockerId: { type: 'string' },
          name: { type: 'string', description: 'Tab name (optional)' },
        },
        required: ['dockerId'],
      },
    },
    {
      name: 'docker_remove_tab',
      description: 'Remove a tab from a docker',
      inputSchema: {
        type: 'object',
        properties: {
          dockerId: { type: 'string' },
          tabIndex: { type: 'number' },
        },
        required: ['dockerId', 'tabIndex'],
      },
    },
    {
      name: 'docker_add_widget',
      description: 'Add a widget instance to a docker tab',
      inputSchema: {
        type: 'object',
        properties: {
          dockerId: { type: 'string' },
          tabIndex: { type: 'number' },
          widgetInstanceId: { type: 'string' },
          height: { type: 'number', description: 'Fixed height (optional, auto if not set)' },
        },
        required: ['dockerId', 'tabIndex', 'widgetInstanceId'],
      },
    },
    {
      name: 'docker_remove_widget',
      description: 'Remove a widget instance from a docker tab',
      inputSchema: {
        type: 'object',
        properties: {
          dockerId: { type: 'string' },
          tabIndex: { type: 'number' },
          widgetInstanceId: { type: 'string' },
        },
        required: ['dockerId', 'tabIndex', 'widgetInstanceId'],
      },
    },
    {
      name: 'docker_bring_to_front',
      description: 'Bring a docker to the front (z-order)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },

    // =========================================================================
    // Social Testing Tools (multiuser simulation)
    // =========================================================================
    {
      name: 'user_create',
      description: 'Create a test user for multiuser testing',
      inputSchema: {
        type: 'object',
        properties: {
          displayName: { type: 'string', description: 'User display name' },
          email: { type: 'string', description: 'User email (optional, auto-generated if not provided)' },
          role: { type: 'string', enum: ['owner', 'editor', 'commenter', 'viewer'], description: 'User role (default: editor)' },
          avatar: { type: 'string', description: 'Avatar URL (optional)' },
        },
        required: ['displayName'],
      },
    },
    {
      name: 'user_get',
      description: 'Get a test user by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'user_update',
      description: 'Update a test user',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          displayName: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['owner', 'editor', 'commenter', 'viewer'] },
          color: { type: 'string', description: 'Hex color for user cursor/presence' },
        },
        required: ['id'],
      },
    },
    {
      name: 'user_remove',
      description: 'Remove a test user',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'user_list',
      description: 'List all test users',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'presence_join',
      description: 'Simulate a user joining the canvas (goes online)',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          canvasId: { type: 'string', description: 'Optional canvas ID to join' },
        },
        required: ['userId'],
      },
    },
    {
      name: 'presence_leave',
      description: 'Simulate a user leaving the canvas (goes offline)',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId'],
      },
    },
    {
      name: 'presence_get',
      description: 'Get current presence state (online users, cursors)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'cursor_update',
      description: 'Update a user cursor position (simulates cursor movement)',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          x: { type: 'number', description: 'X position in canvas space' },
          y: { type: 'number', description: 'Y position in canvas space' },
        },
        required: ['userId', 'x', 'y'],
      },
    },
    {
      name: 'cursor_simulate_path',
      description: 'Simulate cursor movement along a path (for testing real-time cursor updates)',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
              },
              required: ['x', 'y'],
            },
            description: 'Array of points to move cursor through',
          },
          intervalMs: { type: 'number', description: 'Interval between points in ms (default: 50)' },
        },
        required: ['userId', 'points'],
      },
    },
    {
      name: 'social_simulate_edit',
      description: 'Simulate a remote user editing an entity (tests conflict resolution)',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User performing the edit' },
          entityId: { type: 'string', description: 'Entity being edited' },
          changes: { type: 'object', description: 'Changes to apply (position, size, style, etc.)' },
        },
        required: ['userId', 'entityId', 'changes'],
      },
    },
    ...ARTIFACT_TOOL_DEFS,
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = args ?? {};

  // Route artifact tools to their dedicated handler
  if (isArtifactTool(name)) {
    return handleArtifactTool(name, a, { scene, viewport, widgets, ui });
  }

  try {
    switch (name) {
      // Event Bus
      case 'bus_emit': {
        const event = bus.emit(a.type as string, a.payload ?? {}, a.spatial as SpatialContext | undefined);
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
        const passed = result.avgLatencyUs < 1000;
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ...result,
              targetLatencyUs: 1000,
              passed,
              note: passed ? 'PASS: <1ms latency contract met' : 'FAIL: exceeds 1ms latency target',
            }, null, 2),
          }],
        };
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
          type: a.type as CanvasEntityType,
          name: a.name as string | undefined,
          transform: {
            position: { x: (a.x as number) ?? 0, y: (a.y as number) ?? 0 },
            size: { width: (a.width as number) ?? 100, height: (a.height as number) ?? 100 },
            rotation: (a.rotation as number) ?? 0,
            scale: 1,
          },
          opacity: (a.opacity as number) ?? 1,
          visible: (a.visible as boolean) ?? true,
          locked: (a.locked as boolean) ?? false,
          parentId: a.parentId as string | undefined,
          assetUrl: a.assetUrl as string | undefined,
          content: a.content as string | undefined,
          children: a.children as string[] | undefined,
          widgetId: a.widgetId as string | undefined,
          config: a.config as Record<string, unknown> | undefined,
        });
        bus.emit(CanvasEvents.ENTITY_CREATED, { entity });
        return { content: [{ type: 'text', text: JSON.stringify(entity, null, 2) }] };
      }
      case 'canvas_get_entity': {
        const entity = scene.getEntity(a.id as string);
        return { content: [{ type: 'text', text: entity ? JSON.stringify(entity, null, 2) : 'Entity not found' }] };
      }
      case 'canvas_update_entity': {
        const entity = scene.getEntity(a.id as string);
        if (!entity) return { content: [{ type: 'text', text: 'Entity not found' }] };

        const updates: Partial<CanvasEntity> = {};
        if (a.x !== undefined || a.y !== undefined || a.width !== undefined || a.height !== undefined || a.rotation !== undefined) {
          updates.transform = { ...entity.transform };
          if (a.x !== undefined) updates.transform.position.x = a.x as number;
          if (a.y !== undefined) updates.transform.position.y = a.y as number;
          if (a.width !== undefined) updates.transform.size.width = a.width as number;
          if (a.height !== undefined) updates.transform.size.height = a.height as number;
          if (a.rotation !== undefined) updates.transform.rotation = a.rotation as number;
        }
        if (a.opacity !== undefined) updates.opacity = a.opacity as number;
        if (a.visible !== undefined) updates.visible = a.visible as boolean;
        if (a.locked !== undefined) updates.locked = a.locked as boolean;
        if (a.flipH !== undefined) updates.flipH = a.flipH as boolean;
        if (a.flipV !== undefined) updates.flipV = a.flipV as boolean;
        if (a.name !== undefined) updates.name = a.name as string;

        const updated = scene.updateEntity(a.id as string, updates);
        bus.emit(CanvasEvents.ENTITY_UPDATED, { entityId: a.id, updates });
        return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
      }
      case 'canvas_remove_entity': {
        const removed = scene.removeEntity(a.id as string);
        if (removed) {
          bus.emit(CanvasEvents.ENTITY_DELETED, { entityId: a.id });
          selection.removeFromSelection(a.id as string);
        }
        return { content: [{ type: 'text', text: removed ? 'Entity removed' : 'Entity not found' }] };
      }
      case 'canvas_list_entities': {
        const entities = a.type
          ? scene.getEntitiesByType(a.type as CanvasEntityType)
          : scene.getAllEntities();
        return { content: [{ type: 'text', text: JSON.stringify(entities, null, 2) }] };
      }
      case 'canvas_hit_test': {
        const hits = scene.hitTest({ x: a.x as number, y: a.y as number });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(hits.map(e => ({
              id: e.id,
              type: e.type,
              name: e.name,
              zIndex: e.zIndex,
            })), null, 2),
          }],
        };
      }
      case 'canvas_region_select': {
        const entities = scene.regionSelect({
          x: a.x as number,
          y: a.y as number,
          width: a.width as number,
          height: a.height as number,
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(entities.map(e => ({
              id: e.id,
              type: e.type,
              name: e.name,
            })), null, 2),
          }],
        };
      }
      case 'canvas_reorder': {
        const action = a.action as string;
        const success = action === 'bringToFront'
          ? scene.bringToFront(a.id as string)
          : scene.sendToBack(a.id as string);
        if (success) bus.emit('canvas.entity.reordered', { entityId: a.id, action });
        return { content: [{ type: 'text', text: success ? 'Reordered' : 'Entity not found' }] };
      }
      case 'canvas_group': {
        const group = scene.createGroup(a.entityIds as string[], a.groupId as string | undefined);
        if (group) {
          bus.emit(CanvasEvents.ENTITY_GROUPED, { groupId: group.id, childIds: group.children });
        }
        return { content: [{ type: 'text', text: group ? JSON.stringify(group, null, 2) : 'Failed to create group (need at least 2 valid entities)' }] };
      }
      case 'canvas_ungroup': {
        const childIds = scene.ungroup(a.groupId as string);
        if (childIds.length > 0) {
          bus.emit(CanvasEvents.ENTITY_UNGROUPED, { groupId: a.groupId, childIds });
        }
        return { content: [{ type: 'text', text: childIds.length > 0 ? `Ungrouped: ${childIds.join(', ')}` : 'Group not found' }] };
      }
      case 'canvas_stats': {
        return { content: [{ type: 'text', text: JSON.stringify(scene.stats(), null, 2) }] };
      }
      case 'canvas_clear': {
        scene.clear();
        selection.clearSelection();
        bus.emit('canvas.cleared', {});
        return { content: [{ type: 'text', text: 'Canvas cleared' }] };
      }

      // Selection
      case 'selection_select': {
        const ids = selection.select(a.ids as string | string[]);
        bus.emit(CanvasEvents.ENTITY_SELECTED, { entityIds: ids });
        return { content: [{ type: 'text', text: JSON.stringify({ selected: ids }, null, 2) }] };
      }
      case 'selection_add': {
        const ids = selection.addToSelection(a.ids as string | string[]);
        return { content: [{ type: 'text', text: JSON.stringify({ selected: ids }, null, 2) }] };
      }
      case 'selection_remove': {
        const ids = selection.removeFromSelection(a.ids as string | string[]);
        return { content: [{ type: 'text', text: JSON.stringify({ selected: ids }, null, 2) }] };
      }
      case 'selection_toggle': {
        const ids = selection.toggleSelection(a.id as string);
        return { content: [{ type: 'text', text: JSON.stringify({ selected: ids }, null, 2) }] };
      }
      case 'selection_clear': {
        selection.clearSelection();
        bus.emit(CanvasEvents.SELECTION_CLEARED, {});
        return { content: [{ type: 'text', text: 'Selection cleared' }] };
      }
      case 'selection_get': {
        return { content: [{ type: 'text', text: JSON.stringify({ selected: selection.getSelected() }, null, 2) }] };
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
        const center = (a.centerX !== undefined && a.centerY !== undefined)
          ? { x: a.centerX as number, y: a.centerY as number }
          : undefined;
        const state = viewport.zoom(a.level as number, center);
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
        bus.emit(WidgetEvents.MOUNTED, { instanceId: instance.id, widgetId: instance.widgetId });
        return { content: [{ type: 'text', text: JSON.stringify(instance, null, 2) }] };
      }
      case 'widget_set_state': {
        const success = widgets.setState(a.instanceId as string, a.key as string, a.value);
        if (success) bus.emit(WidgetEvents.STATE_CHANGED, { instanceId: a.instanceId, key: a.key });
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
        if (removed) bus.emit(WidgetEvents.UNMOUNTED, { instanceId: a.instanceId });
        return { content: [{ type: 'text', text: removed ? 'Widget removed' : 'Instance not found' }] };
      }

      // Billing & Quota
      case 'billing_create_user': {
        const user = billing.createUser(a.email as string, (a.tier as UserTier) ?? 'free');
        bus.emit('billing.user.created', { userId: user.id, tier: user.tier });
        return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
      }
      case 'billing_get_user': {
        const user = billing.getUser(a.userId as string);
        return { content: [{ type: 'text', text: user ? JSON.stringify(user, null, 2) : 'User not found' }] };
      }
      case 'billing_set_tier': {
        const user = billing.setTier(a.userId as string, a.tier as UserTier);
        if (user) bus.emit('billing.tier.changed', { userId: user.id, tier: user.tier });
        return { content: [{ type: 'text', text: user ? JSON.stringify(user, null, 2) : 'User not found' }] };
      }
      case 'billing_get_quota': {
        const quota = billing.getQuota(a.tier as UserTier);
        return { content: [{ type: 'text', text: JSON.stringify(quota, null, 2) }] };
      }
      case 'billing_check_quota': {
        const result = billing.checkQuota(a.userId as string, a.resource as string, a.currentUsage as number);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'billing_connect_onboard': {
        const result = billing.connectOnboard(a.userId as string);
        if (result) bus.emit('billing.connect.onboarded', { userId: a.userId });
        return { content: [{ type: 'text', text: result ? JSON.stringify(result, null, 2) : 'User not found or tier cannot sell' }] };
      }
      case 'billing_list_users': {
        return { content: [{ type: 'text', text: JSON.stringify(billing.listUsers(), null, 2) }] };
      }
      case 'billing_stats': {
        return { content: [{ type: 'text', text: JSON.stringify(billing.stats(), null, 2) }] };
      }

      // Commerce — Tiers
      case 'commerce_create_tier': {
        const tier = commerce.createTier(a.canvasId as string, a.creatorId as string, {
          name: a.name as string,
          priceCents: a.priceCents as number,
          currency: a.currency as string | undefined,
          interval: a.interval as string | undefined,
          description: a.description as string | undefined,
          benefits: a.benefits as string[] | undefined,
        });
        bus.emit('commerce.tier.created', { tierId: tier.id, canvasId: tier.canvasId });
        return { content: [{ type: 'text', text: JSON.stringify(tier, null, 2) }] };
      }
      case 'commerce_list_tiers': {
        return { content: [{ type: 'text', text: JSON.stringify(commerce.listTiers(a.canvasId as string | undefined), null, 2) }] };
      }
      case 'commerce_update_tier': {
        const tier = commerce.updateTier(a.id as string, {
          name: a.name as string | undefined,
          priceCents: a.priceCents as number | undefined,
          description: a.description as string | undefined,
          benefits: a.benefits as string[] | undefined,
          isActive: a.isActive as boolean | undefined,
        });
        if (tier) bus.emit('commerce.tier.updated', { tierId: tier.id });
        return { content: [{ type: 'text', text: tier ? JSON.stringify(tier, null, 2) : 'Tier not found' }] };
      }
      case 'commerce_delete_tier': {
        const ok = commerce.deleteTier(a.id as string);
        if (ok) bus.emit('commerce.tier.deleted', { tierId: a.id });
        return { content: [{ type: 'text', text: ok ? 'Tier deleted' : 'Tier not found' }] };
      }

      // Commerce — Shop Items
      case 'commerce_create_item': {
        const item = commerce.createItem(a.canvasId as string, a.creatorId as string, {
          name: a.name as string,
          priceCents: a.priceCents as number,
          itemType: a.itemType as ShopItem['itemType'],
          fulfillment: a.fulfillment as ShopItem['fulfillment'] | undefined,
          currency: a.currency as string | undefined,
          description: a.description as string | undefined,
          stockCount: a.stockCount as number | undefined,
          requiresShipping: a.requiresShipping as boolean | undefined,
          shippingNote: a.shippingNote as string | undefined,
        });
        bus.emit('commerce.item.created', { itemId: item.id, canvasId: item.canvasId });
        return { content: [{ type: 'text', text: JSON.stringify(item, null, 2) }] };
      }
      case 'commerce_list_items': {
        return { content: [{ type: 'text', text: JSON.stringify(commerce.listItems(a.canvasId as string | undefined), null, 2) }] };
      }
      case 'commerce_update_item': {
        const item = commerce.updateItem(a.id as string, {
          name: a.name as string | undefined,
          priceCents: a.priceCents as number | undefined,
          description: a.description as string | undefined,
          stockCount: a.stockCount as number | undefined,
          isActive: a.isActive as boolean | undefined,
        });
        if (item) bus.emit('commerce.item.updated', { itemId: item.id });
        return { content: [{ type: 'text', text: item ? JSON.stringify(item, null, 2) : 'Item not found' }] };
      }
      case 'commerce_delete_item': {
        const ok = commerce.deleteItem(a.id as string);
        if (ok) bus.emit('commerce.item.deleted', { itemId: a.id });
        return { content: [{ type: 'text', text: ok ? 'Item deleted' : 'Item not found' }] };
      }

      // Commerce — Orders
      case 'commerce_buy': {
        const user = billing.getUser(a.buyerId as string);
        const sellerId = a.type === 'subscription'
          ? commerce.getTier(a.itemId as string)?.creatorId
          : commerce.getItem(a.itemId as string)?.creatorId;
        const seller = sellerId ? billing.getUser(sellerId) : null;
        const feePct = seller ? billing.getQuota(seller.tier).applicationFeePct : 12;
        const order = commerce.createOrder(a.buyerId as string, a.itemId as string, a.type as Order['type'], feePct);
        if (order) {
          bus.emit('commerce.order.created', { orderId: order.id, buyerId: order.buyerId, sellerId: order.sellerId });
          bus.emit('marketplace.widget.purchased', { orderId: order.id, type: order.type });
        }
        return { content: [{ type: 'text', text: order ? JSON.stringify(order, null, 2) : 'Item or tier not found' }] };
      }
      case 'commerce_list_orders': {
        const orders = commerce.listOrders({ buyerId: a.buyerId as string | undefined, sellerId: a.sellerId as string | undefined });
        return { content: [{ type: 'text', text: JSON.stringify(orders, null, 2) }] };
      }
      case 'commerce_fulfill_order': {
        const order = commerce.fulfillOrder(a.id as string);
        if (order) bus.emit('commerce.order.fulfilled', { orderId: order.id });
        return { content: [{ type: 'text', text: order ? JSON.stringify(order, null, 2) : 'Order not found' }] };
      }
      case 'commerce_stats': {
        return { content: [{ type: 'text', text: JSON.stringify(commerce.stats(), null, 2) }] };
      }
      case 'commerce_clear': {
        commerce.clear();
        bus.emit('commerce.cleared', {});
        return { content: [{ type: 'text', text: 'Commerce data cleared' }] };
      }

      // ── Marketplace (cloud Supabase) ─────────────────────────────────
      case 'marketplace_publish': {
        try {
          const result = await marketplaceDb.publish(
            a.authorId as string,
            a.htmlContent as string,
            a.manifest as Record<string, unknown>,
            { thumbnailUrl: a.thumbnailUrl as string, iconUrl: a.iconUrl as string, isFree: a.isFree as boolean, priceCents: a.priceCents as number, currency: a.currency as string },
          );
          bus.emit('marketplace.widget.published', { widgetId: result.id, authorId: result.authorId, slug: result.slug });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_list': {
        try {
          const items = await marketplaceDb.list({
            category: a.category as string,
            authorId: a.authorId as string,
            isPublished: a.isPublished as boolean,
            isDeprecated: a.isDeprecated as boolean,
          });
          return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_get': {
        try {
          const widget = await marketplaceDb.getWidget(a.id as string);
          return { content: [{ type: 'text', text: widget ? JSON.stringify(widget, null, 2) : 'Widget not found' }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_get_by_slug': {
        try {
          const widget = await marketplaceDb.getWidgetBySlug(a.slug as string);
          return { content: [{ type: 'text', text: widget ? JSON.stringify(widget, null, 2) : 'Widget not found' }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_search': {
        try {
          const results = await marketplaceDb.search({
            query: a.query as string,
            category: a.category as string,
            tags: a.tags as string[],
            sortBy: a.sortBy as string,
            page: a.page as number,
            pageSize: a.pageSize as number,
          });
          return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_update': {
        try {
          const updated = await marketplaceDb.updateWidget(
            a.widgetId as string,
            a.htmlContent as string,
            a.manifest as Record<string, unknown>,
            a.changelog as string,
          );
          if (updated) {
            bus.emit('marketplace.widget.updated', { widgetId: updated.id, version: updated.version });
          }
          return { content: [{ type: 'text', text: updated ? JSON.stringify(updated, null, 2) : 'Widget not found or invalid manifest' }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_deprecate': {
        try {
          await marketplaceDb.deprecateWidget(a.widgetId as string);
          bus.emit('marketplace.widget.deprecated', { widgetId: a.widgetId });
          return { content: [{ type: 'text', text: 'Widget deprecated' }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_delete': {
        try {
          await marketplaceDb.deleteWidget(a.widgetId as string);
          bus.emit('marketplace.widget.deleted', { widgetId: a.widgetId });
          return { content: [{ type: 'text', text: 'Widget deleted' }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_install': {
        try {
          const result = await marketplaceDb.install(a.userId as string, a.widgetId as string);
          if (result) {
            bus.emit('marketplace.widget.installed', { userId: a.userId, widgetId: a.widgetId });
          }
          return { content: [{ type: 'text', text: result ? JSON.stringify(result, null, 2) : 'Widget not found or not published' }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_uninstall': {
        try {
          await marketplaceDb.uninstall(a.userId as string, a.widgetId as string);
          bus.emit('marketplace.widget.uninstalled', { userId: a.userId, widgetId: a.widgetId });
          return { content: [{ type: 'text', text: 'Widget uninstalled' }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_get_installed': {
        try {
          const installed = await marketplaceDb.getInstalledWidgets(a.userId as string);
          return { content: [{ type: 'text', text: JSON.stringify(installed, null, 2) }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_version_history': {
        try {
          const versions = await marketplaceDb.getVersionHistory(a.widgetId as string);
          return { content: [{ type: 'text', text: JSON.stringify(versions, null, 2) }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_stats': {
        try {
          const s = await marketplaceDb.stats();
          return { content: [{ type: 'text', text: JSON.stringify(s, null, 2) }] };
        } catch (err) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }], isError: true };
        }
      }
      case 'marketplace_clear': {
        return { content: [{ type: 'text', text: 'marketplace_clear is disabled when connected to cloud Supabase. Use marketplace_delete to remove individual widgets.' }] };
      }

      // ── Universal Test Canvas ────────────────────────────────────────
      case 'canvas_setup_commerce': {
        const canvasId = (a.canvasId as string) || 'test-commerce-canvas';
        const creatorEmail = (a.creatorEmail as string) || 'creator@test.canvas';

        // 1. Create creator user and onboard
        const creator = billing.createUser(creatorEmail, 'creator');
        billing.connectOnboard(creator.id);
        bus.emit('commerce.setup.creator', { userId: creator.id, email: creatorEmail });

        // 2. Create sample tiers
        const freeTier = commerce.createTier(canvasId, creator.id, {
          name: 'Free Follower',
          priceCents: 0,
          currency: 'usd',
          interval: 'month',
          description: 'Follow along for free!',
          benefits: ['Community chat access', 'Monthly newsletter', 'Early previews'],
        });
        const proTier = commerce.createTier(canvasId, creator.id, {
          name: 'Pro Supporter',
          priceCents: 999,
          currency: 'usd',
          interval: 'month',
          description: 'Get exclusive content and perks',
          benefits: ['All Free benefits', 'Exclusive sticker drops', 'Priority support', 'Behind-the-scenes'],
        });
        bus.emit('commerce.setup.tiers', { count: 2, canvasId });

        // 3. Create sample shop items
        const stickerPack = commerce.createItem(canvasId, creator.id, {
          name: 'Cute Cat Sticker Pack',
          priceCents: 0,
          itemType: 'digital',
          fulfillment: 'auto',
          currency: 'usd',
          description: 'A free starter pack of 5 adorable cat stickers',
          stockCount: 100,
          requiresShipping: false,
        });
        const artPrint = commerce.createItem(canvasId, creator.id, {
          name: 'Signed Art Print',
          priceCents: 2500,
          itemType: 'physical',
          fulfillment: 'manual',
          currency: 'usd',
          description: 'A hand-signed 8x10 art print shipped to your door',
          stockCount: 25,
          requiresShipping: true,
        });
        bus.emit('commerce.setup.items', { count: 2, canvasId });

        // 4. Place all 7 commerce widgets on the canvas in a grid layout
        const widgets = [
          { id: 'w-signup',        widgetId: 'sn.builtin.signup',        name: 'Sign Up',        x: 0,   y: 0,   w: 360, h: 400 },
          { id: 'w-creator-setup', widgetId: 'sn.builtin.creator-setup', name: 'Creator Setup',  x: 400, y: 0,   w: 440, h: 560 },
          { id: 'w-tier-manager',  widgetId: 'sn.builtin.tier-manager',  name: 'Tier Manager',   x: 880, y: 0,   w: 440, h: 600 },
          { id: 'w-item-manager',  widgetId: 'sn.builtin.item-manager',  name: 'Item Manager',   x: 0,   y: 440, w: 440, h: 600 },
          { id: 'w-subscribe',     widgetId: 'sn.builtin.subscribe',     name: 'Subscribe',      x: 480, y: 600, w: 360, h: 500 },
          { id: 'w-shop',          widgetId: 'sn.builtin.shop',          name: 'Shop',           x: 880, y: 640, w: 480, h: 500 },
          { id: 'w-orders',        widgetId: 'sn.builtin.orders',        name: 'My Orders',      x: 0,   y: 1080,w: 420, h: 500 },
        ];

        const placedWidgets = widgets.map(w => {
          const entity = scene.addEntity({
            id: w.id,
            type: 'widget',
            name: w.name,
            transform: {
              position: { x: w.x, y: w.y },
              size: { width: w.w, height: w.h },
              rotation: 0,
              scale: 1,
            },
            visible: true,
            locked: false,
            metadata: { widgetId: w.widgetId, canvasId },
          });
          bus.emit('canvas.widget.placed', { entityId: entity.id, widgetId: w.widgetId });
          return { entityId: entity.id, widgetId: w.widgetId, name: w.name, position: { x: w.x, y: w.y } };
        });

        bus.emit('commerce.setup.complete', { canvasId, widgetCount: widgets.length });

        const result = {
          canvasId,
          creator: { id: creator.id, email: creatorEmail, chargesEnabled: true },
          tiers: [
            { id: freeTier.id, name: freeTier.name, priceCents: freeTier.priceCents },
            { id: proTier.id, name: proTier.name, priceCents: proTier.priceCents },
          ],
          items: [
            { id: stickerPack.id, name: stickerPack.name, priceCents: stickerPack.priceCents, type: stickerPack.itemType },
            { id: artPrint.id, name: artPrint.name, priceCents: artPrint.priceCents, type: artPrint.itemType },
          ],
          widgets: placedWidgets,
          summary: `Canvas "${canvasId}" set up with 7 commerce widgets, 2 tiers (free + $9.99/mo), and 2 items (free digital + $25 physical).`,
        };

        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      // =========================================================================
      // Canvas Document Tools
      // =========================================================================
      case 'document_get': {
        return { content: [{ type: 'text', text: JSON.stringify(canvasDoc.getState(), null, 2) }] };
      }
      case 'document_set_name': {
        const state = canvasDoc.setName(a.name as string);
        bus.emit(CanvasEvents.DOCUMENT_UPDATED, { field: 'name', value: a.name });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'document_set_background': {
        const bgSpec = a.background as unknown as BackgroundSpec;
        const state = canvasDoc.setBackground(bgSpec);
        bus.emit(CanvasEvents.DOCUMENT_UPDATED, { field: 'background', value: bgSpec });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'document_set_layout_mode': {
        const state = canvasDoc.setLayoutMode(a.mode as LayoutMode);
        bus.emit(CanvasEvents.DOCUMENT_UPDATED, { field: 'layoutMode', value: a.mode });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'document_set_viewport_size': {
        const state = canvasDoc.setViewportSize(a.width as number | undefined, a.height as number | undefined);
        bus.emit(CanvasEvents.DOCUMENT_UPDATED, { field: 'viewportSize', value: { width: a.width, height: a.height } });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'document_set_platform': {
        const state = canvasDoc.setPlatform(a.platform as CanvasPlatform);
        bus.emit(CanvasEvents.DOCUMENT_UPDATED, { field: 'platform', value: a.platform });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'document_set_spatial_mode': {
        const state = canvasDoc.setSpatialMode(a.mode as SpatialMode);
        bus.emit(CanvasEvents.DOCUMENT_UPDATED, { field: 'spatialMode', value: a.mode });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }

      // =========================================================================
      // History / Undo-Redo Tools
      // =========================================================================
      case 'history_undo': {
        const entry = history.undo();
        if (entry) {
          bus.emit(CanvasEvents.HISTORY_UNDO, { entry });
          return { content: [{ type: 'text', text: JSON.stringify({ undone: entry, canUndo: history.canUndo(), canRedo: history.canRedo() }, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'Nothing to undo' }] };
      }
      case 'history_redo': {
        const entry = history.redo();
        if (entry) {
          bus.emit(CanvasEvents.HISTORY_REDO, { entry });
          return { content: [{ type: 'text', text: JSON.stringify({ redone: entry, canUndo: history.canUndo(), canRedo: history.canRedo() }, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'Nothing to redo' }] };
      }
      case 'history_get_stack': {
        const stack = history.getStack();
        return { content: [{ type: 'text', text: JSON.stringify(stack, null, 2) }] };
      }
      case 'history_clear': {
        history.clear();
        bus.emit(CanvasEvents.HISTORY_CLEARED, {});
        return { content: [{ type: 'text', text: 'History cleared' }] };
      }
      case 'history_push': {
        const event = bus.emit(a.eventType as string, a.payload as Record<string, unknown>);
        const inverseEvent = a.inversePayload
          ? bus.emit(a.eventType as string, a.inversePayload as Record<string, unknown>)
          : null;
        const entry: HistoryEntry = {
          event,
          inverseEvent,
          timestamp: Date.now(),
        };
        history.push(entry);
        bus.emit(CanvasEvents.HISTORY_PUSHED, { entry });
        return { content: [{ type: 'text', text: JSON.stringify({ pushed: entry, canUndo: history.canUndo() }, null, 2) }] };
      }

      // =========================================================================
      // UI State Tools
      // =========================================================================
      case 'ui_get': {
        return { content: [{ type: 'text', text: JSON.stringify(ui.getState(), null, 2) }] };
      }
      case 'ui_set_interaction_mode': {
        const state = ui.setInteractionMode(a.mode as 'edit' | 'preview');
        bus.emit(CanvasEvents.MODE_CHANGED, { mode: a.mode });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'ui_set_chrome_mode': {
        const state = ui.setChromeMode(a.mode as 'editor' | 'clean');
        bus.emit(ShellEvents.CHROME_MODE_CHANGED, { mode: a.mode });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'ui_set_tool': {
        const state = ui.setActiveTool(a.tool as string);
        bus.emit(CanvasEvents.TOOL_CHANGED, { tool: a.tool });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'ui_set_theme': {
        const state = ui.setTheme(a.theme as 'light' | 'dark' | 'high-contrast');
        bus.emit(ShellEvents.THEME_CHANGED, { theme: a.theme });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'ui_toggle_sidebar': {
        const state = a.side === 'left' ? ui.toggleSidebarLeft() : ui.toggleSidebarRight();
        bus.emit(ShellEvents.SIDEBAR_TOGGLED, { side: a.side, open: a.side === 'left' ? state.sidebarLeftOpen : state.sidebarRightOpen });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'ui_set_3d_mode': {
        const state = ui.set3DMode(a.enabled as boolean);
        bus.emit(SpatialEvents.MODE_CHANGED, { is3D: a.enabled });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }
      case 'ui_set_panel': {
        const state = ui.setPanelOpen(a.panelId as string, a.open as boolean);
        bus.emit(ShellEvents.PANEL_TOGGLED, { panelId: a.panelId, open: a.open });
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      }

      // =========================================================================
      // Docker Tools
      // =========================================================================
      case 'docker_create': {
        const input = {
          name: a.name as string | undefined,
          dockMode: a.dockMode as DockerDockMode | undefined,
          position: a.position as { x: number; y: number } | undefined,
          size: a.size as { width: number; height: number } | undefined,
          visible: a.visible as boolean | undefined,
          pinned: a.pinned as boolean | undefined,
        };
        const docker = dockers.create(input);
        bus.emit(DockerEvents.CREATED, { docker });
        return { content: [{ type: 'text', text: JSON.stringify(docker, null, 2) }] };
      }
      case 'docker_get': {
        const docker = dockers.get(a.id as string);
        if (docker) {
          return { content: [{ type: 'text', text: JSON.stringify(docker, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'Docker not found' }], isError: true };
      }
      case 'docker_update': {
        const updates = {
          name: a.name as string | undefined,
          dockMode: a.dockMode as DockerDockMode | undefined,
          position: a.position as { x: number; y: number } | undefined,
          size: a.size as { width: number; height: number } | undefined,
          visible: a.visible as boolean | undefined,
          pinned: a.pinned as boolean | undefined,
        };
        const docker = dockers.update(a.id as string, updates);
        if (docker) {
          bus.emit(DockerEvents.UPDATED, { dockerId: a.id, updates });
          return { content: [{ type: 'text', text: JSON.stringify(docker, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'Docker not found' }], isError: true };
      }
      case 'docker_remove': {
        const removed = dockers.remove(a.id as string);
        if (removed) {
          bus.emit(DockerEvents.DELETED, { dockerId: a.id });
          return { content: [{ type: 'text', text: 'Docker removed' }] };
        }
        return { content: [{ type: 'text', text: 'Docker not found' }], isError: true };
      }
      case 'docker_list': {
        return { content: [{ type: 'text', text: JSON.stringify(dockers.list(), null, 2) }] };
      }
      case 'docker_add_tab': {
        const tab = dockers.addTab(a.dockerId as string, a.name as string | undefined);
        if (tab) {
          bus.emit(DockerEvents.TAB_ADDED, { dockerId: a.dockerId, tab });
          return { content: [{ type: 'text', text: JSON.stringify(tab, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'Docker not found' }], isError: true };
      }
      case 'docker_remove_tab': {
        const removed = dockers.removeTab(a.dockerId as string, a.tabIndex as number);
        if (removed) {
          bus.emit(DockerEvents.TAB_REMOVED, { dockerId: a.dockerId, tabIndex: a.tabIndex });
          return { content: [{ type: 'text', text: 'Tab removed' }] };
        }
        return { content: [{ type: 'text', text: 'Docker not found or cannot remove (must have at least 1 tab)' }], isError: true };
      }
      case 'docker_add_widget': {
        const added = dockers.addWidgetToTab(
          a.dockerId as string,
          a.tabIndex as number,
          a.widgetInstanceId as string,
          a.height as number | undefined
        );
        if (added) {
          bus.emit(DockerEvents.WIDGET_ADDED, { dockerId: a.dockerId, tabIndex: a.tabIndex, widgetInstanceId: a.widgetInstanceId });
          return { content: [{ type: 'text', text: 'Widget added to tab' }] };
        }
        return { content: [{ type: 'text', text: 'Docker or tab not found' }], isError: true };
      }
      case 'docker_remove_widget': {
        const removed = dockers.removeWidgetFromTab(
          a.dockerId as string,
          a.tabIndex as number,
          a.widgetInstanceId as string
        );
        if (removed) {
          bus.emit(DockerEvents.WIDGET_REMOVED, { dockerId: a.dockerId, tabIndex: a.tabIndex, widgetInstanceId: a.widgetInstanceId });
          return { content: [{ type: 'text', text: 'Widget removed from tab' }] };
        }
        return { content: [{ type: 'text', text: 'Docker, tab, or widget not found' }], isError: true };
      }
      case 'docker_bring_to_front': {
        dockers.bringToFront(a.id as string);
        return { content: [{ type: 'text', text: 'Docker brought to front' }] };
      }

      // =========================================================================
      // Social Testing Tools (multiuser simulation)
      // =========================================================================
      case 'user_create': {
        const user = testUsers.createUser({
          displayName: a.displayName as string,
          email: a.email as string | undefined,
          role: a.role as TestUser['role'] | undefined,
          avatar: a.avatar as string | undefined,
        });
        bus.emit(SocialEvents.PRESENCE_JOINED, { user, simulated: true });
        return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
      }
      case 'user_get': {
        const user = testUsers.getUser(a.id as string);
        if (user) {
          return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'User not found' }], isError: true };
      }
      case 'user_update': {
        const updates: Partial<TestUser> = {};
        if (a.displayName) updates.displayName = a.displayName as string;
        if (a.email) updates.email = a.email as string;
        if (a.role) updates.role = a.role as TestUser['role'];
        if (a.color) updates.color = a.color as string;
        const user = testUsers.updateUser(a.id as string, updates);
        if (user) {
          return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'User not found' }], isError: true };
      }
      case 'user_remove': {
        const removed = testUsers.removeUser(a.id as string);
        if (removed) {
          bus.emit(SocialEvents.PRESENCE_LEFT, { userId: a.id, simulated: true });
          return { content: [{ type: 'text', text: 'User removed' }] };
        }
        return { content: [{ type: 'text', text: 'User not found' }], isError: true };
      }
      case 'user_list': {
        return { content: [{ type: 'text', text: JSON.stringify(testUsers.listUsers(), null, 2) }] };
      }
      case 'presence_join': {
        const user = testUsers.joinCanvas(a.userId as string, a.canvasId as string | undefined);
        if (user) {
          bus.emit(SocialEvents.PRESENCE_JOINED, { user, canvasId: a.canvasId ?? 'test-canvas' });
          return { content: [{ type: 'text', text: JSON.stringify({ joined: user, presence: testUsers.getPresence() }, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'User not found' }], isError: true };
      }
      case 'presence_leave': {
        const left = testUsers.leaveCanvas(a.userId as string);
        if (left) {
          bus.emit(SocialEvents.PRESENCE_LEFT, { userId: a.userId });
          return { content: [{ type: 'text', text: JSON.stringify({ left: a.userId, presence: testUsers.getPresence() }, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'User not found or not online' }], isError: true };
      }
      case 'presence_get': {
        return { content: [{ type: 'text', text: JSON.stringify(testUsers.getPresence(), null, 2) }] };
      }
      case 'cursor_update': {
        const cursor = testUsers.updateCursor(a.userId as string, a.x as number, a.y as number);
        if (cursor) {
          bus.emit(SocialEvents.CURSOR_MOVED, { userId: a.userId, ...cursor });
          return { content: [{ type: 'text', text: JSON.stringify(cursor, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'User not found or not online' }], isError: true };
      }
      case 'cursor_simulate_path': {
        const points = a.points as Array<{ x: number; y: number }>;
        const intervalMs = (a.intervalMs as number) ?? 50;
        testUsers.simulateCursorPath(a.userId as string, points, intervalMs);
        return { content: [{ type: 'text', text: `Simulating cursor path with ${points.length} points at ${intervalMs}ms intervals` }] };
      }
      case 'social_simulate_edit': {
        const entity = scene.getEntity(a.entityId as string);
        if (!entity) {
          return { content: [{ type: 'text', text: 'Entity not found' }], isError: true };
        }
        const user = testUsers.getUser(a.userId as string);
        if (!user) {
          return { content: [{ type: 'text', text: 'User not found' }], isError: true };
        }
        const changes = a.changes as Record<string, unknown>;
        const updated = scene.updateEntity(a.entityId as string, changes);
        bus.emit(SocialEvents.ENTITY_TRANSFORMED, {
          userId: a.userId,
          entityId: a.entityId,
          changes,
          timestamp: new Date().toISOString(),
        });
        return { content: [{ type: 'text', text: JSON.stringify({ editedBy: user.displayName, entity: updated }, null, 2) }] };
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
      uri: 'stickernest://events',
      name: 'Event Type Constants',
      description: 'All event type constants organized by layer (Kernel, Social, Canvas, Widget, Shell, Spatial, Grid, Docker, etc.)',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://entity-types',
      name: 'Canvas Entity Types',
      description: 'List of all 12 canvas entity types with descriptions',
      mimeType: 'application/json',
    },
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
      uri: 'stickernest://canvas/entities',
      name: 'Canvas Entities',
      description: 'All entities currently on the canvas',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://viewport/state',
      name: 'Viewport State',
      description: 'Current viewport state',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://billing/stats',
      name: 'Billing Stats',
      description: 'User/tier billing simulation statistics',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://commerce/stats',
      name: 'Commerce Stats',
      description: 'Creator commerce statistics (tiers, items, orders, revenue)',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://selection',
      name: 'Current Selection',
      description: 'Currently selected entity IDs',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://widgets',
      name: 'Widget Instances',
      description: 'All active widget instances',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://document',
      name: 'Canvas Document',
      description: 'Current canvas document state (name, background, layout mode, platform, spatial mode)',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://history',
      name: 'History Stack',
      description: 'Undo/redo history stack with entries and capabilities',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://ui',
      name: 'UI State',
      description: 'Current UI state (interaction mode, theme, tool, sidebars, panels)',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://dockers',
      name: 'Docker Containers',
      description: 'All docker containers with their tabs and widget slots',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://users',
      name: 'Test Users',
      description: 'All test users for multiuser simulation',
      mimeType: 'application/json',
    },
    {
      uri: 'stickernest://presence',
      name: 'Presence State',
      description: 'Current presence state (online users, cursors)',
      mimeType: 'application/json',
    },
  ],
}));

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'stickernest://events':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(ALL_EVENT_CONSTANTS, null, 2) }] };
    case 'stickernest://entity-types':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            types: ENTITY_TYPES,
            descriptions: {
              sticker: 'Visual asset (image/GIF/video) that may trigger logic on click',
              text: 'Text block entity with font styling',
              widget: 'Interactive program container running in sandboxed iframe',
              shape: 'Vector shape (rectangle, ellipse, line, polygon)',
              drawing: 'Freehand pen stroke',
              group: 'Container for grouped entities',
              docker: 'Container widget that hosts child widgets with layout',
              lottie: 'Lottie animation player',
              audio: 'Audio player with waveform visualization',
              svg: 'Vector graphic (inline SVG markup)',
              path: 'Bezier path with anchor points',
              object3d: '3D object for spatial/VR canvas',
            },
          }, null, 2),
        }],
      };
    case 'stickernest://bus/stats':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(bus.stats(), null, 2) }] };
    case 'stickernest://canvas/stats':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(scene.stats(), null, 2) }] };
    case 'stickernest://canvas/entities':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(scene.getAllEntities(), null, 2) }] };
    case 'stickernest://viewport/state':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(viewport.getState(), null, 2) }] };
    case 'stickernest://billing/stats':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(billing.stats(), null, 2) }] };
    case 'stickernest://commerce/stats':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(commerce.stats(), null, 2) }] };
    case 'stickernest://selection':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ selected: selection.getSelected() }, null, 2) }] };
    case 'stickernest://widgets':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(widgets.listInstances(), null, 2) }] };
    case 'stickernest://document':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(canvasDoc.getState(), null, 2) }] };
    case 'stickernest://history':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(history.getStack(), null, 2) }] };
    case 'stickernest://ui':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(ui.getState(), null, 2) }] };
    case 'stickernest://dockers':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(dockers.list(), null, 2) }] };
    case 'stickernest://users':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(testUsers.listUsers(), null, 2) }] };
    case 'stickernest://presence':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(testUsers.getPresence(), null, 2) }] };
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('StickerNest MCP Dev Server v2.2.0 running on stdio');
}

main().catch(console.error);
