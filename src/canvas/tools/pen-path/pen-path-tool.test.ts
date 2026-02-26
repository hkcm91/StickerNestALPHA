/**
 * Pen Path Tool tests
 * @module canvas/tools/pen-path/test
 * @layer L4A-2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { CanvasPointerEvent, CanvasKeyEvent } from '../registry';

import { createPenPathTool } from './pen-path-tool';

// Mock bus.emit
vi.mock('../../../kernel/bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    unsubscribe: vi.fn(),
  },
}));

function makePointerEvent(
  x: number,
  y: number,
  overrides: Partial<CanvasPointerEvent> = {},
): CanvasPointerEvent {
  return {
    canvasPosition: { x, y },
    screenPosition: { x, y },
    entityId: null,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
  };
}

function makeKeyEvent(key: string, overrides: Partial<CanvasKeyEvent> = {}): CanvasKeyEvent {
  return {
    key,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
  };
}

describe('PenPathTool', () => {
  let getMode: () => 'edit' | 'preview';
  let tool: ReturnType<typeof createPenPathTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    getMode = () => 'edit';
    tool = createPenPathTool(getMode);
    tool.onActivate();
  });

  describe('state initialization', () => {
    it('should start in idle state with no anchors', () => {
      const state = tool.getToolState();
      expect(state.state).toBe('idle');
      expect(state.anchors).toHaveLength(0);
      expect(state.mousePosition).toBeNull();
    });
  });

  describe('click to place corner anchor', () => {
    it('should add a corner anchor on click (pointerDown + pointerUp at same position)', () => {
      tool.onPointerDown(makePointerEvent(100, 200));
      tool.onPointerUp(makePointerEvent(100, 200));

      const state = tool.getToolState();
      expect(state.anchors).toHaveLength(1);
      expect(state.anchors[0].position).toEqual({ x: 100, y: 200 });
      expect(state.anchors[0].pointType).toBe('corner');
      expect(state.anchors[0].handleIn).toBeUndefined();
      expect(state.anchors[0].handleOut).toBeUndefined();
    });

    it('should add multiple corner anchors with successive clicks', () => {
      // First click
      tool.onPointerDown(makePointerEvent(100, 100));
      tool.onPointerUp(makePointerEvent(100, 100));

      // Second click
      tool.onPointerDown(makePointerEvent(200, 100));
      tool.onPointerUp(makePointerEvent(200, 100));

      // Third click
      tool.onPointerDown(makePointerEvent(200, 200));
      tool.onPointerUp(makePointerEvent(200, 200));

      const state = tool.getToolState();
      expect(state.anchors).toHaveLength(3);
    });
  });

  describe('click + drag to place smooth anchor', () => {
    it('should create a smooth anchor with mirrored handles on drag', () => {
      // Place first anchor
      tool.onPointerDown(makePointerEvent(100, 100));
      tool.onPointerUp(makePointerEvent(100, 100));

      // Click and drag to create smooth anchor
      tool.onPointerDown(makePointerEvent(200, 100));
      // Drag far enough to exceed threshold
      tool.onPointerMove(makePointerEvent(250, 100));
      tool.onPointerUp(makePointerEvent(250, 100));

      const state = tool.getToolState();
      expect(state.anchors).toHaveLength(2);

      const smoothAnchor = state.anchors[1];
      expect(smoothAnchor.pointType).toBe('smooth');
      expect(smoothAnchor.position).toEqual({ x: 200, y: 100 });
      // handleOut points towards drag direction (right)
      expect(smoothAnchor.handleOut).toEqual({ x: 50, y: 0 });
      // handleIn is the mirror (left)
      expect(smoothAnchor.handleIn).toEqual({ x: -50, y: 0 });
    });

    it('should not convert to smooth if drag distance is below threshold', () => {
      tool.onPointerDown(makePointerEvent(100, 100));
      // Tiny drag (< 4px)
      tool.onPointerMove(makePointerEvent(102, 101));
      tool.onPointerUp(makePointerEvent(102, 101));

      const state = tool.getToolState();
      expect(state.anchors[0].pointType).toBe('corner');
    });
  });

  describe('closing the path', () => {
    it('should close the path when clicking near the first anchor', () => {
      // Place 3 anchors
      tool.onPointerDown(makePointerEvent(100, 100));
      tool.onPointerUp(makePointerEvent(100, 100));

      tool.onPointerDown(makePointerEvent(200, 100));
      tool.onPointerUp(makePointerEvent(200, 100));

      tool.onPointerDown(makePointerEvent(150, 200));
      tool.onPointerUp(makePointerEvent(150, 200));

      // Click near first anchor to close (within 8px)
      tool.onPointerDown(makePointerEvent(103, 102));
      tool.onPointerUp(makePointerEvent(103, 102));

      // Should have emitted ENTITY_CREATED with closed: true
      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_CREATED,
        expect.objectContaining({
          type: 'path',
          closed: true,
          fill: '#cccccc',
        }),
      );

      // State should be reset
      const state = tool.getToolState();
      expect(state.anchors).toHaveLength(0);
      expect(state.state).toBe('idle');
    });
  });

  describe('committing open path', () => {
    it('should commit open path on Escape with >= 2 anchors', () => {
      tool.onPointerDown(makePointerEvent(0, 0));
      tool.onPointerUp(makePointerEvent(0, 0));

      tool.onPointerDown(makePointerEvent(100, 50));
      tool.onPointerUp(makePointerEvent(100, 50));

      tool.onKeyDown!(makeKeyEvent('Escape'));

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_CREATED,
        expect.objectContaining({
          type: 'path',
          closed: false,
          fill: null,
        }),
      );

      const state = tool.getToolState();
      expect(state.anchors).toHaveLength(0);
    });

    it('should commit open path on Enter', () => {
      tool.onPointerDown(makePointerEvent(10, 10));
      tool.onPointerUp(makePointerEvent(10, 10));

      tool.onPointerDown(makePointerEvent(110, 10));
      tool.onPointerUp(makePointerEvent(110, 10));

      tool.onKeyDown!(makeKeyEvent('Enter'));

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_CREATED,
        expect.objectContaining({ type: 'path' }),
      );
    });

    it('should discard on Escape with < 2 anchors', () => {
      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));

      tool.onKeyDown!(makeKeyEvent('Escape'));

      // Should NOT emit ENTITY_CREATED
      expect(bus.emit).not.toHaveBeenCalledWith(
        CanvasEvents.ENTITY_CREATED,
        expect.anything(),
      );

      const state = tool.getToolState();
      expect(state.anchors).toHaveLength(0);
    });
  });

  describe('Backspace to remove last anchor', () => {
    it('should remove the last anchor on Backspace', () => {
      tool.onPointerDown(makePointerEvent(0, 0));
      tool.onPointerUp(makePointerEvent(0, 0));

      tool.onPointerDown(makePointerEvent(100, 100));
      tool.onPointerUp(makePointerEvent(100, 100));

      tool.onPointerDown(makePointerEvent(200, 0));
      tool.onPointerUp(makePointerEvent(200, 0));

      expect(tool.getToolState().anchors).toHaveLength(3);

      tool.onKeyDown!(makeKeyEvent('Backspace'));
      expect(tool.getToolState().anchors).toHaveLength(2);

      tool.onKeyDown!(makeKeyEvent('Backspace'));
      expect(tool.getToolState().anchors).toHaveLength(1);
    });

    it('should cancel path on Backspace when only 1 anchor remains', () => {
      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));

      expect(tool.getToolState().anchors).toHaveLength(1);

      tool.onKeyDown!(makeKeyEvent('Backspace'));
      expect(tool.getToolState().anchors).toHaveLength(0);
      expect(tool.getToolState().state).toBe('idle');
    });
  });

  describe('entity creation payload', () => {
    it('should emit entity with normalized local coordinates', () => {
      // Place anchors at known positions
      tool.onPointerDown(makePointerEvent(50, 100));
      tool.onPointerUp(makePointerEvent(50, 100));

      tool.onPointerDown(makePointerEvent(150, 100));
      tool.onPointerUp(makePointerEvent(150, 100));

      tool.onKeyDown!(makeKeyEvent('Escape'));

      const call = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[0] === CanvasEvents.ENTITY_CREATED,
      );
      expect(call).toBeDefined();

      const payload = call![1];
      // Entity position should be the bounding box min
      expect(payload.transform.position.x).toBe(50);
      expect(payload.transform.position.y).toBe(100);
      expect(payload.transform.size.width).toBe(100);

      // Anchors should be in local coords (relative to entity position)
      expect(payload.anchors[0].position.x).toBe(0); // 50 - 50
      expect(payload.anchors[0].position.y).toBe(0); // 100 - 100
      expect(payload.anchors[1].position.x).toBe(100); // 150 - 50
      expect(payload.anchors[1].position.y).toBe(0); // 100 - 100
    });

    it('should set strokeWidth to 2 and stroke to #000000', () => {
      tool.onPointerDown(makePointerEvent(0, 0));
      tool.onPointerUp(makePointerEvent(0, 0));

      tool.onPointerDown(makePointerEvent(100, 0));
      tool.onPointerUp(makePointerEvent(100, 0));

      tool.onKeyDown!(makeKeyEvent('Escape'));

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_CREATED,
        expect.objectContaining({
          stroke: '#000000',
          strokeWidth: 2,
        }),
      );
    });
  });

  describe('preview mode', () => {
    it('should not place anchors in preview mode', () => {
      getMode = () => 'preview';
      tool = createPenPathTool(getMode);
      tool.onActivate();

      tool.onPointerDown(makePointerEvent(100, 100));
      tool.onPointerUp(makePointerEvent(100, 100));

      expect(tool.getToolState().anchors).toHaveLength(0);
    });
  });

  describe('cancel / deactivate', () => {
    it('should auto-commit on cancel if >= 2 anchors', () => {
      tool.onPointerDown(makePointerEvent(0, 0));
      tool.onPointerUp(makePointerEvent(0, 0));

      tool.onPointerDown(makePointerEvent(100, 50));
      tool.onPointerUp(makePointerEvent(100, 50));

      tool.cancel();

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_CREATED,
        expect.objectContaining({ type: 'path' }),
      );
    });

    it('should discard on cancel if < 2 anchors', () => {
      tool.onPointerDown(makePointerEvent(50, 50));
      tool.onPointerUp(makePointerEvent(50, 50));

      tool.cancel();

      expect(bus.emit).not.toHaveBeenCalledWith(
        CanvasEvents.ENTITY_CREATED,
        expect.anything(),
      );
    });

    it('should auto-commit on deactivate if >= 2 anchors', () => {
      tool.onPointerDown(makePointerEvent(0, 0));
      tool.onPointerUp(makePointerEvent(0, 0));

      tool.onPointerDown(makePointerEvent(100, 0));
      tool.onPointerUp(makePointerEvent(100, 0));

      tool.onDeactivate();

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasEvents.ENTITY_CREATED,
        expect.objectContaining({ type: 'path' }),
      );
    });
  });

  describe('mouse position tracking', () => {
    it('should track mouse position for rubber-band preview', () => {
      tool.onPointerDown(makePointerEvent(100, 100));
      tool.onPointerUp(makePointerEvent(100, 100));

      tool.onPointerMove(makePointerEvent(200, 150));

      expect(tool.getToolState().mousePosition).toEqual({ x: 200, y: 150 });
    });
  });
});
