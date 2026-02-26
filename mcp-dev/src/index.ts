#!/usr/bin/env node
/**
 * StickerNest MCP Development Server
 *
 * Provides tools for testing the event bus, canvas core, widget systems,
 * billing/quota, and creator commerce without requiring the full browser
 * or React environment.
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
// MCP Server
// ============================================================================

const bus = new EventBus();
const scene = new SceneGraph();
const viewport = new Viewport();
const widgets = new WidgetRegistry();
const billing = new BillingSimulation();
const commerce = new CommerceSimulation();

const server = new Server(
  {
    name: 'stickernest-dev',
    version: '2.0.0',
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
    case 'stickernest://billing/stats':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(billing.stats(), null, 2) }] };
    case 'stickernest://commerce/stats':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(commerce.stats(), null, 2) }] };
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
