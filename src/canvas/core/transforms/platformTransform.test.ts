/**
 * Platform transform resolution tests
 * @module canvas/core/transforms/platformTransform.test
 */

import { describe, it, expect } from 'vitest';

import type { CanvasEntityBase, Transform2D } from '@sn/types';

import { resolveEntityTransform, setEntityPlatformTransform } from './platformTransform';

const webTransform: Transform2D = {
  position: { x: 100, y: 200 },
  size: { width: 300, height: 150 },
  rotation: 0,
  scale: 1,
};

const mobileTransform: Transform2D = {
  position: { x: 10, y: 20 },
  size: { width: 200, height: 100 },
  rotation: 0,
  scale: 1,
};

function makeEntity(overrides: Partial<CanvasEntityBase> = {}): CanvasEntityBase {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'sticker',
    canvasId: '550e8400-e29b-41d4-a716-446655440001',
    transform: webTransform,
    zIndex: 1,
    visible: true,
    locked: false,
    flipH: false,
    flipV: false,
    opacity: 1,
    canvasVisibility: 'both',
    syncTransform2d3d: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user',
    ...overrides,
  } as CanvasEntityBase;
}

describe('resolveEntityTransform', () => {
  it('returns web transform when platform is web', () => {
    const entity = makeEntity();
    expect(resolveEntityTransform(entity, 'web')).toBe(webTransform);
  });

  it('returns mobile transform when set', () => {
    const entity = makeEntity({
      platformTransforms: { mobile: mobileTransform },
    });
    expect(resolveEntityTransform(entity, 'mobile')).toBe(mobileTransform);
  });

  it('falls back to web transform when mobile not set', () => {
    const entity = makeEntity();
    expect(resolveEntityTransform(entity, 'mobile')).toBe(webTransform);
  });

  it('falls back to web transform when platformTransforms is undefined', () => {
    const entity = makeEntity({ platformTransforms: undefined });
    expect(resolveEntityTransform(entity, 'desktop')).toBe(webTransform);
  });

  it('returns desktop transform when set', () => {
    const desktopTransform: Transform2D = {
      position: { x: 50, y: 50 },
      size: { width: 500, height: 300 },
      rotation: 0,
      scale: 1,
    };
    const entity = makeEntity({
      platformTransforms: { desktop: desktopTransform },
    });
    expect(resolveEntityTransform(entity, 'desktop')).toBe(desktopTransform);
  });
});

describe('setEntityPlatformTransform', () => {
  it('updates transform field directly for web', () => {
    const entity = makeEntity();
    const newTransform: Transform2D = {
      position: { x: 500, y: 600 },
      size: { width: 400, height: 200 },
      rotation: 45,
      scale: 2,
    };
    const updated = setEntityPlatformTransform(entity, 'web', newTransform);
    expect(updated.transform).toBe(newTransform);
    expect(updated.platformTransforms).toBeUndefined();
  });

  it('stores in platformTransforms for mobile', () => {
    const entity = makeEntity();
    const updated = setEntityPlatformTransform(entity, 'mobile', mobileTransform);
    expect(updated.platformTransforms?.mobile).toBe(mobileTransform);
    expect(updated.transform).toBe(webTransform); // unchanged
  });

  it('preserves existing platformTransforms when adding new platform', () => {
    const entity = makeEntity({
      platformTransforms: { mobile: mobileTransform },
    });
    const desktopTransform: Transform2D = {
      position: { x: 0, y: 0 },
      size: { width: 1920, height: 1080 },
      rotation: 0,
      scale: 1,
    };
    const updated = setEntityPlatformTransform(entity, 'desktop', desktopTransform);
    expect(updated.platformTransforms?.mobile).toBe(mobileTransform);
    expect(updated.platformTransforms?.desktop).toBe(desktopTransform);
  });

  it('does not mutate the original entity', () => {
    const entity = makeEntity();
    const updated = setEntityPlatformTransform(entity, 'mobile', mobileTransform);
    expect(entity.platformTransforms).toBeUndefined();
    expect(updated).not.toBe(entity);
  });
});
