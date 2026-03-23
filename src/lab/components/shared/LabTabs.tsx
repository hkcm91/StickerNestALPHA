/**
 * LabTabs — Tab bar for switching between Lab panels.
 *
 * Active tab uses storm-colored bottom border + bioluminescent glow shadow,
 * matching the UI Swatches gallery tab pattern. Generous padding for
 * breathing room. Keyboard navigable with arrow keys.
 *
 * @module lab/components/shared
 * @layer L2
 */

import React from 'react';

import { SPRING, HEX, hexToRgb } from './palette';

export interface LabTab {
  id: string;
  label: string;
  /** Optional dot indicator color (e.g., ember for unsaved) */
  dotColor?: string;
}

export interface LabTabsProps {
  tabs: LabTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const [sr, sg, sb] = hexToRgb(HEX.storm);

export const LabTabs: React.FC<LabTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    }
    if (nextIndex !== index) {
      onTabChange(tabs[nextIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: '2px',
        padding: '3px',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.03)',
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            style={{
              flex: 1,
              padding: '10px 20px',
              fontSize: '13px',
              fontFamily: 'var(--sn-font-family)',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--sn-text)' : 'var(--sn-text-muted)',
              background: isActive
                ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%), var(--sn-surface-glass)'
                : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: `all 300ms ${SPRING}`,
              outline: 'none',
              position: 'relative',
              boxShadow: isActive
                ? [
                    `0 0 1px rgba(${sr},${sg},${sb},0.3)`,
                    `0 0 8px rgba(${sr},${sg},${sb},0.12)`,
                    `0 0 20px rgba(${sr},${sg},${sb},0.05)`,
                    `inset 0 1px 0 rgba(255,255,255,0.04)`,
                  ].join(', ')
                : 'none',
              letterSpacing: '0.01em',
            }}
          >
            {tab.label}
            {/* Active indicator — bottom glow line */}
            {isActive && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: 2,
                  left: '20%',
                  right: '20%',
                  height: 2,
                  borderRadius: 1,
                  background: `var(--sn-storm, ${HEX.storm})`,
                  boxShadow: `0 0 6px rgba(${sr},${sg},${sb},0.5), 0 0 12px rgba(${sr},${sg},${sb},0.2)`,
                }}
              />
            )}
            {tab.dotColor && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '6px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: tab.dotColor,
                  boxShadow: `0 0 4px ${tab.dotColor}`,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
