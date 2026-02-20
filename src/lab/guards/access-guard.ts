/**
 * Lab Access Guard
 *
 * Gate Widget Lab access to Creator+ tier users.
 * Enforce at route level — not inside individual components.
 *
 * @module lab/guards
 * @layer L2
 */

import type { AuthUser } from '../../kernel/stores/auth/auth.store';

/** Tiers that are allowed to access the full Widget Lab IDE */
const ALLOWED_TIERS: ReadonlySet<string> = new Set(['creator', 'pro', 'enterprise']);

export interface AccessCheckResult {
  allowed: boolean;
  reason?: 'upgrade_required' | 'not_authenticated';
}

/**
 * Check if a user has access to the Widget Lab.
 *
 * @param user - The authenticated user, or null if not authenticated
 * @returns Access check result with reason if denied
 */
export function checkLabAccess(user: AuthUser | null): AccessCheckResult {
  if (!user) {
    return { allowed: false, reason: 'not_authenticated' };
  }

  if (!ALLOWED_TIERS.has(user.tier)) {
    return { allowed: false, reason: 'upgrade_required' };
  }

  return { allowed: true };
}
