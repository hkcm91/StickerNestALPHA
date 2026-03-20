/**
 * ConstellationLines — P13: Multi-select creates a constellation.
 *
 * When multiple widgets are selected, draws subtle dashed lines
 * between them — they become a group, a constellation.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React from "react";

import type { SceneGraph } from "../../../canvas/core";
import { resolveEntityTransform } from "../../../canvas/core";
import { useUIStore } from "../../../kernel/stores/ui/ui.store";
import { getEntityBoundingBox } from "../renderers/entity-style";

export interface ConstellationLinesProps {
  selectedIds: Set<string>;
  sceneGraph: SceneGraph | null;
  interactionMode: "edit" | "preview";
}

/**
 * Renders SVG dashed lines between selected entities' centers.
 * Only visible with 2+ selected entities in edit mode.
 */
export const ConstellationLines: React.FC<ConstellationLinesProps> = ({
  selectedIds,
  sceneGraph,
  interactionMode,
}) => {
  const platform = useUIStore((s) => s.canvasPlatform);

  if (interactionMode !== "edit") return null;
  if (selectedIds.size < 2) return null;
  if (!sceneGraph) return null;

  // Collect entity centers
  const centers: Array<{ x: number; y: number; id: string }> = [];
  for (const id of selectedIds) {
    const entity = sceneGraph.getEntity(id);
    if (!entity) continue;
    const resolvedTransform = resolveEntityTransform(entity, platform);
    const bounds = getEntityBoundingBox(entity, resolvedTransform);
    centers.push({
      id,
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    });
  }

  if (centers.length < 2) return null;

  // Build lines connecting each consecutive pair
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];
  for (let i = 0; i < centers.length - 1; i++) {
    lines.push({
      x1: centers[i].x,
      y1: centers[i].y,
      x2: centers[i + 1].x,
      y2: centers[i + 1].y,
      key: `${centers[i].id}-${centers[i + 1].id}`,
    });
  }

  return (
    <svg
      data-testid="constellation-lines"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 0,
      }}
    >
      {lines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="var(--sn-accent, #4E7B8E)"
          strokeWidth="1"
          strokeDasharray="4 6"
          opacity="0.25"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};
