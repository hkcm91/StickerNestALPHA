/**
 * Auth — Test Suite
 * @module kernel/auth
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KernelEvents } from '@sn/types';

import { bus } from '../bus';
import { useAuthStore } from '../stores/auth';

// Mock Supabase
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockRefreshSession = vi.fn();
const mockOnAuthStateChange = vi.fn((_cb: unknown) => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(args[0]),
      signUp: (...args: unknown[]) => mockSignUp(args[0]),
      signOut: () => mockSignOut(),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(args[0]),
      refreshSession: () => mockRefreshSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
    },
  },
}));

// Import after mocks
const authModule = await import('./auth');
const { signInWithEmail, signUp, signOut, signInWithOAuth, refreshSession, initAuthListener } = authModule;

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: { display_name: 'Test User', avatar_url: 'https://example.com/avatar.jpg', tier: 'creator' },
};

const mockSession = {
  access_token: 'access-token-123',
  refresh_token: 'refresh-token-456',
  expires_at: Date.now() + 3600000,
  user: mockUser,
};

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().reset();
    bus.unsubscribeAll();
  });

  describe('signInWithEmail', () => {
    it('should sign in successfully and update store', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const busHandler = vi.fn();
      bus.subscribe(KernelEvents.AUTH_STATE_CHANGED, busHandler);

      const { error } = await signInWithEmail('test@example.com', 'password');

      expect(error).toBeNull();
      const state = useAuthStore.getState();
      expect(state.user).toEqual(expect.objectContaining({ id: 'user-123', email: 'test@example.com' }));
      expect(state.session).toEqual(expect.objectContaining({ accessToken: 'access-token-123' }));
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(busHandler).toHaveBeenCalledOnce();
    });

    it('should handle sign-in error', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', status: 401 },
      });

      const { error } = await signInWithEmail('bad@example.com', 'wrong');

      expect(error).toBeTruthy();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('signUp', () => {
    it('should sign up successfully and update store', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { error } = await signUp('new@example.com', 'password123', 'New User');

      expect(error).toBeNull();
      expect(useAuthStore.getState().user).toEqual(
        expect.objectContaining({ id: 'user-123' }),
      );
    });

    it('should handle sign-up error', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      });

      const { error } = await signUp('exists@example.com', 'password');

      expect(error).toBeTruthy();
      expect(useAuthStore.getState().error).toBe('Email already registered');
    });
  });

  describe('signOut', () => {
    it('should sign out and reset store', async () => {
      // First set up signed-in state
      useAuthStore.getState().setUser({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test',
        avatarUrl: null,
        tier: 'free',
      });

      mockSignOut.mockResolvedValueOnce({ error: null });

      const busHandler = vi.fn();
      bus.subscribe(KernelEvents.AUTH_STATE_CHANGED, busHandler);

      const { error } = await signOut();

      expect(error).toBeNull();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isInitialized).toBe(true);
      expect(busHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { user: null, session: null },
        }),
      );
    });

    it('should handle sign-out error', async () => {
      mockSignOut.mockResolvedValueOnce({
        error: { message: 'Network error' },
      });

      const { error } = await signOut();

      expect(error).toBeTruthy();
      expect(useAuthStore.getState().error).toBe('Network error');
    });
  });

  describe('signInWithOAuth', () => {
    it('should initiate OAuth flow', async () => {
      mockSignInWithOAuth.mockResolvedValueOnce({
        data: { provider: 'github', url: 'https://github.com/login/oauth' },
        error: null,
      });

      const { data, error } = await signInWithOAuth('github');

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'github' }),
      );
    });

    it('should handle OAuth error', async () => {
      mockSignInWithOAuth.mockResolvedValueOnce({
        data: null,
        error: { message: 'OAuth provider unavailable' },
      });

      const { error } = await signInWithOAuth('google');

      expect(error).toBeTruthy();
      expect(useAuthStore.getState().error).toBe('OAuth provider unavailable');
    });
  });

  describe('refreshSession', () => {
    it('should refresh session and update store', async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { error } = await refreshSession();

      expect(error).toBeNull();
      expect(useAuthStore.getState().session).toBeTruthy();
    });

    it('should emit session expired on refresh failure', async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Token expired' },
      });

      const busHandler = vi.fn();
      bus.subscribe(KernelEvents.AUTH_SESSION_EXPIRED, busHandler);

      const { error } = await refreshSession();

      expect(error).toBeTruthy();
      expect(busHandler).toHaveBeenCalledOnce();
    });
  });

  describe('initAuthListener', () => {
    it('should set up auth state change listener', () => {
      const { unsubscribe } = initAuthListener();

      expect(mockOnAuthStateChange).toHaveBeenCalledOnce();
      expect(typeof unsubscribe).toBe('function');
    });
  });
});
