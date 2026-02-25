/**
 * Sticker entity renderer — images, GIFs, and videos.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React from 'react';

import type { StickerEntity } from '@sn/types';

import { entityTransformStyle } from './entity-style';

export interface StickerRendererProps {
  entity: StickerEntity;
  isSelected: boolean;
}

export const StickerRenderer: React.FC<StickerRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="sticker"
      style={{
        ...style,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        cursor: entity.locked ? 'default' : 'grab',
      }}
    >
      {entity.assetType === 'video' ? (
        <video
          src={entity.assetUrl}
          autoPlay
          loop
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          aria-label={entity.altText}
        />
      ) : (
        <img
          src={entity.assetUrl}
          alt={entity.altText ?? ''}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          draggable={false}
        />
      )}
    </div>
  );
};
