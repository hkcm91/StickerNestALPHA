/**
 * Auth Integration Handler Tests
 *
 * @module runtime/integrations
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../../kernel/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
    },
  },
}));

import { createAuthHandler } from './auth-integration';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createAuthHandler', () => {
  let handler: ReturnType<typeof createAuthHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate limiter state by advancing time concept (use fresh handler)
    vi.useFakeTimers();
    vi.setSystemTime(Date.now());
    handler = createAuthHandler();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -- query --

  describe('query: session', () => {
    it('returns authenticated user when logged in', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'u-1', email: 'alice@example.com' } },
      });

      const result = await handler.query({ action: 'session' }) as any;

      expect(result.isAuthenticated).toBe(true);
      expect(result.user.id).toBe('u-1');
      expect(result.user.email).toBe('alice@example.com');
    });

    it('returns unauthenticated when no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await handler.query({ action: 'session' }) as any;

      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeNull();
    });

    it('throws for unknown query action', async () => {
      await expect(handler.query({ action: 'unknown' })).rejects.toThrow(
        'Unknown auth query action',
      );
    });
  });

  // -- mutate: signup --

  describe('mutate: signup', () => {
    it('returns error when email is missing', async () => {
      const result = await handler.mutate({ action: 'signup', password: 'Password1' }) as any;
      expect(result.error).toBe('Email and password required');
    });

    it('returns error when password is missing', async () => {
      const result = await handler.mutate({ action: 'signup', email: 'a@b.com' }) as any;
      expect(result.error).toBe('Email and password required');
    });

    it('returns error for invalid email format', async () => {
      const result = await handler.mutate({
        action: 'signup',
        email: 'not-an-email',
        password: 'Password1',
      }) as any;
      expect(result.error).toBe('Invalid email format');
    });

    it('returns error when password is too short', async () => {
      const result = await handler.mutate({
        action: 'signup',
        email: 'a@b.com',
        password: 'Ab1',
      }) as any;
      expect(result.error).toContain('at least 8 characters');
    });

    it('returns error when password has no uppercase', async () => {
      const result = await handler.mutate({
        action: 'signup',
        email: 'a@b.com',
        password: 'password1',
      }) as any;
      expect(result.error).toContain('uppercase letter');
    });

    it('returns error when password has no number', async () => {
      const result = await handler.mutate({
        action: 'signup',
        email: 'a@b.com',
        password: 'Password',
      }) as any;
      expect(result.error).toContain('number');
    });

    it('signs up successfully with valid credentials', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user', email: 'a@b.com' } },
        error: null,
      });

      const result = await handler.mutate({
        action: 'signup',
        email: 'a@b.com',
        password: 'ValidPass1',
      }) as any;

      expect(result.user).toEqual({ id: 'new-user', email: 'a@b.com' });
      expect(mockSignUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'ValidPass1' });
    });

    it('returns supabase error on signup failure', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      });

      const result = await handler.mutate({
        action: 'signup',
        email: 'exists@b.com',
        password: 'ValidPass1',
      }) as any;

      expect(result.error).toBe('User already registered');
    });
  });

  // -- mutate: signin --

  describe('mutate: signin', () => {
    it('returns error when email is missing', async () => {
      const result = await handler.mutate({ action: 'signin', password: 'x' }) as any;
      expect(result.error).toBe('Email and password required');
    });

    it('returns error for invalid email format', async () => {
      const result = await handler.mutate({
        action: 'signin',
        email: 'bad',
        password: 'x',
      }) as any;
      expect(result.error).toBe('Invalid email format');
    });

    it('signs in successfully', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'u-1', email: 'a@b.com' } },
        error: null,
      });

      const result = await handler.mutate({
        action: 'signin',
        email: 'a@b.com',
        password: 'secret',
      }) as any;

      expect(result.user).toEqual({ id: 'u-1', email: 'a@b.com' });
    });

    it('returns supabase error on signin failure', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      const result = await handler.mutate({
        action: 'signin',
        email: 'a@b.com',
        password: 'wrong',
      }) as any;

      expect(result.error).toBe('Invalid credentials');
    });
  });

  // -- mutate: signout --

  describe('mutate: signout', () => {
    it('signs out successfully', async () => {
      mockSignOut.mockResolvedValue({});

      const result = await handler.mutate({ action: 'signout' }) as any;

      expect(result.success).toBe(true);
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  // -- mutate: unknown --

  describe('mutate: unknown action', () => {
    it('throws for unknown mutate action', async () => {
      await expect(handler.mutate({ action: 'reset' })).rejects.toThrow(
        'Unknown auth mutate action',
      );
    });
  });

  // -- rate limiting --

  describe('rate limiting', () => {
    it('allows up to 5 attempts within the window', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      for (let i = 0; i < 5; i++) {
        const result = await handler.mutate({
          action: 'signin',
          email: 'rate@test.com',
          password: 'wrong',
        }) as any;
        // Should not be rate-limited yet
        expect(result.error).toBe('Invalid credentials');
      }
    });

    it('blocks the 6th attempt within the window', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      for (let i = 0; i < 5; i++) {
        await handler.mutate({
          action: 'signin',
          email: 'blocked@test.com',
          password: 'wrong',
        });
      }

      const result = await handler.mutate({
        action: 'signin',
        email: 'blocked@test.com',
        password: 'wrong',
      }) as any;

      expect(result.error).toContain('Too many attempts');
    });

    it('resets after the rate limit window expires', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      for (let i = 0; i < 5; i++) {
        await handler.mutate({
          action: 'signin',
          email: 'reset@test.com',
          password: 'wrong',
        });
      }

      // Advance past the 60-second window
      vi.advanceTimersByTime(61_000);

      const result = await handler.mutate({
        action: 'signin',
        email: 'reset@test.com',
        password: 'wrong',
      }) as any;

      // Should get the normal error, not rate-limited
      expect(result.error).toBe('Invalid credentials');
    });
  });
});

// Need afterEach import
import { afterEach } from 'vitest';
