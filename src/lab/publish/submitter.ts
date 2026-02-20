/**
 * Widget Submitter
 *
 * Submits a validated widget to the Marketplace via bus events.
 * L2 (Lab) cannot import from L5 (Marketplace) directly — all
 * communication goes through the event bus.
 *
 * @module lab/publish
 * @layer L2
 */

import type { WidgetManifest, BusEvent } from '@sn/types';
import { MarketplaceEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

/** Timeout for publish request (30 seconds) */
const SUBMIT_TIMEOUT_MS = 30_000;

export interface SubmitPayload {
  html: string;
  manifest: WidgetManifest;
  thumbnail: Blob | null;
  authorId: string;
}

export interface SubmitResult {
  success: boolean;
  listingId?: string;
  error?: string;
}

/**
 * Submits a widget to the Marketplace via bus event.
 * Emits a publish request and waits for the marketplace layer to respond.
 *
 * @param payload - The submission payload
 * @returns Submit result from the marketplace
 */
export async function submitWidget(payload: SubmitPayload): Promise<SubmitResult> {
  return new Promise<SubmitResult>((resolve) => {
    let settled = false;

    // Subscribe for the response from marketplace
    const unsub = bus.subscribe(
      MarketplaceEvents.PUBLISH_RESPONSE,
      (event: BusEvent) => {
        if (settled) return;
        settled = true;
        unsub();

        const result = event.payload as SubmitResult;
        resolve(result);
      },
    );

    // Timeout after 30 seconds
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsub();
      resolve({ success: false, error: 'Submission timed out' });
    }, SUBMIT_TIMEOUT_MS);

    // Emit the publish request
    bus.emit(MarketplaceEvents.PUBLISH_REQUEST, {
      html: payload.html,
      manifest: payload.manifest,
      thumbnail: payload.thumbnail,
      authorId: payload.authorId,
    });

    // Clean up timer if resolved via response
    void Promise.resolve().then(() => {
      if (settled) clearTimeout(timer);
    });
  });
}
