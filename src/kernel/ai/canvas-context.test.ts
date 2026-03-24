/**
 * AI Canvas Context Builder — Tests
 * @module kernel/ai
 */

import { describe, expect, it, beforeEach } from 'vitest';

import type { CanvasEntity } from '@sn/types';

import {
  AIActionSchema,
  AIActionBatchSchema,
  AICanvasContextSchema,
} from '../schemas/ai-action';
import { useCanvasStore } from '../stores/canvas';
import { useWidgetStore } from '../stores/widget';

import { buildCanvasAIContext } from './canvas-context';
import type { ViewportState } from './canvas-context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'sticker',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 100, y: 200 },
      size: { width: 50, height: 50 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 0,
    visible: true,
    locked: false,
    flipH: false,
    flipV: false,
    opacity: 1,
    borderRadius: 0,
    canvasVisibility: 'both' as const,
    syncTransform2d3d: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
    assetUrl: 'https://example.com/sticker.png',
    assetType: 'image' as const,
    aspectLocked: true,
    hoverEffect: 'none' as const,
    ...overrides,
  } as CanvasEntity;
}

const defaultViewport: ViewportState = {
  x: 500,
  y: 500,
  zoom: 1,
  screenWidth: 1000,
  screenHeight: 800,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildCanvasAIContext', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      activeCanvasId: 'canvas-1',
      canvasMeta: { id: 'canvas-1', name: 'Test Canvas', slug: null, ownerId: 'user-1', description: null, thumbnailUrl: null, isPublic: false, settings: {} },
    });
    useWidgetStore.getState().reset();
  });

  it('returns a valid AICanvasContext', () => {
    const entities = [makeEntity()];
    const ctx = buildCanvasAIContext({ entities, viewport: defaultViewport });

    const result = AICanvasContextSchema.safeParse(ctx);
    expect(result.success).toBe(true);
    expect(ctx.canvasId).toBe('canvas-1');
    expect(ctx.canvasName).toBe('Test Canvas');
    expect(ctx.entities).toHaveLength(1);
    expect(ctx.totalEntities).toBe(1);
  });

  it('produces compact entity snapshots with type-specific props', () => {
    const entity = makeEntity({
      name: 'Cool Sticker',
      assetUrl: 'https://cdn.example.com/cat.gif',
      assetType: 'gif',
    });
    const ctx = buildCanvasAIContext({ entities: [entity], viewport: defaultViewport });

    const snap = ctx.entities[0];
    expect(snap.type).toBe('sticker');
    expect(snap.name).toBe('Cool Sticker');
    expect(snap.x).toBe(100);
    expect(snap.y).toBe(200);
    expect(snap.w).toBe(50);
    expect(snap.h).toBe(50);
    expect(snap.props?.assetUrl).toBe('https://cdn.example.com/cat.gif');
    expect(snap.props?.assetType).toBe('gif');
  });

  it('handles text entity snapshots', () => {
    const entity = makeEntity({
      type: 'text',
      content: 'Hello World',
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 400,
      color: '#ff0000',
      textAlign: 'left',
    });
    // Remove sticker-specific fields
    delete (entity as Record<string, unknown>).assetUrl;
    delete (entity as Record<string, unknown>).assetType;

    const ctx = buildCanvasAIContext({ entities: [entity], viewport: defaultViewport });
    expect(ctx.entities[0].props?.content).toBe('Hello World');
    expect(ctx.entities[0].props?.fontSize).toBe(24);
  });

  it('filters entities by viewport when viewportOnly is true', () => {
    const inView = makeEntity({ transform: { position: { x: 200, y: 200 }, size: { width: 50, height: 50 }, rotation: 0, scale: 1 } });
    const outOfView = makeEntity({ transform: { position: { x: 5000, y: 5000 }, size: { width: 50, height: 50 }, rotation: 0, scale: 1 } });

    const ctx = buildCanvasAIContext({
      entities: [inView, outOfView],
      viewport: defaultViewport,
      viewportOnly: true,
    });

    expect(ctx.entities).toHaveLength(1);
    expect(ctx.entities[0].id).toBe(inView.id);
    expect(ctx.totalEntities).toBe(1);
  });

  it('limits entities to maxEntities', () => {
    const entities = Array.from({ length: 200 }, (_, i) =>
      makeEntity({ zIndex: i }),
    );
    const ctx = buildCanvasAIContext({ entities, maxEntities: 10, viewport: defaultViewport });

    expect(ctx.entities).toHaveLength(10);
    expect(ctx.totalEntities).toBe(200);
    // Should have highest z-index entities first
    expect(ctx.entities[0].z).toBe(199);
  });

  it('computes overlap relations', () => {
    const a = makeEntity({ transform: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 } });
    const b = makeEntity({ transform: { position: { x: 50, y: 50 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 } });

    const ctx = buildCanvasAIContext({ entities: [a, b], viewport: defaultViewport });
    const overlap = ctx.relations.find((r) => r.relation === 'overlaps');
    expect(overlap).toBeDefined();
  });

  it('computes containment relations', () => {
    const outer = makeEntity({ transform: { position: { x: 0, y: 0 }, size: { width: 200, height: 200 }, rotation: 0, scale: 1 } });
    const inner = makeEntity({ transform: { position: { x: 10, y: 10 }, size: { width: 20, height: 20 }, rotation: 0, scale: 1 } });

    const ctx = buildCanvasAIContext({ entities: [outer, inner], viewport: defaultViewport });
    const containsRel = ctx.relations.find((r) => r.relation === 'contains');
    expect(containsRel).toBeDefined();
    expect(containsRel?.from).toBe(outer.id);
    expect(containsRel?.to).toBe(inner.id);
  });

  it('computes adjacency relations', () => {
    const a = makeEntity({ transform: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 } });
    const b = makeEntity({ transform: { position: { x: 120, y: 0 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 } });

    const ctx = buildCanvasAIContext({ entities: [a, b], viewport: defaultViewport });
    const adj = ctx.relations.find((r) => r.relation === 'adjacent_right');
    expect(adj).toBeDefined();
  });

  it('includes available widgets from registry', () => {
    useWidgetStore.getState().registerWidget({
      widgetId: 'wgt-clock',
      manifest: { id: 'wgt-clock', name: 'Clock', version: '1.0.0', category: 'utilities' } as never,
      htmlContent: '<div>clock</div>',
      isBuiltIn: true,
      installedAt: new Date().toISOString(),
    });

    const ctx = buildCanvasAIContext({ viewport: defaultViewport });
    expect(ctx.availableWidgets).toHaveLength(1);
    expect(ctx.availableWidgets![0].name).toBe('Clock');
  });

  it('handles empty canvas', () => {
    const ctx = buildCanvasAIContext({ entities: [], viewport: defaultViewport });

    expect(ctx.entities).toHaveLength(0);
    expect(ctx.relations).toHaveLength(0);
    expect(ctx.totalEntities).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AI Action Schema tests
// ---------------------------------------------------------------------------

describe('AIActionSchema', () => {
  it('validates create_sticker action', () => {
    const action = {
      action: 'create_sticker',
      assetUrl: 'https://example.com/img.png',
      position: { x: 100, y: 200 },
    };
    expect(AIActionSchema.safeParse(action).success).toBe(true);
  });

  it('validates create_widget action', () => {
    const action = {
      action: 'create_widget',
      widgetId: 'wgt-clock',
      position: { x: 0, y: 0 },
      config: { timezone: 'UTC' },
    };
    expect(AIActionSchema.safeParse(action).success).toBe(true);
  });

  it('validates create_text action', () => {
    const action = {
      action: 'create_text',
      content: 'Hello',
      position: { x: 50, y: 50 },
      fontSize: 24,
      color: '#000000',
    };
    expect(AIActionSchema.safeParse(action).success).toBe(true);
  });

  it('validates move_entity action', () => {
    const action = {
      action: 'move_entity',
      entityId: crypto.randomUUID(),
      position: { x: 300, y: 400 },
    };
    expect(AIActionSchema.safeParse(action).success).toBe(true);
  });

  it('validates delete_entity action', () => {
    const action = {
      action: 'delete_entity',
      entityId: crypto.randomUUID(),
    };
    expect(AIActionSchema.safeParse(action).success).toBe(true);
  });

  it('validates trigger_generation action', () => {
    const action = {
      action: 'trigger_generation',
      prompt: 'a cute cat sticker',
      position: { x: 100, y: 100 },
    };
    expect(AIActionSchema.safeParse(action).success).toBe(true);
  });

  it('rejects invalid action type', () => {
    const action = {
      action: 'invalid_action',
      position: { x: 0, y: 0 },
    };
    expect(AIActionSchema.safeParse(action).success).toBe(false);
  });

  it('validates action batch', () => {
    const batch = {
      actions: [
        { action: 'create_text', content: 'Title', position: { x: 0, y: 0 } },
        { action: 'create_sticker', assetUrl: 'https://example.com/img.png', position: { x: 100, y: 0 } },
      ],
      reasoning: 'Adding a title and decorative sticker',
    };
    expect(AIActionBatchSchema.safeParse(batch).success).toBe(true);
  });
});
