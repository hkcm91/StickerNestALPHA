/**
 * AI Tool Tests
 *
 * @module canvas/tools/ai-tool
 * @layer L4A-2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { bus } from '../../../kernel/bus';

import { createAiTool, AI_TOOL_PANEL_OPEN, AI_TOOL_CANCELLED } from './ai-tool';
import { buildCanvasAIContext, serializeCanvasContextForPrompt } from './canvas-ai-context';

vi.mock('../../../kernel/bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(),
  },
}));

describe('AI Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has name "ai"', () => {
    const tool = createAiTool();
    expect(tool.name).toBe('ai');
  });

  it('emits activated event on activate', () => {
    const tool = createAiTool();
    tool.onActivate();
    expect(bus.emit).toHaveBeenCalledWith('canvas.tool.activated', { tool: 'ai' });
  });

  it('emits cancelled event on deactivate', () => {
    const tool = createAiTool();
    tool.onActivate();
    tool.onDeactivate();
    expect(bus.emit).toHaveBeenCalledWith(AI_TOOL_CANCELLED, {});
  });

  it('emits panel open on empty canvas click', () => {
    const tool = createAiTool();
    tool.onActivate();

    tool.onPointerDown({
      canvasPosition: { x: 100, y: 200 },
      screenPosition: { x: 150, y: 250 },
      entityId: null,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    expect(bus.emit).toHaveBeenCalledWith(AI_TOOL_PANEL_OPEN, {
      canvasPosition: { x: 100, y: 200 },
      screenPosition: { x: 150, y: 250 },
    });
  });

  it('does not emit panel open when clicking on entity', () => {
    const tool = createAiTool();
    tool.onActivate();
    vi.clearAllMocks();

    tool.onPointerDown({
      canvasPosition: { x: 100, y: 200 },
      screenPosition: { x: 150, y: 250 },
      entityId: 'entity-123',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    expect(bus.emit).not.toHaveBeenCalledWith(AI_TOOL_PANEL_OPEN, expect.anything());
  });

  it('does not emit when not active', () => {
    const tool = createAiTool();
    // NOT activated

    tool.onPointerDown({
      canvasPosition: { x: 100, y: 200 },
      screenPosition: { x: 150, y: 250 },
      entityId: null,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    expect(bus.emit).not.toHaveBeenCalledWith(AI_TOOL_PANEL_OPEN, expect.anything());
  });

  it('emits cancelled on cancel()', () => {
    const tool = createAiTool();
    tool.onActivate();
    vi.clearAllMocks();

    tool.cancel();
    expect(bus.emit).toHaveBeenCalledWith(AI_TOOL_CANCELLED, {});
  });
});

describe('Canvas AI Context', () => {
  it('builds context with nearby entities sorted by distance', () => {
    const entities = [
      { type: 'widget', name: 'Far Widget', transform: { position: { x: 1000, y: 1000 } } },
      { type: 'sticker', name: 'Near Sticker', transform: { position: { x: 110, y: 210 } } },
      { type: 'text', transform: { position: { x: 500, y: 500 } } },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = buildCanvasAIContext({ x: 100, y: 200 }, entities as any);

    expect(ctx.totalEntities).toBe(3);
    expect(ctx.nearbyEntities).toHaveLength(3);
    // Nearest first
    expect(ctx.nearbyEntities[0].name).toBe('Near Sticker');
  });

  it('limits nearby entities to maxNearby', () => {
    const entities = Array.from({ length: 20 }, (_, i) => ({
      type: 'widget',
      name: `W${i}`,
      transform: { position: { x: i * 100, y: 0 } },
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = buildCanvasAIContext({ x: 0, y: 0 }, entities as any, 5);
    expect(ctx.nearbyEntities).toHaveLength(5);
    expect(ctx.totalEntities).toBe(20);
  });

  it('serializes context to readable string', () => {
    const ctx = {
      position: { x: 100, y: 200 },
      nearbyEntities: [
        { type: 'sticker', name: 'Logo', distance: 50 },
        { type: 'widget', distance: 200 },
      ],
      totalEntities: 5,
    };

    const text = serializeCanvasContextForPrompt(ctx);
    expect(text).toContain('Canvas position: (100, 200)');
    expect(text).toContain('Total entities on canvas: 5');
    expect(text).toContain('sticker "Logo"');
    expect(text).toContain('50px away');
  });

  it('handles empty entity list', () => {
    const ctx = buildCanvasAIContext({ x: 0, y: 0 }, []);
    expect(ctx.totalEntities).toBe(0);
    expect(ctx.nearbyEntities).toHaveLength(0);
  });
});
