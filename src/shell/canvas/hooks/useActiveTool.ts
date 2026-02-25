/**
 * React hook for active tool state.
 * Reads from uiStore (same source as Toolbar) and interaction store.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import { useCallback } from 'react';

import { useInteractionStore } from '../../../canvas/core';
import type { InteractionMode } from '../../../canvas/core';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export type CanvasToolId =
  | 'select'
  | 'pan'
  | 'move'
  | 'resize'
  | 'pen'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'sticker'
  | 'widget';

/**
 * Set the active tool in uiStore (callable outside React).
 */
export function setActiveTool(tool: CanvasToolId) {
  useUIStore.getState().setActiveTool(tool);
}

/**
 * Hook returning active tool and interaction mode.
 * Reads from uiStore — the same source Toolbar uses.
 */
export function useActiveTool() {
  const activeTool = useUIStore((s) => s.activeTool) as CanvasToolId;
  const mode: InteractionMode = useInteractionStore((s) => s.mode);
  const toolsEnabled = useInteractionStore((s) => s.toolsEnabled);

  const setTool = useCallback((t: CanvasToolId) => {
    if (!useInteractionStore.getState().toolsEnabled) return;
    setActiveTool(t);
  }, []);

  return { activeTool, tool: activeTool, mode, toolsEnabled, setTool };
}
