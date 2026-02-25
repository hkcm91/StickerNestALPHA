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

import { entityTransformStyle } from './entity-style';

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

    // Apply fill/stroke overrides by injecting a style element
    if (entity.fill || entity.stroke) {
      const overrides: string[] = [];
      if (entity.fill) overrides.push(`fill: ${entity.fill}`);
      if (entity.stroke) overrides.push(`stroke: ${entity.stroke}`);
      const styleTag = `<style>svg > * { ${overrides.join('; ')} }</style>`;
      svg = svg.replace(/<svg([^>]*)>/, `<svg$1>${styleTag}`);
    }

    return svg;
  }, [entity.svgContent, entity.fill, entity.stroke]);

  return (
    <div
      data-entity-id={entity.id}
      data-entity-type="svg"
      style={{
        ...style,
        outline: isSelected ? '2px solid var(--sn-accent, #3b82f6)' : undefined,
      }}
      role="img"
      aria-label={entity.altText ?? 'SVG graphic'}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};
