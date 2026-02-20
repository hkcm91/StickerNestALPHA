import type { Page } from '@playwright/test';

/**
 * Utility functions for E2E testing.
 */

/**
 * Wait for a specific number of milliseconds.
 * Use sparingly - prefer waiting for specific conditions.
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a unique ID for test entities.
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Mock a canvas with test entities for E2E testing.
 * This will be used before the actual canvas implementation exists.
 */
export async function mockCanvasWithEntities(
  page: Page,
  entities: Array<{ id: string; x: number; y: number; type: string }>
): Promise<void> {
  await page.evaluate((testEntities) => {
    // Inject mock entities into the page for testing
    (window as unknown as { __SN_MOCK_ENTITIES__: typeof testEntities }).__SN_MOCK_ENTITIES__ = testEntities;
  }, entities);
}

/**
 * Get the bounding box of an element in screen coordinates.
 */
export async function getElementBounds(
  page: Page,
  selector: string
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const element = page.locator(selector);
  return await element.boundingBox();
}

/**
 * Simulate a keyboard shortcut.
 */
export async function pressShortcut(
  page: Page,
  key: string,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}
): Promise<void> {
  const keys: string[] = [];

  if (modifiers.ctrl) keys.push('Control');
  if (modifiers.shift) keys.push('Shift');
  if (modifiers.alt) keys.push('Alt');
  if (modifiers.meta) keys.push('Meta');

  keys.push(key);

  await page.keyboard.press(keys.join('+'));
}

/**
 * Assert that a position is within epsilon of an expected position.
 */
export function positionsEqual(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
  epsilon = 0.001
): boolean {
  return (
    Math.abs(actual.x - expected.x) < epsilon &&
    Math.abs(actual.y - expected.y) < epsilon
  );
}

/**
 * Convert screen coordinates to canvas coordinates.
 * This is a placeholder - actual implementation will use the viewport transform.
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: { panX: number; panY: number; zoom: number }
): { x: number; y: number } {
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom,
  };
}

/**
 * Convert canvas coordinates to screen coordinates.
 * This is a placeholder - actual implementation will use the viewport transform.
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: { panX: number; panY: number; zoom: number }
): { x: number; y: number } {
  return {
    x: canvasX * viewport.zoom + viewport.panX,
    y: canvasY * viewport.zoom + viewport.panY,
  };
}
