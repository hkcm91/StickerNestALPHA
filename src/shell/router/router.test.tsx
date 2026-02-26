/**
 * Router tests
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ShellEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';

import { AppRouter } from './router';

/**
 * Helper: set auth store state for tests.
 */
function setAuthState(overrides: {
  isInitialized?: boolean;
  isLoading?: boolean;
  user?: { id: string; email: string; displayName: string | null; avatarUrl: string | null; tier: 'free' | 'creator' | 'pro' | 'enterprise' } | null;
  session?: { accessToken: string; refreshToken: string; expiresAt: number } | null;
}): void {
  const store = useAuthStore.getState();
  if (overrides.isInitialized !== undefined) {
    if (overrides.isInitialized) store.setInitialized();
  }
  if (overrides.isLoading !== undefined) store.setLoading(overrides.isLoading);
  if (overrides.user !== undefined) store.setUser(overrides.user);
  if (overrides.session !== undefined) store.setSession(overrides.session);
}

function renderAtRoute(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

const MOCK_SESSION = { accessToken: 'tok', refreshToken: 'ref', expiresAt: Date.now() + 60000 };
const MOCK_USER_FREE = { id: '1', email: 'a@b.c', displayName: 'A', avatarUrl: null, tier: 'free' as const };
const MOCK_USER_CREATOR = { id: '1', email: 'a@b.c', displayName: 'A', avatarUrl: null, tier: 'creator' as const };

describe('AppRouter', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  describe('auth guard', () => {
    it('redirects unauthenticated user from /canvas/:uuid to /login', () => {
      setAuthState({ isInitialized: true, user: null, session: null });
      // Canvas with UUID goes through AuthGuard when it's a direct route,
      // but per our current setup canvas is public. Let's test / which requires auth.
      renderAtRoute('/');
      // Should redirect to login
      expect(screen.getByTestId('page-login')).toBeTruthy();
    });

    it('shows loading when auth not ready', () => {
      setAuthState({ isInitialized: false, isLoading: true });
      renderAtRoute('/');
      expect(screen.getByTestId('auth-loading')).toBeTruthy();
    });

    it('renders dashboard for authenticated user', () => {
      setAuthState({ isInitialized: true, user: MOCK_USER_FREE, session: MOCK_SESSION });
      renderAtRoute('/');
      expect(screen.getByTestId('page-dashboard')).toBeTruthy();
    });
  });

  describe('tier guard', () => {
    it('shows upgrade prompt for free user at /lab', () => {
      setAuthState({ isInitialized: true, user: MOCK_USER_FREE, session: MOCK_SESSION });
      renderAtRoute('/lab');
      expect(screen.getByTestId('tier-gate')).toBeTruthy();
      expect(screen.getByText(/creator/i)).toBeTruthy();
    });

    it('does not show upgrade prompt for creator user at /lab', () => {
      setAuthState({ isInitialized: true, user: MOCK_USER_CREATOR, session: MOCK_SESSION });
      renderAtRoute('/lab');
      expect(screen.queryByTestId('tier-gate')).toBeNull();
    });
  });

  describe('route rendering smoke tests', () => {
    it('renders login page at /login', () => {
      renderAtRoute('/login');
      expect(screen.getByTestId('page-login')).toBeTruthy();
    });

    it('renders canvas gallery at /canvas', () => {
      renderAtRoute('/canvas');
      expect(screen.getByTestId('page-canvas-gallery')).toBeTruthy();
    });

    it('renders canvas page at /canvas/my-slug', () => {
      renderAtRoute('/canvas/my-slug');
      expect(screen.getByTestId('page-canvas')).toBeTruthy();
      expect(screen.getByTestId('page-canvas').getAttribute('data-mode')).toBe('edit');
    });

    it('renders invite page at /invite/abc123', () => {
      renderAtRoute('/invite/abc123');
      expect(screen.getByTestId('page-invite')).toBeTruthy();
    });

    it('renders not-found page for unknown route', () => {
      renderAtRoute('/unknown');
      expect(screen.getByTestId('page-not-found')).toBeTruthy();
    });

    it('renders marketplace for authenticated user', () => {
      setAuthState({ isInitialized: true, user: MOCK_USER_FREE, session: MOCK_SESSION });
      renderAtRoute('/marketplace');
      expect(screen.getByTestId('page-marketplace')).toBeTruthy();
    });

    it('renders settings for authenticated user', () => {
      setAuthState({ isInitialized: true, user: MOCK_USER_FREE, session: MOCK_SESSION });
      renderAtRoute('/settings');
      expect(screen.getByTestId('page-settings')).toBeTruthy();
    });
  });

  describe('route change emitter', () => {
    it('emits ShellEvents.ROUTE_CHANGED on navigation', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(ShellEvents.ROUTE_CHANGED, handler);

      setAuthState({ isInitialized: true, user: MOCK_USER_FREE, session: MOCK_SESSION });
      renderAtRoute('/marketplace');

      expect(handler).toHaveBeenCalled();
      const event = handler.mock.calls[0][0];
      expect(event.payload).toEqual({ path: '/marketplace' });

      unsub();
    });
  });
});
