import type { Page, Locator } from '@playwright/test';
/**
 * Canvas page object providing helpers for canvas E2E testing.
 *
 * This fixture abstracts common canvas operations:
 * - Viewport manipulation (pan, zoom)
 * - Entity selection and manipulation
 * - Coordinate space conversions
 */
export declare class CanvasPage {
    readonly page: Page;
    readonly canvas: Locator;
    readonly viewport: Locator;
    constructor(page: Page);
    /**
     * Navigate to a specific canvas by ID.
     */
    goto(canvasId: string): Promise<void>;
    /**
     * Wait for the canvas to be fully loaded and interactive.
     */
    waitForCanvasReady(): Promise<void>;
    /**
     * Pan the canvas by the specified delta.
     * @param dx - Horizontal pan distance in pixels
     * @param dy - Vertical pan distance in pixels
     */
    pan(dx: number, dy: number): Promise<void>;
    /**
     * Zoom the canvas by the specified factor.
     * Factor > 1 zooms in, factor < 1 zooms out.
     * @param factor - Zoom factor (e.g., 1.5 for 150% zoom)
     */
    zoom(factor: number): Promise<void>;
    /**
     * Select an entity by its ID.
     * @param entityId - The entity's unique identifier
     */
    selectEntity(entityId: string): Promise<void>;
    /**
     * Drag an entity by the specified delta.
     * @param entityId - The entity's unique identifier
     * @param dx - Horizontal drag distance in canvas units
     * @param dy - Vertical drag distance in canvas units
     */
    dragEntity(entityId: string, dx: number, dy: number): Promise<void>;
    /**
     * Get the position of an entity.
     * @param entityId - The entity's unique identifier
     * @returns The entity's position in canvas coordinates
     */
    getEntityPosition(entityId: string): Promise<{
        x: number;
        y: number;
    }>;
    /**
     * Get the current viewport state (pan offset and zoom level).
     */
    getViewportState(): Promise<{
        panX: number;
        panY: number;
        zoom: number;
    }>;
    /**
     * Check if an entity exists on the canvas.
     * @param entityId - The entity's unique identifier
     */
    entityExists(entityId: string): Promise<boolean>;
    /**
     * Get all entity IDs currently on the canvas.
     */
    getAllEntityIds(): Promise<string[]>;
    /**
     * Check if the canvas is in edit mode.
     */
    isEditMode(): Promise<boolean>;
    /**
     * Check if the canvas is in preview mode.
     */
    isPreviewMode(): Promise<boolean>;
    /**
     * Toggle between edit and preview modes.
     */
    toggleMode(): Promise<void>;
}
/**
 * Extended test fixture that includes the CanvasPage.
 */
export declare const test: import("playwright/test").TestType<import("playwright/test").PlaywrightTestArgs & import("playwright/test").PlaywrightTestOptions & {
    canvasPage: CanvasPage;
}, import("playwright/test").PlaywrightWorkerArgs & import("playwright/test").PlaywrightWorkerOptions>;
export { expect } from '@playwright/test';
//# sourceMappingURL=canvas.fixture.d.ts.map