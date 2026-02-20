/**
 * Sandbox Policy
 *
 * Defines the iframe sandbox attributes for widget execution.
 * NEVER includes allow-same-origin — this is the security foundation.
 *
 * @module runtime/security
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

/**
 * Sandbox attribute value for widget iframes.
 * allow-scripts: JavaScript execution
 * allow-forms: Form elements for UI
 * NEVER: allow-same-origin, allow-top-navigation, allow-popups, allow-pointer-lock
 */
export const SANDBOX_POLICY = 'allow-scripts allow-forms';

/**
 * Validates that a sandbox policy string does not contain forbidden tokens.
 *
 * @param policy - Sandbox attribute value to validate
 * @returns true if the policy is safe
 * @throws Error if forbidden tokens are found
 */
export function validateSandboxPolicy(policy: string): boolean {
  const forbidden = [
    'allow-same-origin',
    'allow-top-navigation',
    'allow-popups',
    'allow-pointer-lock',
  ];

  for (const token of forbidden) {
    if (policy.includes(token)) {
      throw new Error(`Forbidden sandbox token: ${token}. This would compromise widget sandboxing.`);
    }
  }

  return true;
}
