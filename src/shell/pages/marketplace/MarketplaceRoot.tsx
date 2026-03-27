/**
 * MarketplaceRoot — sub-router for all marketplace pages.
 *
 * Renders a shared tab bar (Browse / My Library / Publisher) above the
 * active route. Tab bar is hidden on detail/manage sub-pages.
 *
 * Routes:
 *   /marketplace              → BrowsePage
 *   /marketplace/widget/:id   → DetailPage
 *   /marketplace/library      → LibraryPage
 *   /marketplace/publisher    → PublisherPage
 *   /marketplace/publisher/:widgetId → WidgetManagePage
 *
 * @module shell/pages/marketplace
 * @layer L6
 */

import React from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';
import { themeVar } from '../../theme/theme-vars';

import { BrowsePage } from './browse/BrowsePage';
import { DetailPage } from './detail/DetailPage';
import { LibraryPage } from './library/LibraryPage';
import { PublisherPage } from './publisher/PublisherPage';
import { WidgetManagePage } from './publisher/WidgetManagePage';
import { SamplesPage } from './samples';

const TABS = [
  { path: '/marketplace', label: 'Browse', exact: true },
  { path: '/marketplace/samples', label: 'Samples', exact: false },
  { path: '/marketplace/library', label: 'My Library', exact: false },
  { path: '/marketplace/publisher', label: 'Publisher', exact: false },
] as const;

/** Pages where we hide the tab bar (detail / manage sub-pages). */
function shouldShowTabs(pathname: string): boolean {
  return !pathname.includes('/marketplace/widget/') &&
    !(/\/marketplace\/publisher\/[^/]+/.test(pathname));
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  padding: '0 24px',
  borderBottom: `1px solid ${themeVar('--sn-border')}`,
  background: themeVar('--sn-bg'),
  maxWidth: '1100px',
  margin: '0 auto',
};

function tabStyle(isActive: boolean): React.CSSProperties {
  return {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? themeVar('--sn-text') : themeVar('--sn-text-muted'),
    textDecoration: 'none',
    borderBottom: isActive ? `2px solid ${themeVar('--sn-accent')}` : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  };
}

export const MarketplaceRoot: React.FC = () => {
  const location = useLocation();
  const userTier = useAuthStore((s) => s.user?.tier ?? 'free');
  const showTabs = shouldShowTabs(location.pathname);

  // Only show Publisher tab for Creator+ tier users
  const visibleTabs = TABS.filter((tab) => {
    if (tab.path === '/marketplace/publisher' && userTier === 'free') return false;
    return true;
  });

  return (
    <>
      {showTabs && (
        <nav data-testid="marketplace-tabs" style={tabBarStyle}>
          {visibleTabs.map((tab) => {
            const isActive = tab.exact
              ? location.pathname === tab.path
              : location.pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                data-testid={`marketplace-tab-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={tabStyle(isActive)}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}

      <Routes>
        <Route index element={<BrowsePage />} />
        <Route path="widget/:id" element={<DetailPage />} />
        <Route path="samples" element={<SamplesPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="publisher" element={<PublisherPage />} />
        <Route path="publisher/:widgetId" element={<WidgetManagePage />} />
      </Routes>
    </>
  );
};
