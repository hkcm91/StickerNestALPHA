/**
 * AI Tool — On-canvas AI widget generation
 *
 * When active, clicking on the canvas opens an AI input panel at the
 * click position. The user types a prompt, AI generates a widget, and
 * the widget is placed at the clicked position.
 *
 * @module canvas/tools/ai-tool
 * @layer L4A-2
 */

import type { Point2D } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { CanvasPointerEvent, Tool } from '../registry/tool-registry';

/** Bus event: AI tool clicked on canvas — opens AI input panel */
export const AI_TOOL_PANEL_OPEN = 'canvas.ai.panel.open';

/** Bus event: AI generation completed — widget ready for placement */
export const AI_TOOL_GENERATED = 'canvas.ai.generated';

/** Bus event: AI tool cancelled or deactivated */
export const AI_TOOL_CANCELLED = 'canvas.ai.cancelled';

export interface AiToolState {
  clickPosition: Point2D | null;
  isActive: boolean;
}

/**
 * Creates the AI canvas tool.
 */
export function createAiTool(): Tool {
  const state: AiToolState = {
    clickPosition: null,
    isActive: false,
  };

  return {
    name: 'ai',

    onActivate() {
      state.isActive = true;
      state.clickPosition = null;
      bus.emit('canvas.tool.activated', { tool: 'ai' });
    },

    onDeactivate() {
      state.isActive = false;
      state.clickPosition = null;
      bus.emit(AI_TOOL_CANCELLED, {});
      bus.emit('canvas.tool.deactivated', { tool: 'ai' });
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (!state.isActive) return;
      // Only open panel when clicking on empty canvas (no entity)
      if (event.entityId) return;

      state.clickPosition = { ...event.canvasPosition };
      bus.emit(AI_TOOL_PANEL_OPEN, {
        canvasPosition: state.clickPosition,
        screenPosition: event.screenPosition,
      });
    },

    onPointerMove() {
      // AI tool doesn't track pointer moves
    },

    onPointerUp() {
      // No action on pointer up
    },

    cancel() {
      state.clickPosition = null;
      bus.emit(AI_TOOL_CANCELLED, {});
    },
  };
}
