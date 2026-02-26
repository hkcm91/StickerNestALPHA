/**
 * SVG vector graphic entity renderer.
 * Renders inline SVG content with optional fill/stroke overrides.
 * SVG content is sanitized via a basic allowlist before rendering.
 *
 * @module shell/canvas/renderers
 * @layer L6
 */

import React, { useMemo } from 'react';

import type { SvgEntity } from '@sn/types';

import { entityTransformStyle, RENDER_SIZE_MULTIPLIER } from './entity-style';

/**
 * Basic SVG sanitizer — strips dangerous elements and attributes.
 * For production, consider using DOMPurify with SVG profile.
 */
function sanitizeSvg(raw: string): string {
  // Remove script tags and event handlers
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '');
}

export interface SvgRendererProps {
  entity: SvgEntity;
  isSelected: boolean;
}

export const SvgRenderer: React.FC<SvgRendererProps> = ({ entity, isSelected }) => {
  const style = entityTransformStyle(entity);

  const sanitizedContent = useMemo(() => {
    let svg = sanitizeSvg(entity.svgContent);

    const rootStyle =
      'width:100%;height:100%;display:block;overflow:visible;pointer-events:none;vector-effect:non-scaling-stroke;';
    const rootStyleTag = `<style>svg{${rootStyle}}</style>`;

    // Apply fill/stroke overrides and target all descendants, not only direct children.
    const colorRule = entity.fill || entity.stroke
      ? `<style>svg * { ${entity.fill ? `fill: ${entity.fill} !important;` : ''} ${entity.stroke ? `stroke: ${entity.stroke} !important;` : ''} }</style>`
      : '';

    svg = svg.replace(/<svg([^>]*)>/, `<svg$1>${rootStyleTag}${colorRule}`);

    return svg;
  }, [entity.svgContent, entity.fill, entity.stroke]);

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="svg"
      style={{
        ...style,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
        // Render at a higher multiplier for sharpness, then scale it down to fit the container
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="img"
      aria-label={entity.altText ?? 'SVG graphic'}
    >
      <div
        style={{
          width: `${100 * RENDER_SIZE_MULTIPLIER}%`,
          height: `${100 * RENDER_SIZE_MULTIPLIER}%`,
          transform: `scale(${1 / RENDER_SIZE_MULTIPLIER})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </div>
  );
};
