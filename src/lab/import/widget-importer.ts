/**
 * Widget Importer
 *
 * Loads Marketplace widgets into Lab for forking.
 * Respects license metadata — no-fork and proprietary licenses are rejected.
 *
 * @module lab/import
 * @layer L2
 */

import type { WidgetManifest, WidgetLicense } from '@sn/types';

/** Licenses that prohibit forking */
const NO_FORK_LICENSES: ReadonlySet<WidgetLicense> = new Set(['no-fork', 'proprietary']);

export interface WidgetListing {
  widgetId: string;
  html: string;
  manifest: WidgetManifest;
}

export interface ImportResult {
  success: true;
  html: string;
  manifest: WidgetManifest;
  isFork: boolean;
  originalWidgetId: string;
}

export interface ImportError {
  success: false;
  error: string;
}

export type ImportOutcome = ImportResult | ImportError;

/**
 * Check if a license allows forking.
 *
 * @param license - The widget's license
 * @returns true if forking is allowed
 */
export function checkLicense(license: WidgetLicense): boolean {
  return !NO_FORK_LICENSES.has(license);
}

/**
 * Import a widget from a Marketplace listing for forking.
 *
 * @param listing - The widget listing to import
 * @returns Import result or error
 */
export function importWidget(listing: WidgetListing): ImportOutcome {
  if (!checkLicense(listing.manifest.license)) {
    return {
      success: false,
      error: `Widget "${listing.manifest.name}" has a ${listing.manifest.license} license and cannot be forked.`,
    };
  }

  return {
    success: true,
    html: listing.html,
    manifest: listing.manifest,
    isFork: true,
    originalWidgetId: listing.widgetId,
  };
}
