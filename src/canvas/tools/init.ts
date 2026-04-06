/**
 * Canvas Tools — initialization
 *
 * Registers all canvas tools and wires bus-based input bridge
 * so L6 (Shell) can forward pointer/key events to tools without
 * importing from this layer directly.
 *
 * @module canvas/tools
 * @layer L4A-2
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import type { SceneGraph } from '../core';

import { createAiTool } from './ai-tool';
import { createDirectSelectTool } from './direct-select';
import { createPathfinderTool } from './pathfinder-tool';
import { createPenTool as createBrushTool } from './pen/brush-tool';
import { createPenPathTool as createPenTool } from './pen-path';
import type { PenToolState as PenPathToolState } from './pen-path';
import { createRazorTool } from './razor';
import { createToolRegistry } from './registry';
import type { ToolRegistry, CanvasPointerEvent, CanvasKeyEvent } from './registry';
import { createResizeTool } from './resize';
import { createSelectTool } from './select';
import { createShapeTool } from './shape';
import { createSlipTool } from './slip';
import { createTextTool } from './text';

/** Tools that receive input via the bus bridge (L6 cannot import L4A-2 directly) */
const BUS_BRIDGED_TOOLS = new Set(['pen', 'direct-select', 'pathfinder', 'ai', 'razor', 'slip']);

export interface CanvasToolsContext {
  registry: ToolRegistry;
  teardownBridge: () => void;
}

let context: CanvasToolsContext | null = null;

export function initCanvasTools(
  sceneGraph: SceneGraph,
  getMode: () => 'edit' | 'preview',
): CanvasToolsContext {
  if (context) return context;

  const registry = createToolRegistry();

  registry.register(createSelectTool(sceneGraph));
  registry.register(createResizeTool(sceneGraph, getMode));
  registry.register(createBrushTool(getMode));
  registry.register(createTextTool(getMode));
  registry.register(createShapeTool('rectangle', getMode));
  registry.register(createShapeTool('ellipse', getMode));
  registry.register(createShapeTool('line', getMode));
  registry.register(createPenTool(getMode));
  registry.register(createDirectSelectTool(sceneGraph, getMode));
  registry.register(createPathfinderTool(sceneGraph, getMode));
  registry.register(createAiTool());
  registry.register(createRazorTool());
  registry.register(createSlipTool());

  registry.activate('select');

  // ── Bus-based input bridge ─────────────────────────────────────
  // L6 (CanvasToolLayer) emits TOOL_INPUT_* bus events.
  // We dispatch them to the active tool here when it's a bridged tool.

  function shouldDispatch(): boolean {
    const active = registry.getActiveName();
    return active !== null && BUS_BRIDGED_TOOLS.has(active);
  }

  const unsubDown = bus.subscribe(
    CanvasEvents.TOOL_INPUT_DOWN,
    (event: { payload: CanvasPointerEvent }) => {
      if (shouldDispatch()) registry.dispatchPointerDown(event.payload);
      emitPenPathPreview();
    },
  );

  const unsubMove = bus.subscribe(
    CanvasEvents.TOOL_INPUT_MOVE,
    (event: { payload: CanvasPointerEvent }) => {
      if (shouldDispatch()) registry.dispatchPointerMove(event.payload);
      emitPenPathPreview();
    },
  );

  const unsubUp = bus.subscribe(
    CanvasEvents.TOOL_INPUT_UP,
    (event: { payload: CanvasPointerEvent }) => {
      if (shouldDispatch()) registry.dispatchPointerUp(event.payload);
      emitPenPathPreview();
    },
  );

  const unsubKey = bus.subscribe(
    CanvasEvents.TOOL_INPUT_KEY,
    (event: { payload: CanvasKeyEvent }) => {
      if (shouldDispatch()) registry.dispatchKeyDown(event.payload);
      emitPenPathPreview();
    },
  );

  // Emit pen-path preview state when the tool is active
  function emitPenPathPreview(): void {
    if (registry.getActiveName() !== 'pen') return;
    const tool = registry.getTool('pen') as
      | (ReturnType<typeof createPenTool>)
      | undefined;
    if (!tool) return;
    const state: PenPathToolState = tool.getToolState();
    bus.emit(CanvasEvents.PEN_PATH_PREVIEW, state);
  }

  // Activate tools when TOOL_CHANGED fires from the shell.
  // All registered tools are activated; BUS_BRIDGED_TOOLS only gates
  // input dispatch (pointer/key events), not activation.
  const unsubToolChanged = bus.subscribe(
    CanvasEvents.TOOL_CHANGED,
    (event: { payload: { tool: string } }) => {
      const toolName = event.payload.tool;
      if (registry.getTool(toolName)) {
        registry.activate(toolName);
      }
    },
  );

  function teardownBridge() {
    unsubDown();
    unsubMove();
    unsubUp();
    unsubKey();
    unsubToolChanged();
  }

  context = { registry, teardownBridge };
  return context;
}

export function teardownCanvasTools(): void {
  if (context) {
    context.teardownBridge();
  }
  context = null;
}

export function isCanvasToolsInitialized(): boolean {
  return context !== null;
}
