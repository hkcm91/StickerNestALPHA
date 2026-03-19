/**
 * Canvas Panels — initialization
 *
 * @module canvas/panels
 * @layer L4A-4
 */

import { createAssetPanelController } from './assets';
import type { AssetPanelController } from './assets';
import { createContextMenuController } from './context-menu';
import type { ContextMenuController } from './context-menu';
import { createFloatingActionBarController } from './floating-bar';
import type { FloatingActionBarController } from './floating-bar';
import type { LayersController } from './layers';
import { createLayersController } from './layers';
import type { MinimapController } from './minimap';
import { createMinimapController } from './minimap';
import type { PipelineInspectorController } from './pipeline-inspector';
import { createPipelineInspectorController } from './pipeline-inspector';
import type { PropertiesController } from './properties';
import { createPropertiesController } from './properties';
import type { ToolbarController } from './toolbar';
import { createToolbarController } from './toolbar';

export interface CanvasPanelsContext {
  toolbar: ToolbarController;
  properties: PropertiesController;
  layers: LayersController;
  assets: AssetPanelController;
  pipelineInspector: PipelineInspectorController;
  contextMenu: ContextMenuController;
  floatingBar: FloatingActionBarController;
  minimap: MinimapController;
}

let context: CanvasPanelsContext | null = null;

export function initCanvasPanels(getZoom: () => number): CanvasPanelsContext {
  if (context) return context;

  context = {
    toolbar: createToolbarController(getZoom),
    properties: createPropertiesController(),
    layers: createLayersController(),
    assets: createAssetPanelController(),
    pipelineInspector: createPipelineInspectorController(),
    contextMenu: createContextMenuController(),
    floatingBar: createFloatingActionBarController(),
    minimap: createMinimapController(),
  };

  return context;
}

export function teardownCanvasPanels(): void {
  context = null;
}

export function isCanvasPanelsInitialized(): boolean {
  return context !== null;
}

export function getCanvasPanelsContext(): CanvasPanelsContext | null {
  return context;
}
