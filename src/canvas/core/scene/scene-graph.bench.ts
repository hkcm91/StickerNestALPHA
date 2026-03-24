/**
 * Scene graph performance benchmarks
 *
 * Run with: npx vitest bench src/canvas/core/scene/scene-graph.bench.ts
 *
 * @module canvas/core/scene
 * @layer L4A-1
 */

import { bench, describe } from 'vitest';

import type { CanvasEntity } from '@sn/types';

import { createSceneGraph } from './scene-graph';

function makeStickerEntity(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  zIndex: number,
): CanvasEntity {
  return {
    id,
    type: 'sticker',
    canvasId: 'bench-canvas',
    transform: {
      position: { x, y },
      size: { width: w, height: h },
      rotation: 0,
      scale: 1,
    },
    zIndex,
    visible: true,
    locked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'bench-user',
    assetUrl: `https://example.com/sticker-${id}.png`,
    mediaType: 'image',
  } as unknown as CanvasEntity;
}

function seedGraph(count: number) {
  const sg = createSceneGraph();
  for (let i = 0; i < count; i++) {
    sg.addEntity(
      makeStickerEntity(
        `e-${i}`,
        (i % 20) * 100,
        Math.floor(i / 20) * 100,
        64,
        64,
        i,
      ),
    );
  }
  return sg;
}

describe.each([50, 100, 200, 500, 1000])('Scene Graph — %d entities', (count) => {
  bench(`addEntity × ${count}`, () => {
    const sg = createSceneGraph();
    for (let i = 0; i < count; i++) {
      sg.addEntity(
        makeStickerEntity(`b-${i}`, (i % 20) * 100, Math.floor(i / 20) * 100, 64, 64, i),
      );
    }
  });

  bench(`bringToFront with ${count} entities`, () => {
    const sg = seedGraph(count);
    sg.bringToFront('e-0');
  });

  bench(`queryPoint with ${count} entities`, () => {
    const sg = seedGraph(count);
    sg.queryPoint({ x: 150, y: 150 });
  });

  bench(`queryRegion with ${count} entities`, () => {
    const sg = seedGraph(count);
    sg.queryRegion({
      min: { x: 0, y: 0 },
      max: { x: 500, y: 500 },
    });
  });

  bench(`updateEntity position × ${count}`, () => {
    const sg = seedGraph(count);
    for (let i = 0; i < count; i++) {
      sg.updateEntity(`e-${i}`, {
        transform: {
          position: { x: i * 20, y: 100 },
          size: { width: 64, height: 64 },
          rotation: 0,
          scale: 1,
        },
      });
    }
  });
});
