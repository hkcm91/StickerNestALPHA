/**
 * Entity Layer renders all entities from the scene graph.
 * Sits inside the viewport layer so entities pan and zoom with the viewport.
 *
 * @module shell/canvas
 * @layer L6
 */

import React, { useCallback, useMemo } from 'react';

import type { CanvasEntity } from '@sn/types';

import { useUIStore } from '../../kernel/stores/ui/ui.store';

import { EntityRenderer } from './renderers';

export interface CanvasEntityLayerProps {
  entities: CanvasEntity[];
  selectedIds: Set<string>;
  /** Open docker folder IDs (closed folders hide child entities). */
  openFolderIds?: Set<string>;
  /** Widget HTML lookup: widgetInstanceId -> html string. */
  widgetHtmlMap?: Map<string, string>;
  theme?: Record<string, string>;
  interactionMode?: 'edit' | 'preview';
}

/**
 * Renders positioned entity elements in z-order.
 */
export const CanvasEntityLayer: React.FC<CanvasEntityLayerProps> = ({
  entities,
  selectedIds,
  openFolderIds = new Set<string>(),
  widgetHtmlMap,
  theme,
  interactionMode = 'edit',
}) => {
  const { visibleEntities, entitiesByParent } = useMemo(() => {
    const byId = new Map<string, CanvasEntity>(entities.map((entity) => [entity.id, entity]));
    const byParent = new Map<string, CanvasEntity[]>();
    
    entities.forEach(entity => {
      if (entity.parentId) {
        const children = byParent.get(entity.parentId) ?? [];
        children.push(entity);
        byParent.set(entity.parentId, children);
      }
    });

    const isInsideClosedFolder = (entity: CanvasEntity): boolean => {
      let current: CanvasEntity | undefined = entity;
      while (current?.parentId) {
        const parent = byId.get(current.parentId);
        if (!parent) break;
        if (parent.type === 'docker' && !openFolderIds.has(parent.id)) {
          return true;
        }
        current = parent;
      }
      return false;
    };

    // Filter out entities that are children of ANY open folder (they render inside the folder)
    // AND entities that are inside a CLOSED folder (they are hidden)
    // AND entities that are only visible in 3D
    const filtered = entities.filter((entity) => {
      if (
        entity.canvasVisibility === "3d" ||
        isInsideClosedFolder(entity)
      ) {
        return false;
      }

      // If it has a parent and that parent is an open folder, don't render it in the main layer
      if (entity.parentId) {
        const parent = byId.get(entity.parentId);
        if (parent?.type === 'docker' && openFolderIds.has(parent.id)) {
          return false;
        }
      }
      
      return true;
    });

    return { visibleEntities: filtered, entitiesByParent: byParent };
  }, [entities, openFolderIds]);

  // Hide the active focused entity (rendered in FocusOverlay instead)
  const focusMode = useUIStore((s) => s.focusMode);
  const focusedActiveId = focusMode?.active
    ? focusMode.focusedEntityIds[focusMode.activeIndex]
    : null;

  const renderEntity = useCallback((entity: CanvasEntity) => {
    const isFocusHidden = entity.id === focusedActiveId;
    return (
      <div
        key={entity.id}
        style={isFocusHidden ? { opacity: 0, pointerEvents: 'none' } : undefined}
      >
        <EntityRenderer
          entity={entity}
          isSelected={selectedIds.has(entity.id)}
          folderOpen={entity.type === 'docker' ? openFolderIds.has(entity.id) : undefined}
          childrenEntities={entity.type === 'docker' ? entitiesByParent.get(entity.id) : undefined}
          renderChild={renderEntity}
          widgetHtml={
            entity.type === 'widget'
              ? widgetHtmlMap?.get(entity.widgetInstanceId)
              : undefined
          }
          theme={theme}
          interactionMode={interactionMode}
        />
      </div>
    );
  }, [selectedIds, openFolderIds, entitiesByParent, widgetHtmlMap, theme, interactionMode, focusedActiveId]);

  return (
    <div data-testid="canvas-entity-layer" style={{ position: 'absolute', inset: 0 }}>
      {visibleEntities.map(renderEntity)}
    </div>
  );
};


