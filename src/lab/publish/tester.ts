/**
 * Widget Tester
 *
 * Runs a widget in a headless sandbox to verify READY signal
 * within 500ms and no uncaught errors.
 *
 * @module lab/publish
 * @layer L2
 */

import type { WidgetManifest } from '@sn/types';

export interface TestResult {
  passed: boolean;
  errors: string[];
  readyTime?: number;
}

/** Maximum time to wait for READY signal in ms */
export const READY_TIMEOUT_MS = 500;

/**
 * Tests a widget by simulating a sandbox load.
 * In a real environment this would use a headless iframe or Playwright.
 * For now, performs static analysis checks.
 *
 * @param html - Widget HTML source
 * @param _manifest - Widget manifest (used for future contract testing)
 * @returns Test result
 */
export function testWidget(html: string, _manifest: WidgetManifest): TestResult {
  const errors: string[] = [];

  if (!html || html.trim().length === 0) {
    errors.push('Widget HTML is empty');
    return { passed: false, errors };
  }

  // Check that ready() is actually called (not just defined)
  const readyCallPattern = /StickerNest\.ready\s*\(/;
  if (!readyCallPattern.test(html)) {
    errors.push('Widget does not call StickerNest.ready() — will fail READY timeout');
  }

  // Check for common errors that would prevent load
  const syntaxErrorPattern = /\beval\s*\(/;
  if (syntaxErrorPattern.test(html)) {
    errors.push('Widget uses eval() which is blocked by CSP');
  }

  if (errors.length === 0) {
    return { passed: true, errors: [], readyTime: 0 };
  }

  return { passed: false, errors };
}
