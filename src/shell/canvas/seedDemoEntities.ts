/**
 * Seed demo entities for visual testing.
 *
 * Emits ENTITY_CREATED bus events for a set of sample entities so the canvas
 * is visually populated when navigating to `/canvas/demo`.
 *
 * @module shell/canvas
 * @layer L6
 */

import type { CanvasEntity, CanvasDocument } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useCanvasStore } from '../../kernel/stores/canvas/canvas.store';
import { supabase } from '../../kernel/supabase';

// ── Commerce Canvas Seed ────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'sn:canvas:';
const STORAGE_INDEX_KEY = 'sn:canvas:index';

interface LocalCanvasSummary {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface SeedRealCommerceOptions {
  canvasId?: string;
  canvasSlug?: string;
}

interface SeedRealCommerceResult {
  ok: boolean;
  canvasId: string;
  tiersInserted: number;
  itemsInserted: number;
  message: string;
}

function resolveCanvasId(options?: SeedRealCommerceOptions): string | null {
  if (options?.canvasId) return options.canvasId;

  const activeCanvasId = useCanvasStore.getState().activeCanvasId;
  if (activeCanvasId) return activeCanvasId;

  const slug = options?.canvasSlug ?? 'alice-art-shop';
  const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { meta?: { id?: string } };
    return parsed.meta?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Seeds real commerce rows in Supabase for the active canvas.
 * This powers sn.builtin.shop + sn.builtin.subscribe with live DB data.
 */
export async function seedRealCommerceData(
  options?: SeedRealCommerceOptions,
): Promise<SeedRealCommerceResult> {
  const canvasId = resolveCanvasId(options);
  if (!canvasId) {
    return {
      ok: false,
      canvasId: '',
      tiersInserted: 0,
      itemsInserted: 0,
      message: 'No active canvas found. Open a canvas route first.',
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return {
      ok: false,
      canvasId,
      tiersInserted: 0,
      itemsInserted: 0,
      message: `Auth required: ${authError?.message ?? 'Sign in first.'}`,
    };
  }

  const user = authData.user;

  const { data: existingCanvas, error: canvasReadError } = await supabase
    .from('canvases')
    .select('id, owner_id')
    .eq('id', canvasId)
    .maybeSingle();

  if (canvasReadError) {
    return {
      ok: false,
      canvasId,
      tiersInserted: 0,
      itemsInserted: 0,
      message: `Failed reading canvas: ${canvasReadError.message}`,
    };
  }

  if (existingCanvas && existingCanvas.owner_id !== user.id) {
    return {
      ok: false,
      canvasId,
      tiersInserted: 0,
      itemsInserted: 0,
      message: 'You must own this canvas to seed creator commerce data.',
    };
  }

  if (!existingCanvas) {
    const slug = options?.canvasSlug ?? 'alice-art-shop';
    const { error: canvasInsertError } = await supabase.from('canvases').insert({
      id: canvasId,
      owner_id: user.id,
      name: "Alice's Art Shop",
      slug,
      description: 'Commerce demo canvas',
      is_public: true,
      default_role: 'viewer',
      settings: { isShop: true },
    });
    if (canvasInsertError) {
      return {
        ok: false,
        canvasId,
        tiersInserted: 0,
        itemsInserted: 0,
        message: `Failed creating canvas row: ${canvasInsertError.message}`,
      };
    }
  }

  const { data: existingTiers, error: tiersReadError } = await supabase
    .from('canvas_subscription_tiers')
    .select('id')
    .eq('canvas_id', canvasId)
    .limit(1);

  if (tiersReadError) {
    return {
      ok: false,
      canvasId,
      tiersInserted: 0,
      itemsInserted: 0,
      message: `Failed reading tiers: ${tiersReadError.message}`,
    };
  }

  let tiersInserted = 0;
  if (!existingTiers || existingTiers.length === 0) {
    const tiers = [
      {
        id: crypto.randomUUID(),
        canvas_id: canvasId,
        creator_id: user.id,
        name: 'Free Supporter',
        description: 'Follow along with my art updates.',
        price_cents: 0,
        currency: 'usd',
        interval: 'month',
        benefits: ['Community updates', 'Early previews'],
        canvas_role: 'viewer',
        sort_order: 0,
        is_active: true,
      },
      {
        id: crypto.randomUUID(),
        canvas_id: canvasId,
        creator_id: user.id,
        name: 'Art Patron',
        description: 'Monthly support with bonus drops.',
        price_cents: 500,
        currency: 'usd',
        interval: 'month',
        benefits: ['Everything in Free', 'HD downloads', 'Bonus pack'],
        canvas_role: 'commenter',
        sort_order: 1,
        is_active: true,
      },
      {
        id: crypto.randomUUID(),
        canvas_id: canvasId,
        creator_id: user.id,
        name: 'VIP Collector',
        description: 'Top-tier support and exclusive content.',
        price_cents: 1500,
        currency: 'usd',
        interval: 'month',
        benefits: ['Everything in Art Patron', 'Monthly exclusive set'],
        canvas_role: 'editor',
        sort_order: 2,
        is_active: true,
      },
    ];

    const { error: tierInsertError } = await supabase
      .from('canvas_subscription_tiers')
      .insert(tiers);

    if (tierInsertError) {
      return {
        ok: false,
        canvasId,
        tiersInserted: 0,
        itemsInserted: 0,
        message: `Failed inserting tiers: ${tierInsertError.message}`,
      };
    }
    tiersInserted = tiers.length;
  }

  const { data: existingItems, error: itemsReadError } = await supabase
    .from('shop_items')
    .select('id')
    .eq('canvas_id', canvasId)
    .limit(1);

  if (itemsReadError) {
    return {
      ok: false,
      canvasId,
      tiersInserted,
      itemsInserted: 0,
      message: `Failed reading shop items: ${itemsReadError.message}`,
    };
  }

  let itemsInserted = 0;
  if (!existingItems || existingItems.length === 0) {
    const items = [
      {
        id: crypto.randomUUID(),
        canvas_id: canvasId,
        seller_id: user.id,
        name: 'Starter Sticker Pack',
        description: 'A free pack of starter stickers.',
        item_type: 'digital',
        fulfillment: 'instant',
        price_cents: 0,
        currency: 'usd',
        max_per_buyer: 1,
        tags: ['free', 'stickers'],
        is_active: true,
      },
      {
        id: crypto.randomUUID(),
        canvas_id: canvasId,
        seller_id: user.id,
        name: 'Kawaii Animals Bundle',
        description: '20 kawaii animal stickers.',
        item_type: 'digital',
        fulfillment: 'instant',
        price_cents: 300,
        currency: 'usd',
        max_per_buyer: 3,
        tags: ['kawaii', 'stickers'],
        is_active: true,
      },
      {
        id: crypto.randomUUID(),
        canvas_id: canvasId,
        seller_id: user.id,
        name: 'Wallpaper Collection',
        description: 'High-res wallpapers from the set.',
        item_type: 'digital',
        fulfillment: 'instant',
        price_cents: 800,
        currency: 'usd',
        tags: ['wallpaper'],
        is_active: true,
      },
    ];

    const { error: itemsInsertError } = await supabase.from('shop_items').insert(items);
    if (itemsInsertError) {
      return {
        ok: false,
        canvasId,
        tiersInserted,
        itemsInserted: 0,
        message: `Failed inserting shop items: ${itemsInsertError.message}`,
      };
    }
    itemsInserted = items.length;
  }

  return {
    ok: true,
    canvasId,
    tiersInserted,
    itemsInserted,
    message: 'Commerce data is ready.',
  };
}

/**
 * Seeds Alice's Art Shop canvas into localStorage for commerce testing.
 * Call this from browser console: `seedCommerceCanvas()`
 */
export function seedCommerceCanvas(): void {
  const now = new Date().toISOString();
  const canvasId = 'a1111111-1111-4111-a111-111111111111';
  const userId = '00000000-0000-4000-a000-000000000001';
  const slug = 'alice-art-shop';

  // Create canvas summary for index
  const summary: LocalCanvasSummary = {
    id: canvasId,
    slug,
    name: "Alice's Art Shop",
    createdAt: now,
    updatedAt: now,
  };

  // Shop entities
  const entities: CanvasEntity[] = [
    {
      id: 'aaa00000-0000-4000-a000-000000000001',
      type: 'text',
      canvasId,
      transform: { position: { x: 100, y: 50 }, size: { width: 500, height: 80 }, rotation: 0, scale: 1 },
      zIndex: 1,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Shop Header',
      content: "Welcome to Alice's Art Shop!",
      fontSize: 36,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 700,
      color: '#e91e63',
      textAlign: 'left',
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000002',
      type: 'text',
      canvasId,
      transform: { position: { x: 100, y: 140 }, size: { width: 600, height: 50 }, rotation: 0, scale: 1 },
      zIndex: 2,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Shop Description',
      content: 'Digital stickers, wallpapers, and exclusive content for art lovers',
      fontSize: 18,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 400,
      color: '#666',
      textAlign: 'left',
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000003',
      type: 'shape',
      canvasId,
      transform: { position: { x: 100, y: 210 }, size: { width: 600, height: 4 }, rotation: 0, scale: 1 },
      zIndex: 3,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Divider',
      shapeType: 'rectangle',
      fill: '#e91e63',
      stroke: 'none',
      strokeWidth: 0,
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000004',
      type: 'text',
      canvasId,
      transform: { position: { x: 100, y: 250 }, size: { width: 300, height: 40 }, rotation: 0, scale: 1 },
      zIndex: 4,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Featured Section',
      content: 'Featured Items',
      fontSize: 24,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 700,
      color: '#333',
      textAlign: 'left',
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000005',
      type: 'widget',
      canvasId,
      transform: { position: { x: 100, y: 300 }, size: { width: 580, height: 220 }, rotation: 0, scale: 1 },
      zIndex: 5,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'Shop Items Widget',
      widgetId: 'sn.builtin.shop',
      widgetInstanceId: 'a1111111-1111-4111-a111-111111111112',
      config: { title: 'Shop Items', showPrices: true },
    } as CanvasEntity,
    // Item cards
    {
      id: 'aaa00000-0000-4000-a000-000000000006',
      type: 'shape',
      canvasId,
      transform: { position: { x: 100, y: 310 }, size: { width: 180, height: 200 }, rotation: 0, scale: 1 },
      zIndex: 5,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'Starter Pack Card',
      shapeType: 'rectangle',
      fill: '#fff9c4',
      stroke: '#fdd835',
      strokeWidth: 2,
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000007',
      type: 'text',
      canvasId,
      transform: { position: { x: 110, y: 420 }, size: { width: 160, height: 80 }, rotation: 0, scale: 1 },
      zIndex: 6,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Starter Pack Label',
      content: 'Starter Sticker Pack\nFREE',
      fontSize: 14,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 600,
      color: '#333',
      textAlign: 'center',
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000008',
      type: 'shape',
      canvasId,
      transform: { position: { x: 300, y: 310 }, size: { width: 180, height: 200 }, rotation: 0, scale: 1 },
      zIndex: 5,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'Kawaii Bundle Card',
      shapeType: 'rectangle',
      fill: '#e1f5fe',
      stroke: '#03a9f4',
      strokeWidth: 2,
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000009',
      type: 'text',
      canvasId,
      transform: { position: { x: 310, y: 420 }, size: { width: 160, height: 80 }, rotation: 0, scale: 1 },
      zIndex: 6,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Kawaii Bundle Label',
      content: 'Kawaii Animals\n$3.00',
      fontSize: 14,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 600,
      color: '#333',
      textAlign: 'center',
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-00000000000a',
      type: 'shape',
      canvasId,
      transform: { position: { x: 500, y: 310 }, size: { width: 180, height: 200 }, rotation: 0, scale: 1 },
      zIndex: 5,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'Wallpaper Card',
      shapeType: 'rectangle',
      fill: '#f3e5f5',
      stroke: '#9c27b0',
      strokeWidth: 2,
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-00000000000b',
      type: 'text',
      canvasId,
      transform: { position: { x: 510, y: 420 }, size: { width: 160, height: 80 }, rotation: 0, scale: 1 },
      zIndex: 6,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Wallpaper Label',
      content: 'Wallpaper Collection\n$8.00',
      fontSize: 14,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 600,
      color: '#333',
      textAlign: 'center',
    } as CanvasEntity,
    // Subscription section
    {
      id: 'aaa00000-0000-4000-a000-00000000000c',
      type: 'text',
      canvasId,
      transform: { position: { x: 100, y: 550 }, size: { width: 300, height: 40 }, rotation: 0, scale: 1 },
      zIndex: 7,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Subscriptions Header',
      content: 'Support My Work',
      fontSize: 24,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 700,
      color: '#333',
      textAlign: 'left',
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-00000000000d',
      type: 'widget',
      canvasId,
      transform: { position: { x: 100, y: 610 }, size: { width: 580, height: 220 }, rotation: 0, scale: 1 },
      zIndex: 8,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'Subscribe Widget',
      widgetId: 'sn.builtin.subscribe',
      widgetInstanceId: 'a2222222-2222-4222-a222-222222222223',
      config: { title: 'Subscription Tiers' },
    } as CanvasEntity,
    // Tier cards
    {
      id: 'aaa00000-0000-4000-a000-00000000000e',
      type: 'shape',
      canvasId,
      transform: { position: { x: 100, y: 610 }, size: { width: 180, height: 140 }, rotation: 0, scale: 1 },
      zIndex: 8,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'Free Tier Card',
      shapeType: 'rectangle',
      fill: '#e8f5e9',
      stroke: '#4caf50',
      strokeWidth: 2,
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-00000000000f',
      type: 'text',
      canvasId,
      transform: { position: { x: 110, y: 640 }, size: { width: 160, height: 80 }, rotation: 0, scale: 1 },
      zIndex: 9,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Free Tier Label',
      content: 'Free Supporter\nFREE/mo',
      fontSize: 14,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 600,
      color: '#333',
      textAlign: 'center',
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000010',
      type: 'shape',
      canvasId,
      transform: { position: { x: 300, y: 610 }, size: { width: 180, height: 140 }, rotation: 0, scale: 1 },
      zIndex: 8,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'Patron Tier Card',
      shapeType: 'rectangle',
      fill: '#e3f2fd',
      stroke: '#2196f3',
      strokeWidth: 2,
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000011',
      type: 'text',
      canvasId,
      transform: { position: { x: 310, y: 640 }, size: { width: 160, height: 80 }, rotation: 0, scale: 1 },
      zIndex: 9,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Patron Tier Label',
      content: 'Art Patron\n$5/mo',
      fontSize: 14,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 600,
      color: '#333',
      textAlign: 'center',
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000012',
      type: 'shape',
      canvasId,
      transform: { position: { x: 500, y: 610 }, size: { width: 180, height: 140 }, rotation: 0, scale: 1 },
      zIndex: 8,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'VIP Tier Card',
      shapeType: 'rectangle',
      fill: '#fce4ec',
      stroke: '#e91e63',
      strokeWidth: 2,
    } as CanvasEntity,
    {
      id: 'aaa00000-0000-4000-a000-000000000013',
      type: 'text',
      canvasId,
      transform: { position: { x: 510, y: 640 }, size: { width: 160, height: 80 }, rotation: 0, scale: 1 },
      zIndex: 9,
      visible: true,
      canvasVisibility: 'both',
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'VIP Tier Label',
      content: 'VIP Collector\n$15/mo',
      fontSize: 14,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 600,
      color: '#333',
      textAlign: 'center',
    } as CanvasEntity,
  ];

  const normalizedEntities = entities.map((entity) => {
    const base = {
      ...entity,
      id: crypto.randomUUID(),
      canvasId,
      createdBy: userId,
    };
    if (base.type === 'widget') {
      return {
        ...base,
        widgetInstanceId: crypto.randomUUID(),
      };
    }
    return base;
  }) as CanvasEntity[];

  // Create canvas document
  const doc: CanvasDocument = {
    version: 1,
    meta: {
      id: canvasId,
      name: summary.name,
      createdAt: now,
      updatedAt: now,
    },
    viewport: {
      background: { type: 'solid', color: '#fff5f5', opacity: 1 },
      sizeMode: 'infinite',
      isPreviewMode: false,
    },
    entities: normalizedEntities,
    layoutMode: 'freeform',
    platform: 'web',
    spatialMode: '2d',
    platformConfigs: {
      web: {
        background: { type: 'solid', color: '#fff5f5', opacity: 1 },
        sizeMode: 'infinite',
        isPreviewMode: false,
      },
      mobile: {
        width: 390,
        height: 844,
        background: { type: 'solid', color: '#fff5f5', opacity: 1 },
        sizeMode: 'bounded',
        isPreviewMode: false,
      },
      desktop: {
        width: 1440,
        height: 900,
        background: { type: 'solid', color: '#fff5f5', opacity: 1 },
        sizeMode: 'bounded',
        isPreviewMode: false,
      },
    },
  };

  // Update canvas index
  const indexRaw = localStorage.getItem(STORAGE_INDEX_KEY);
  const index = indexRaw ? JSON.parse(indexRaw) : { items: [] };
  const filtered = index.items.filter((i: LocalCanvasSummary) => i.slug !== slug);
  filtered.push(summary);
  localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify({ items: filtered }));

  // Store canvas document
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}`, JSON.stringify(doc));

  console.log('[seedCommerceCanvas] Created Alice\'s Art Shop at /canvas/alice-art-shop');
  console.log('[seedCommerceCanvas] Refresh the page and check your canvas gallery!');
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).seedCommerceCanvas = seedCommerceCanvas;
  (window as unknown as Record<string, unknown>).seedRealCommerceData = seedRealCommerceData;
}

const DEMO_CANVAS_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_USER_ID = 'ddd00000-0000-4000-a000-000000000099';

// Header entities
const DEMO_TITLE_ID = 'ddd00000-0000-4000-a000-000000000001';
const DEMO_SUBTITLE_ID = 'ddd00000-0000-4000-a000-000000000002';
const DEMO_DIVIDER_ID = 'ddd00000-0000-4000-a000-000000000003';

// Widget entities — 3 across: Todo List | Kanban | Pathfinder
const DEMO_TODO_ID = 'ddd00000-0000-4000-a000-000000000010';
const DEMO_TODO_INST = 'ddd00000-0000-4000-a000-100000000010';
const DEMO_KANBAN_ID = 'ddd00000-0000-4000-a000-000000000011';
const DEMO_KANBAN_INST = 'ddd00000-0000-4000-a000-100000000011';
const DEMO_PATHFINDER_ID = 'ddd00000-0000-4000-a000-000000000012';
const DEMO_PATHFINDER_INST = 'ddd00000-0000-4000-a000-100000000012';

// Decorative bottom-row entities
const DEMO_CARD_ID = 'ddd00000-0000-4000-a000-000000000020';
const DEMO_STICKER_ID = 'ddd00000-0000-4000-a000-000000000021';
const DEMO_LABEL_ID = 'ddd00000-0000-4000-a000-000000000022';
const DEMO_DRAWING_ID = 'ddd00000-0000-4000-a000-000000000023';
const DEMO_SVG_ID = 'ddd00000-0000-4000-a000-000000000024';

/**
 * Creates and emits demo entities onto the canvas via the event bus.
 *
 * Layout (canvas-space coordinates):
 *   Row 1 — Hero header:  title + subtitle + divider  (y: 60–160)
 *   Row 2 — 3 Widgets:    Todo List | Kanban | Pathfinder  (y: 180–540)
 *   Row 3 — Decorative:   accent card + sticker + label text + drawing + SVG  (y: 570–680)
 *
 * Total canvas footprint: ~1200 × 700 units — designed to fill a 1440×900 viewport.
 * Call once after Canvas Core has been initialized.
 */
export function seedDemoEntities(): void {
  const now = new Date().toISOString();
  const entities: CanvasEntity[] = [

    // ── Row 1: Header ────────────────────────────────────────────────────────

    // Hero title
    {
      id: DEMO_TITLE_ID,
      type: 'text',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 80, y: 60 }, size: { width: 820, height: 80 }, rotation: 0, scale: 1 },
      zIndex: 1,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Hero Title',
      content: 'Your infinite canvas.',
      fontSize: 52,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 700,
      color: 'var(--sn-text, #1a1a2e)',
      textAlign: 'left',
    } as CanvasEntity,

    // Subtitle
    {
      id: DEMO_SUBTITLE_ID,
      type: 'text',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 80, y: 148 }, size: { width: 700, height: 36 }, rotation: 0, scale: 1 },
      zIndex: 2,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Subtitle',
      content: 'Widgets, stickers, and pipelines — composable by design.',
      fontSize: 20,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 400,
      color: 'var(--sn-text-muted, #666)',
      textAlign: 'left',
    } as CanvasEntity,

    // Accent divider line
    {
      id: DEMO_DIVIDER_ID,
      type: 'shape',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 80, y: 192 }, size: { width: 820, height: 4 }, rotation: 0, scale: 1 },
      zIndex: 3,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 2,
      syncTransform2d3d: true,
      name: 'Accent Divider',
      shapeType: 'rectangle',
      fill: 'var(--sn-accent, #6c5ce7)',
      stroke: 'none',
      strokeWidth: 0,
    } as CanvasEntity,

    // ── Row 2: Three widgets side-by-side ────────────────────────────────────

    // Todo List widget (left)
    {
      id: DEMO_TODO_ID,
      type: 'widget',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 80, y: 214 }, size: { width: 320, height: 330 }, rotation: 0, scale: 1 },
      zIndex: 10,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'Todo List',
      widgetId: 'sn.builtin.todo-list',
      widgetInstanceId: DEMO_TODO_INST,
      config: { title: 'Today' },
    } as CanvasEntity,

    // Kanban widget (center)
    {
      id: DEMO_KANBAN_ID,
      type: 'widget',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 440, y: 214 }, size: { width: 460, height: 330 }, rotation: 0, scale: 1 },
      zIndex: 11,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'Kanban Board',
      widgetId: 'sn.builtin.kanban',
      widgetInstanceId: DEMO_KANBAN_INST,
      config: { title: 'Sprint Board' },
    } as CanvasEntity,

    // Pathfinder widget (right)
    {
      id: DEMO_PATHFINDER_ID,
      type: 'widget',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 940, y: 214 }, size: { width: 320, height: 330 }, rotation: 0, scale: 1 },
      zIndex: 12,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 12,
      syncTransform2d3d: true,
      name: 'Pathfinder',
      widgetId: 'sn.builtin.pathfinder',
      widgetInstanceId: DEMO_PATHFINDER_INST,
      config: {},
    } as CanvasEntity,

    // ── Row 3: Decorative bar ────────────────────────────────────────────────

    // Accent card (colored background block)
    {
      id: DEMO_CARD_ID,
      type: 'shape',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 80, y: 572 }, size: { width: 380, height: 100 }, rotation: 0, scale: 1 },
      zIndex: 20,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 0.9,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 16,
      syncTransform2d3d: true,
      name: 'Accent Card',
      shapeType: 'rectangle',
      fill: 'var(--sn-accent, #6c5ce7)',
      stroke: 'none',
      strokeWidth: 0,
    } as CanvasEntity,

    // Star sticker
    {
      id: DEMO_STICKER_ID,
      type: 'sticker',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 104, y: 588 }, size: { width: 68, height: 68 }, rotation: 0, scale: 1 },
      zIndex: 21,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Star Sticker',
      assetUrl: 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        + '<polygon points="50,5 63,38 98,38 70,60 80,95 50,73 20,95 30,60 2,38 37,38" '
        + 'fill="%23f9ca24" stroke="%23f0932b" stroke-width="2"/></svg>',
      ),
      assetType: 'image',
    } as CanvasEntity,

    // Label text on the accent card
    {
      id: DEMO_LABEL_ID,
      type: 'text',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 192, y: 598 }, size: { width: 250, height: 60 }, rotation: 0, scale: 1 },
      zIndex: 22,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Card Label',
      content: 'Design. Build. Ship.',
      fontSize: 22,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 700,
      color: '#ffffff',
      textAlign: 'left',
    } as CanvasEntity,

    // Freehand drawing annotation (squiggle underline)
    {
      id: DEMO_DRAWING_ID,
      type: 'drawing',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 500, y: 580 }, size: { width: 360, height: 60 }, rotation: 0, scale: 1 },
      zIndex: 23,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Annotation',
      points: [
        { x: 0, y: 30 }, { x: 40, y: 10 }, { x: 80, y: 40 },
        { x: 130, y: 8 }, { x: 180, y: 38 }, { x: 230, y: 12 },
        { x: 280, y: 42 }, { x: 320, y: 18 }, { x: 360, y: 35 },
      ],
      stroke: '#e17055',
      strokeWidth: 3,
      smoothing: 0.6,
    } as CanvasEntity,

    // Heart SVG icon
    {
      id: DEMO_SVG_ID,
      type: 'svg',
      canvasId: DEMO_CANVAS_ID,
      transform: { position: { x: 900, y: 578 }, size: { width: 88, height: 88 }, rotation: 0, scale: 1 },
      zIndex: 24,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 0,
      syncTransform2d3d: true,
      name: 'Heart Icon',
      svgContent:
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3'
        + 'c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5'
        + 'c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>',
      fill: '#e84393',
      stroke: '',
    } as CanvasEntity,
  ];

  // Emit each entity as an ENTITY_CREATED bus event
  for (const entity of entities) {
    bus.emit(CanvasEvents.ENTITY_CREATED, entity);
  }
}

// ── Claude's Lab Canvas Seed ────────────────────────────────────────────────

const CLAUDE_CANVAS_ID = 'ccc00000-0000-4000-a000-000000000001';
const CLAUDE_USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const CLAUDE_CHAT_ID = 'ccc00000-0000-4000-a000-000000000002';
const CLAUDE_AGENT_ID = 'ccc00000-0000-4000-a000-000000000003';
const CLAUDE_CHAT_INST = 'ccc00000-0000-4000-a000-100000000001';
const CLAUDE_AGENT_INST = 'ccc00000-0000-4000-a000-100000000002';
const CLAUDE_TTT_ID = 'ccc00000-0000-4000-a000-000000000004';
const CLAUDE_TTT_INST = 'ccc00000-0000-4000-a000-100000000003';
const CLAUDE_C4_ID = 'ccc00000-0000-4000-a000-000000000005';
const CLAUDE_C4_INST = 'ccc00000-0000-4000-a000-100000000004';
const CLAUDE_PONG_ID = 'ccc00000-0000-4000-a000-000000000007';
const CLAUDE_PONG_INST = 'ccc00000-0000-4000-a000-100000000006';
const CLAUDE_BS_ID = 'ccc00000-0000-4000-a000-000000000006';
const CLAUDE_BS_INST = 'ccc00000-0000-4000-a000-100000000005';

/**
 * Seeds Claude's Lab canvas with Live Chat + AI Agent widgets.
 * Used for cross-canvas communication testing.
 */
export function seedClaudeLabCanvas(): void {
  const now = new Date().toISOString();
  const entities: CanvasEntity[] = [
    // --- Live Chat widget (Claude's side) ---
    {
      id: CLAUDE_CHAT_ID,
      type: 'widget',
      canvasId: CLAUDE_CANVAS_ID,
      transform: {
        position: { x: 80, y: 80 },
        size: { width: 350, height: 450 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 10,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: CLAUDE_USER_ID,
      borderRadius: 8,
      syncTransform2d3d: true,
      name: 'Live Chat (Claude)',
      widgetId: 'wgt-live-chat',
      widgetInstanceId: CLAUDE_CHAT_INST,
      config: {},
    } as CanvasEntity,

    // --- AI Agent widget (Claude's side) ---
    {
      id: CLAUDE_AGENT_ID,
      type: 'widget',
      canvasId: CLAUDE_CANVAS_ID,
      transform: {
        position: { x: 460, y: 80 },
        size: { width: 350, height: 450 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 11,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: CLAUDE_USER_ID,
      borderRadius: 8,
      syncTransform2d3d: true,
      name: 'AI Agent (Claude)',
      widgetId: 'wgt-ai-agent',
      widgetInstanceId: CLAUDE_AGENT_INST,
      config: {},
    } as CanvasEntity,

    // --- Tic-Tac-Toe widget (Claude's side) ---
    {
      id: CLAUDE_TTT_ID,
      type: 'widget',
      canvasId: CLAUDE_CANVAS_ID,
      transform: {
        position: { x: 840, y: 80 },
        size: { width: 320, height: 400 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 12,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: CLAUDE_USER_ID,
      borderRadius: 8,
      syncTransform2d3d: true,
      name: 'Tic-Tac-Toe (Claude)',
      widgetId: 'wgt-tictactoe',
      widgetInstanceId: CLAUDE_TTT_INST,
      config: {},
    } as CanvasEntity,

    // --- Connect Four widget (Claude's side) ---
    {
      id: CLAUDE_C4_ID,
      type: 'widget',
      canvasId: CLAUDE_CANVAS_ID,
      transform: {
        position: { x: 840, y: 540 },
        size: { width: 350, height: 420 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 13,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: CLAUDE_USER_ID,
      borderRadius: 8,
      syncTransform2d3d: true,
      name: 'Connect Four (Claude)',
      widgetId: 'wgt-connect4',
      widgetInstanceId: CLAUDE_C4_INST,
      config: {},
    } as CanvasEntity,

    // --- Pong widget (Claude's side) ---
    {
      id: CLAUDE_PONG_ID,
      type: 'widget',
      canvasId: CLAUDE_CANVAS_ID,
      transform: {
        position: { x: 80, y: 1060 },
        size: { width: 420, height: 340 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 15,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: CLAUDE_USER_ID,
      borderRadius: 8,
      syncTransform2d3d: true,
      name: 'Pong (Claude)',
      widgetId: 'wgt-pong',
      widgetInstanceId: CLAUDE_PONG_INST,
      config: {},
    } as CanvasEntity,

    // --- Battleship widget (Claude's side) ---
    {
      id: CLAUDE_BS_ID,
      type: 'widget',
      canvasId: CLAUDE_CANVAS_ID,
      transform: {
        position: { x: 80, y: 540 },
        size: { width: 500, height: 500 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 14,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: CLAUDE_USER_ID,
      borderRadius: 8,
      syncTransform2d3d: true,
      name: 'Battleship',
      widgetId: 'wgt-battleship',
      widgetInstanceId: CLAUDE_BS_INST,
      config: {},
    } as CanvasEntity,
  ];

  for (const entity of entities) {
    bus.emit(CanvasEvents.ENTITY_CREATED, entity);
  }
}
