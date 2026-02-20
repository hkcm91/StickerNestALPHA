/**
 * Auth Store — Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { KernelEvents } from '@sn/types';

import { bus } from '../../bus';

import {
  useAuthStore,
  selectAuthReady,
  selectIsAuthenticated,
  setupAuthBusSubscriptions,
} from './auth.store';
import type { AuthUser, AuthSession } from './auth.store';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  tier: 'creator',
};

const mockSession: AuthSession = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
  expiresAt: Date.now() + 3600000,
};

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  describe('initial state', () => {
    it('should have null user', () => {
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should have null session', () => {
      expect(useAuthStore.getState().session).toBeNull();
    });

    it('should not be loading', () => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should have null error', () => {
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should not be initialized', () => {
      expect(useAuthStore.getState().isInitialized).toBe(false);
    });
  });

  describe('actions', () => {
    it('setUser should update user', () => {
      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('setUser with null should clear user', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setUser(null);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('setSession should update session', () => {
      useAuthStore.getState().setSession(mockSession);
      expect(useAuthStore.getState().session).toEqual(mockSession);
    });

    it('setSession with null should clear session', () => {
      useAuthStore.getState().setSession(mockSession);
      useAuthStore.getState().setSession(null);
      expect(useAuthStore.getState().session).toBeNull();
    });

    it('setLoading should update isLoading', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);

      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('setError should update error', () => {
      useAuthStore.getState().setError('Something went wrong');
      expect(useAuthStore.getState().error).toBe('Something went wrong');
    });

    it('setInitialized should set isInitialized to true', () => {
      useAuthStore.getState().setInitialized();
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it('clearError should set error to null', () => {
      useAuthStore.getState().setError('Some error');
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('reset should restore initial state', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setSession(mockSession);
      useAuthStore.getState().setLoading(true);
      useAuthStore.getState().setError('error');
      useAuthStore.getState().setInitialized();

      useAuthStore.getState().reset();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('selectors', () => {
    it('selectAuthReady returns false when not initialized', () => {
      expect(selectAuthReady(useAuthStore.getState())).toBe(false);
    });

    it('selectAuthReady returns false when loading', () => {
      useAuthStore.getState().setInitialized();
      useAuthStore.getState().setLoading(true);
      expect(selectAuthReady(useAuthStore.getState())).toBe(false);
    });

    it('selectAuthReady returns true when initialized and not loading', () => {
      useAuthStore.getState().setInitialized();
      expect(selectAuthReady(useAuthStore.getState())).toBe(true);
    });

    it('selectIsAuthenticated returns false when no user', () => {
      expect(selectIsAuthenticated(useAuthStore.getState())).toBe(false);
    });

    it('selectIsAuthenticated returns false when user but no session', () => {
      useAuthStore.getState().setUser(mockUser);
      expect(selectIsAuthenticated(useAuthStore.getState())).toBe(false);
    });

    it('selectIsAuthenticated returns false when session but no user', () => {
      useAuthStore.getState().setSession(mockSession);
      expect(selectIsAuthenticated(useAuthStore.getState())).toBe(false);
    });

    it('selectIsAuthenticated returns true when both user and session', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setSession(mockSession);
      expect(selectIsAuthenticated(useAuthStore.getState())).toBe(true);
    });
  });

  describe('bus subscriptions', () => {
    it('should clear session and set error on AUTH_SESSION_EXPIRED', () => {
      setupAuthBusSubscriptions();

      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setSession(mockSession);

      bus.emit(KernelEvents.AUTH_SESSION_EXPIRED, {});

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.error).toBe('Session expired. Please sign in again.');
      // User should still be present (session expired, not signed out)
      expect(state.user).toEqual(mockUser);
    });
  });
});
