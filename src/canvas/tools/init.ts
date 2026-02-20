/**
 * Canvas Tools — initialization
 *
 * @module canvas/tools
 * @layer L4A-2
 */

import type { SceneGraph } from '../core';

import { createMoveTool } from './move';
import { createPenTool } from './pen';
import { createToolRegistry } from './registry';
import type { ToolRegistry } from './registry';
import { createResizeTool } from './resize';
import { createSelectTool } from './select';
import { createShapeTool } from './shape';
import { createTextTool } from './text';

export interface CanvasToolsContext {
  registry: ToolRegistry;
}

let context: CanvasToolsContext | null = null;

export function initCanvasTools(
  sceneGraph: SceneGraph,
  getMode: () => 'edit' | 'preview',
): CanvasToolsContext {
  if (context) return context;

  const registry = createToolRegistry();

  registry.register(createSelectTool(sceneGraph));
  registry.register(createMoveTool(sceneGraph, getMode));
  registry.register(createResizeTool(sceneGraph, getMode));
  registry.register(createPenTool(getMode));
  registry.register(createTextTool(getMode));
  registry.register(createShapeTool('rectangle', getMode));
  registry.register(createShapeTool('ellipse', getMode));
  registry.register(createShapeTool('line', getMode));

  registry.activate('select');

  context = { registry };
  return context;
}

export function teardownCanvasTools(): void {
  context = null;
}

export function isCanvasToolsInitialized(): boolean {
  return context !== null;
}
