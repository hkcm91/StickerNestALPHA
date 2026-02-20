/**
 * Mobile Viewport Guard
 *
 * Widget Lab is desktop-browser-first.
 * Viewports narrower than the minimum breakpoint get a redirect prompt.
 *
 * @module lab/guards
 * @layer L2
 */

/** Minimum viewport width in pixels for the Lab IDE */
export const MIN_DESKTOP_WIDTH = 1024;

/**
 * Check if the viewport is wide enough for the Lab IDE.
 *
 * @param width - Current viewport width in pixels
 * @returns true if desktop-sized, false if too narrow
 */
export function checkDesktopViewport(width: number): boolean {
  return width >= MIN_DESKTOP_WIDTH;
}
