/**
 * GraphBreadcrumb — Depth navigation breadcrumb for the scene graph.
 *
 * Shows: Scene > Docker Name > Widget Name (internals)
 * Each segment is clickable to navigate back up the hierarchy.
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import React from 'react';

import type { BreadcrumbSegment } from '../../graph/scene-types';
import { labPalette, SPRING } from '../shared/palette';

export interface GraphBreadcrumbProps {
  breadcrumbs: BreadcrumbSegment[];
  onNavigate: (segmentIndex: number) => void;
}

export const GraphBreadcrumb: React.FC<GraphBreadcrumbProps> = ({
  breadcrumbs,
  onNavigate,
}) => {
  if (breadcrumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Graph navigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 10px',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {breadcrumbs.map((segment, i) => {
        const isLast = i === breadcrumbs.length - 1;

        return (
          <React.Fragment key={segment.id}>
            {i > 0 && (
              <span style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.2)',
                padding: '0 2px',
              }}>
                {'\u203A'}
              </span>
            )}
            <button
              onClick={() => !isLast && onNavigate(i)}
              disabled={isLast}
              aria-current={isLast ? 'page' : undefined}
              style={{
                fontSize: 10,
                fontWeight: isLast ? 600 : 400,
                fontFamily: 'var(--sn-font-family)',
                color: isLast ? labPalette.text : labPalette.textMuted,
                background: 'transparent',
                border: 'none',
                padding: '2px 4px',
                borderRadius: 4,
                cursor: isLast ? 'default' : 'pointer',
                transition: `all 200ms ${SPRING}`,
                opacity: isLast ? 1 : 0.7,
              }}
              onMouseEnter={(e) => {
                if (!isLast) e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                if (!isLast) e.currentTarget.style.opacity = '0.7';
              }}
            >
              {segment.label}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
