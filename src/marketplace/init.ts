/**
 * Marketplace Layer Initialization
 *
 * Sets up bus event subscriptions for marketplace operations.
 * Handles the publish request/response bridge between Lab (L2)
 * and Marketplace (L5) via the event bus.
 *
 * @module marketplace/init
 * @layer L5
 */

import type { BusEvent, WidgetManifest } from '@sn/types';
import { MarketplaceEvents } from '@sn/types';

import { bus } from '../kernel/bus';

import { createPublisherDashboard } from './publisher/publisher-dashboard';

let initialized = false;
const busUnsubscribes: Array<() => void> = [];

interface PublishRequestPayload {
  html: string;
  manifest: WidgetManifest;
  thumbnail: Blob | null;
  authorId: string;
}

/**
 * Initialize the marketplace layer.
 * Sets up bus subscriptions for cross-layer communication.
 */
export function initMarketplace(): void {
  if (initialized) return;

  // Handle publish requests from Lab (L2 cannot import L5 directly)
  const unsubPublish = bus.subscribe(
    MarketplaceEvents.PUBLISH_REQUEST,
    async (event: BusEvent) => {
      const payload = event.payload as PublishRequestPayload;

      try {
        const dashboard = createPublisherDashboard(payload.authorId);
        const result = await dashboard.publish(
          payload.html,
          payload.manifest,
          payload.thumbnail,
        );

        bus.emit(MarketplaceEvents.PUBLISH_RESPONSE, {
          success: result.success,
          listingId: result.widgetId,
          error: result.error,
        });
      } catch (err) {
        bus.emit(MarketplaceEvents.PUBLISH_RESPONSE, {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown publish error',
        });
      }
    },
  );
  busUnsubscribes.push(unsubPublish);

  initialized = true;
}

/**
 * Tear down the marketplace layer and clean up subscriptions.
 */
export function teardownMarketplace(): void {
  if (!initialized) return;

  for (const unsub of busUnsubscribes) {
    unsub();
  }
  busUnsubscribes.length = 0;
  initialized = false;
}

/**
 * Check if the marketplace is initialized.
 */
export function isMarketplaceInitialized(): boolean {
  return initialized;
}
