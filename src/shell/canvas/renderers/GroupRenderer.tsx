/**
 * Group entity renderer — container for child entities.
 * Children are rendered by the parent CanvasEntityLayer, not here.
 * This component renders the group's bounding box and selection state.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { GroupEntity } from '@sn/types';

import { entityTransformStyle } from './entity-style';

export interface GroupRendererProps {
  entity: GroupEntity;
  isSelected: boolean;
}

export const GroupRenderer: React.FC<GroupRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="group"
      style={{
        ...style,
        outline: isSelected ? '2px dashed var(--sn-accent, #3b82f6)' : undefined,
        background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
      }}
    />
  );
};
