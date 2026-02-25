import type { Page } from '@playwright/test';
/**
 * Utility functions for E2E testing.
 */
/**
 * Wait for a specific number of milliseconds.
 * Use sparingly - prefer waiting for specific conditions.
 */
export declare function wait(ms: number): Promise<void>;
/**
 * Generate a unique ID for test entities.
 */
export declare function generateTestId(prefix?: string): string;
/**
 * Mock a canvas with test entities for E2E testing.
 * This will be used before the actual canvas implementation exists.
 */
export declare function mockCanvasWithEntities(page: Page, entities: Array<{
    id: string;
    x: number;
    y: number;
    type: string;
}>): Promise<void>;
/**
 * Get the bounding box of an element in screen coordinates.
 */
export declare function getElementBounds(page: Page, selector: string): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
} | null>;
/**
 * Simulate a keyboard shortcut.
 */
export declare function pressShortcut(page: Page, key: string, modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
}): Promise<void>;
/**
 * Assert that a position is within epsilon of an expected position.
 */
export declare function positionsEqual(actual: {
    x: number;
    y: number;
}, expected: {
    x: number;
    y: number;
}, epsilon?: number): boolean;
/**
 * Convert screen coordinates to canvas coordinates.
 * This is a placeholder - actual implementation will use the viewport transform.
 */
export declare function screenToCanvas(screenX: number, screenY: number, viewport: {
    panX: number;
    panY: number;
    zoom: number;
}): {
    x: number;
    y: number;
};
/**
 * Convert canvas coordinates to screen coordinates.
 * This is a placeholder - actual implementation will use the viewport transform.
 */
export declare function canvasToScreen(canvasX: number, canvasY: number, viewport: {
    panX: number;
    panY: number;
    zoom: number;
}): {
    x: number;
    y: number;
};
//# sourceMappingURL=test-helpers.d.ts.map