/**
 * Layers Panel Controller — z-order list, visibility toggles, inline rename
 *
 * @module canvas/panels/layers
 * @layer L4A-4
 */

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export interface LayerEntry {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export interface LayersController {
  getLayers(entities: CanvasEntity[]): LayerEntry[];
  selectEntity(id: string): void;
  toggleVisibility(id: string, currentlyVisible: boolean): void;
  toggleLock(id: string, currentlyLocked: boolean): void;
  rename(id: string, name: string): void;
  reorder(id: string, newZIndex: number): void;
  bringToFront(id: string): void;
  sendToBack(id: string): void;
  isActiveInMode(): boolean;
}

export function createLayersController(): LayersController {
  return {
    getLayers(entities: CanvasEntity[]): LayerEntry[] {
      return [...entities]
        .sort((a, b) => b.zIndex - a.zIndex)
        .map((e) => ({
          id: e.id,
          name: e.name ?? `${e.type}-${e.id.slice(0, 8)}`,
          type: e.type,
          visible: e.visible,
          locked: e.locked,
          zIndex: e.zIndex,
        }));
    },

    selectEntity(id: string) {
      bus.emit(CanvasEvents.ENTITY_SELECTED, { id });
    },

    toggleVisibility(id: string, currentlyVisible: boolean) {
      bus.emit(CanvasEvents.ENTITY_UPDATED, { id, updates: { visible: !currentlyVisible } });
    },

    toggleLock(id: string, currentlyLocked: boolean) {
      bus.emit(CanvasEvents.ENTITY_UPDATED, { id, updates: { locked: !currentlyLocked } });
    },

    rename(id: string, name: string) {
      bus.emit(CanvasEvents.ENTITY_UPDATED, { id, updates: { name } });
    },

    reorder(id: string, newZIndex: number) {
      bus.emit(CanvasEvents.ENTITY_UPDATED, { id, updates: { zIndex: newZIndex } });
    },

    bringToFront(id: string) {
      bus.emit('canvas.entity.bringToFront', { id });
    },

    sendToBack(id: string) {
      bus.emit('canvas.entity.sendToBack', { id });
    },

    isActiveInMode(): boolean {
      return useUIStore.getState().canvasInteractionMode === 'edit';
    },
  };
}
