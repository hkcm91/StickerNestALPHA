/**
 * LabTabs — Tab bar for switching between Lab panels.
 *
 * Active tab uses glow state (soft box-shadow) rather than
 * background change. Keyboard navigable with arrow keys.
 *
 * @module lab/components/shared
 * @layer L2
 */

import React from 'react';

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
        padding: '2px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
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
              padding: '6px 12px',
              fontSize: '12px',
              fontFamily: 'var(--sn-font-family)',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--sn-text)' : 'var(--sn-text-muted)',
              background: isActive ? 'var(--sn-surface-glass)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
              outline: 'none',
              position: 'relative',
              boxShadow: isActive ? '0 0 8px var(--sn-storm)22' : 'none',
            }}
          >
            {tab.label}
            {tab.dotColor && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
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
