/**
 * DockerWidgetSlot — glass-styled widget slot with undock button.
 *
 * Resize between slots is handled by DockerDivider in DockerContent.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useState } from 'react';

import type { DockerWidgetSlot as DockerWidgetSlotType } from '@sn/types';

import { HOVER_TRANSITION, STORM_RGB } from './docker-palette';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerWidgetSlotProps {
  slot: DockerWidgetSlotType;
  onRemove: (widgetInstanceId: string) => void;
  children: React.ReactNode;
  /** Effective height — always numeric when dividers are present */
  effectiveHeight?: number;
  minHeight?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_MIN_HEIGHT = 60;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerWidgetSlot: React.FC<DockerWidgetSlotProps> = ({
  slot,
  onRemove,
  children,
  effectiveHeight,
  minHeight = DEFAULT_MIN_HEIGHT,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const height = effectiveHeight ?? slot.height ?? 'auto';

  return (
    <div
      data-testid={`docker-widget-slot-${slot.widgetInstanceId}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        height,
        minHeight,
        flexShrink: 0,
        background: isDragOver
          ? 'rgba(255,255,255,0.03)'
          : isHovered
            ? 'rgba(255,255,255,0.01)'
            : 'transparent',
        transition: HOVER_TRANSITION,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => setIsDragOver(false)}
    >
      {/* Widget content */}
      <div style={{ height: '100%', padding: 4, position: 'relative' }}>
        {children}
      </div>

      {/* Undock button — glass pill, appears on hover */}
      <button
        data-testid={`docker-widget-remove-${slot.widgetInstanceId}`}
        onClick={() => onRemove(slot.widgetInstanceId)}
        title="Undock to canvas"
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(20,17,24,0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--sn-text-soft, #B8B5C0)',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 500,
          fontFamily: 'var(--sn-font-family, "Outfit", system-ui)',
          opacity: isHovered ? 1 : 0,
          pointerEvents: isHovered ? 'auto' : 'none',
          transition: `opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
          zIndex: 20,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},0.3)`;
          e.currentTarget.style.color = 'var(--sn-text, #E8E6ED)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.color = 'var(--sn-text-soft, #B8B5C0)';
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6" />
          <path d="M10 14L21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
        <span>Undock</span>
      </button>
    </div>
  );
};
