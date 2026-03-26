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
 * The tier is fetched separately from the users table (source of truth).
 */
function mapUser(user: User, tier: AuthUser['tier'] = 'free'): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: user.user_metadata?.display_name ?? user.email ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    tier,
  };
}

/**
 * Fetch the user's tier from the users table (source of truth).
 * Creates a user row if one doesn't exist (handles OAuth signups).
 */
async function fetchUserTier(userId: string): Promise<AuthUser['tier']> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('tier')
      .eq('id', userId)
      .maybeSingle();

    // Row exists - return the tier
    if (data?.tier) {
      return data.tier as AuthUser['tier'];
    }

    // No row found (new OAuth user) - try to create one
    if (!data && !error) {
      // Get user info from Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Insert new user row with default tier
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email ?? '',
            display_name: user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
            tier: 'free',
          });

        if (insertError) {
          console.warn('Failed to create user row:', insertError.message);
        }
      }
    }

    return 'free';
  } catch (err) {
    console.warn('Failed to fetch user tier:', err);
    return 'free';
  }
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
 * Fetches the user's tier from the database (source of truth).
 */
async function handleAuthChange(user: User | null, session: Session | null): Promise<void> {
  const store = useAuthStore.getState();

  if (user && session) {
    // Fetch tier from users table (source of truth)
    const tier = await fetchUserTier(user.id);
    store.setUser(mapUser(user, tier));
    store.setSession(mapSession(session));

    bus.emit(KernelEvents.AUTH_STATE_CHANGED, {
      user: mapUser(user, tier),
      session: { accessToken: session.access_token, expiresAt: session.expires_at },
    });
  } else {
    store.setUser(null);
    store.setSession(null);

    bus.emit(KernelEvents.AUTH_STATE_CHANGED, {
      user: null,
      session: null,
    });
  }

  store.setLoading(false);
  store.setInitialized();
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

  await handleAuthChange(data.user, data.session);
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

  await handleAuthChange(data.user, data.session);
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
    await handleAuthChange(data.user, data.session);
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
      .then(async ({ data, error }) => {
        if (error) {
          useAuthStore.getState().setLoading(false);
          useAuthStore.getState().setInitialized();
          return;
        }
        await handleAuthChange(data.session?.user ?? null, data.session ?? null);
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
    // Fire and forget - tier fetch happens asynchronously
    void handleAuthChange(session?.user ?? null, session);
  });

  return {
    unsubscribe: () => subscription.unsubscribe(),
  };
}

// ── MFA / Two-Factor Authentication ───────────────────────────────

export interface MFAFactor {
  id: string;
  factorType: 'totp';
  friendlyName: string | null;
  status: 'verified' | 'unverified';
}

/**
 * Enroll a new TOTP MFA factor. Returns the QR code URI and secret
 * for the user to scan with their authenticator app.
 */
export async function enrollMFA(friendlyName?: string) {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: friendlyName ?? 'Authenticator App',
  });

  if (error) throw error;

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/**
 * Create an MFA challenge for a factor (step 1 of verification).
 */
export async function challengeMFA(factorId: string) {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;
  return { challengeId: data.id };
}

/**
 * Verify an MFA challenge with a TOTP code (step 2 of verification).
 */
export async function verifyMFA(factorId: string, challengeId: string, code: string) {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  if (error) throw error;
  return data;
}

/**
 * Unenroll (remove) an MFA factor.
 */
export async function unenrollMFA(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

/**
 * List all MFA factors for the current user.
 */
export async function listMFAFactors(): Promise<MFAFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;

  return (data.totp ?? []).map((f) => ({
    id: f.id,
    factorType: 'totp' as const,
    friendlyName: f.friendly_name ?? null,
    status: f.status as 'verified' | 'unverified',
  }));
}

/**
 * Get the current MFA assurance level.
 * Returns 'aal1' (password only) or 'aal2' (password + MFA).
 */
export async function getMFAAssuranceLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return {
    currentLevel: data.currentLevel,
    nextLevel: data.nextLevel,
    currentAuthenticationMethods: data.currentAuthenticationMethods,
  };
}
