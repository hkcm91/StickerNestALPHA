/**
 * Text entity renderer.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { TextEntity } from '@sn/types';

import { entityTransformStyle } from './entity-style';

export interface TextRendererProps {
  entity: TextEntity;
  isSelected: boolean;
}

export const TextRenderer: React.FC<TextRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="text"
      style={{
        ...style,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        fontFamily: entity.fontFamily,
        fontSize: entity.fontSize,
        fontWeight: entity.fontWeight,
        color: entity.color,
        textAlign: entity.textAlign,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        padding: 4,
        cursor: entity.locked ? 'default' : 'text',
      }}
    >
      {entity.content}
    </div>
  );
};
