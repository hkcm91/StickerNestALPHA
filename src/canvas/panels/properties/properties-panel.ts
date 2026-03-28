/**
 * Properties Panel Controller — entity config, multi-select "mixed" handling
 *
 * @module canvas/panels/properties
 * @layer L4A-4
 */

import type { CanvasEntity, Point2D, Size2D } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export type PropertyValue<T> = T | 'mixed';

export interface EntityProperties {
  position: PropertyValue<Point2D>;
  size: PropertyValue<Size2D>;
  rotation: PropertyValue<number>;
  visible: PropertyValue<boolean>;
  locked: PropertyValue<boolean>;
  name: PropertyValue<string | undefined>;
}

export interface PropertiesController {
  getProperties(entities: CanvasEntity[]): EntityProperties;
  updateProperty(entityIds: string[], key: string, value: unknown, entities?: CanvasEntity[]): void;
  updateConfig(entityId: string, configKey: string, value: unknown, previousValue?: unknown): void;
  isActiveInMode(): boolean;
}

function resolveProperty<T>(values: T[]): PropertyValue<T> {
  if (values.length === 0) return 'mixed';
  const first = values[0];
  if (typeof first === 'object' && first !== null) {
    const firstStr = JSON.stringify(first);
    return values.every((v) => JSON.stringify(v) === firstStr) ? first : 'mixed';
  }
  return values.every((v) => v === first) ? first : 'mixed';
}

export function createPropertiesController(): PropertiesController {
  return {
    getProperties(entities: CanvasEntity[]): EntityProperties {
      if (entities.length === 0) {
        return {
          position: 'mixed',
          size: 'mixed',
          rotation: 'mixed',
          visible: 'mixed',
          locked: 'mixed',
          name: 'mixed',
        };
      }

      return {
        position: resolveProperty(entities.map((e) => e.transform.position)),
        size: resolveProperty(entities.map((e) => e.transform.size)),
        rotation: resolveProperty(entities.map((e) => e.transform.rotation)),
        visible: resolveProperty(entities.map((e) => e.visible)),
        locked: resolveProperty(entities.map((e) => e.locked)),
        name: resolveProperty(entities.map((e) => e.name)),
      };
    },

    updateProperty(entityIds: string[], key: string, value: unknown) {
      for (const id of entityIds) {
        bus.emit(CanvasEvents.ENTITY_UPDATED, { id, updates: { [key]: value } });
      }
    },

    updateConfig(entityId: string, configKey: string, value: unknown, previousValue?: unknown) {
      bus.emit(CanvasEvents.ENTITY_CONFIG_UPDATED, { id: entityId, key: configKey, value, previousValue });
    },

    isActiveInMode(): boolean {
      return useUIStore.getState().canvasInteractionMode === 'edit';
    },
  };
}
