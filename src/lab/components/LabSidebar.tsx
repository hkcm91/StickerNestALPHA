/**
 * LabSidebar — Vertical icon rail for the Widget Lab.
 *
 * 48px wide, full height. Flask branding icon at top, then five
 * panel icons stacked vertically. Active panel gets a storm-colored
 * left border indicator and subtle background highlight.
 *
 * @module lab/components
 * @layer L2
 */

import React, { useState } from 'react';

import type { SidebarPanel } from '../hooks/useLabState';

import { labPalette, SPRING, HEX, hexToRgb } from './shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Panel definitions
// ═══════════════════════════════════════════════════════════════════

interface PanelDef {
  id: SidebarPanel;
  label: string;
  icon: React.ReactNode;
}

const [sr, sg, sb] = hexToRgb(HEX.storm);

// Inline SVG icons — 18x18, stroke-based
const icons = {
  entities: (color: string) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="10" y="2" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="2" y="10" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="10" y="10" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" />
    </svg>
  ),
  widgets: (color: string) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 1.5L15.5 5.25V12.75L9 16.5L2.5 12.75V5.25L9 1.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 16.5V9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15.5 5.25L9 9L2.5 5.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  inspector: (color: string) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="3" y1="5" x2="15" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="9" x2="15" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="13" x2="15" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="5" r="1.5" fill={color} />
      <circle cx="12" cy="9" r="1.5" fill={color} />
      <circle cx="8" cy="13" r="1.5" fill={color} />
    </svg>
  ),
  testing: (color: string) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke={color} strokeWidth="1.5" />
      <path
        d="M7 6.5V11.5L12 9L7 6.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  deploy: (color: string) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 2L11.5 7H14.5L9 16L3.5 7H6.5L9 2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const PANELS: PanelDef[] = [
  { id: 'entities', label: 'Entities', icon: icons.entities(labPalette.textMuted) },
  { id: 'widgets', label: 'Widgets', icon: icons.widgets(labPalette.textMuted) },
  { id: 'inspector', label: 'Inspector', icon: icons.inspector(labPalette.textMuted) },
  { id: 'testing', label: 'Testing', icon: icons.testing(labPalette.textMuted) },
  { id: 'deploy', label: 'Deploy', icon: icons.deploy(labPalette.textMuted) },
];

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

// Debug icon — bug/antenna shape
const debugIcon = (color: string) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <ellipse cx="9" cy="11" rx="4" ry="5" stroke={color} strokeWidth="1.5" />
    <path d="M7 6.5C7 5.12 7.9 4 9 4s2 1.12 2 2.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="5" y1="9" x2="3" y2="7.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="13" y1="9" x2="15" y2="7.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="5" y1="13" x2="3" y2="14.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="13" y1="13" x2="15" y2="14.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const [er, eg, eb] = hexToRgb(HEX.ember);

export interface LabSidebarProps {
  activePanel: SidebarPanel;
  onPanelChange: (panel: SidebarPanel) => void;
  debugMode: boolean;
  onToggleDebug: () => void;
}

export const LabSidebar: React.FC<LabSidebarProps> = ({ activePanel, onPanelChange, debugMode, onToggleDebug }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [debugHovered, setDebugHovered] = useState(false);

  const getIconColor = (id: SidebarPanel): string => {
    if (id === activePanel) return labPalette.text;
    if (id === hoveredId) return labPalette.textSoft;
    return labPalette.textMuted;
  };

  return (
    <nav
      aria-label="Lab navigation"
      style={{
        width: 48,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--sn-surface-glass, rgba(20,17,24,0.85))',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
        paddingTop: 12,
      }}
    >
      {/* Flask branding icon */}
      <div
        style={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ opacity: 0.7 }}>
          <path
            d="M6 2v5.5L3 13a1.5 1.5 0 001.3 2.2h9.4A1.5 1.5 0 0015 13l-3-5.5V2"
            stroke={HEX.storm}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="5" y1="2" x2="13" y2="2" stroke={HEX.storm} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Panel icons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {PANELS.map((panel) => {
          const isActive = panel.id === activePanel;
          const isHovered = panel.id === hoveredId;
          const iconColor = getIconColor(panel.id);

          return (
            <button
              key={panel.id}
              title={panel.label}
              onClick={() => onPanelChange(panel.id)}
              onMouseEnter={() => setHoveredId(panel.id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                position: 'relative',
                width: 40,
                height: 40,
                borderRadius: 8,
                border: 'none',
                borderLeft: isActive ? `3px solid ${HEX.storm}` : '3px solid transparent',
                background: isActive
                  ? `rgba(${sr},${sg},${sb},0.12)`
                  : isHovered
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: `all 250ms ${SPRING}`,
                outline: 'none',
                padding: 0,
              }}
            >
              {panel.id === 'entities' && icons.entities(iconColor)}
              {panel.id === 'widgets' && icons.widgets(iconColor)}
              {panel.id === 'inspector' && icons.inspector(iconColor)}
              {panel.id === 'testing' && icons.testing(iconColor)}
              {panel.id === 'deploy' && icons.deploy(iconColor)}
            </button>
          );
        })}
      </div>

      {/* Spacer — push debug toggle to bottom */}
      <div style={{ flex: 1 }} />

      {/* Debug mode toggle */}
      <div style={{ paddingBottom: 12 }}>
        <button
          title={debugMode ? 'Debug mode on' : 'Debug mode off'}
          onClick={onToggleDebug}
          onMouseEnter={() => setDebugHovered(true)}
          onMouseLeave={() => setDebugHovered(false)}
          aria-pressed={debugMode}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            border: 'none',
            background: debugMode
              ? `rgba(${er},${eg},${eb},0.12)`
              : debugHovered
                ? 'rgba(255,255,255,0.04)'
                : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: `all 250ms ${SPRING}`,
            outline: 'none',
            padding: 0,
            boxShadow: debugMode ? `0 0 8px rgba(${er},${eg},${eb},0.2)` : 'none',
          }}
        >
          {debugIcon(
            debugMode
              ? HEX.ember
              : debugHovered
                ? labPalette.textSoft
                : labPalette.textMuted,
          )}
        </button>
      </div>
    </nav>
  );
};
