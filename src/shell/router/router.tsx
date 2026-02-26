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
import { PricingPage } from '../pages/PricingPage';
import { ProfilePage } from '../profile';
import { themeVar } from '../theme/theme-vars';

import {
  DashboardPage,
  LoginPage,
  CanvasGalleryPage,
  NewCanvasPage,
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
const GlobalNav: React.FC = () => {
  return (
    <nav
      data-testid="global-nav"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 14px",
        borderBottom: `1px solid ${themeVar("--sn-border")}`,
        background: themeVar("--sn-surface"),
        color: themeVar("--sn-text"),
        fontFamily: themeVar("--sn-font-family"),
      }}
    >
      <Link style={{ color: "inherit" }} to="/">
        Dashboard
      </Link>
      <Link style={{ color: "inherit" }} to="/canvas">
        Canvas
      </Link>
      <Link style={{ color: "inherit" }} to="/data">
        Data
      </Link>
      <Link style={{ color: "inherit" }} to="/lab">
        Lab
      </Link>
      <Link style={{ color: "inherit" }} to="/marketplace">
        Marketplace
      </Link>
      <Link style={{ color: "inherit" }} to="/profile/me" data-testid="nav-profile">
        Profile
      </Link>
      <Link style={{ color: "inherit" }} to="/settings">
        Settings
      </Link>
      <Link style={{ color: "inherit" }} to="/dev/test">
        Dev
      </Link>
      <Link style={{ color: "inherit" }} to="/login">
        Login
      </Link>
    </nav>
  );
};

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
      <Route path="/pricing" element={<PricingPage />} />
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

      <Route path="/profile/:username" element={<ProfilePage />} />

      <Route path="/canvas" element={<CanvasGalleryPage />} />
      <Route path="/canvas/new" element={<NewCanvasPage />} />
      <Route path="/canvas/:canvasSlug" element={<CanvasPage />} />

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
