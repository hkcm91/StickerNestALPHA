/**
 * Marketplace row mappers — transform Supabase rows to domain types
 * Extracted from marketplace-api.ts
 *
 * @module marketplace/api
 * @layer L5
 */

import { WidgetManifestSchema } from '@sn/types';

import type {
  MarketplaceWidgetListing,
  MarketplaceWidgetDetail,
  WidgetReview,
  WidgetVersion,
} from './types';

export const LISTING_COLUMNS =
  'id,name,slug,description,version,author_id,thumbnail_url,icon_url,category,tags,license,is_published,is_deprecated,install_count,rating_average,rating_count,is_free,price_cents,currency,stripe_price_id,metadata,created_at,updated_at';

export function rowToListing(row: Record<string, unknown>): MarketplaceWidgetListing {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string | null,
    version: row.version as string,
    authorId: row.author_id as string | null,
    thumbnailUrl: row.thumbnail_url as string | null,
    iconUrl: row.icon_url as string | null,
    category: row.category as string | null,
    tags: (row.tags as string[]) ?? [],
    license: row.license as string,
    isPublished: row.is_published as boolean,
    isDeprecated: row.is_deprecated as boolean,
    installCount: row.install_count as number,
    ratingAverage: row.rating_average as number | null,
    ratingCount: row.rating_count as number,
    isFree: (row.is_free as boolean) ?? true,
    priceCents: (row.price_cents as number | null) ?? null,
    currency: (row.currency as string) ?? 'usd',
    stripePriceId: (row.stripe_price_id as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function rowToDetail(row: Record<string, unknown>): MarketplaceWidgetDetail | null {
  const listing = rowToListing(row);
  const manifestResult = WidgetManifestSchema.safeParse(row.manifest);
  if (manifestResult.success) {
    return {
      ...listing,
      htmlContent: row.html_content as string,
      manifest: manifestResult.data,
    };
  }
  // Fallback: construct a minimal valid manifest from listing data so the
  // detail page can still render even if the stored manifest is V4-era or
  // otherwise malformed.
  const fallbackManifest = WidgetManifestSchema.safeParse({
    id: listing.slug || listing.id,
    name: listing.name,
    version: listing.version || '1.0.0',
    description: listing.description ?? undefined,
    category: listing.category ?? 'other',
    tags: listing.tags,
    license: listing.license ?? 'MIT',
  });
  if (!fallbackManifest.success) return null;
  return {
    ...listing,
    htmlContent: (row.html_content as string) ?? '',
    manifest: fallbackManifest.data,
  };
}

export function rowToReview(row: Record<string, unknown>): WidgetReview {
  return {
    id: row.id as string,
    widgetId: row.widget_id as string,
    userId: row.user_id as string,
    rating: row.rating as number,
    reviewText: row.review_text as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function rowToVersion(row: Record<string, unknown>): WidgetVersion | null {
  const manifestResult = WidgetManifestSchema.safeParse(row.manifest);
  if (!manifestResult.success) return null;
  return {
    id: row.id as string,
    widgetId: row.widget_id as string,
    version: row.version as string,
    htmlContent: row.html_content as string,
    manifest: manifestResult.data,
    changelog: row.changelog as string | null,
    createdAt: row.created_at as string,
  };
}

export function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Date.now().toString(36)
  );
}
