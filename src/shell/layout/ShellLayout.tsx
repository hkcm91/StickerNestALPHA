/**
 * Shell Layout — grid layout with slide-out tray overlays for sidebars.
 *
 * @module shell/layout
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

import { useUIStore } from '../../kernel/stores/ui/ui.store';
import { DockerLayer } from '../components/docker';
import { themeVar } from '../theme/theme-vars';

export interface ShellLayoutProps {
  /** Content for the top bar slot (toolbar) */
  topbar?: React.ReactNode;
  /** Content for the left sidebar slot (asset panel) */
  sidebarLeft?: React.ReactNode;
  /** Content for the right sidebar slot (properties, layers) */
  sidebarRight?: React.ReactNode;
  /** Main content (canvas workspace) */
  children: React.ReactNode;
  /** Render function for widget content in dockers */
  renderDockerWidget?: (widgetInstanceId: string) => React.ReactNode;
}

const SIDEBAR_DEFAULT = 280;
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const TRAY_Z = 50;
const TAB_WIDTH = 28;
const TAB_HEIGHT = 80;

/** Spring easing — Principle 4: "Spring physics, not CSS ease" */
const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const PANEL_TRANSITION = `transform 0.35s ${SPRING}`;
const TAB_TRANSITION_LEFT = `left 0.3s ${SPRING}`;
const TAB_TRANSITION_RIGHT = `right 0.3s ${SPRING}`;

/**
 * Shell Layout — topbar + full-width main area with overlay tray panels.
 *
 * Layout:
 * ```
 * +--------topbar--------+
 * |                      |
 * | [tab] main     [tab] |
 * |                      |
 * +----------------------+
 * ```
 * Trays slide in from edges, overlaying the main content.
 */
export const ShellLayout: React.FC<ShellLayoutProps> = ({
  topbar,
  sidebarLeft,
  sidebarRight,
  children,
  renderDockerWidget,
}) => {
  const leftOpen = useUIStore((s) => s.sidebarLeftOpen);
  const rightOpen = useUIStore((s) => s.sidebarRightOpen);
  const toggleLeft = useUIStore((s) => s.toggleSidebarLeft);
  const toggleRight = useUIStore((s) => s.toggleSidebarRight);

  const hasLeft = sidebarLeft != null;
  const hasRight = sidebarRight != null;

  // Resizable panel widths (local state, not persisted)
  const [leftWidth, setLeftWidth] = useState(SIDEBAR_DEFAULT);
  const [rightWidth, setRightWidth] = useState(SIDEBAR_DEFAULT);
  const isResizing = useRef(false);

  const startResize = useCallback(
    (side: 'left' | 'right', startX: number) => {
      const startWidth = side === 'left' ? leftWidth : rightWidth;
      const setWidth = side === 'left' ? setLeftWidth : setRightWidth;
      const direction = side === 'left' ? 1 : -1;
      isResizing.current = true;

      const onMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        const delta = (e.clientX - startX) * direction;
        const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth + delta));
        setWidth(newWidth);
      };
      const onMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [leftWidth, rightWidth],
  );

  // Close panels on backdrop click (click-outside dismiss)
  const handleBackdropClick = useCallback(() => {
    if (leftOpen) toggleLeft();
    if (rightOpen) toggleRight();
  }, [leftOpen, rightOpen, toggleLeft, toggleRight]);

  return (
    <div
      data-testid="shell-layout"
      style={{
        display: 'grid',
        gridTemplateRows: topbar ? 'auto 1fr' : '1fr',
        gridTemplateColumns: '1fr',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: themeVar('--sn-bg'),
        color: themeVar('--sn-text'),
        fontFamily: themeVar('--sn-font-family'),
      }}
    >
      {/* Top bar — overflow:visible so toolbar tray dropdown is not clipped */}
      {topbar && (
        <div data-testid="shell-topbar" style={{ minHeight: 0, minWidth: 0, overflow: 'visible', position: 'relative', zIndex: 60 }}>
          {topbar}
        </div>
      )}

      {/* Main content area with overlay trays */}
      <div
        data-testid="shell-main"
        style={{
          position: 'relative',
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* Canvas content — always full width */}
        {children}

        {/* Docker layer — renders floating and docked dockers */}
        {renderDockerWidget && (
          <DockerLayer renderWidget={renderDockerWidget} />
        )}

        {/* Click-outside dismiss overlay — behind panels, above canvas */}
        {(leftOpen || rightOpen) && (
          <div
            data-testid="panel-backdrop"
            onClick={handleBackdropClick}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: TRAY_Z - 1,
            }}
          />
        )}

        {/* Left tray overlay */}
        {hasLeft && (
          <>
            {/* Left toggle tab */}
            <button
              data-testid="tray-tab-left"
              onClick={toggleLeft}
              style={{
                position: 'absolute',
                top: '50%',
                left: leftOpen ? leftWidth : 0,
                transform: 'translateY(-50%)',
                zIndex: TRAY_Z + 1,
                width: TAB_WIDTH,
                height: TAB_HEIGHT,
                border: `1px solid ${themeVar('--sn-border')}`,
                borderLeft: 'none',
                borderRadius: '0 6px 6px 0',
                background: themeVar('--sn-surface'),
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
                transition: isResizing.current ? 'none' : TAB_TRANSITION_LEFT,
                color: themeVar('--sn-text-muted'),
                fontSize: '11px',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                letterSpacing: '1px',
                fontFamily: themeVar('--sn-font-family'),
              }}
            >
              {leftOpen ? '\u25C0' : 'Assets'}
            </button>

            {/* Left tray panel */}
            <div
              data-testid="shell-sidebar-left"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: leftWidth,
                zIndex: TRAY_Z,
                background: themeVar('--sn-surface-glass'),
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRight: `1px solid ${themeVar('--sn-border')}`,
                boxShadow: '2px 0 12px rgba(0,0,0,0.1)',
                transform: leftOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: PANEL_TRANSITION,
                overflow: 'hidden auto',
              }}
            >
              {sidebarLeft}
              {/* Resize handle — right edge */}
              <div
                data-testid="resize-handle-left"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startResize('left', e.clientX);
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 4,
                  height: '100%',
                  cursor: 'col-resize',
                  zIndex: 1,
                }}
              />
            </div>
          </>
        )}

        {/* Right tray overlay */}
        {hasRight && (
          <>
            {/* Right toggle tab */}
            <button
              data-testid="tray-tab-right"
              onClick={toggleRight}
              style={{
                position: 'absolute',
                top: '50%',
                right: rightOpen ? rightWidth : 0,
                transform: 'translateY(-50%)',
                zIndex: TRAY_Z + 1,
                width: TAB_WIDTH,
                height: TAB_HEIGHT,
                border: `1px solid ${themeVar('--sn-border')}`,
                borderRight: 'none',
                borderRadius: '6px 0 0 6px',
                background: themeVar('--sn-surface'),
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                boxShadow: '-2px 0 8px rgba(0,0,0,0.08)',
                transition: isResizing.current ? 'none' : TAB_TRANSITION_RIGHT,
                color: themeVar('--sn-text-muted'),
                fontSize: '11px',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                letterSpacing: '1px',
                fontFamily: themeVar('--sn-font-family'),
              }}
            >
              {rightOpen ? '\u25B6' : 'Props'}
            </button>

            {/* Right tray panel */}
            <div
              data-testid="shell-sidebar-right"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: rightWidth,
                zIndex: TRAY_Z,
                background: themeVar('--sn-surface-glass'),
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderLeft: `1px solid ${themeVar('--sn-border')}`,
                boxShadow: '-2px 0 12px rgba(0,0,0,0.1)',
                transform: rightOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: PANEL_TRANSITION,
                overflow: 'hidden auto',
              }}
            >
              {sidebarRight}
              {/* Resize handle — left edge */}
              <div
                data-testid="resize-handle-right"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startResize('right', e.clientX);
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 4,
                  height: '100%',
                  cursor: 'col-resize',
                  zIndex: 1,
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
