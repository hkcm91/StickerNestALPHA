/**
 * Marketplace API types
 * Extracted from marketplace-api.ts
 *
 * @module marketplace/api
 * @layer L5
 */

import type { WidgetManifest } from '@sn/types';

export interface MarketplaceWidgetListing {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  version: string;
  authorId: string | null;
  thumbnailUrl: string | null;
  iconUrl: string | null;
  category: string | null;
  tags: string[];
  license: string;
  isPublished: boolean;
  isDeprecated: boolean;
  installCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  /** Whether the widget is free (true) or paid */
  isFree: boolean;
  /** Price in smallest currency unit (e.g. cents). null for free widgets. */
  priceCents: number | null;
  /** ISO 4217 currency code (e.g. 'usd') */
  currency: string;
  /** Stripe price ID for paid widgets */
  stripePriceId: string | null;
  /** Arbitrary metadata (e.g. { official: true, builtIn: true, rendering: "inline" }) */
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceWidgetDetail extends MarketplaceWidgetListing {
  htmlContent: string;
  manifest: WidgetManifest;
}

export interface WidgetReview {
  id: string;
  widgetId: string;
  userId: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetVersion {
  id: string;
  widgetId: string;
  version: string;
  htmlContent: string;
  manifest: WidgetManifest;
  changelog: string | null;
  createdAt: string;
}

export interface SearchParams {
  query?: string;
  category?: string;
  tags?: string[];
  page: number;
  pageSize: number;
  sortBy?: 'rating' | 'installs' | 'newest';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface MarketplaceAPI {
  search(params: SearchParams): Promise<PaginatedResult<MarketplaceWidgetListing>>;
  getFeatured(): Promise<MarketplaceWidgetListing[]>;
  getWidget(widgetId: string): Promise<MarketplaceWidgetDetail | null>;
  getWidgetBySlug(slug: string): Promise<MarketplaceWidgetDetail | null>;
  install(userId: string, widgetId: string): Promise<{ htmlContent: string; manifest: WidgetManifest }>;
  uninstall(userId: string, widgetId: string): Promise<void>;
  getInstalledWidgets(userId: string): Promise<MarketplaceWidgetListing[]>;
  publish(
    authorId: string,
    html: string,
    manifest: WidgetManifest,
    thumbnail: Blob | null,
  ): Promise<{ widgetId: string }>;
  updateWidget(
    widgetId: string,
    html: string,
    manifest: WidgetManifest,
    changelog?: string,
  ): Promise<void>;
  deprecateWidget(widgetId: string): Promise<void>;
  deleteWidget(widgetId: string): Promise<void>;
  getPublishedByAuthor(authorId: string): Promise<MarketplaceWidgetListing[]>;
  getVersionHistory(widgetId: string): Promise<WidgetVersion[]>;
  getReviews(
    widgetId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<WidgetReview>>;
  addReview(
    widgetId: string,
    userId: string,
    rating: number,
    text?: string,
  ): Promise<void>;
  updateReview(
    widgetId: string,
    userId: string,
    rating: number,
    text?: string,
  ): Promise<void>;
  deleteReview(widgetId: string, userId: string): Promise<void>;
}
