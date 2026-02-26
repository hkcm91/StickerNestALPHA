/**
 * Layout Mode Registry
 *
 * Centralized registry for layout modes.
 * Allows registering, retrieving, and managing layout strategies.
 *
 * @module canvas/core/layout
 * @layer L4A-1
 */

import { artboardLayout } from './artboard';
import { bentoLayout } from './bento';
import { desktopLayout } from './desktop';
import { freeformLayout } from './freeform';
import type { LayoutMode } from './layout-mode';

/**
 * Internal registry of layout modes
 */
const layoutRegistry = new Map<string, LayoutMode>();

/**
 * Register a layout mode
 *
 * @param mode - The layout mode to register
 * @throws Error if a mode with the same name is already registered
 */
export function registerLayoutMode(mode: LayoutMode): void {
  if (layoutRegistry.has(mode.name)) {
    throw new Error(`Layout mode "${mode.name}" is already registered`);
  }
  layoutRegistry.set(mode.name, mode);
}

/**
 * Get a layout mode by name
 *
 * @param name - The name of the layout mode
 * @returns The layout mode, or undefined if not found
 */
export function getLayoutMode(name: string): LayoutMode | undefined {
  return layoutRegistry.get(name);
}

/**
 * Check if a layout mode is registered
 *
 * @param name - The name of the layout mode
 * @returns Whether the mode is registered
 */
export function hasLayoutMode(name: string): boolean {
  return layoutRegistry.has(name);
}

/**
 * Unregister a layout mode
 *
 * @param name - The name of the layout mode to unregister
 * @returns Whether the mode was unregistered
 */
export function unregisterLayoutMode(name: string): boolean {
  return layoutRegistry.delete(name);
}

/**
 * Get all registered layout mode names
 *
 * @returns Array of registered layout mode names
 */
export function getRegisteredLayoutModes(): string[] {
  return Array.from(layoutRegistry.keys());
}

/**
 * Get all registered layout modes
 *
 * @returns Array of registered layout modes
 */
export function getAllLayoutModes(): LayoutMode[] {
  return Array.from(layoutRegistry.values());
}

/**
 * Clear all registered layout modes
 * Useful for testing
 */
export function clearLayoutModes(): void {
  layoutRegistry.clear();
}

/**
 * Initialize the registry with default layout modes
 */
export function initializeDefaultLayoutModes(): void {
  // Clear any existing modes
  clearLayoutModes();

  // Register built-in modes
  registerLayoutMode(freeformLayout);
  registerLayoutMode(bentoLayout);
  registerLayoutMode(desktopLayout);
  registerLayoutMode(artboardLayout);
}

/**
 * Get the default layout mode
 *
 * @returns The default (freeform) layout mode
 */
export function getDefaultLayoutMode(): LayoutMode {
  return freeformLayout;
}

// Auto-initialize with default modes
initializeDefaultLayoutModes();
