/**
 * Tool Registry — manages canvas tool lifecycle and dispatching
 *
 * @module canvas/tools/registry
 * @layer L4A-2
 */

import type { Point2D } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

export interface CanvasPointerEvent {
  canvasPosition: Point2D;
  screenPosition: Point2D;
  entityId: string | null;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export interface CanvasKeyEvent {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export interface Tool {
  name: string;
  onActivate(): void;
  onDeactivate(): void;
  onPointerDown(event: CanvasPointerEvent): void;
  onPointerMove(event: CanvasPointerEvent): void;
  onPointerUp(event: CanvasPointerEvent): void;
  onKeyDown?(event: CanvasKeyEvent): void;
  cancel(): void;
}

export interface ToolRegistry {
  register(tool: Tool): void;
  unregister(name: string): void;
  activate(name: string): void;
  getActive(): Tool | null;
  getActiveName(): string | null;
  getTool(name: string): Tool | undefined;
  dispatchPointerDown(event: CanvasPointerEvent): void;
  dispatchPointerMove(event: CanvasPointerEvent): void;
  dispatchPointerUp(event: CanvasPointerEvent): void;
  dispatchKeyDown(event: CanvasKeyEvent): void;
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, Tool>();
  let activeTool: Tool | null = null;

  return {
    register(tool: Tool) {
      tools.set(tool.name, tool);
    },

    unregister(name: string) {
      if (activeTool?.name === name) {
        activeTool.cancel();
        activeTool.onDeactivate();
        activeTool = null;
      }
      tools.delete(name);
    },

    activate(name: string) {
      const tool = tools.get(name);
      if (!tool) return;
      if (activeTool) {
        activeTool.cancel();
        activeTool.onDeactivate();
      }
      activeTool = tool;
      activeTool.onActivate();
      bus.emit(CanvasEvents.TOOL_CHANGED, { tool: name });
    },

    getActive() {
      return activeTool;
    },

    getActiveName() {
      return activeTool?.name ?? null;
    },

    getTool(name: string) {
      return tools.get(name);
    },

    dispatchPointerDown(event: CanvasPointerEvent) {
      activeTool?.onPointerDown(event);
    },

    dispatchPointerMove(event: CanvasPointerEvent) {
      activeTool?.onPointerMove(event);
    },

    dispatchPointerUp(event: CanvasPointerEvent) {
      activeTool?.onPointerUp(event);
    },

    dispatchKeyDown(event: CanvasKeyEvent) {
      activeTool?.onKeyDown?.(event);
    },
  };
}
