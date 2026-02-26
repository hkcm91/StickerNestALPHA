/**
 * Pathfinder Widget
 *
 * Vector pathfinder and shapebuilder tool panel matching Adobe Illustrator UI.
 *
 * Category: utilities
 *
 * @module runtime/widgets/pathfinder
 */

import React, { useEffect, useState } from 'react';

import type { WidgetManifest } from '@sn/types';

import { useEmit, useSubscribe, useWidgetState } from '../../hooks';

import { PATHFINDER_EVENTS } from './pathfinder.events';
import { type PathfinderConfig } from './pathfinder.schema';

/**
 * Widget manifest declaration.
 */
export const pathfinderManifest: WidgetManifest = {
  id: 'sn.builtin.pathfinder',
  name: 'Pathfinder',
  version: '1.0.0',
  description: 'Vector pathfinder and shapebuilder tool panel',
  category: 'utilities',
  author: { name: 'StickerNest', url: 'https://stickernest.com' },
  license: 'MIT',
  tags: ['vector', 'geometry', 'illustrator'],
  permissions: [],
  config: { fields: [] },
  entry: 'inline',
  size: {
    defaultWidth: 240,
    defaultHeight: 320,
    minWidth: 200,
    minHeight: 200,
    aspectLocked: false,
  },
  spatialSupport: false,
  events: {
    emits: Object.values(PATHFINDER_EVENTS.emits).map(name => ({ name })),
    subscribes: Object.values(PATHFINDER_EVENTS.subscribes).map(name => ({ name })),
  },
};

/**
 * Props for the Pathfinder widget component.
 */
export interface PathfinderWidgetProps {
  instanceId: string;
  config: PathfinderConfig;
  theme: Record<string, string>;
  viewport: { width: number; height: number };
}

// ── Icons ────────────────────────────────────────────────────────

const UniteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="10" height="10" rx="1" />
    <rect x="10" y="10" width="10" height="10" rx="1" />
    <path d="M10 14h4v-4" stroke="none" />
  </svg>
);

const MinusFrontIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="12" height="12" rx="1" fill="currentColor" fillOpacity="0.2" />
    <rect x="10" y="10" width="10" height="10" rx="1" strokeDasharray="2 2" />
  </svg>
);

const IntersectIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="12" height="12" rx="1" strokeOpacity="0.5" />
    <rect x="8" y="8" width="12" height="12" rx="1" strokeOpacity="0.5" />
    <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.4" />
  </svg>
);

const ExcludeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="12" height="12" rx="1" fill="currentColor" fillOpacity="0.2" />
    <rect x="10" y="10" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.2" />
    <rect x="10" y="10" width="6" height="6" rx="0.5" fill="var(--sn-surface)" stroke="none" />
  </svg>
);

const DivideIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="4" y="4" width="8" height="8" rx="0.5" />
    <rect x="12" y="4" width="8" height="8" rx="0.5" />
    <rect x="4" y="12" width="8" height="8" rx="0.5" />
    <rect x="12" y="12" width="8" height="8" rx="0.5" />
  </svg>
);

const TrimIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h10v10H4z" fill="currentColor" fillOpacity="0.2" />
    <path d="M10 10h10v10H10z" strokeDasharray="3 1" />
  </svg>
);

const MergeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="8" cy="12" r="6" fill="currentColor" fillOpacity="0.2" />
    <circle cx="16" cy="12" r="6" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

const CropIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="6" y="6" width="12" height="12" rx="1" />
    <path d="M2 6h20M6 2v20" strokeOpacity="0.3" />
  </svg>
);

/**
 * Pathfinder widget component.
 */
export const PathfinderWidget: React.FC<PathfinderWidgetProps> = ({
  instanceId,
  theme,
}) => {
  const emit = useEmit() as any;
  const [state] = useWidgetState(instanceId);
  
  // Widget internal state
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShapeBuilderActive, setIsShapeBuilderActive] = useState(false);

  /**
   * Initialize widget on mount.
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        if (state && Object.keys(state).length > 0) {
          console.log(`[Pathfinder] Restored state for instance ${instanceId}`);
        }
        setIsReady(true);
        emit(PATHFINDER_EVENTS.emits.READY, {
          instanceId,
          timestamp: Date.now(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize widget');
      }
    };
    initialize();
  }, [instanceId, emit]);

  /**
   * Set up event subscriptions.
   */
  useSubscribe(PATHFINDER_EVENTS.subscribes.CONFIG_UPDATE, (payload: any) => {
    console.log(`[Pathfinder] Config update received:`, payload);
  });

  if (error) {
    return (
      <div style={{ padding: '16px', backgroundColor: theme['--sn-surface'] || '#fff', color: '#ef4444', borderRadius: '8px' }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!isReady) {
    return (
      <div style={{ padding: '16px', backgroundColor: theme['--sn-surface'] || '#fff', color: '#666', borderRadius: '8px' }}>
        Loading...
      </div>
    );
  }

  const sectionHeaderStyle: React.CSSProperties = {
    margin: '0 0 8px 0',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme['--sn-text-muted'] || '#666',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '2px',
    marginBottom: '16px',
  };

  // Main widget UI
  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: theme['--sn-surface'] || '#fff',
        color: theme['--sn-text'] || '#000',
        fontFamily: theme['--sn-font-family'] || 'system-ui',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
      data-testid="pathfinder-widget"
    >
      <div style={{ marginBottom: '12px' }}>
        <h3 style={sectionHeaderStyle}>Shape Modes</h3>
        <div style={gridStyle}>
          <PathfinderButton
            title="Unite (Alt for Compound)"
            onClick={(e) => emit(PATHFINDER_EVENTS.emits.UNION, { instanceId, altKey: e.altKey })}
            icon={<UniteIcon />}
          />
          <PathfinderButton
            title="Minus Front"
            onClick={(e) => emit(PATHFINDER_EVENTS.emits.SUBTRACT, { instanceId, altKey: e.altKey })}
            icon={<MinusFrontIcon />}
          />
          <PathfinderButton
            title="Intersect"
            onClick={(e) => emit(PATHFINDER_EVENTS.emits.INTERSECT, { instanceId, altKey: e.altKey })}
            icon={<IntersectIcon />}
          />
          <PathfinderButton
            title="Exclude"
            onClick={(e) => emit(PATHFINDER_EVENTS.emits.EXCLUDE, { instanceId, altKey: e.altKey })}
            icon={<ExcludeIcon />}
          />
        </div>

        <h3 style={sectionHeaderStyle}>Pathfinders</h3>
        <div style={gridStyle}>
          <PathfinderButton
            title="Divide"
            onClick={(e) => emit(PATHFINDER_EVENTS.emits.DIVIDE, { instanceId, altKey: e.altKey })}
            icon={<DivideIcon />}
          />
          <PathfinderButton
            title="Trim"
            onClick={() => {}}
            icon={<TrimIcon />}
          />
          <PathfinderButton
            title="Merge"
            onClick={() => {}}
            icon={<MergeIcon />}
          />
          <PathfinderButton
            title="Crop"
            onClick={() => {}}
            icon={<CropIcon />}
          />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${theme['--sn-border'] || '#e5e7eb'}`, paddingTop: '12px', marginTop: 'auto' }}>
        <button
          onClick={() => {
            const nextActive = !isShapeBuilderActive;
            setIsShapeBuilderActive(nextActive);
            emit(PATHFINDER_EVENTS.emits.SHAPE_BUILDER_TOGGLE, { instanceId, active: nextActive });
          }}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: isShapeBuilderActive ? (theme['--sn-accent'] || '#3b82f6') : 'transparent',
            color: isShapeBuilderActive ? '#fff' : (theme['--sn-text'] || '#000'),
            border: `1px solid ${theme['--sn-accent'] || '#3b82f6'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.1s ease',
          }}
        >
          <span>✨</span> Shape Builder Tool
        </button>
        <p style={{ fontSize: '10px', color: '#999', textAlign: 'center', marginTop: '8px', margin: '8px 0 0 0' }}>
          Shortcut: Shift + M
        </p>
      </div>
    </div>
  );
};

interface PathfinderButtonProps {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
}

const PathfinderButton: React.FC<PathfinderButtonProps> = ({ title, onClick, icon }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={(e) => onClick(e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isHovered ? 'rgba(0,0,0,0.05)' : 'transparent',
        border: '1px solid transparent',
        borderRadius: '4px',
        cursor: 'pointer',
        padding: '4px',
        transition: 'background 0.1s ease',
      }}
    >
      {icon}
    </button>
  );
};

export default PathfinderWidget;
