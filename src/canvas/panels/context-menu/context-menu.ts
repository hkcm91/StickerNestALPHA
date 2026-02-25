/**
 * Context Menu Controller — right-click actions for entities/canvas
 *
 * @module canvas/panels/context-menu
 * @layer L4A-4
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export interface ContextMenuItem {
  id: string;
  label: string;
  action: string;
  disabled: boolean;
}

export interface ContextMenuState {
  visible: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  targetEntityId: string | null;
}

export interface ContextMenuController {
  getEntityMenuItems(entityId: string): ContextMenuItem[];
  getCanvasMenuItems(): ContextMenuItem[];
  executeAction(action: string, entityId: string | null): void;
  isActiveInMode(): boolean;
}

export function createContextMenuController(): ContextMenuController {
  return {
    getEntityMenuItems(_entityId: string): ContextMenuItem[] {
      return [
        { id: 'cut', label: 'Cut', action: 'cut', disabled: false },
        { id: 'copy', label: 'Copy', action: 'copy', disabled: false },
        { id: 'delete', label: 'Delete', action: 'delete', disabled: false },
        { id: 'bring-front', label: 'Bring to Front', action: 'bringToFront', disabled: false },
        { id: 'send-back', label: 'Send to Back', action: 'sendToBack', disabled: false },
        { id: 'lock', label: 'Lock', action: 'lock', disabled: false },
      ];
    },

    getCanvasMenuItems(): ContextMenuItem[] {
      return [
        { id: 'paste', label: 'Paste', action: 'paste', disabled: false },
        { id: 'select-all', label: 'Select All', action: 'selectAll', disabled: false },
      ];
    },

    executeAction(action: string, entityId: string | null) {
      switch (action) {
        case 'delete':
          if (entityId) bus.emit(CanvasEvents.ENTITY_DELETED, { id: entityId });
          break;
        case 'bringToFront':
          if (entityId) bus.emit('canvas.entity.bringToFront', { id: entityId });
          break;
        case 'sendToBack':
          if (entityId) bus.emit('canvas.entity.sendToBack', { id: entityId });
          break;
        case 'lock':
          if (entityId) bus.emit(CanvasEvents.ENTITY_UPDATED, { id: entityId, updates: { locked: true } });
          break;
        case 'selectAll':
          bus.emit(CanvasEvents.SELECTION_CLEARED, {});
          bus.emit('canvas.entity.selectAll', {});
          break;
      }
    },

    isActiveInMode(): boolean {
      return useUIStore.getState().canvasInteractionMode === 'edit';
    },
  };
}
