/**
 * Lottie animation entity renderer.
 *
 * Uses a simple <object> embed for Lottie files. For full lottie-web
 * integration, this can be upgraded once the dependency is added.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React, { useEffect, useRef } from 'react';

import type { LottieEntity } from '@sn/types';

import { entityTransformStyle, RENDER_SIZE_MULTIPLIER } from './entity-style';

export interface LottieRendererProps {
  entity: LottieEntity;
  isSelected: boolean;
}

export const LottieRenderer: React.FC<LottieRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Placeholder: when lottie-web is added, initialize player here
    // For now, display the animation URL as an image fallback
  }, [entity.assetUrl, entity.loop, entity.speed, entity.direction, entity.autoplay]);

  return (
    <div
      ref={containerRef}
      data-entity-id={entity.id}
      data-entity-type="lottie"
      style={{
        ...style,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--sn-surface, #f8f8f8)',
      }}
    >
      <img
        src={entity.assetUrl}
        alt={entity.altText ?? 'Lottie animation'}
        style={{ 
          width: `${100 * RENDER_SIZE_MULTIPLIER}%`, 
          height: `${100 * RENDER_SIZE_MULTIPLIER}%`, 
          transform: `scale(${1 / RENDER_SIZE_MULTIPLIER})`,
          transformOrigin: 'center center',
          objectFit: 'contain',
          flexShrink: 0,
        }}
        draggable={false}
      />
    </div>
  );
};
