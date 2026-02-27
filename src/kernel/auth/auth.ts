/**
 * Auth — authentication logic for StickerNest V5
 * @module kernel/auth
 */

import type { AuthError, OAuthResponse, Session, User } from '@supabase/supabase-js';

import { KernelEvents } from '@sn/types';

import { bus } from '../bus';
import { useAuthStore } from '../stores/auth';
import type { AuthUser } from '../stores/auth';
import { supabase } from '../supabase';

/**
 * Map Supabase user to AuthUser.
 */
function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: user.user_metadata?.display_name ?? user.email ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    tier: (user.user_metadata?.tier as AuthUser['tier']) ?? 'free',
  };
}

/**
 * Map Supabase session to our session shape.
 */
function mapSession(session: Session) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
  };
}

/**
 * Update auth store and emit bus event on auth state change.
 */
function handleAuthChange(user: User | null, session: Session | null): void {
  const store = useAuthStore.getState();

  if (user && session) {
    store.setUser(mapUser(user));
    store.setSession(mapSession(session));
  } else {
    store.setUser(null);
    store.setSession(null);
  }

  store.setLoading(false);
  store.setInitialized();

  bus.emit(KernelEvents.AUTH_STATE_CHANGED, {
    user: user ? mapUser(user) : null,
    session: session
      ? { accessToken: session.access_token, expiresAt: session.expires_at }
      : null,
  });
}

/**
 * Sign in with email and password.
 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error: AuthError | null }> {
  const store = useAuthStore.getState();
  store.setLoading(true);
  store.clearError();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    store.setLoading(false);
    store.setError(error.message);
    return { error };
  }

  handleAuthChange(data.user, data.session);
  return { error: null };
}

/**
 * Sign up with email and password.
 */
export async function signUp(
  email: string,
  password: string,
  displayName?: string,
): Promise<{ error: AuthError | null }> {
  const store = useAuthStore.getState();
  store.setLoading(true);
  store.clearError();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) {
    store.setLoading(false);
    store.setError(error.message);
    return { error };
  }

  handleAuthChange(data.user, data.session);
  return { error: null };
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const store = useAuthStore.getState();
  store.setLoading(true);

  const { error } = await supabase.auth.signOut();

  if (error) {
    store.setLoading(false);
    store.setError(error.message);
    return { error };
  }

  store.reset();
  store.setInitialized();
  bus.emit(KernelEvents.AUTH_STATE_CHANGED, { user: null, session: null });
  return { error: null };
}

/**
 * Sign in with an OAuth provider.
 */
export async function signInWithOAuth(
  provider: 'google' | 'github' | 'discord',
): Promise<{ data: OAuthResponse['data'] | null; error: AuthError | null }> {
  const store = useAuthStore.getState();
  store.setLoading(true);
  store.clearError();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : '' },
  });

  if (error) {
    store.setLoading(false);
    store.setError(error.message);
    return { data: null, error };
  }

  // Avoid a stuck spinner if redirect is blocked/misconfigured.
  store.setLoading(false);
  return { data, error: null };
}

/**
 * Refresh the current session.
 */
export async function refreshSession(): Promise<{
  error: AuthError | null;
}> {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    bus.emit(KernelEvents.AUTH_SESSION_EXPIRED, { reason: error.message });
    return { error };
  }

  if (data.session && data.user) {
    handleAuthChange(data.user, data.session);
  }

  return { error: null };
}

/**
 * Initialize auth state listener. Call once at app startup.
 * Listens for Supabase auth state changes and bridges them to the bus.
 */
export function initAuthListener(): { unsubscribe: () => void } {
  // Bootstrap auth state immediately so route guards don't wait on an event.
  if (typeof supabase.auth.getSession === 'function') {
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          useAuthStore.getState().setLoading(false);
          useAuthStore.getState().setInitialized();
          return;
        }
        handleAuthChange(data.session?.user ?? null, data.session ?? null);
      })
      .catch(() => {
        useAuthStore.getState().setLoading(false);
        useAuthStore.getState().setInitialized();
      });
  } else {
    useAuthStore.getState().setLoading(false);
    useAuthStore.getState().setInitialized();
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthChange(session?.user ?? null, session);
  });

  return {
    unsubscribe: () => subscription.unsubscribe(),
  };
}
