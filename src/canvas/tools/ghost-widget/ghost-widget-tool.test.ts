/**
 * Ghost Widget Tool tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn() },
}));

import { bus } from '../../../kernel/bus';
import type { CanvasPointerEvent, CanvasKeyEvent } from '../registry';

import { createGhostWidgetTool } from './ghost-widget-tool';
import type { GhostWidgetPayload } from './ghost-widget-tool';

const mockEmit = bus.emit as ReturnType<typeof vi.fn>;

const basePayload: GhostWidgetPayload = {
  inviteId: 'invite-1',
  widgetId: 'widget-abc',
  mode: 'share',
  widgetManifestSnapshot: {
    size: { defaultWidth: 400, defaultHeight: 300 },
  },
};

const pipelinePayload: GhostWidgetPayload = {
  inviteId: 'invite-2',
  widgetId: 'widget-xyz',
  mode: 'pipeline',
  sourcePortId: 'output-1',
  targetPortId: 'input-1',
  sourceCanvasId: 'canvas-source',
  sourceWidgetInstanceId: 'instance-source',
};

function makePointerEvent(overrides: Partial<CanvasPointerEvent> = {}): CanvasPointerEvent {
  return {
    canvasPosition: { x: 100, y: 200 },
    screenPosition: { x: 500, y: 400 },
    entityId: null,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
  };
}

describe('Ghost Widget Tool', () => {
  let mode: 'edit' | 'preview';

  beforeEach(() => {
    vi.clearAllMocks();
    mode = 'edit';
  });

  it('emits GHOST_ACTIVATED on activate', () => {
    const tool = createGhostWidgetTool(basePayload, () => mode);
    tool.onActivate();
    expect(mockEmit).toHaveBeenCalledWith(
      'canvas.ghost.activated',
      expect.objectContaining({ widgetId: 'widget-abc', inviteId: 'invite-1' }),
    );
  });

  it('emits GHOST_DEACTIVATED on deactivate', () => {
    const tool = createGhostWidgetTool(basePayload, () => mode);
    tool.onDeactivate();
    expect(mockEmit).toHaveBeenCalledWith(
      'canvas.ghost.deactivated',
      expect.objectContaining({ inviteId: 'invite-1' }),
    );
  });

  it('emits position updates on pointer move', () => {
    const tool = createGhostWidgetTool(basePayload, () => mode);
    const event = makePointerEvent({ canvasPosition: { x: 150, y: 250 } });
    tool.onPointerMove(event);
    expect(mockEmit).toHaveBeenCalledWith(
      'canvas.ghost.positionUpdate',
      expect.objectContaining({ position: { x: 150, y: 250 } }),
    );
  });

  it('creates entity on click in edit mode', () => {
    const tool = createGhostWidgetTool(basePayload, () => mode);
    const event = makePointerEvent();
    tool.onPointerDown(event);

    // Should emit ENTITY_CREATED
    expect(mockEmit).toHaveBeenCalledWith(
      'canvas.entity.created',
      expect.objectContaining({
        type: 'widget',
        widgetId: 'widget-abc',
        transform: expect.objectContaining({
          position: { x: 100, y: 200 },
          size: { width: 400, height: 300 },
        }),
      }),
    );

    // Should emit GHOST_PLACED
    expect(mockEmit).toHaveBeenCalledWith(
      'canvas.ghost.placed',
      expect.objectContaining({ inviteId: 'invite-1' }),
    );

    // Should switch to select tool
    expect(mockEmit).toHaveBeenCalledWith(
      'canvas.tool.changed',
      expect.objectContaining({ tool: 'select' }),
    );
  });

  it('does NOT create entity in preview mode', () => {
    mode = 'preview';
    const tool = createGhostWidgetTool(basePayload, () => mode);
    tool.onPointerDown(makePointerEvent());
    expect(mockEmit).not.toHaveBeenCalledWith(
      'canvas.entity.created',
      expect.anything(),
    );
  });

  it('emits cross-canvas edge request for pipeline mode', () => {
    const tool = createGhostWidgetTool(pipelinePayload, () => mode);
    tool.onPointerDown(makePointerEvent());
    expect(mockEmit).toHaveBeenCalledWith(
      'canvas.pipeline.crossCanvasEdge.requested',
      expect.objectContaining({
        inviteId: 'invite-2',
        sourceCanvasId: 'canvas-source',
        sourceWidgetInstanceId: 'instance-source',
        sourcePortId: 'output-1',
        targetPortId: 'input-1',
      }),
    );
  });

  it('does NOT emit cross-canvas edge for share mode', () => {
    const tool = createGhostWidgetTool(basePayload, () => mode);
    tool.onPointerDown(makePointerEvent());
    expect(mockEmit).not.toHaveBeenCalledWith(
      'canvas.pipeline.crossCanvasEdge.requested',
      expect.anything(),
    );
  });

  it('cancels on Escape key', () => {
    const tool = createGhostWidgetTool(basePayload, () => mode);
    const keyEvent: CanvasKeyEvent = { key: 'Escape', shiftKey: false, ctrlKey: false, metaKey: false };
    tool.onKeyDown!(keyEvent);
    expect(mockEmit).toHaveBeenCalledWith(
      'canvas.tool.changed',
      expect.objectContaining({ tool: 'select' }),
    );
  });

  it('uses default size when manifest has no size info', () => {
    const noSizePayload: GhostWidgetPayload = {
      ...basePayload,
      widgetManifestSnapshot: undefined,
    };
    const tool = createGhostWidgetTool(noSizePayload, () => mode);
    tool.onPointerDown(makePointerEvent());
    expect(mockEmit).toHaveBeenCalledWith(
      'canvas.entity.created',
      expect.objectContaining({
        transform: expect.objectContaining({
          size: { width: 300, height: 200 },
        }),
      }),
    );
  });
});
