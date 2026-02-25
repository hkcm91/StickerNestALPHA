import { test as base } from '@playwright/test';
/**
 * Canvas page object providing helpers for canvas E2E testing.
 *
 * This fixture abstracts common canvas operations:
 * - Viewport manipulation (pan, zoom)
 * - Entity selection and manipulation
 * - Coordinate space conversions
 */
export class CanvasPage {
    page;
    canvas;
    viewport;
    constructor(page) {
        this.page = page;
        // These selectors will be updated when canvas implementation exists
        this.canvas = page.locator('[data-testid="canvas"]');
        this.viewport = page.locator('[data-testid="canvas-viewport"]');
    }
    /**
     * Navigate to a specific canvas by ID.
     */
    async goto(canvasId) {
        await this.page.goto(`/canvas/${canvasId}`);
        await this.waitForCanvasReady();
    }
    /**
     * Wait for the canvas to be fully loaded and interactive.
     */
    async waitForCanvasReady() {
        // Wait for canvas element to be visible
        await this.canvas.waitFor({ state: 'visible' });
        // Wait for any loading indicators to disappear
        await this.page.locator('[data-testid="canvas-loading"]').waitFor({ state: 'hidden' }).catch(() => {
            // Loading indicator may not exist, which is fine
        });
    }
    /**
     * Pan the canvas by the specified delta.
     * @param dx - Horizontal pan distance in pixels
     * @param dy - Vertical pan distance in pixels
     */
    async pan(dx, dy) {
        const box = await this.canvas.boundingBox();
        if (!box) {
            throw new Error('Canvas element not found');
        }
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        // Middle-click drag to pan (common canvas convention)
        await this.page.mouse.move(startX, startY);
        await this.page.mouse.down({ button: 'middle' });
        await this.page.mouse.move(startX + dx, startY + dy);
        await this.page.mouse.up({ button: 'middle' });
    }
    /**
     * Zoom the canvas by the specified factor.
     * Factor > 1 zooms in, factor < 1 zooms out.
     * @param factor - Zoom factor (e.g., 1.5 for 150% zoom)
     */
    async zoom(factor) {
        const box = await this.canvas.boundingBox();
        if (!box) {
            throw new Error('Canvas element not found');
        }
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        // Calculate scroll delta from factor
        // Positive delta zooms in, negative zooms out
        const scrollDelta = factor > 1 ? -120 * Math.log2(factor) : 120 * Math.log2(1 / factor);
        await this.page.mouse.move(centerX, centerY);
        await this.page.keyboard.down('Control');
        await this.page.mouse.wheel(0, scrollDelta);
        await this.page.keyboard.up('Control');
    }
    /**
     * Select an entity by its ID.
     * @param entityId - The entity's unique identifier
     */
    async selectEntity(entityId) {
        const entity = this.page.locator(`[data-entity-id="${entityId}"]`);
        await entity.click();
    }
    /**
     * Drag an entity by the specified delta.
     * @param entityId - The entity's unique identifier
     * @param dx - Horizontal drag distance in canvas units
     * @param dy - Vertical drag distance in canvas units
     */
    async dragEntity(entityId, dx, dy) {
        const entity = this.page.locator(`[data-entity-id="${entityId}"]`);
        const box = await entity.boundingBox();
        if (!box) {
            throw new Error(`Entity with ID "${entityId}" not found`);
        }
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        await this.page.mouse.move(startX, startY);
        await this.page.mouse.down();
        await this.page.mouse.move(startX + dx, startY + dy);
        await this.page.mouse.up();
    }
    /**
     * Get the position of an entity.
     * @param entityId - The entity's unique identifier
     * @returns The entity's position in canvas coordinates
     */
    async getEntityPosition(entityId) {
        const entity = this.page.locator(`[data-entity-id="${entityId}"]`);
        // Get the transform/position from the entity's data attributes or computed style
        const position = await entity.evaluate((el) => {
            const x = parseFloat(el.getAttribute('data-x') || '0');
            const y = parseFloat(el.getAttribute('data-y') || '0');
            return { x, y };
        });
        return position;
    }
    /**
     * Get the current viewport state (pan offset and zoom level).
     */
    async getViewportState() {
        return await this.page.evaluate(() => {
            // This will be replaced with actual store access when canvas is implemented
            const viewport = window.__SN_VIEWPORT__;
            return viewport || { panX: 0, panY: 0, zoom: 1 };
        });
    }
    /**
     * Check if an entity exists on the canvas.
     * @param entityId - The entity's unique identifier
     */
    async entityExists(entityId) {
        const entity = this.page.locator(`[data-entity-id="${entityId}"]`);
        return await entity.count() > 0;
    }
    /**
     * Get all entity IDs currently on the canvas.
     */
    async getAllEntityIds() {
        const entities = this.page.locator('[data-entity-id]');
        return await entities.evaluateAll((els) => els.map((el) => el.getAttribute('data-entity-id') || '').filter(Boolean));
    }
    /**
     * Check if the canvas is in edit mode.
     */
    async isEditMode() {
        return await this.page.evaluate(() => {
            // This will be replaced with actual store access when canvas is implemented
            const mode = window.__SN_CANVAS_MODE__;
            return mode === 'edit';
        });
    }
    /**
     * Check if the canvas is in preview mode.
     */
    async isPreviewMode() {
        return !(await this.isEditMode());
    }
    /**
     * Toggle between edit and preview modes.
     */
    async toggleMode() {
        const modeToggle = this.page.locator('[data-testid="mode-toggle"]');
        await modeToggle.click();
    }
}
/**
 * Extended test fixture that includes the CanvasPage.
 */
export const test = base.extend({
    canvasPage: async ({ page }, use) => {
        const canvasPage = new CanvasPage(page);
        await use(canvasPage);
    },
});
export { expect } from '@playwright/test';
//# sourceMappingURL=canvas.fixture.js.map