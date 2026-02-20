/**
 * Widget Detail Service
 *
 * Fetches full widget detail including HTML content and manifest.
 *
 * @module marketplace/detail
 * @layer L5
 */

import { createMarketplaceAPI } from '../api/marketplace-api';
import type { MarketplaceWidgetDetail } from '../api/marketplace-api';

export interface WidgetDetailService {
  getById(widgetId: string): Promise<MarketplaceWidgetDetail | null>;
  getBySlug(slug: string): Promise<MarketplaceWidgetDetail | null>;
}

export function createWidgetDetailService(): WidgetDetailService {
  const api = createMarketplaceAPI();

  return {
    async getById(widgetId: string): Promise<MarketplaceWidgetDetail | null> {
      return api.getWidget(widgetId);
    },

    async getBySlug(slug: string): Promise<MarketplaceWidgetDetail | null> {
      return api.getWidgetBySlug(slug);
    },
  };
}
