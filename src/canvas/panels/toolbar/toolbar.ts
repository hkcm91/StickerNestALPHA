/**
 * Toolbar Controller — tool selector, zoom controls, mode toggle
 *
 * @module canvas/panels/toolbar
 * @layer L4A-4
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export interface ToolbarState {
  activeTool: string;
  mode: 'edit' | 'preview';
  zoom: number;
}

export interface ToolbarController {
  getState(): ToolbarState;
  selectTool(name: string): void;
  toggleMode(): void;
  setMode(mode: 'edit' | 'preview'): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomToFit(): void;
  setZoom(zoom: number): void;
  isActiveInMode(): boolean;
}

export function createToolbarController(getZoom: () => number): ToolbarController {
  let currentZoom = getZoom();

  return {
    getState(): ToolbarState {
      const uiState = useUIStore.getState();
      return {
        activeTool: uiState.activeTool,
        mode: uiState.canvasInteractionMode,
        zoom: currentZoom,
      };
    },

    selectTool(name: string) {
      bus.emit(CanvasEvents.TOOL_CHANGED, { tool: name });
    },

    toggleMode() {
      const current = useUIStore.getState().canvasInteractionMode;
      const next = current === 'edit' ? 'preview' : 'edit';
      bus.emit(CanvasEvents.MODE_CHANGED, { mode: next });
    },

    setMode(mode: 'edit' | 'preview') {
      bus.emit(CanvasEvents.MODE_CHANGED, { mode });
    },

    zoomIn() {
      currentZoom = Math.min(currentZoom * 1.25, 10);
      bus.emit('canvas.viewport.zoom', { zoom: currentZoom });
    },

    zoomOut() {
      currentZoom = Math.max(currentZoom / 1.25, 0.1);
      bus.emit('canvas.viewport.zoom', { zoom: currentZoom });
    },

    zoomToFit() {
      currentZoom = 1;
      bus.emit('canvas.viewport.zoom', { zoom: 1, fit: true });
    },

    setZoom(zoom: number) {
      currentZoom = Math.min(10, Math.max(0.1, zoom));
      bus.emit('canvas.viewport.zoom', { zoom: currentZoom });
    },

    isActiveInMode(): boolean {
      // Toolbar is always visible (shows mode toggle even in preview)
      return true;
    },
  };
}
