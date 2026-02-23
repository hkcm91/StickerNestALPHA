/**
 * Test Entity Factory — helpers for creating test canvas entities
 * Extracted from TestHarness.tsx
 *
 * @module shell/dev
 * @layer L6
 */

import type { CanvasEntity } from '@sn/types';

// ============================================================================
// Entity Type Helpers
// ============================================================================

export type EntityType = 'sticker' | 'text' | 'shape' | 'widget' | 'lottie' | 'group' | 'docker';

export const ENTITY_COLORS: Record<EntityType, string> = {
  sticker: '#ffcc00',
  text: '#00ccff',
  shape: '#ff66cc',
  widget: '#66ff66',
  lottie: '#ff8800',
  group: '#aa66ff',
  docker: '#ff4444',
};

// Generate a simple UUID-like string for testing (not cryptographically random)
export function testUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const TEST_CANVAS_ID = testUuid();
export const TEST_USER_ID = testUuid();

export function createTestEntity(id: string, type: EntityType, x: number, y: number, zIndex: number): CanvasEntity {
  const now = new Date().toISOString();
  const entityId = testUuid();

  const base = {
    id: entityId,
    canvasId: TEST_CANVAS_ID,
    transform: {
      position: { x, y },
      size: { width: 100, height: type === 'text' ? 40 : 100 },
      rotation: 0,
      scale: 1,
    },
    zIndex,
    visible: true,
    locked: false,
    name: id,
    createdAt: now,
    updatedAt: now,
    createdBy: TEST_USER_ID,
  };

  if (type === 'text') {
    return {
      ...base,
      type: 'text' as const,
      content: 'Sample Text',
      fontSize: 16,
      fontFamily: 'sans-serif',
      fontWeight: 400,
      color: '#000000',
      textAlign: 'left' as const,
    };
  }
  if (type === 'shape') {
    return {
      ...base,
      type: 'shape' as const,
      shapeType: 'rectangle' as const,
      fill: '#ff66cc',
      stroke: '#000000',
      strokeWidth: 1,
      cornerRadius: 0,
    };
  }
  if (type === 'widget') {
    return {
      ...base,
      type: 'widget' as const,
      widgetInstanceId: testUuid(),
      widgetId: 'test-widget',
      config: {},
    };
  }
  if (type === 'lottie') {
    return {
      ...base,
      type: 'lottie' as const,
      assetUrl: 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189571e20dc3/3VEPaAaJfp.lottie',
      loop: true,
      speed: 1,
      direction: 1 as const,
      autoplay: true,
      aspectLocked: true,
    };
  }
  if (type === 'group') {
    return {
      ...base,
      type: 'group' as const,
      children: [],
    };
  }
  if (type === 'docker') {
    return {
      ...base,
      type: 'docker' as const,
      children: [],
      layout: 'free' as const,
    };
  }
  // Default: sticker
  return {
    ...base,
    type: 'sticker' as const,
    assetUrl: 'https://picsum.photos/seed/sticker1/100/100',
    assetType: 'image' as const,
    aspectLocked: true,
    clickEventType: 'sticker.clicked',
    hoverEffect: 'scale' as const,
  };
}

/**
 * Create a GroupEntity with specific children for testing parent-child relationships.
 */
export function createGroupEntity(
  name: string,
  childIds: string[],
  x: number,
  y: number,
  zIndex: number,
): CanvasEntity {
  const now = new Date().toISOString();
  return {
    id: testUuid(),
    type: 'group' as const,
    canvasId: TEST_CANVAS_ID,
    transform: {
      position: { x, y },
      size: { width: 200, height: 200 },
      rotation: 0,
      scale: 1,
    },
    zIndex,
    visible: true,
    locked: false,
    name,
    createdAt: now,
    updatedAt: now,
    createdBy: TEST_USER_ID,
    children: childIds,
  };
}

/**
 * Create a DockerEntity with specific child widget instances and layout mode.
 */
export function createDockerEntity(
  name: string,
  childWidgetIds: string[],
  layout: 'free' | 'stack' | 'grid',
  x: number,
  y: number,
  zIndex: number,
): CanvasEntity {
  const now = new Date().toISOString();
  return {
    id: testUuid(),
    type: 'docker' as const,
    canvasId: TEST_CANVAS_ID,
    transform: {
      position: { x, y },
      size: { width: 300, height: 300 },
      rotation: 0,
      scale: 1,
    },
    zIndex,
    visible: true,
    locked: false,
    name,
    createdAt: now,
    updatedAt: now,
    createdBy: TEST_USER_ID,
    children: childWidgetIds,
    layout,
  };
}
