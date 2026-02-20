import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { createToolRegistry } from './tool-registry';
import type { Tool, CanvasPointerEvent } from './tool-registry';

function makeMockTool(name: string): Tool {
  return {
    name,
    onActivate: vi.fn(),
    onDeactivate: vi.fn(),
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onKeyDown: vi.fn(),
    cancel: vi.fn(),
  };
}

function makeEvent(x = 0, y = 0): CanvasPointerEvent {
  return {
    canvasPosition: { x, y },
    screenPosition: { x, y },
    entityId: null,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  };
}

describe('ToolRegistry', () => {
  beforeEach(() => {
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  it('registers and activates a tool', () => {
    const registry = createToolRegistry();
    const tool = makeMockTool('select');
    registry.register(tool);
    registry.activate('select');
    expect(registry.getActiveName()).toBe('select');
    expect(tool.onActivate).toHaveBeenCalledTimes(1);
  });

  it('deactivates previous tool on switch', () => {
    const registry = createToolRegistry();
    const tool1 = makeMockTool('select');
    const tool2 = makeMockTool('move');
    registry.register(tool1);
    registry.register(tool2);
    registry.activate('select');
    registry.activate('move');
    expect(tool1.cancel).toHaveBeenCalledTimes(1);
    expect(tool1.onDeactivate).toHaveBeenCalledTimes(1);
    expect(tool2.onActivate).toHaveBeenCalledTimes(1);
  });

  it('emits TOOL_CHANGED on activate', () => {
    const registry = createToolRegistry();
    const handler = vi.fn();
    bus.subscribe(CanvasEvents.TOOL_CHANGED, handler);
    registry.register(makeMockTool('select'));
    registry.activate('select');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ tool: 'select' });
  });

  it('dispatches pointer events to active tool', () => {
    const registry = createToolRegistry();
    const tool = makeMockTool('select');
    registry.register(tool);
    registry.activate('select');
    const event = makeEvent(10, 20);
    registry.dispatchPointerDown(event);
    registry.dispatchPointerMove(event);
    registry.dispatchPointerUp(event);
    expect(tool.onPointerDown).toHaveBeenCalledTimes(1);
    expect(tool.onPointerMove).toHaveBeenCalledTimes(1);
    expect(tool.onPointerUp).toHaveBeenCalledTimes(1);
  });

  it('dispatches key events to active tool', () => {
    const registry = createToolRegistry();
    const tool = makeMockTool('select');
    registry.register(tool);
    registry.activate('select');
    registry.dispatchKeyDown({ key: 'Delete', shiftKey: false, ctrlKey: false, metaKey: false });
    expect(tool.onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('unregister removes tool and deactivates if active', () => {
    const registry = createToolRegistry();
    const tool = makeMockTool('select');
    registry.register(tool);
    registry.activate('select');
    registry.unregister('select');
    expect(registry.getActive()).toBeNull();
    expect(tool.cancel).toHaveBeenCalled();
  });

  it('getActive returns null when no tool is active', () => {
    const registry = createToolRegistry();
    expect(registry.getActive()).toBeNull();
  });
});
