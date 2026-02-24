/**
 * EntityManager — manages the set of entities rendered in the 3D spatial scene.
 *
 * Subscribes to bus events for entity placement, transformation, and removal.
 * Renders `<SpatialEntity>` for non-widget entities and `<WidgetInSpace>` for
 * widget entities. Tracks selection state and emits controller select events
 * on entity click.
 *
 * @module spatial/entities/EntityManager
 * @layer L4B
 */

import React, { useCallback, useEffect, useState } from 'react';

import { CanvasEvents, SpatialEvents } from '@sn/types';
import type { CanvasEntityBase, Transform3D } from '@sn/types';

import { bus } from '../../kernel/bus';
import type { ThemeTokens } from '../../runtime/bridge/message-types';

import { SpatialEntity } from './SpatialEntity';
import { WidgetInSpace } from './WidgetInSpace';

/**
 * Internal record for a managed entity, including optional widget metadata.
 */
export interface ManagedEntity {
  /** The canvas entity data */
  entity: CanvasEntityBase;
  /** Widget HTML source (only for widget entities) */
  widgetHtml?: string;
  /** Widget configuration (only for widget entities) */
  config?: Record<string, unknown>;
}

/** Default theme tokens for widgets in spatial mode */
const DEFAULT_THEME: ThemeTokens = {
  '--sn-bg': '#ffffff',
  '--sn-surface': '#f5f5f5',
  '--sn-accent': '#6366f1',
  '--sn-text': '#1a1a1a',
  '--sn-text-muted': '#6b7280',
  '--sn-border': '#e5e7eb',
  '--sn-radius': '8px',
  '--sn-font-family': 'system-ui, sans-serif',
};

/**
 * Bus event payload shapes (typed locally for handler type safety).
 */
interface EntityPlacedPayload {
  entity: CanvasEntityBase;
  widgetHtml?: string;
  config?: Record<string, unknown>;
}

interface EntityTransformedPayload {
  entityId: string;
  spatialTransform: Transform3D;
}

interface EntityRemovedPayload {
  entityId: string;
}

interface EntityUpdatedPayload {
  entity: CanvasEntityBase;
}

interface EntityDeletedPayload {
  entityId: string;
}

/**
 * EntityManager — renderless-ish component that subscribes to bus events
 * and manages a map of entities to render in the 3D scene.
 *
 * Renders:
 * - `<SpatialEntity>` for non-widget entities
 * - `<WidgetInSpace>` for widget entities (type === 'widget')
 *
 * Selection:
 * - Clicking an entity sets it as selected
 * - Emits `spatial.controller.select` with the entity id
 */
export function EntityManager(): React.JSX.Element {
  const [entities, setEntities] = useState<Map<string, ManagedEntity>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Subscribe to bus events on mount, clean up on unmount
  useEffect(() => {
    const unsubPlaced = bus.subscribe<EntityPlacedPayload>(
      SpatialEvents.ENTITY_PLACED,
      (event) => {
        const { entity, widgetHtml, config } = event.payload;
        setEntities((prev) => {
          const next = new Map(prev);
          next.set(entity.id, { entity, widgetHtml, config });
          return next;
        });
      },
    );

    const unsubTransformed = bus.subscribe<EntityTransformedPayload>(
      SpatialEvents.ENTITY_TRANSFORMED,
      (event) => {
        const { entityId, spatialTransform } = event.payload;
        setEntities((prev) => {
          const existing = prev.get(entityId);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(entityId, {
            ...existing,
            entity: { ...existing.entity, spatialTransform },
          });
          return next;
        });
      },
    );

    const unsubRemoved = bus.subscribe<EntityRemovedPayload>(
      SpatialEvents.ENTITY_REMOVED,
      (event) => {
        const { entityId } = event.payload;
        setEntities((prev) => {
          if (!prev.has(entityId)) return prev;
          const next = new Map(prev);
          next.delete(entityId);
          return next;
        });
        setSelectedId((prev) => (prev === entityId ? null : prev));
      },
    );

    const unsubUpdated = bus.subscribe<EntityUpdatedPayload>(
      CanvasEvents.ENTITY_UPDATED,
      (event) => {
        const { entity } = event.payload;
        setEntities((prev) => {
          const existing = prev.get(entity.id);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(entity.id, { ...existing, entity });
          return next;
        });
      },
    );

    const unsubDeleted = bus.subscribe<EntityDeletedPayload>(
      CanvasEvents.ENTITY_DELETED,
      (event) => {
        const { entityId } = event.payload;
        setEntities((prev) => {
          if (!prev.has(entityId)) return prev;
          const next = new Map(prev);
          next.delete(entityId);
          return next;
        });
        setSelectedId((prev) => (prev === entityId ? null : prev));
      },
    );

    return () => {
      unsubPlaced();
      unsubTransformed();
      unsubRemoved();
      unsubUpdated();
      unsubDeleted();
    };
  }, []);

  const handleSelect = useCallback((entityId: string) => {
    setSelectedId(entityId);
    bus.emit(SpatialEvents.CONTROLLER_SELECT, { entityId });
  }, []);

  const rendered: React.JSX.Element[] = [];

  for (const [id, managed] of entities) {
    const isWidget = managed.entity.type === 'widget';

    if (isWidget && managed.widgetHtml) {
      // Cast to access widget-specific fields
      const widgetEntity = managed.entity as CanvasEntityBase & {
        widgetId: string;
        widgetInstanceId: string;
      };
      rendered.push(
        <WidgetInSpace
          key={id}
          entity={widgetEntity as import('@sn/types').WidgetContainerEntity}
          widgetHtml={managed.widgetHtml}
          config={managed.config ?? {}}
          theme={DEFAULT_THEME}
          selected={selectedId === id}
          onSelect={handleSelect}
        />,
      );
    } else {
      rendered.push(
        <SpatialEntity
          key={id}
          entity={managed.entity}
          selected={selectedId === id}
          onSelect={handleSelect}
        />,
      );
    }
  }

  return <>{rendered}</>;
}
