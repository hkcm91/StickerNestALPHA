/**
 * Route Guards — AuthGuard and TierGuard
 *
 * @module shell/router
 * @layer L6
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

import {
  useAuthStore,
  selectIsAuthenticated,
  selectAuthReady,
} from '../../kernel/stores/auth/auth.store';
import type { AuthUser } from '../../kernel/stores/auth/auth.store';

/**
 * AuthGuard — redirects to /login if not authenticated.
 * Shows loading text while auth is initializing.
 */
export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ready = useAuthStore(selectAuthReady);
  const authenticated = useAuthStore(selectIsAuthenticated);

  if (!ready) {
    return <div data-testid="auth-loading">Loading...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const TIER_LEVELS: Record<string, number> = {
  free: 0,
  creator: 1,
  pro: 2,
  enterprise: 3,
};

/**
 * TierGuard — shows upgrade prompt if user tier is too low.
 */
export const TierGuard: React.FC<{
  requiredTier: AuthUser['tier'];
  children: React.ReactNode;
}> = ({ requiredTier, children }) => {
  const userTier = useAuthStore((s) => s.user?.tier ?? 'free');
  const userLevel = TIER_LEVELS[userTier] ?? 0;
  const requiredLevel = TIER_LEVELS[requiredTier] ?? 0;

  if (userLevel < requiredLevel) {
    return (
      <div data-testid="tier-gate">
        <h2>Upgrade Required</h2>
        <p>
          This feature requires the {requiredTier} tier or higher.
          Your current tier: {userTier}.
        </p>
        <a href="/settings">Go to Settings</a>
      </div>
    );
  }

  return <>{children}</>;
};
