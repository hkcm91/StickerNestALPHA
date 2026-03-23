/**
 * Cross-Canvas Edge Handler tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { derivePipelineChannelName, handleCrossCanvasEdgeRequest } from './cross-canvas-edge-handler';

vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn().mockReturnValue(() => {}) },
}));

describe('Cross-Canvas Edge Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('derivePipelineChannelName', () => {
    it('builds a valid channel name from canvas, instance, and port IDs', () => {
      const channel = derivePipelineChannelName('canvas-1', 'widget-inst-1', 'output-port');
      expect(channel).toBe('pipeline.canvas-1.widget-inst-1.output-port');
    });
  });

  describe('handleCrossCanvasEdgeRequest', () => {
    it('returns the payload when all source fields are present', () => {
      const event = {
        type: 'canvas.pipeline.crossCanvasEdge.requested',
        payload: {
          inviteId: 'invite-1',
          sourceCanvasId: 'canvas-source',
          sourceWidgetInstanceId: 'instance-source',
          sourcePortId: 'output-1',
          targetPortId: 'input-1',
          targetPosition: { x: 100, y: 200 },
        },
      };
      const result = handleCrossCanvasEdgeRequest(event);
      expect(result).not.toBeNull();
      expect(result!.inviteId).toBe('invite-1');
      expect(result!.sourceCanvasId).toBe('canvas-source');
    });

    it('returns null when sourceCanvasId is missing', () => {
      const event = {
        type: 'canvas.pipeline.crossCanvasEdge.requested',
        payload: {
          inviteId: 'invite-1',
          sourceWidgetInstanceId: 'instance-source',
          sourcePortId: 'output-1',
          targetPosition: { x: 0, y: 0 },
        },
      };
      const result = handleCrossCanvasEdgeRequest(event);
      expect(result).toBeNull();
    });

    it('returns null when sourceWidgetInstanceId is missing', () => {
      const event = {
        type: 'canvas.pipeline.crossCanvasEdge.requested',
        payload: {
          inviteId: 'invite-1',
          sourceCanvasId: 'canvas-source',
          sourcePortId: 'output-1',
          targetPosition: { x: 0, y: 0 },
        },
      };
      const result = handleCrossCanvasEdgeRequest(event);
      expect(result).toBeNull();
    });

    it('returns null when sourcePortId is missing', () => {
      const event = {
        type: 'canvas.pipeline.crossCanvasEdge.requested',
        payload: {
          inviteId: 'invite-1',
          sourceCanvasId: 'canvas-source',
          sourceWidgetInstanceId: 'instance-source',
          targetPosition: { x: 0, y: 0 },
        },
      };
      const result = handleCrossCanvasEdgeRequest(event);
      expect(result).toBeNull();
    });
  });
});
