/**
 * Application Router — wires routes, guards, and lazy-loaded Lab.
 *
 * @module shell/router
 * @layer L6
 */

import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';

import { ShellEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { DataManagerPage } from '../data';
import { TestHarness } from '../dev';


import {
  DashboardPage,
  LoginPage,
  CanvasPage,
  MarketplacePage,
  SettingsPage,
  InvitePage,
  NotFoundPage,
} from './pages';
import { AuthGuard, TierGuard } from './route-guards';

/**
 * Lazy-loaded Lab page component.
 * Uses dynamic import so dependency-cruiser sees it as a dynamic dependency
 * (allowed by the L6-forbidden-imports rule).
 */
const LazyLabPage = React.lazy(() =>
  import('../../lab').then(() => ({
    default: () => React.createElement('div', { 'data-testid': 'page-lab' },
      React.createElement('h1', null, 'Widget Lab'),
    ),
  })),
);

/**
 * Emits ShellEvents.ROUTE_CHANGED on every navigation.
 */
function RouteChangeEmitter(): null {
  const location = useLocation();

  useEffect(() => {
    bus.emit(ShellEvents.ROUTE_CHANGED, { path: location.pathname });
  }, [location.pathname]);

  return null;
}

/**
 * Global navigation bar — visible on every page including login.
 */
const navStyles: Record<string, React.CSSProperties> = {
  nav: { display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 16px', background: 'var(--sn-surface, #fff)', borderBottom: '1px solid var(--sn-border, #ddd)', zIndex: 100, position: 'relative' as const },
  link: { padding: '6px 12px', fontSize: '13px', fontWeight: 500, color: 'var(--sn-text-muted, #555)', textDecoration: 'none', borderRadius: 'var(--sn-radius, 6px)' },
};

const GlobalNav: React.FC = () => (
  <nav data-testid="global-nav" style={navStyles.nav}>
    <Link to="/" style={navStyles.link}>Dashboard</Link>
    <Link to="/canvas/demo" style={navStyles.link}>Canvas</Link>
    <Link to="/data" style={navStyles.link}>Databases</Link>
    <Link to="/lab" style={navStyles.link}>Lab</Link>
    <Link to="/marketplace" style={navStyles.link}>Marketplace</Link>
    <Link to="/settings" style={navStyles.link}>Settings</Link>
    <Link to="/dev/test" style={navStyles.link}>Dev</Link>
  </nav>
);

/**
 * Main application router.
 * BrowserRouter must be provided by a parent (main.tsx).
 */
export const AppRouter: React.FC = () => (
  <>
    <RouteChangeEmitter />
    <GlobalNav />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/dev/test" element={<TestHarness />} />

      <Route
        path="/"
        element={
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        }
      />

      <Route path="/canvas/:canvasParam" element={<CanvasPage />} />

      <Route
        path="/lab"
        element={
          <AuthGuard>
            <TierGuard requiredTier="creator">
              <Suspense fallback={<div>Loading Lab...</div>}>
                <LazyLabPage />
              </Suspense>
            </TierGuard>
          </AuthGuard>
        }
      />

      <Route
        path="/data"
        element={
          <AuthGuard>
            <DataManagerPage />
          </AuthGuard>
        }
      />

      <Route
        path="/marketplace"
        element={
          <AuthGuard>
            <MarketplacePage />
          </AuthGuard>
        }
      />

      <Route
        path="/settings"
        element={
          <AuthGuard>
            <SettingsPage />
          </AuthGuard>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </>
);
