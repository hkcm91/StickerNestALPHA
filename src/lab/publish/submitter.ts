/**
 * Widget Submitter
 *
 * Submits a validated widget to the Marketplace API.
 * Stub while Layer 5 (Marketplace) is not yet built.
 *
 * @module lab/publish
 * @layer L2
 */

import type { WidgetManifest } from '@sn/types';

export interface SubmitPayload {
  html: string;
  manifest: WidgetManifest;
  thumbnail: Blob | null;
}

export interface SubmitResult {
  success: boolean;
  listingId?: string;
  error?: string;
}

/**
 * Submits a widget to the Marketplace.
 * Stub — logs the payload and returns success.
 *
 * @param payload - The submission payload
 * @returns Submit result
 */
export async function submitWidget(payload: SubmitPayload): Promise<SubmitResult> {
  // Stub: Log the payload for pipeline testing before L5 ships
  console.log('[Lab/Publish] Submit payload:', {
    htmlLength: payload.html.length,
    manifestId: payload.manifest.id,
    manifestName: payload.manifest.name,
    manifestVersion: payload.manifest.version,
    hasThumbnail: payload.thumbnail !== null,
  });

  return {
    success: true,
    listingId: `listing-stub-${payload.manifest.id}-${Date.now()}`,
  };
}
