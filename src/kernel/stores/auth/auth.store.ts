/**
 * Auth Store — manages authentication state
 * @module kernel/stores/auth
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { KernelEvents } from '@sn/types';

import { bus } from '../../bus';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  tier: 'free' | 'creator' | 'pro' | 'enterprise';
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: () => void;
  clearError: () => void;
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
