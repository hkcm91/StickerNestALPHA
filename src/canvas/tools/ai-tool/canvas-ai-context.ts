/**
 * Canvas AI Context Builder
 *
 * Builds AI prompt context from the current canvas state for better
 * widget generation results. Lighter than Lab's full context — focuses
 * on spatial layout and nearby entities.
 *
 * @module canvas/tools/ai-tool
 * @layer L4A-2
 */

import type { CanvasEntity, Point2D } from '@sn/types';

export interface CanvasAIContext {
  /** Canvas position where the user clicked */
  position: Point2D;
  /** Summary of nearby entities */
  nearbyEntities: Array<{
    type: string;
    name?: string;
    distance: number;
  }>;
  /** Number of total entities on canvas */
  totalEntities: number;
}

/**
 * Build AI context from canvas state for the generation prompt.
 */
export function buildCanvasAIContext(
  clickPosition: Point2D,
  entities: CanvasEntity[],
  maxNearby: number = 10,
): CanvasAIContext {
  // Calculate distances and sort by proximity
  const withDistance = entities.map((e) => {
    const ex = e.transform?.position?.x ?? 0;
    const ey = e.transform?.position?.y ?? 0;
    const dx = ex - clickPosition.x;
    const dy = ey - clickPosition.y;
    return {
      type: e.type,
      name: e.name ?? undefined,
      distance: Math.sqrt(dx * dx + dy * dy),
    };
  });

  withDistance.sort((a, b) => a.distance - b.distance);

  return {
    position: clickPosition,
    nearbyEntities: withDistance.slice(0, maxNearby),
    totalEntities: entities.length,
  };
}

/**
 * Serialize canvas AI context into a prompt-friendly string.
 */
export function serializeCanvasContextForPrompt(ctx: CanvasAIContext): string {
  const lines: string[] = [
    `Canvas position: (${Math.round(ctx.position.x)}, ${Math.round(ctx.position.y)})`,
    `Total entities on canvas: ${ctx.totalEntities}`,
  ];

  if (ctx.nearbyEntities.length > 0) {
    lines.push('Nearby entities:');
    for (const e of ctx.nearbyEntities) {
      const label = e.name ? `${e.type} "${e.name}"` : e.type;
      lines.push(`  - ${label} (${Math.round(e.distance)}px away)`);
    }
  }

  return lines.join('\n');
}
