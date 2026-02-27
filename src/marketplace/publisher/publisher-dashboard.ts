/**
 * Publisher Dashboard
 *
 * Submit, update, deprecate, and manage published widgets.
 * This is the final step of the Lab publish pipeline (L2).
 *
 * @module marketplace/publisher
 * @layer L5
 */

import { MarketplaceEvents } from '@sn/types';
import type { WidgetManifest } from '@sn/types';

import { bus } from '../../kernel/bus';
import { createMarketplaceAPI } from '../api/marketplace-api';
import type { MarketplaceWidgetListing, WidgetVersion } from '../api/marketplace-api';

export interface PublishResult {
  success: boolean;
  widgetId?: string;
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  error?: string;
}

export interface PublisherDashboard {
  publish(
    html: string,
    manifest: WidgetManifest,
    thumbnail: Blob | null,
  ): Promise<PublishResult>;
  update(
    widgetId: string,
    html: string,
    manifest: WidgetManifest,
    changelog?: string,
  ): Promise<UpdateResult>;
  deprecate(widgetId: string): Promise<void>;
  deleteWidget(widgetId: string): Promise<void>;
  getMyWidgets(): Promise<MarketplaceWidgetListing[]>;
  getVersionHistory(widgetId: string): Promise<WidgetVersion[]>;
}

export function createPublisherDashboard(authorId: string): PublisherDashboard {
  const api = createMarketplaceAPI();

  return {
    async publish(
      html: string,
      manifest: WidgetManifest,
      thumbnail: Blob | null,
    ): Promise<PublishResult> {
      try {
        const { widgetId } = await api.publish(authorId, html, manifest, thumbnail);

        bus.emit(MarketplaceEvents.WIDGET_PUBLISHED, {
          widgetId,
          manifest,
        });

        return { success: true, widgetId };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Publish failed',
        };
      }
    },

    async update(
      widgetId: string,
      html: string,
      manifest: WidgetManifest,
      changelog?: string,
    ): Promise<UpdateResult> {
      try {
        await api.updateWidget(widgetId, html, manifest, changelog);

        bus.emit(MarketplaceEvents.WIDGET_UPDATED, {
          widgetId,
          version: manifest.version,
        });

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Update failed',
        };
      }
    },

    async deprecate(widgetId: string): Promise<void> {
      await api.deprecateWidget(widgetId);
      bus.emit(MarketplaceEvents.WIDGET_DEPRECATED, { widgetId });
    },

    async deleteWidget(widgetId: string): Promise<void> {
      await api.deleteWidget(widgetId);
    },

    async getMyWidgets(): Promise<MarketplaceWidgetListing[]> {
      return api.getPublishedByAuthor(authorId);
    },

    async getVersionHistory(widgetId: string): Promise<WidgetVersion[]> {
      return api.getVersionHistory(widgetId);
    },
  };
}
