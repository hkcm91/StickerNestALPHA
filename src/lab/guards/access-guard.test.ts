import { describe, it, expect } from 'vitest';

import type { AuthUser } from '../../kernel/stores/auth/auth.store';

import { checkLabAccess } from './access-guard';

function makeUser(tier: AuthUser['tier']): AuthUser {
  return {
    id: 'user-1',
    email: 'test@test.com',
    displayName: 'Test',
    avatarUrl: null,
    tier,
  };
}

describe('checkLabAccess', () => {
  it('allows creator tier', () => {
    expect(checkLabAccess(makeUser('creator'))).toEqual({ allowed: true });
  });

  it('allows pro tier', () => {
    expect(checkLabAccess(makeUser('pro'))).toEqual({ allowed: true });
  });

  it('allows enterprise tier', () => {
    expect(checkLabAccess(makeUser('enterprise'))).toEqual({ allowed: true });
  });

  it('denies free tier with upgrade_required', () => {
    const result = checkLabAccess(makeUser('free'));
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('upgrade_required');
  });

  it('denies null user with not_authenticated', () => {
    const result = checkLabAccess(null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not_authenticated');
  });
});
