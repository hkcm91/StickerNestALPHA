/**
 * Application Router — wires routes, guards, and lazy-loaded Lab.
 *
 * @module shell/router
 * @layer L6
 */

import React, { Suspense, useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

import type { BusEvent } from '@sn/types';
import { ShellEvents, SocialGraphEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { getUnreadMessageCount } from '../../kernel/social-graph';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { ChatPanel } from '../components/ChatPanel';
import { NotificationPanel } from '../components/NotificationPanel';
import { NotionPermissionModal } from '../components/NotionPermissionModal';
import { OfflineBanner } from '../components/OfflineBanner';
import { ToastContainer } from '../components/ToastContainer';
import { DataManagerPage } from '../data';
import { TestHarness } from '../dev';
import { MessagingPage } from '../messaging';
import { EmbedPage } from '../pages/EmbedPage';
import { PricingPage } from '../pages/PricingPage';
import { ProfilePage } from '../profile';
import { themeVar } from '../theme/theme-vars';

import {
  DashboardPage,
  LoginPage,
  NewCanvasPage,
  CanvasPage,
  MarketplacePage,
  SettingsPage,
  InvitePage,
  NotFoundPage,
  TermsPage,
  PrivacyPage,
} from './pages';
import { AuthGuard, TierGuard } from './route-guards';

/**
 * Lazy-loaded Lab page component.
 * Uses dynamic import so dependency-cruiser sees it as a dynamic dependency
 * (allowed by the L6-forbidden-imports rule).
 */
const LazyLabPage = React.lazy(() =>
  import('../../lab').then((mod) => ({
    default: mod.LabPage,
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
 * Grouped layout: Logo | Primary nav | Utility nav (right-aligned).
 */

/** Spring easing — Principle 4 */
const NAV_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

const navLinkBase: React.CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 400,
  transition: `background 150ms ${NAV_SPRING}, color 150ms ${NAV_SPRING}`,
  position: 'relative',
};

/** Nav link with active-route detection */
const NavLink: React.FC<{
  to: string;
  children: React.ReactNode;
  'data-testid'?: string;
  /** Match exact path only (default: prefix match) */
  exact?: boolean;
}> = ({ to, children, 'data-testid': testId, exact }) => {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      data-testid={testId}
      style={{
        ...navLinkBase,
        background: isActive ? themeVar('--sn-surface-raised') : 'transparent',
        color: isActive ? themeVar('--sn-text') : themeVar('--sn-text-soft'),
        fontWeight: isActive ? 500 : 400,
        borderBottom: isActive ? `2px solid ${themeVar('--sn-accent')}` : '2px solid transparent',
      }}
    >
      {children}
    </Link>
  );
};

/** Message icon (speech bubble) */
const MessageIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

/** Bell icon for notifications */
const BellIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

/** Settings gear icon */
const GearIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/** User icon */
const UserIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const navIconBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  transition: `background 150ms ${NAV_SPRING}`,
};

/** Simple chat icon SVG */
const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h12v8H4l-2 2V3z" />
  </svg>
);

const GlobalNav: React.FC = () => {
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const location = useLocation();
  const authUser = useAuthStore((s) => s.user);

  // Fetch unread message count and subscribe to updates
  useEffect(() => {
    if (!authUser?.id) { setUnreadMsgCount(0); return; }
    let cancelled = false;

    async function fetchCount() {
      const result = await getUnreadMessageCount(authUser!.id);
      if (!cancelled && result.success) setUnreadMsgCount(result.data);
    }
    fetchCount();

    const unsubs = [
      bus.subscribe(SocialGraphEvents.MESSAGE_SENT, (event: BusEvent) => {
        const { message } = event.payload as { message: { recipientId: string } };
        if (message.recipientId === authUser!.id) {
          setUnreadMsgCount((c) => c + 1);
        }
      }),
      bus.subscribe(SocialGraphEvents.MESSAGES_READ, (event: BusEvent) => {
        const { count } = event.payload as { count: number };
        setUnreadMsgCount((c) => Math.max(0, c - count));
      }),
    ];

    return () => { cancelled = true; unsubs.forEach((u) => u()); };
  }, [authUser?.id]);

  // DEV SEED: fire test notifications on first mount so the panel has data
  React.useEffect(() => {
    if (import.meta.env.PROD) return;
    const timer = setTimeout(() => {
      bus.emit('kernel.socialgraph.notification.created', {
        notification: { id: 'seed-n1', recipientId: 'me', actorId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', type: 'follow', isRead: false, createdAt: new Date().toISOString() },
      });
      bus.emit('kernel.socialgraph.notification.created', {
        notification: { id: 'seed-n2', recipientId: 'me', actorId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', type: 'mutual_follow', isRead: false, createdAt: new Date().toISOString() },
      });
      bus.emit('kernel.socialgraph.widgetInvite.sent', {
        invite: { id: 'seed-inv1', senderId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', recipientId: 'me', mode: 'share', status: 'pending', isBroadcast: false, widgetId: 'live-chat-v1', widgetManifestSnapshot: { name: 'Live Chat', size: { defaultWidth: 350, defaultHeight: 400 } }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      });
      bus.emit('kernel.socialgraph.widgetInvite.sent', {
        invite: { id: 'seed-inv2', senderId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', recipientId: 'me', mode: 'pipeline', status: 'pending', isBroadcast: false, widgetId: 'price-ticker-v2', widgetManifestSnapshot: { name: 'Price Ticker', size: { defaultWidth: 280, defaultHeight: 120 } }, sourcePortId: 'output-price-feed', targetPortId: 'input-data-stream', sourceCanvasId: 'canvas-src', sourceWidgetInstanceId: 'inst-src', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      });
      bus.emit('kernel.socialgraph.widgetInvite.sent', {
        invite: { id: 'seed-inv3', senderId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', recipientId: 'me', mode: 'share', status: 'pending', isBroadcast: true, broadcastId: 'bc1', widgetId: 'weather-dashboard-v1', widgetManifestSnapshot: { name: 'Weather Dashboard', size: { defaultWidth: 400, defaultHeight: 300 } }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      });
      bus.emit('kernel.socialgraph.widgetInvite.sent', {
        invite: { id: 'seed-inv4', senderId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', recipientId: 'me', mode: 'share', status: 'pending', isBroadcast: false, widgetId: 'ai-agent-v1', widgetManifestSnapshot: { name: 'Claude Agent', size: { defaultWidth: 380, defaultHeight: 450 } }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <nav
        data-testid="global-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0 16px',
          height: '48px',
          borderBottom: `1px solid ${themeVar('--sn-border')}`,
          background: themeVar('--sn-surface'),
          color: themeVar('--sn-text'),
          fontFamily: themeVar('--sn-font-family'),
          userSelect: 'none',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: themeVar('--sn-text'),
            fontFamily: themeVar('--sn-font-serif'),
            fontSize: '17px',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            marginRight: '16px',
            flexShrink: 0,
          }}
        >
          StickerNest
        </Link>

        {/* Primary nav group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <NavLink to="/" exact>Dashboard</NavLink>
          <NavLink to="/canvas">Canvas</NavLink>
          <NavLink to="/data">Data</NavLink>
          <NavLink to="/lab">Lab</NavLink>
          <NavLink to="/marketplace">Marketplace</NavLink>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Utility nav group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <Link
            to="/profile/kimber"
            data-testid="nav-profile"
            title="Profile"
            style={{
              ...navIconBtnStyle,
              textDecoration: 'none',
              color: location.pathname.startsWith('/profile') ? themeVar('--sn-text') : themeVar('--sn-text-soft'),
              background: location.pathname.startsWith('/profile') ? themeVar('--sn-surface-raised') : 'transparent',
            }}
          >
            <UserIcon />
          </Link>

          <Link
            to="/messages"
            data-testid="nav-messages"
            title="Messages"
            style={{
              ...navIconBtnStyle,
              textDecoration: 'none',
              color: location.pathname.startsWith('/messages') ? themeVar('--sn-text') : themeVar('--sn-text-soft'),
              background: location.pathname.startsWith('/messages') ? themeVar('--sn-surface-raised') : 'transparent',
              position: 'relative' as const,
            }}
          >
            <MessageIcon />
            {unreadMsgCount > 0 && (
              <span
                data-testid="unread-msg-badge"
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 14,
                  height: 14,
                  borderRadius: 7,
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                }}
              >
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </span>
            )}
          </Link>

          <button
            data-testid="nav-chat"
            onClick={() => { setChatOpen((p) => !p); setNotifOpen(false); }}
            title="Messages"
            style={{
              ...navIconBtnStyle,
              background: chatOpen ? themeVar('--sn-accent') : 'transparent',
              color: chatOpen ? '#fff' : themeVar('--sn-text-soft'),
            }}
          >
            <ChatIcon />
          </button>

          <button
            data-testid="nav-notifications"
            onClick={() => { setNotifOpen((p) => !p); setChatOpen(false); }}
            title="Notifications"
            style={{
              ...navIconBtnStyle,
              background: notifOpen ? themeVar('--sn-accent') : 'transparent',
              color: notifOpen ? '#fff' : themeVar('--sn-text-soft'),
            }}
          >
            <BellIcon />
          </button>

          <Link
            to="/settings"
            title="Settings"
            style={{
              ...navIconBtnStyle,
              textDecoration: 'none',
              color: location.pathname === '/settings' ? themeVar('--sn-text') : themeVar('--sn-text-soft'),
              background: location.pathname === '/settings' ? themeVar('--sn-surface-raised') : 'transparent',
            }}
          >
            <GearIcon />
          </Link>

          {import.meta.env.DEV && (
            <NavLink to="/dev/test">Dev</NavLink>
          )}
        </div>
      </nav>

      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
};

/**
 * Main application router.
 * BrowserRouter must be provided by a parent (main.tsx).
 */
export const AppRouter: React.FC = () => {
  const location = useLocation();
  const isEmbedRoute = location.pathname.startsWith('/embed/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <RouteChangeEmitter />
      <OfflineBanner />
      {!isEmbedRoute && <GlobalNav />}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Routes>
        {/* Embed route — no chrome, no auth */}
        <Route path="/embed/:slug" element={<EmbedPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      {import.meta.env.DEV && (
        <>
          <Route path="/dev/test" element={<TestHarness />} />
          <Route path="/dev/split" element={<TestHarness initialTab="split" />} />
        </>
      )}

      <Route
        path="/"
        element={
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        }
      />
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        }
      />

      <Route path="/profile/:username" element={<ProfilePage />} />

      <Route path="/messages" element={<AuthGuard><MessagingPage /></AuthGuard>} />
      <Route path="/messages/:userId" element={<AuthGuard><MessagingPage /></AuthGuard>} />

      <Route path="/canvas" element={<Navigate to="/profile/me" replace />} />
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
        path="/marketplace/*"
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
      </div>
      <NotionPermissionModal />
      <ToastContainer />
    </div>
  );
};
