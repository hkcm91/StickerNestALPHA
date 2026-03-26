import { describe, it, expect } from 'vitest';

import type { CanvasEntity, PropertyLayer } from '@sn/types';

import { resolveEntityProperties, hasActivePropertyLayers } from './property-layer-resolver';

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function makeLayer(id: string, order: number, properties: Record<string, unknown>, enabled = true): PropertyLayer {
  return {
    id,
    widgetInstanceId: UUID,
    widgetId: 'test-widget',
    label: `Layer ${id}`,
    enabled,
    order,
    properties,
    createdAt: '2024-01-01T00:00:00Z',
  };
}

function makeEntity(overrides?: Partial<CanvasEntity>): CanvasEntity {
  return {
    id: UUID,
    type: 'shape',
    canvasId: UUID,
    transform: {
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 0,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: UUID,
    shapeType: 'rectangle',
    fill: null,
    stroke: '#000000',
    strokeWidth: 1,
    cornerRadius: 0,
    ...overrides,
  } as CanvasEntity;
}

describe('resolveEntityProperties', () => {
  it('returns base properties when entity has no layers', () => {
    const entity = makeEntity();
    const resolved = resolveEntityProperties(entity);
    expect(resolved.opacity).toBe(1);
    expect(resolved.stroke).toBe('#000000');
    expect(resolved).not.toHaveProperty('propertyLayers');
  });

  it('returns base properties when propertyLayers is empty array', () => {
    const entity = makeEntity({ propertyLayers: [] } as Partial<CanvasEntity>);
    const resolved = resolveEntityProperties(entity);
    expect(resolved.opacity).toBe(1);
  });

  it('applies a single enabled layer override', () => {
    const entity = makeEntity({
      propertyLayers: [makeLayer('l1', 0, { opacity: 0.5, stroke: '#ff0000' })],
    } as Partial<CanvasEntity>);
    const resolved = resolveEntityProperties(entity);
    expect(resolved.opacity).toBe(0.5);
    expect(resolved.stroke).toBe('#ff0000');
    // Unmodified properties remain
    expect(resolved.visible).toBe(true);
  });

  it('skips disabled layers', () => {
    const entity = makeEntity({
      propertyLayers: [makeLayer('l1', 0, { opacity: 0.5 }, false)],
    } as Partial<CanvasEntity>);
    const resolved = resolveEntityProperties(entity);
    expect(resolved.opacity).toBe(1); // base value preserved
  });

  it('topmost layer wins for same key (last-write-wins)', () => {
    const entity = makeEntity({
      propertyLayers: [
        makeLayer('l1', 0, { opacity: 0.3 }),
        makeLayer('l2', 1, { opacity: 0.7 }),
      ],
    } as Partial<CanvasEntity>);
    const resolved = resolveEntityProperties(entity);
    expect(resolved.opacity).toBe(0.7); // layer with order=1 wins
  });

  it('respects order regardless of array position', () => {
    const entity = makeEntity({
      propertyLayers: [
        makeLayer('l2', 1, { opacity: 0.7 }),
        makeLayer('l1', 0, { opacity: 0.3 }),
      ],
    } as Partial<CanvasEntity>);
    const resolved = resolveEntityProperties(entity);
    expect(resolved.opacity).toBe(0.7); // order=1 still wins
  });

  it('merges different keys from different layers', () => {
    const entity = makeEntity({
      propertyLayers: [
        makeLayer('l1', 0, { opacity: 0.5 }),
        makeLayer('l2', 1, { stroke: '#00ff00' }),
      ],
    } as Partial<CanvasEntity>);
    const resolved = resolveEntityProperties(entity);
    expect(resolved.opacity).toBe(0.5);
    expect(resolved.stroke).toBe('#00ff00');
  });

  it('handles layer with empty properties as no-op', () => {
    const entity = makeEntity({
      propertyLayers: [makeLayer('l1', 0, {})],
    } as Partial<CanvasEntity>);
    const resolved = resolveEntityProperties(entity);
    expect(resolved.opacity).toBe(1); // unchanged
  });
});

describe('hasActivePropertyLayers', () => {
  it('returns false for entity with no layers', () => {
    expect(hasActivePropertyLayers(makeEntity())).toBe(false);
  });

  it('returns false when all layers are disabled', () => {
    const entity = makeEntity({
      propertyLayers: [makeLayer('l1', 0, { opacity: 0.5 }, false)],
    } as Partial<CanvasEntity>);
    expect(hasActivePropertyLayers(entity)).toBe(false);
  });

  it('returns true when at least one layer is enabled', () => {
    const entity = makeEntity({
      propertyLayers: [
        makeLayer('l1', 0, { opacity: 0.5 }, false),
        makeLayer('l2', 1, { stroke: '#ff0000' }, true),
      ],
    } as Partial<CanvasEntity>);
    expect(hasActivePropertyLayers(entity)).toBe(true);
  });
});
