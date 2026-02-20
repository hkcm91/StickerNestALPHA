/**
 * Widget Validator
 *
 * Validates widget HTML against the bridge protocol spec.
 * Checks that StickerNest.register() and StickerNest.ready() are called.
 *
 * @module lab/publish
 * @layer L2
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a widget HTML string for publish readiness.
 *
 * @param html - The widget HTML source
 * @returns Validation result with any errors
 */
export function validateWidget(html: string): ValidationResult {
  const errors: string[] = [];

  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    errors.push('Widget HTML is empty');
    return { valid: false, errors };
  }

  // Check for StickerNest.ready() call
  if (!html.includes('StickerNest.ready()') && !html.includes('StickerNest.ready(')) {
    errors.push('Widget must call StickerNest.ready() to signal initialization complete');
  }

  // Check for StickerNest.register() call
  if (!html.includes('StickerNest.register(')) {
    errors.push('Widget must call StickerNest.register(manifest) before ready()');
  }

  // Check for remote script sources (security)
  const remoteScriptPattern = /<script[^>]+src\s*=\s*["']https?:\/\//i;
  if (remoteScriptPattern.test(html)) {
    errors.push('Widget must not load remote scripts — all code must be inline');
  }

  return { valid: errors.length === 0, errors };
}
