/**
 * ConstellationLines component tests.
 *
 * @module shell/canvas/components
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConstellationLines } from './ConstellationLines';

// Mock getEntityBoundingBox
vi.mock('../renderers/entity-style', () => ({
  getEntityBoundingBox: (entity: { position: { x: number; y: number }; size: { width: number; height: number } }) => ({
    minX: entity.position.x,
    minY: entity.position.y,
    maxX: entity.position.x + entity.size.width,
    maxY: entity.position.y + entity.size.height,
  }),
}));

function makeSceneGraph(entities: Record<string, { position: { x: number; y: number }; size: { width: number; height: number } }>) {
  return {
    getEntity: (id: string) => entities[id] ?? null,
  } as any;
}

describe('ConstellationLines', () => {
  it('renders nothing in preview mode', () => {
    const sg = makeSceneGraph({
      a: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
      b: { position: { x: 200, y: 200 }, size: { width: 100, height: 100 } },
    });

    render(
      <ConstellationLines
        selectedIds={new Set(['a', 'b'])}
        sceneGraph={sg}
        interactionMode="preview"
      />,
    );

    expect(screen.queryByTestId('constellation-lines')).toBeNull();
  });

  it('renders nothing with fewer than 2 selected entities', () => {
    const sg = makeSceneGraph({
      a: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
    });

    render(
      <ConstellationLines
        selectedIds={new Set(['a'])}
        sceneGraph={sg}
        interactionMode="edit"
      />,
    );

    expect(screen.queryByTestId('constellation-lines')).toBeNull();
  });

  it('renders nothing with no scene graph', () => {
    render(
      <ConstellationLines
        selectedIds={new Set(['a', 'b'])}
        sceneGraph={null}
        interactionMode="edit"
      />,
    );

    expect(screen.queryByTestId('constellation-lines')).toBeNull();
  });

  it('renders SVG lines between 2 selected entities', () => {
    const sg = makeSceneGraph({
      a: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
      b: { position: { x: 200, y: 200 }, size: { width: 100, height: 100 } },
    });

    render(
      <ConstellationLines
        selectedIds={new Set(['a', 'b'])}
        sceneGraph={sg}
        interactionMode="edit"
      />,
    );

    const svg = screen.getByTestId('constellation-lines');
    expect(svg).toBeTruthy();

    const lines = svg.querySelectorAll('line');
    expect(lines.length).toBe(1);
  });

  it('renders N-1 lines for N selected entities', () => {
    const sg = makeSceneGraph({
      a: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
      b: { position: { x: 200, y: 0 }, size: { width: 100, height: 100 } },
      c: { position: { x: 400, y: 0 }, size: { width: 100, height: 100 } },
    });

    render(
      <ConstellationLines
        selectedIds={new Set(['a', 'b', 'c'])}
        sceneGraph={sg}
        interactionMode="edit"
      />,
    );

    const svg = screen.getByTestId('constellation-lines');
    const lines = svg.querySelectorAll('line');
    expect(lines.length).toBe(2);
  });

  it('uses dashed stroke pattern', () => {
    const sg = makeSceneGraph({
      a: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
      b: { position: { x: 200, y: 200 }, size: { width: 100, height: 100 } },
    });

    render(
      <ConstellationLines
        selectedIds={new Set(['a', 'b'])}
        sceneGraph={sg}
        interactionMode="edit"
      />,
    );

    const line = screen.getByTestId('constellation-lines').querySelector('line')!;
    expect(line.getAttribute('stroke-dasharray')).toBe('4 6');
  });

  it('has pointer-events: none', () => {
    const sg = makeSceneGraph({
      a: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
      b: { position: { x: 200, y: 200 }, size: { width: 100, height: 100 } },
    });

    render(
      <ConstellationLines
        selectedIds={new Set(['a', 'b'])}
        sceneGraph={sg}
        interactionMode="edit"
      />,
    );

    const svg = screen.getByTestId('constellation-lines');
    expect(svg.style.pointerEvents).toBe('none');
  });
});
