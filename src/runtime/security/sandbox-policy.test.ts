/**
 * Sandbox Policy Tests
 *
 * Tests for iframe sandbox attribute validation and security enforcement.
 *
 * @module runtime/security
 * @layer L3
 */

import { describe, it, expect } from 'vitest';

import { SANDBOX_POLICY, validateSandboxPolicy } from './sandbox-policy';

describe('SANDBOX_POLICY constant', () => {
  it('includes allow-scripts', () => {
    expect(SANDBOX_POLICY).toContain('allow-scripts');
  });

  it('includes allow-forms', () => {
    expect(SANDBOX_POLICY).toContain('allow-forms');
  });

  it('does not include allow-same-origin', () => {
    expect(SANDBOX_POLICY).not.toContain('allow-same-origin');
  });

  it('does not include allow-top-navigation', () => {
    expect(SANDBOX_POLICY).not.toContain('allow-top-navigation');
  });

  it('does not include allow-popups', () => {
    expect(SANDBOX_POLICY).not.toContain('allow-popups');
  });

  it('does not include allow-pointer-lock', () => {
    expect(SANDBOX_POLICY).not.toContain('allow-pointer-lock');
  });

  it('is a string with exactly two tokens', () => {
    const tokens = SANDBOX_POLICY.split(' ');
    expect(tokens).toHaveLength(2);
    expect(tokens).toEqual(['allow-scripts', 'allow-forms']);
  });
});

describe('validateSandboxPolicy', () => {
  it('returns true for the default SANDBOX_POLICY', () => {
    expect(validateSandboxPolicy(SANDBOX_POLICY)).toBe(true);
  });

  it('returns true for a policy with only allow-scripts', () => {
    expect(validateSandboxPolicy('allow-scripts')).toBe(true);
  });

  it('returns true for an empty string (no tokens)', () => {
    expect(validateSandboxPolicy('')).toBe(true);
  });

  it('throws for allow-same-origin', () => {
    expect(() => validateSandboxPolicy('allow-scripts allow-same-origin')).toThrow(
      'Forbidden sandbox token: allow-same-origin',
    );
  });

  it('throws for allow-top-navigation', () => {
    expect(() => validateSandboxPolicy('allow-top-navigation')).toThrow(
      'Forbidden sandbox token: allow-top-navigation',
    );
  });

  it('throws for allow-popups', () => {
    expect(() => validateSandboxPolicy('allow-popups allow-scripts')).toThrow(
      'Forbidden sandbox token: allow-popups',
    );
  });

  it('throws for allow-pointer-lock', () => {
    expect(() => validateSandboxPolicy('allow-pointer-lock')).toThrow(
      'Forbidden sandbox token: allow-pointer-lock',
    );
  });

  it('throws with a message referencing the specific forbidden token', () => {
    try {
      validateSandboxPolicy('allow-same-origin');
    } catch (e) {
      expect((e as Error).message).toContain('allow-same-origin');
      expect((e as Error).message).toContain('compromise widget sandboxing');
    }
  });

  it('detects the first forbidden token when multiple are present', () => {
    expect(() =>
      validateSandboxPolicy('allow-same-origin allow-top-navigation allow-popups'),
    ).toThrow('allow-same-origin');
  });

  it('accepts allow-forms alone', () => {
    expect(validateSandboxPolicy('allow-forms')).toBe(true);
  });
});
