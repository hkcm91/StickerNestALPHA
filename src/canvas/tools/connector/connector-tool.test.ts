/**
 * Connector Tool — unit tests
 * @module canvas/tools/connector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CanvasEvents } from '@sn/types';

vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn() },
}));

import { bus } from '../../../kernel/bus';

import { createConnectorTool } from './connector-tool';

describe('connector-tool', () => {
  const getMode = () => 'edit' as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a connector on drag from point A to point B', () => {
    const tool = createConnectorTool(getMode);
    tool.onActivate();

    tool.onPointerDown({
      canvasPosition: { x: 100, y: 100 },
      screenPosition: { x: 100, y: 100 },
      entityId: 'entity-a',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    tool.onPointerUp({
      canvasPosition: { x: 300, y: 200 },
      screenPosition: { x: 300, y: 200 },
      entityId: 'entity-b',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.ENTITY_CREATED,
      expect.objectContaining({
        type: 'connector',
        sourceEntityId: 'entity-a',
        targetEntityId: 'entity-b',
        sourcePoint: { x: 100, y: 100 },
        targetPoint: { x: 300, y: 200 },
        lineStyle: 'curved',
        arrowHead: 'arrow',
      }),
    );
  });

  it('should create a freeform connector when no entity is targeted', () => {
    const tool = createConnectorTool(getMode);
    tool.onActivate();

    tool.onPointerDown({
      canvasPosition: { x: 50, y: 50 },
      screenPosition: { x: 50, y: 50 },
      entityId: null,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    tool.onPointerUp({
      canvasPosition: { x: 200, y: 150 },
      screenPosition: { x: 200, y: 150 },
      entityId: null,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.ENTITY_CREATED,
      expect.objectContaining({
        type: 'connector',
        sourceEntityId: null,
        targetEntityId: null,
      }),
    );
  });

  it('should not create a connector for very short drags (< 4px)', () => {
    const tool = createConnectorTool(getMode);
    tool.onActivate();

    tool.onPointerDown({
      canvasPosition: { x: 100, y: 100 },
      screenPosition: { x: 100, y: 100 },
      entityId: null,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    tool.onPointerUp({
      canvasPosition: { x: 102, y: 101 },
      screenPosition: { x: 102, y: 101 },
      entityId: null,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    expect(bus.emit).not.toHaveBeenCalled();
  });

  it('should not create a connector in preview mode', () => {
    const tool = createConnectorTool(() => 'preview');
    tool.onActivate();

    tool.onPointerDown({
      canvasPosition: { x: 100, y: 100 },
      screenPosition: { x: 100, y: 100 },
      entityId: 'entity-a',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    tool.onPointerUp({
      canvasPosition: { x: 300, y: 200 },
      screenPosition: { x: 300, y: 200 },
      entityId: 'entity-b',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    expect(bus.emit).not.toHaveBeenCalled();
  });

  it('should use custom options when provided', () => {
    const tool = createConnectorTool(getMode, {
      lineStyle: 'orthogonal',
      arrowHead: 'diamond',
      strokeColor: '#ff0000',
      strokeWidth: 4,
    });
    tool.onActivate();

    tool.onPointerDown({
      canvasPosition: { x: 0, y: 0 },
      screenPosition: { x: 0, y: 0 },
      entityId: null,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    tool.onPointerUp({
      canvasPosition: { x: 100, y: 100 },
      screenPosition: { x: 100, y: 100 },
      entityId: null,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.ENTITY_CREATED,
      expect.objectContaining({
        lineStyle: 'orthogonal',
        arrowHead: 'diamond',
        strokeColor: '#ff0000',
        strokeWidth: 4,
      }),
    );
  });

  it('should clear state on cancel', () => {
    const tool = createConnectorTool(getMode);
    tool.onActivate();

    tool.onPointerDown({
      canvasPosition: { x: 100, y: 100 },
      screenPosition: { x: 100, y: 100 },
      entityId: 'entity-a',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    tool.cancel();

    // After cancel, pointer up should do nothing since source was cleared
    tool.onPointerUp({
      canvasPosition: { x: 300, y: 200 },
      screenPosition: { x: 300, y: 200 },
      entityId: 'entity-b',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    expect(bus.emit).not.toHaveBeenCalled();
  });
});
