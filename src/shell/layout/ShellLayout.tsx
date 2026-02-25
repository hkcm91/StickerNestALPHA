/**
 * Shell Layout — grid layout with slide-out tray overlays for sidebars.
 *
 * @module shell/layout
 * @layer L6
 */

import React from 'react';

import { useUIStore } from '../../kernel/stores/ui/ui.store';

export interface ShellLayoutProps {
  /** Content for the top bar slot (toolbar) */
  topbar?: React.ReactNode;
  /** Content for the left sidebar slot (asset panel) */
  sidebarLeft?: React.ReactNode;
  /** Content for the right sidebar slot (properties, layers) */
  sidebarRight?: React.ReactNode;
  /** Main content (canvas workspace) */
  children: React.ReactNode;
}

const SIDEBAR_WIDTH = 280;
const TRAY_Z = 50;
const TAB_WIDTH = 28;
const TAB_HEIGHT = 80;

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
}) => {
  const leftOpen = useUIStore((s) => s.sidebarLeftOpen);
  const rightOpen = useUIStore((s) => s.sidebarRightOpen);
  const toggleLeft = useUIStore((s) => s.toggleSidebarLeft);
  const toggleRight = useUIStore((s) => s.toggleSidebarRight);

  const hasLeft = sidebarLeft != null;
  const hasRight = sidebarRight != null;

  return (
    <div
      data-testid="shell-layout"
      style={{
        display: 'grid',
        gridTemplateRows: topbar ? 'auto 1fr' : '1fr',
        gridTemplateColumns: '1fr',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--sn-bg, #f8f9fa)',
        fontFamily: 'var(--sn-font-family, system-ui)',
      }}
    >
      {/* Top bar */}
      {topbar && (
        <div data-testid="shell-topbar" style={{ minHeight: 0 }}>
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
                left: leftOpen ? SIDEBAR_WIDTH : 0,
                transform: 'translateY(-50%)',
                zIndex: TRAY_Z + 1,
                width: TAB_WIDTH,
                height: TAB_HEIGHT,
                border: '1px solid var(--sn-border, #e0e0e0)',
                borderLeft: 'none',
                borderRadius: '0 6px 6px 0',
                background: 'var(--sn-surface, #fff)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
                transition: 'left 0.25s ease',
                color: 'var(--sn-text-muted, #6b7280)',
                fontSize: '11px',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                letterSpacing: '1px',
                fontFamily: 'var(--sn-font-family, system-ui)',
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
                width: SIDEBAR_WIDTH,
                zIndex: TRAY_Z,
                background: 'var(--sn-surface, #fff)',
                borderRight: '1px solid var(--sn-border, #e0e0e0)',
                boxShadow: '2px 0 12px rgba(0,0,0,0.1)',
                transform: leftOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s ease',
                overflow: 'hidden auto',
              }}
            >
              {sidebarLeft}
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
                right: rightOpen ? SIDEBAR_WIDTH : 0,
                transform: 'translateY(-50%)',
                zIndex: TRAY_Z + 1,
                width: TAB_WIDTH,
                height: TAB_HEIGHT,
                border: '1px solid var(--sn-border, #e0e0e0)',
                borderRight: 'none',
                borderRadius: '6px 0 0 6px',
                background: 'var(--sn-surface, #fff)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                boxShadow: '-2px 0 8px rgba(0,0,0,0.08)',
                transition: 'right 0.25s ease',
                color: 'var(--sn-text-muted, #6b7280)',
                fontSize: '11px',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                letterSpacing: '1px',
                fontFamily: 'var(--sn-font-family, system-ui)',
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
                width: SIDEBAR_WIDTH,
                zIndex: TRAY_Z,
                background: 'var(--sn-surface, #fff)',
                borderLeft: '1px solid var(--sn-border, #e0e0e0)',
                boxShadow: '-2px 0 12px rgba(0,0,0,0.1)',
                transform: rightOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.25s ease',
                overflow: 'hidden auto',
              }}
            >
              {sidebarRight}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
