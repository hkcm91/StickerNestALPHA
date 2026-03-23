/**
 * DockerTabBar — glass tab strip with drag reorder and close buttons.
 *
 * @remarks
 * Features:
 * - Click to switch tabs
 * - Close (x) button on hover per tab
 * - Right-click context menu for rename
 * - Drag to reorder tabs
 * - "+" button to add new tab
 *
 * @module shell/components/docker
 * @layer L6
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';

import type { DockerTab } from '@sn/types';

import { HOVER_TRANSITION, STORM_RGB } from './docker-palette';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerTabBarProps {
  tabs: DockerTab[];
  activeTabIndex: number;
  onTabClick: (index: number) => void;
  onAddTab: () => void;
  onRenameTab: (index: number, name: string) => void;
  onRemoveTab: (index: number) => void;
  /** Called when tabs are reordered via drag */
  onReorderTabs?: (tabIds: string[]) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAB_HEIGHT = 30;
const DRAG_THRESHOLD = 4;

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
  onReorderTabs,
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{ dragIndex: number; overIndex: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartX = useRef<number | null>(null);

  // Handle right-click for context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, index });
  }, []);

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

  const finishEditing = useCallback(() => {
    if (editingIndex !== null && editValue.trim()) {
      onRenameTab(editingIndex, editValue.trim());
    }
    setEditingIndex(null);
  }, [editingIndex, editValue, onRenameTab]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
    }
  }, [finishEditing]);

  const handleRemove = useCallback((index: number) => {
    closeContextMenu();
    if (tabs.length > 1) {
      onRemoveTab(index);
    }
  }, [tabs.length, onRemoveTab, closeContextMenu]);

  // Tab drag reorder
  const handleTabDragStart = useCallback((e: React.MouseEvent, index: number) => {
    if (editingIndex !== null) return;
    dragStartX.current = e.clientX;

    const handleMove = (moveEvent: MouseEvent) => {
      if (dragStartX.current === null) return;
      const dist = Math.abs(moveEvent.clientX - dragStartX.current);
      if (dist < DRAG_THRESHOLD) return;

      // Find which tab we're over
      const tabElements = document.querySelectorAll('[data-docker-tab-index]');
      let overIdx = index;
      for (const el of tabElements) {
        const rect = el.getBoundingClientRect();
        if (moveEvent.clientX >= rect.left && moveEvent.clientX <= rect.right) {
          overIdx = parseInt(el.getAttribute('data-docker-tab-index') ?? '0', 10);
          break;
        }
      }

      setDragState({ dragIndex: index, overIndex: overIdx });
    };

    const handleUp = () => {
      if (dragState && dragState.dragIndex !== dragState.overIndex && onReorderTabs) {
        const newOrder = [...tabs.map((t) => t.id)];
        const [moved] = newOrder.splice(dragState.dragIndex, 1);
        newOrder.splice(dragState.overIndex, 0, moved);
        onReorderTabs(newOrder);
      }
      dragStartX.current = null;
      setDragState(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('mouseup', handleUp);
  }, [editingIndex, tabs, dragState, onReorderTabs]);

  // Close context menu on click outside
  useEffect(() => {
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
        background: 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
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
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeTabIndex;
          const isEditing = editingIndex === index;
          const isHovered = hoveredIndex === index;
          const isDragged = dragState?.dragIndex === index;
          const isDropTarget = dragState !== null && dragState.overIndex === index && dragState.dragIndex !== index;

          return (
            <div
              key={tab.id}
              data-testid={`docker-tab-${index}`}
              data-active={isActive ? 'true' : 'false'}
              data-docker-tab-index={index}
              onClick={() => !isEditing && onTabClick(index)}
              onContextMenu={(e) => handleContextMenu(e, index)}
              onDoubleClick={() => startEditing(index)}
              onMouseDown={(e) => handleTabDragStart(e, index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                paddingRight: isHovered && tabs.length > 1 ? 4 : 8,
                minWidth: 50,
                maxWidth: 160,
                background: isActive
                  ? 'rgba(255,255,255,0.06)'
                  : isHovered
                    ? 'rgba(255,255,255,0.03)'
                    : 'transparent',
                cursor: isDragged ? 'grabbing' : 'pointer',
                transition: HOVER_TRANSITION,
                opacity: isDragged ? 0.6 : 1,
                transform: isDragged ? 'scale(1.02)' : 'none',
                // Drop indicator — storm-colored left border
                borderLeft: isDropTarget
                  ? `2px solid rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},0.6)`
                  : '2px solid transparent',
              }}
            >
              {/* Active indicator — bottom glow line */}
              {isActive && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 4,
                    right: 4,
                    height: 2,
                    borderRadius: 1,
                    background: `rgb(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b})`,
                    boxShadow: `0 0 6px rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},0.4)`,
                  }}
                />
              )}

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
                    border: `1px solid rgba(${STORM_RGB.r},${STORM_RGB.g},${STORM_RGB.b},0.4)`,
                    borderRadius: 3,
                    fontSize: 12,
                    fontFamily: 'var(--sn-font-family, "Outfit", system-ui)',
                    color: 'var(--sn-text, #E8E6ED)',
                    background: 'rgba(255,255,255,0.06)',
                    outline: 'none',
                  }}
                />
              ) : (
                <>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive
                        ? 'var(--sn-text, #E8E6ED)'
                        : 'var(--sn-text-muted, #7A7784)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                    }}
                  >
                    {tab.name}
                  </span>

                  {/* Close button — visible on hover, only if >1 tab */}
                  {isHovered && tabs.length > 1 && (
                    <button
                      data-testid={`docker-tab-close-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 16,
                        height: 16,
                        marginLeft: 2,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--sn-text-muted, #7A7784)',
                        borderRadius: 3,
                        cursor: 'pointer',
                        transition: HOVER_TRANSITION,
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(200,88,88,0.2)';
                        e.currentTarget.style.color = '#C85858';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--sn-text-muted, #7A7784)';
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </>
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
          width: 28,
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: 'var(--sn-text-muted, #7A7784)',
          cursor: 'pointer',
          transition: HOVER_TRANSITION,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = 'var(--sn-text-soft, #B8B5C0)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--sn-text-muted, #7A7784)';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Context menu */}
      {contextMenu && (
        <div
          data-testid="docker-tab-context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--sn-surface-glass, rgba(20,17,24,0.85))',
            backdropFilter: 'blur(20px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
            zIndex: 1000,
            minWidth: 130,
            padding: '4px',
          }}
        >
          <button
            onClick={() => startEditing(contextMenu.index)}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--sn-text, #E8E6ED)',
              fontFamily: 'var(--sn-font-family, "Outfit", system-ui)',
              borderRadius: 4,
              transition: HOVER_TRANSITION,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Rename
          </button>
          <button
            onClick={() => handleRemove(contextMenu.index)}
            disabled={tabs.length <= 1}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: tabs.length > 1 ? 'pointer' : 'not-allowed',
              fontSize: 13,
              color: tabs.length > 1 ? '#C85858' : 'var(--sn-text-faint, #4A4754)',
              fontFamily: 'var(--sn-font-family, "Outfit", system-ui)',
              borderRadius: 4,
              transition: HOVER_TRANSITION,
            }}
            onMouseEnter={(e) => {
              if (tabs.length > 1) e.currentTarget.style.background = 'rgba(200,88,88,0.1)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
