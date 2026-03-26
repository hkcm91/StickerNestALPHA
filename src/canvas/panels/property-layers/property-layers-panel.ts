/**
 * Property Layers Panel Controller
 *
 * Headless controller for managing widget-attributed property layers on
 * canvas entities. Users can view, toggle, reorder, remove, and "alter"
 * (re-open originating widget) property layers.
 *
 * @module canvas/panels/property-layers
 * @layer L4A-4
 */

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export interface PropertyLayerEntry {
  id: string;
  label: string;
  widgetId: string;
  widgetInstanceId: string;
  enabled: boolean;
  order: number;
  /** Which property keys this layer overrides */
  propertyKeys: string[];
}

export interface PropertyLayersController {
  /** Get property layers for an entity, sorted by order (bottom-to-top) */
  getLayers(entity: CanvasEntity): PropertyLayerEntry[];
  /** Toggle a property layer on/off */
  toggleLayer(entityId: string, layerId: string, enabled: boolean): void;
  /** Remove a property layer from an entity */
  removeLayer(entityId: string, layerId: string): void;
  /** Reorder property layers (layerIds in new bottom-to-top order) */
  reorderLayers(entityId: string, layerIds: string[]): void;
  /** Open/focus the widget that created this layer */
  alterLayer(entityId: string, layerId: string): void;
  /** Panel is only active in edit mode */
  isActiveInMode(): boolean;
}

export function createPropertyLayersController(): PropertyLayersController {
  return {
    getLayers(entity: CanvasEntity): PropertyLayerEntry[] {
      const layers = entity.propertyLayers;
      if (!layers || layers.length === 0) return [];

      return [...layers]
        .sort((a, b) => a.order - b.order)
        .map((l) => ({
          id: l.id,
          label: l.label,
          widgetId: l.widgetId,
          widgetInstanceId: l.widgetInstanceId,
          enabled: l.enabled,
          order: l.order,
          propertyKeys: Object.keys(l.properties),
        }));
    },

    toggleLayer(entityId: string, layerId: string, enabled: boolean) {
      bus.emit(CanvasEvents.PROPERTY_LAYER_TOGGLED, { entityId, layerId, enabled });
    },

    removeLayer(entityId: string, layerId: string) {
      bus.emit(CanvasEvents.PROPERTY_LAYER_REMOVED, { entityId, layerId });
    },

    reorderLayers(entityId: string, layerIds: string[]) {
      bus.emit(CanvasEvents.PROPERTY_LAYER_REORDERED, { entityId, layerIds });
    },

    alterLayer(entityId: string, layerId: string) {
      bus.emit(CanvasEvents.PROPERTY_LAYER_ALTER, { entityId, layerId });
    },

    isActiveInMode(): boolean {
      return useUIStore.getState().canvasInteractionMode === 'edit';
    },
  };
}
