/**
 * SvgRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SvgEntity } from '@sn/types';

import { SvgRenderer } from './SvgRenderer';

function makeSvg(overrides: Partial<SvgEntity> = {}): SvgEntity {
  return {
    id: 'svg-1',
    type: 'svg',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 100, y: 100 },
      size: { width: 100, height: 100 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: 'user-1',
    svgContent: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>',
    altText: 'A circle',
    ...overrides,
  } as SvgEntity;
}

describe('SvgRenderer', () => {
  it('renders the SVG content via dangerouslySetInnerHTML', () => {
    const entity = makeSvg();
    const { container } = render(<SvgRenderer entity={entity} isSelected={false} />);
    // The inner div should contain the SVG markup
    const inner = container.querySelector('[data-entity-type="svg"] > div');
    // happy-dom may not fully parse SVG elements, so check innerHTML contains part of the source
    expect(inner?.innerHTML).toContain('svg');
  });

  it('sanitizes script tags from SVG content', () => {
    const entity = makeSvg({
      svgContent: '<svg viewBox="0 0 100 100"><script>alert("xss")</script><circle cx="50" cy="50" r="40"/></svg>',
    });
    const { container } = render(<SvgRenderer entity={entity} isSelected={false} />);
    const inner = container.querySelector('[data-entity-type="svg"] > div');
    expect(inner?.innerHTML).not.toContain('<script');
  });

  it('sets role=img and aria-label', () => {
    const entity = makeSvg({ altText: 'My SVG graphic' });
    render(<SvgRenderer entity={entity} isSelected={false} />);
    const el = screen.getByRole('img');
    expect(el.getAttribute('aria-label')).toBe('My SVG graphic');
  });

  it('renders without crashing when selected', () => {
    const entity = makeSvg();
    const { container } = render(<SvgRenderer entity={entity} isSelected={true} />);
    expect(container.querySelector('[data-entity-type="svg"]')).not.toBeNull();
  });

  it('sets data-entity-id', () => {
    const entity = makeSvg({ id: 'svg-42' });
    const { container } = render(<SvgRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('[data-entity-id="svg-42"]')).not.toBeNull();
  });
});
