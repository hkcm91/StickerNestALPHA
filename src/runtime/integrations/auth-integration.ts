/**
 * Auth Integration Handler — proxies auth calls from widget iframes to Supabase Auth.
 * Widgets call StickerNest.integration('auth').query/mutate() and the host
 * routes those calls here. The widget never sees JWTs or session tokens.
 *
 * @module runtime/integrations
 * @layer L3
 */

import { supabase } from '../../kernel/supabase';

import type { IntegrationHandler } from './integration-proxy';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// ── Rate limiter ────────────────────────────────────────────────────────────
// Simple in-memory rate limiter for auth attempts. Keyed by action + email
// since we can't access the client IP from an iframe context.
// Resets on process restart, which is acceptable for iframe-scoped use.

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const rateLimiter = new Map<string, RateLimitEntry>();

/**
 * Check and increment the rate limiter for a given key.
 * Returns true if the request is allowed, false if rate-limited.
 * Also cleans up stale entries on each call.
 */
function checkRateLimit(key: string): boolean {
  const now = Date.now();

  // Clean up stale entries
  for (const [k, entry] of rateLimiter) {
    if (entry.resetAt < now) {
      rateLimiter.delete(k);
    }
  }

  const existing = rateLimiter.get(key);
  if (!existing || existing.resetAt < now) {
    // No entry or expired — start a new window
    rateLimiter.set(key, { attempts: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (existing.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  existing.attempts += 1;
  return true;
}

interface AuthQueryParams {
  action: 'session';
}

interface AuthMutateParams {
  action: 'signup' | 'signin' | 'signout';
  email?: string;
  password?: string;
}

async function handleAuthQuery(params: AuthQueryParams): Promise<unknown> {
  switch (params.action) {
    case 'session': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isAuthenticated: false, user: null, canvasRole: null };
      }
      return {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
        },
        canvasRole: null, // Canvas-specific role would be resolved by the host
      };
    }
    default:
      throw new Error(`Unknown auth query action: ${(params as { action: string }).action}`);
  }
}

async function handleAuthMutate(params: AuthMutateParams): Promise<unknown> {
  // Rate-limit signup and signin attempts
  if (params.action === 'signup' || params.action === 'signin') {
    const rateLimitKey = `${params.action}:${(params.email ?? '').toLowerCase()}`;
    if (!checkRateLimit(rateLimitKey)) {
      return { error: 'Too many attempts. Please wait a moment and try again.' };
    }
  }

  switch (params.action) {
    case 'signup': {
      if (!params.email || !params.password) {
        return { error: 'Email and password required' };
      }
      if (!EMAIL_RE.test(params.email)) {
        return { error: 'Invalid email format' };
      }
      if (params.password.length < MIN_PASSWORD_LENGTH) {
        return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
      }
      if (!/[A-Z]/.test(params.password)) {
        return { error: 'Password must contain at least one uppercase letter' };
      }
      if (!/[0-9]/.test(params.password)) {
        return { error: 'Password must contain at least one number' };
      }
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
      });
      if (error) {
        return { error: error.message };
      }
      return {
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
      };
    }
    case 'signin': {
      if (!params.email || !params.password) {
        return { error: 'Email and password required' };
      }
      if (!EMAIL_RE.test(params.email)) {
        return { error: 'Invalid email format' };
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });
      if (error) {
        return { error: error.message };
      }
      return {
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
      };
    }
    case 'signout': {
      await supabase.auth.signOut();
      return { success: true };
    }
    default:
      throw new Error(`Unknown auth mutate action: ${(params as { action: string }).action}`);
  }
}

/**
 * Creates an auth integration handler for the widget bridge.
 */
export function createAuthHandler(): IntegrationHandler {
  return {
    query: (params: unknown) => handleAuthQuery(params as AuthQueryParams),
    mutate: (params: unknown) => handleAuthMutate(params as AuthMutateParams),
  };
}
