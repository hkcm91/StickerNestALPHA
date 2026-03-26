/**
 * Route guards tests
 * @module shell/router
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';

import { useAuthStore } from '../../kernel/stores/auth/auth.store';

import { AuthGuard, TierGuard } from './route-guards';

function renderWithRouter(element: React.ReactElement, path = '/protected') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/protected" element={element} />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const MOCK_USER = {
  id: 'user-1',
  email: 'test@test.com',
  displayName: 'Test',
  avatarUrl: null,
  tier: 'free' as const,
};

const MOCK_SESSION = {
  accessToken: 'token',
  refreshToken: 'refresh',
  expiresAt: Date.now() + 60000,
};

describe('AuthGuard', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('shows loading state when auth is not initialized', () => {
    // Default state: isInitialized = false
    renderWithRouter(
      <AuthGuard>
        <div data-testid="protected-content">Secret</div>
      </AuthGuard>,
    );
    expect(screen.getByTestId('auth-loading')).toBeTruthy();
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('redirects to /login when not authenticated', () => {
    useAuthStore.setState({ isInitialized: true, isLoading: false, user: null, session: null });
    renderWithRouter(
      <AuthGuard>
        <div data-testid="protected-content">Secret</div>
      </AuthGuard>,
    );
    expect(screen.getByTestId('login-page')).toBeTruthy();
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('renders children when authenticated', () => {
    useAuthStore.setState({
      isInitialized: true,
      isLoading: false,
      user: MOCK_USER,
      session: MOCK_SESSION,
    });
    renderWithRouter(
      <AuthGuard>
        <div data-testid="protected-content">Secret</div>
      </AuthGuard>,
    );
    expect(screen.getByTestId('protected-content')).toBeTruthy();
    expect(screen.queryByTestId('login-page')).toBeNull();
  });

  it('shows loading when auth is initialized but still loading', () => {
    useAuthStore.setState({ isInitialized: false, isLoading: true });
    renderWithRouter(
      <AuthGuard>
        <div data-testid="protected-content">Secret</div>
      </AuthGuard>,
    );
    expect(screen.getByTestId('auth-loading')).toBeTruthy();
  });
});

describe('TierGuard', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('shows upgrade prompt when user tier is too low', () => {
    useAuthStore.setState({ user: { ...MOCK_USER, tier: 'free' } });
    renderWithRouter(
      <TierGuard requiredTier="creator">
        <div data-testid="lab-content">Lab</div>
      </TierGuard>,
    );
    expect(screen.getByTestId('tier-gate')).toBeTruthy();
    expect(screen.getByText(/Upgrade Required/)).toBeTruthy();
    expect(screen.getByText(/creator/)).toBeTruthy();
    expect(screen.queryByTestId('lab-content')).toBeNull();
  });

  it('renders children when user has sufficient tier', () => {
    useAuthStore.setState({ user: { ...MOCK_USER, tier: 'creator' } });
    renderWithRouter(
      <TierGuard requiredTier="creator">
        <div data-testid="lab-content">Lab</div>
      </TierGuard>,
    );
    expect(screen.getByTestId('lab-content')).toBeTruthy();
    expect(screen.queryByTestId('tier-gate')).toBeNull();
  });

  it('renders children when user tier is higher than required', () => {
    useAuthStore.setState({ user: { ...MOCK_USER, tier: 'pro' } });
    renderWithRouter(
      <TierGuard requiredTier="creator">
        <div data-testid="lab-content">Lab</div>
      </TierGuard>,
    );
    expect(screen.getByTestId('lab-content')).toBeTruthy();
  });

  it('shows upgrade prompt when user is null (defaults to free)', () => {
    useAuthStore.setState({ user: null });
    renderWithRouter(
      <TierGuard requiredTier="creator">
        <div data-testid="lab-content">Lab</div>
      </TierGuard>,
    );
    expect(screen.getByTestId('tier-gate')).toBeTruthy();
  });
});
