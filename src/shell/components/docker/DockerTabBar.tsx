/**
 * DockerTabBar — tab strip for switching between docker tabs.
 *
 * @remarks
 * Features:
 * - Click to switch tabs
 * - Right-click context menu for rename/delete
 * - "+" button to add new tab
 * - Tab drag to reorder (future)
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useState, useRef } from 'react';

import type { DockerTab } from '@sn/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerTabBarProps {
  /** Tabs to display */
  tabs: DockerTab[];
  /** Index of active tab */
  activeTabIndex: number;
  /** Called when a tab is clicked */
  onTabClick: (index: number) => void;
  /** Called to add a new tab */
  onAddTab: () => void;
  /** Called to rename a tab */
  onRenameTab: (index: number, name: string) => void;
  /** Called to remove a tab */
  onRemoveTab: (index: number) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAB_HEIGHT = 28;

// ---------------------------------------------------------------------------
// Icon Components (Improved SVGs)
// ---------------------------------------------------------------------------

const PlusIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerTabBar: React.FC<DockerTabBarProps> = ({
  tabs,
  activeTabIndex,
  onTabClick,
  onAddTab,
  onRenameTab,
  onRemoveTab,
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle right-click for context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, index });
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Start editing tab name
  const startEditing = useCallback((index: number) => {
    setEditingIndex(index);
    setEditValue(tabs[index].name);
    closeContextMenu();
    setTimeout(() => inputRef.current?.select(), 0);
  }, [tabs, closeContextMenu]);

  // Finish editing
  const finishEditing = useCallback(() => {
    if (editingIndex !== null && editValue.trim()) {
      onRenameTab(editingIndex, editValue.trim());
    }
    setEditingIndex(null);
  }, [editingIndex, editValue, onRenameTab]);

  // Handle keyboard in edit mode
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
    }
  }, [finishEditing]);

  // Handle remove with confirmation if only one tab left
  const handleRemove = useCallback((index: number) => {
    closeContextMenu();
    if (tabs.length > 1) {
      onRemoveTab(index);
    }
  }, [tabs.length, onRemoveTab, closeContextMenu]);

  // Close context menu on click outside
  React.useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, closeContextMenu]);

  return (
    <div
      data-testid="docker-tab-bar"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: TAB_HEIGHT,
        background: 'var(--sn-bg, #f8f9fa)',
        borderBottom: '1px solid var(--sn-border, #e0e0e0)',
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none', // Firefox
        }}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeTabIndex;
          const isEditing = editingIndex === index;

          return (
            <div
              key={tab.id}
              data-testid={`docker-tab-${index}`}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => !isEditing && onTabClick(index)}
              onContextMenu={(e) => handleContextMenu(e, index)}
              onDoubleClick={() => startEditing(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                minWidth: '60px',
                maxWidth: '160px',
                background: isActive ? 'var(--sn-surface, #fff)' : 'transparent',
                borderRight: '1px solid var(--sn-border, #e0e0e0)',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                borderTop: isActive ? '2px solid var(--sn-accent, #3b82f6)' : '2px solid transparent',
              }}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={finishEditing}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '2px 4px',
                    border: '1px solid var(--sn-accent, #3b82f6)',
                    borderRadius: '2px',
                    fontSize: '12px',
                    fontFamily: 'var(--sn-font-family, system-ui)',
                    outline: 'none',
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: '12px',
                    color: isActive ? 'var(--sn-text, #1f2937)' : 'var(--sn-text-muted, #6b7280)',
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {tab.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Add tab button */}
      <button
        data-testid="docker-tab-add"
        onClick={onAddTab}
        title="Add tab"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: 'var(--sn-text-muted, #6b7280)',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <PlusIcon />
      </button>

      {/* Context menu */}
      {contextMenu && (
        <div
          data-testid="docker-tab-context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--sn-surface, #fff)',
            border: '1px solid var(--sn-border, #e0e0e0)',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '120px',
            padding: '4px 0',
          }}
        >
          <button
            onClick={() => startEditing(contextMenu.index)}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 12px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--sn-text, #1f2937)',
              fontFamily: 'var(--sn-font-family, system-ui)',
            }}
          >
            Rename
          </button>
          <button
            onClick={() => handleRemove(contextMenu.index)}
            disabled={tabs.length <= 1}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 12px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: tabs.length > 1 ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              color: tabs.length > 1 ? 'var(--sn-text, #1f2937)' : 'var(--sn-text-muted, #9ca3af)',
              fontFamily: 'var(--sn-font-family, system-ui)',
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
