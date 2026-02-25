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
        { id: 'ungroup', label: 'Ungroup', action: 'ungroup' },
      ];
      if (selectedCount === 1) {
        actions.push(
          { id: 'crop', label: 'Crop', action: 'crop' },
          { id: 'reset-crop', label: 'Reset Crop', action: 'resetCrop' },
        );
      }
      if (selectedCount > 1) {
        actions.push(
          { id: 'group', label: 'Group', action: 'group' },
          { id: 'align-left', label: 'Align Left', action: 'alignLeft' },
          { id: 'align-center-h', label: 'Align Center H', action: 'alignCenterH' },
          { id: 'align-right', label: 'Align Right', action: 'alignRight' },
          { id: 'align-top', label: 'Align Top', action: 'alignTop' },
          { id: 'align-center-v', label: 'Align Center V', action: 'alignCenterV' },
          { id: 'align-bottom', label: 'Align Bottom', action: 'alignBottom' },
        );
      }
      if (selectedCount > 2) {
        actions.push(
          { id: 'distribute-h', label: 'Distribute H', action: 'distributeH' },
          { id: 'distribute-v', label: 'Distribute V', action: 'distributeV' },
        );
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
        case 'ungroup':
          bus.emit('canvas.entity.ungroup', { entityIds });
          break;
        case 'crop':
          bus.emit('canvas.crop.toggle', { entityIds });
          break;
        case 'resetCrop':
          bus.emit('canvas.crop.reset', { entityIds });
          break;
        case 'alignLeft':
          bus.emit('canvas.align.left', { entityIds });
          break;
        case 'alignRight':
          bus.emit('canvas.align.right', { entityIds });
          break;
        case 'alignTop':
          bus.emit('canvas.align.top', { entityIds });
          break;
        case 'alignBottom':
          bus.emit('canvas.align.bottom', { entityIds });
          break;
        case 'alignCenterH':
          bus.emit('canvas.align.centerH', { entityIds });
          break;
        case 'alignCenterV':
          bus.emit('canvas.align.centerV', { entityIds });
          break;
        case 'distributeH':
          bus.emit('canvas.distribute.horizontal', { entityIds });
          break;
        case 'distributeV':
          bus.emit('canvas.distribute.vertical', { entityIds });
          break;
      }
    },

    isActiveInMode(): boolean {
      return useUIStore.getState().canvasInteractionMode === 'edit';
    },
  };
}
