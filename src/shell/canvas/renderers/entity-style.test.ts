/**
 * Entity style utility tests.
 *
 * @module shell/canvas/renderers
 */

import { describe, expect, it } from 'vitest';

import type { CanvasEntityBase } from '@sn/types';

import {
  entityTransformStyle,
  getEntityBoundingBox,
  getEntityTopLeft,
} from './entity-style';

// Helper to create a minimal entity for testing
function createTestEntity(overrides: Partial<CanvasEntityBase> = {}): CanvasEntityBase {
  return {
    id: 'test-entity',
    type: 'sticker',
    canvasId: 'test-canvas',
    transform: {
      position: { x: 100, y: 100 },
      size: { width: 50, height: 50 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test-user',
    ...overrides,
  } as CanvasEntityBase;
}

describe('entityTransformStyle', () => {
  it('positions entity with center at transform position', () => {
    const entity = createTestEntity({
      transform: {
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        rotation: 0,
        scale: 1,
      },
    });

    const style = entityTransformStyle(entity);

    // Center-based: left = position.x - width/2, top = position.y - height/2
    expect(style.left).toBe(75); // 100 - 25
    expect(style.top).toBe(75);  // 100 - 25
    expect(style.width).toBe(50);
    expect(style.height).toBe(50);
  });

  it('applies rotation and scale transforms', () => {
    const entity = createTestEntity({
      transform: {
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        rotation: 45,
        scale: 1.5,
      },
    });

    const style = entityTransformStyle(entity);

    expect(style.transform).toBe('rotate(45deg) scale(1.5)');
    expect(style.transformOrigin).toBe('center center');
  });

  it('sets visibility and pointer events based on entity state', () => {
    const visibleEntity = createTestEntity({ visible: true, locked: false });
    const hiddenEntity = createTestEntity({ visible: false, locked: true });

    const visibleStyle = entityTransformStyle(visibleEntity);
    const hiddenStyle = entityTransformStyle(hiddenEntity);

    expect(visibleStyle.visibility).toBe('visible');
    expect(visibleStyle.pointerEvents).toBe('auto');
    expect(hiddenStyle.visibility).toBe('hidden');
    expect(hiddenStyle.pointerEvents).toBe('none');
  });

  it('applies border radius when greater than zero', () => {
    const entityWithRadius = createTestEntity({ borderRadius: 8 });
    const entityNoRadius = createTestEntity({ borderRadius: 0 });

    const styleWithRadius = entityTransformStyle(entityWithRadius);
    const styleNoRadius = entityTransformStyle(entityNoRadius);

    expect(styleWithRadius.borderRadius).toBe(8);
    expect(styleNoRadius.borderRadius).toBeUndefined();
  });

  it('applies opacity', () => {
    const entity = createTestEntity({ opacity: 0.5 });
    const style = entityTransformStyle(entity);

    expect(style.opacity).toBe(0.5);
  });

  it('applies z-index', () => {
    const entity = createTestEntity({ zIndex: 10 });
    const style = entityTransformStyle(entity);

    expect(style.zIndex).toBe(10);
  });

  it('includes flex centering for content', () => {
    const entity = createTestEntity();
    const style = entityTransformStyle(entity);

    expect(style.display).toBe('flex');
    expect(style.alignItems).toBe('center');
    expect(style.justifyContent).toBe('center');
  });

  it('applies crop as clip-path when cropRect is provided', () => {
    const entity = createTestEntity({
      cropRect: { top: 0.1, right: 0.2, bottom: 0.1, left: 0.2 },
    });

    const style = entityTransformStyle(entity);

    expect(style.clipPath).toBe('inset(10.00% 20.00% 10.00% 20.00%)');
  });

  it('does not apply clip-path when cropRect is all zeros', () => {
    const entity = createTestEntity({
      cropRect: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    const style = entityTransformStyle(entity);

    expect(style.clipPath).toBeUndefined();
  });
});

describe('getEntityTopLeft', () => {
  it('returns top-left corner from center-based position', () => {
    const entity = createTestEntity({
      transform: {
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        rotation: 0,
        scale: 1,
      },
    });

    const topLeft = getEntityTopLeft(entity);

    expect(topLeft.x).toBe(75); // 100 - 25
    expect(topLeft.y).toBe(75); // 100 - 25
  });

  it('handles asymmetric sizes correctly', () => {
    const entity = createTestEntity({
      transform: {
        position: { x: 200, y: 150 },
        size: { width: 100, height: 60 },
        rotation: 0,
        scale: 1,
      },
    });

    const topLeft = getEntityTopLeft(entity);

    expect(topLeft.x).toBe(150); // 200 - 50
    expect(topLeft.y).toBe(120); // 150 - 30
  });
});

describe('getEntityBoundingBox', () => {
  it('returns min/max corners from center-based position', () => {
    const entity = createTestEntity({
      transform: {
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        rotation: 0,
        scale: 1,
      },
    });

    const bounds = getEntityBoundingBox(entity);

    expect(bounds.minX).toBe(75);  // 100 - 25
    expect(bounds.minY).toBe(75);  // 100 - 25
    expect(bounds.maxX).toBe(125); // 100 + 25
    expect(bounds.maxY).toBe(125); // 100 + 25
  });

  it('handles asymmetric sizes correctly', () => {
    const entity = createTestEntity({
      transform: {
        position: { x: 200, y: 150 },
        size: { width: 100, height: 60 },
        rotation: 0,
        scale: 1,
      },
    });

    const bounds = getEntityBoundingBox(entity);

    expect(bounds.minX).toBe(150); // 200 - 50
    expect(bounds.minY).toBe(120); // 150 - 30
    expect(bounds.maxX).toBe(250); // 200 + 50
    expect(bounds.maxY).toBe(180); // 150 + 30
  });

  it('width and height can be derived from bounds', () => {
    const entity = createTestEntity({
      transform: {
        position: { x: 100, y: 100 },
        size: { width: 80, height: 60 },
        rotation: 0,
        scale: 1,
      },
    });

    const bounds = getEntityBoundingBox(entity);
    const derivedWidth = bounds.maxX - bounds.minX;
    const derivedHeight = bounds.maxY - bounds.minY;

    expect(derivedWidth).toBe(80);
    expect(derivedHeight).toBe(60);
  });
});

describe('center-based positioning invariants', () => {
  it('entity center equals transform position', () => {
    const entity = createTestEntity({
      transform: {
        position: { x: 150, y: 200 },
        size: { width: 80, height: 60 },
        rotation: 0,
        scale: 1,
      },
    });

    const bounds = getEntityBoundingBox(entity);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    expect(centerX).toBe(entity.transform.position.x);
    expect(centerY).toBe(entity.transform.position.y);
  });

  it('round-trip: style position + size/2 equals transform position', () => {
    const entity = createTestEntity({
      transform: {
        position: { x: 123, y: 456 },
        size: { width: 78, height: 90 },
        rotation: 0,
        scale: 1,
      },
    });

    const style = entityTransformStyle(entity);
    const recoveredCenterX = (style.left as number) + (style.width as number) / 2;
    const recoveredCenterY = (style.top as number) + (style.height as number) / 2;

    expect(recoveredCenterX).toBe(entity.transform.position.x);
    expect(recoveredCenterY).toBe(entity.transform.position.y);
  });
});
