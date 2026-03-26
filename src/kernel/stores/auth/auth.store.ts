/**
 * Auth Store — manages authentication state
 * @module kernel/stores/auth
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { KernelEvents } from '@sn/types';

import { bus } from '../../bus';

/** Authenticated user profile from Supabase auth */
export interface AuthUser {
  /** Supabase auth user ID (UUID) */
  id: string;
  /** User's email address */
  email: string;
  /** Display name shown in presence and profiles */
  displayName: string | null;
  /** URL to the user's avatar image */
  avatarUrl: string | null;
  /** Subscription tier — gates access to features like Widget Lab (creator+) */
  tier: 'free' | 'creator' | 'pro' | 'enterprise';
}

/** Active authentication session tokens */
export interface AuthSession {
  /** JWT access token for API requests */
  accessToken: string;
  /** Token used to refresh the session when accessToken expires */
  refreshToken: string;
  /** Unix timestamp (ms) when the access token expires */
  expiresAt: number;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

/** Actions for mutating auth state — all emit via the event bus for cross-store coordination */
export interface AuthActions {
  /** Sets the current user profile, or null on sign-out */
  setUser: (user: AuthUser | null) => void;
  /** Sets the active session tokens, or null when expired/signed-out */
  setSession: (session: AuthSession | null) => void;
  /** Toggles the loading flag during auth operations */
  setLoading: (loading: boolean) => void;
  /** Sets an error message from auth operations */
  setError: (error: string | null) => void;
  /** Marks auth as initialized after the first session check completes */
  setInitialized: () => void;
  /** Clears any existing error */
  clearError: () => void;
  /** Resets auth state to initial values (used on sign-out) */
  reset: () => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: false,
  error: null,
  isInitialized: false,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialState,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setInitialized: () => set({ isInitialized: true }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    })),
    { name: 'authStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

/** Returns true when auth has initialized and is not loading */
export const selectAuthReady = (state: AuthStore): boolean =>
  state.isInitialized && !state.isLoading;

/** Returns true when the user is fully authenticated */
export const selectIsAuthenticated = (state: AuthStore): boolean =>
  state.user !== null && state.session !== null;

/** Subscribe to auth-related bus events for cross-store coordination */
export function setupAuthBusSubscriptions(): void {
  bus.subscribe(KernelEvents.AUTH_SESSION_EXPIRED, (_event: BusEvent) => {
    useAuthStore.getState().setSession(null);
    useAuthStore.getState().setError('Session expired. Please sign in again.');
  });
}
