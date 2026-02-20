/**
 * Floating Action Bar Controller — near-selection actions
 *
 * @module canvas/panels/floating-bar
 * @layer L4A-4
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export interface FloatingAction {
  id: string;
  label: string;
  action: string;
}

export interface FloatingActionBarController {
  getActions(selectedCount: number): FloatingAction[];
  executeAction(action: string, entityIds: string[]): void;
  isActiveInMode(): boolean;
}

export function createFloatingActionBarController(): FloatingActionBarController {
  return {
    getActions(selectedCount: number): FloatingAction[] {
      if (selectedCount === 0) return [];
      const actions: FloatingAction[] = [
        { id: 'delete', label: 'Delete', action: 'delete' },
        { id: 'duplicate', label: 'Duplicate', action: 'duplicate' },
        { id: 'bring-front', label: 'Bring to Front', action: 'bringToFront' },
        { id: 'send-back', label: 'Send to Back', action: 'sendToBack' },
      ];
      if (selectedCount > 1) {
        actions.push({ id: 'group', label: 'Group', action: 'group' });
      }
      return actions;
    },

    executeAction(action: string, entityIds: string[]) {
      switch (action) {
        case 'delete':
          for (const id of entityIds) {
            bus.emit(CanvasEvents.ENTITY_DELETED, { id });
          }
          break;
        case 'duplicate':
          for (const id of entityIds) {
            bus.emit('canvas.entity.duplicate', { id });
          }
          break;
        case 'bringToFront':
          for (const id of entityIds) {
            bus.emit('canvas.entity.bringToFront', { id });
          }
          break;
        case 'sendToBack':
          for (const id of entityIds) {
            bus.emit('canvas.entity.sendToBack', { id });
          }
          break;
        case 'group':
          bus.emit('canvas.entity.group', { entityIds });
          break;
      }
    },

    isActiveInMode(): boolean {
      return useUIStore.getState().canvasInteractionMode === 'edit';
    },
  };
}
