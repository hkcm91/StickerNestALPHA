/**
 * Property Layers Panel Controller
 *
 * Headless controller for managing widget-attributed property layers on
 * canvas entities. Users can view, toggle, reorder, remove, duplicate,
 * inline-edit, and "alter" (re-open originating widget) property layers.
 *
 * @module canvas/panels/property-layers
 * @layer L4A-4
 */

import type { CanvasEntity, PropertyLayer } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { useWidgetStore } from '../../../kernel/stores/widget/widget.store';

export interface PropertyLayerEntry {
  id: string;
  label: string;
  widgetId: string;
  widgetInstanceId: string;
  enabled: boolean;
  order: number;
  /** Which property keys this layer overrides */
  propertyKeys: string[];
  /** Human-readable widget name from registry, or widgetId as fallback */
  widgetName: string;
  /** True when the originating widget instance no longer exists */
  isOrphan: boolean;
  /** Property keys also set by another enabled layer (conflict) */
  conflictingKeys: string[];
  /** Actual property values for display */
  propertyValues: Record<string, unknown>;
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
  /** Disable all layers on an entity */
  disableAllLayers(entityId: string, entity: CanvasEntity): void;
  /** Enable all layers on an entity */
  enableAllLayers(entityId: string, entity: CanvasEntity): void;
  /** Remove all layers originating from a specific widget */
  removeLayersByWidget(entityId: string, entity: CanvasEntity, widgetId: string): void;
  /** Remove all orphaned layers (widget instance no longer exists) */
  removeOrphanedLayers(entityId: string, entity: CanvasEntity): void;
  /** Duplicate a layer with a new ID and "(copy)" suffix */
  duplicateLayer(entityId: string, entity: CanvasEntity, layerId: string): void;
  /** Directly update property values on a layer (for orphans or manual tweaking) */
  updateLayerProperties(entityId: string, layerId: string, properties: Record<string, unknown>): void;
}

/**
 * Compute which property keys are set by more than one enabled layer.
 */
function computeConflictingKeys(layers: PropertyLayer[]): Map<string, string[]> {
  const keyToLayerIds = new Map<string, string[]>();
  for (const layer of layers) {
    if (!layer.enabled) continue;
    for (const key of Object.keys(layer.properties)) {
      const ids = keyToLayerIds.get(key);
      if (ids) {
        ids.push(layer.id);
      } else {
        keyToLayerIds.set(key, [layer.id]);
      }
    }
  }
  return keyToLayerIds;
}

export function createPropertyLayersController(): PropertyLayersController {
  return {
    getLayers(entity: CanvasEntity): PropertyLayerEntry[] {
      const layers = entity.propertyLayers;
      if (!layers || layers.length === 0) return [];

      const { registry, instances } = useWidgetStore.getState();
      const conflictMap = computeConflictingKeys(layers);

      return [...layers]
        .sort((a, b) => a.order - b.order)
        .map((l) => {
          const propertyKeys = Object.keys(l.properties);
          const conflictingKeys = propertyKeys.filter((k) => {
            const ids = conflictMap.get(k);
            return ids !== undefined && ids.length > 1;
          });

          return {
            id: l.id,
            label: l.label,
            widgetId: l.widgetId,
            widgetInstanceId: l.widgetInstanceId,
            enabled: l.enabled,
            order: l.order,
            propertyKeys,
            widgetName: registry[l.widgetId]?.manifest?.name ?? l.widgetId,
            isOrphan: !(l.widgetInstanceId in instances),
            conflictingKeys,
            propertyValues: { ...l.properties },
          };
        });
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

    disableAllLayers(entityId: string, entity: CanvasEntity) {
      const layers = entity.propertyLayers;
      if (!layers || layers.length === 0) return;
      const updated = layers.map((l) => ({ ...l, enabled: false }));
      bus.emit(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, { entityId, layers: updated });
    },

    enableAllLayers(entityId: string, entity: CanvasEntity) {
      const layers = entity.propertyLayers;
      if (!layers || layers.length === 0) return;
      const updated = layers.map((l) => ({ ...l, enabled: true }));
      bus.emit(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, { entityId, layers: updated });
    },

    removeLayersByWidget(entityId: string, entity: CanvasEntity, widgetId: string) {
      const layers = entity.propertyLayers;
      if (!layers || layers.length === 0) return;
      const filtered = layers
        .filter((l) => l.widgetId !== widgetId)
        .map((l, i) => ({ ...l, order: i }));
      bus.emit(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, { entityId, layers: filtered });
    },

    removeOrphanedLayers(entityId: string, entity: CanvasEntity) {
      const layers = entity.propertyLayers;
      if (!layers || layers.length === 0) return;
      const { instances } = useWidgetStore.getState();
      const filtered = layers
        .filter((l) => l.widgetInstanceId in instances)
        .map((l, i) => ({ ...l, order: i }));
      bus.emit(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, { entityId, layers: filtered });
    },

    duplicateLayer(entityId: string, entity: CanvasEntity, layerId: string) {
      const layers = entity.propertyLayers;
      if (!layers || layers.length === 0) return;
      const target = layers.find((l) => l.id === layerId);
      if (!target) return;
      const clone: PropertyLayer = {
        ...target,
        id: crypto.randomUUID(),
        label: `${target.label} (copy)`,
        order: target.order + 1,
        createdAt: new Date().toISOString(),
      };
      // Insert clone after target, shift higher layers up
      const updated = layers.flatMap((l) => {
        if (l.id === layerId) return [l, clone];
        return [l];
      }).map((l, i) => ({ ...l, order: i }));
      bus.emit(CanvasEvents.PROPERTY_LAYER_BATCH_UPDATED, { entityId, layers: updated });
    },

    updateLayerProperties(entityId: string, layerId: string, properties: Record<string, unknown>) {
      bus.emit(CanvasEvents.PROPERTY_LAYER_UPDATED, {
        entityId,
        layerId,
        updates: { properties },
      });
    },
  };
}
