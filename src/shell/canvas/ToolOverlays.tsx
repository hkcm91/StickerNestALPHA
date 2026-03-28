/**
 * Canvas tool overlay components — SVG previews for pen-path and pathfinder tools.
 * Extracted from CanvasToolLayer.tsx for file-size management.
 *
 * @module shell/canvas
 * @layer L6
 */

import React from 'react';

import type { ViewportState } from '../../canvas/core';
import { anchorsToSvgPath } from '../../canvas/core';

import type { PenPathPreview } from './tool-layer-helpers';

// ── Pathfinder overlay ──────────────────────────────────────────

interface PathfinderOverlayProps {
  hover: { pathData?: string; bounds?: { x: number; y: number; width: number; height: number } } | null;
  viewport: ViewportState;
}

export const PathfinderOverlay: React.FC<PathfinderOverlayProps> = ({ hover, viewport }) => {
  if (!hover) return null;
  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 997 }}
    >
      <defs>
        <pattern id="pathfinder-dot-mesh" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="rgba(0,0,0,0.5)" />
        </pattern>
      </defs>
      {hover.pathData && (
        <g transform={`translate(${viewport.offset.x * viewport.zoom}, ${viewport.offset.y * viewport.zoom}) scale(${viewport.zoom})`}>
          <path
            d={hover.pathData}
            fill="url(#pathfinder-dot-mesh)"
            stroke="#ef4444"
            strokeWidth={1 / viewport.zoom}
            style={{ opacity: 0.8 }}
          />
        </g>
      )}
    </svg>
  );
};

// ── Pen path preview overlay ────────────────────────────────────

interface PenPathPreviewOverlayProps {
  preview: PenPathPreview;
  viewport: ViewportState;
}

export const PenPathPreviewOverlay: React.FC<PenPathPreviewOverlayProps> = ({ preview, viewport }) => {
  if (preview.anchors.length === 0) return null;

  const transformedAnchors = preview.anchors.map((a) => ({
    position: {
      x: (a.position.x + viewport.offset.x) * viewport.zoom,
      y: (a.position.y + viewport.offset.y) * viewport.zoom,
    },
    handleIn: a.handleIn
      ? { x: a.handleIn.x * viewport.zoom, y: a.handleIn.y * viewport.zoom }
      : undefined,
    handleOut: a.handleOut
      ? { x: a.handleOut.x * viewport.zoom, y: a.handleOut.y * viewport.zoom }
      : undefined,
    pointType: a.pointType as 'corner' | 'smooth' | 'symmetric',
  }));

  const last = preview.anchors[preview.anchors.length - 1];
  const lastScreenX = (last.position.x + viewport.offset.x) * viewport.zoom;
  const lastScreenY = (last.position.y + viewport.offset.y) * viewport.zoom;

  let rubberBand: React.ReactNode = null;
  if (preview.mousePosition) {
    const mx = (preview.mousePosition.x + viewport.offset.x) * viewport.zoom;
    const my = (preview.mousePosition.y + viewport.offset.y) * viewport.zoom;
    if (last.handleOut) {
      const cpx = lastScreenX + last.handleOut.x * viewport.zoom;
      const cpy = lastScreenY + last.handleOut.y * viewport.zoom;
      rubberBand = (
        <path d={`M ${lastScreenX} ${lastScreenY} Q ${cpx} ${cpy} ${mx} ${my}`}
          fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="6 3" opacity={0.6} />
      );
    } else {
      rubberBand = (
        <line x1={lastScreenX} y1={lastScreenY} x2={mx} y2={my}
          stroke="#3b82f6" strokeWidth={1} strokeDasharray="6 3" opacity={0.6} />
      );
    }
  }

  return (
    <svg
      data-testid="pen-path-preview"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 998 }}
    >
      {/* Main path */}
      {preview.anchors.length > 1 && (
        <path
          d={anchorsToSvgPath(transformedAnchors, false)}
          fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4"
        />
      )}

      {/* Rubber-band from last anchor to mouse */}
      {rubberBand}

      {/* Handle bars and dots */}
      {preview.anchors.map((a, i) => {
        const ax = (a.position.x + viewport.offset.x) * viewport.zoom;
        const ay = (a.position.y + viewport.offset.y) * viewport.zoom;
        return (
          <g key={`handles-${i}`}>
            {a.handleIn && (
              <>
                <line x1={ax} y1={ay}
                  x2={ax + a.handleIn.x * viewport.zoom} y2={ay + a.handleIn.y * viewport.zoom}
                  stroke="#94a3b8" strokeWidth={1} />
                <circle cx={ax + a.handleIn.x * viewport.zoom} cy={ay + a.handleIn.y * viewport.zoom}
                  r={3} fill="white" stroke="#94a3b8" strokeWidth={1} />
              </>
            )}
            {a.handleOut && (
              <>
                <line x1={ax} y1={ay}
                  x2={ax + a.handleOut.x * viewport.zoom} y2={ay + a.handleOut.y * viewport.zoom}
                  stroke="#94a3b8" strokeWidth={1} />
                <circle cx={ax + a.handleOut.x * viewport.zoom} cy={ay + a.handleOut.y * viewport.zoom}
                  r={3} fill="white" stroke="#94a3b8" strokeWidth={1} />
              </>
            )}
          </g>
        );
      })}

      {/* Anchor dots */}
      {preview.anchors.map((a, i) => {
        const ax = (a.position.x + viewport.offset.x) * viewport.zoom;
        const ay = (a.position.y + viewport.offset.y) * viewport.zoom;
        return (
          <circle key={`anchor-${i}`} cx={ax} cy={ay} r={4}
            fill={i === 0 ? '#3b82f6' : 'white'} stroke="#3b82f6" strokeWidth={2} />
        );
      })}
    </svg>
  );
};
