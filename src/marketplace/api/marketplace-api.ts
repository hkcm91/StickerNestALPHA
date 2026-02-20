/**
 * Marketplace API — Core Supabase data access layer
 *
 * All marketplace database operations go through this module.
 * Handles widget listings, installs, publishing, and reviews.
 *
 * @module marketplace/api
 * @layer L5
 * @see .claude/rules/L5-marketplace.md
 */

import { WidgetManifestSchema } from '@sn/types';
import type { WidgetManifest } from '@sn/types';

import { supabase } from '../../kernel/supabase';
import type { Json } from '../../kernel/supabase/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Row mapping helpers
// ---------------------------------------------------------------------------

function rowToListing(row: Record<string, unknown>): MarketplaceWidgetListing {
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
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToDetail(row: Record<string, unknown>): MarketplaceWidgetDetail | null {
  const listing = rowToListing(row);
  const manifestResult = WidgetManifestSchema.safeParse(row.manifest);
  if (!manifestResult.success) return null;
  return {
    ...listing,
    htmlContent: row.html_content as string,
    manifest: manifestResult.data,
  };
}

function rowToReview(row: Record<string, unknown>): WidgetReview {
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

function rowToVersion(row: Record<string, unknown>): WidgetVersion | null {
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

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Date.now().toString(36)
  );
}

// ---------------------------------------------------------------------------
// Listing columns (no html_content for list queries)
// ---------------------------------------------------------------------------

const LISTING_COLUMNS =
  'id,name,slug,description,version,author_id,thumbnail_url,icon_url,category,tags,license,is_published,is_deprecated,install_count,rating_average,rating_count,created_at,updated_at';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMarketplaceAPI(): MarketplaceAPI {
  return {
    async search(params: SearchParams): Promise<PaginatedResult<MarketplaceWidgetListing>> {
      const { page, pageSize, query, category, sortBy } = params;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from('widgets')
        .select(LISTING_COLUMNS, { count: 'exact' })
        .eq('is_published', true);

      if (query) {
        q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      }
      if (category) {
        q = q.eq('category', category);
      }
      if (params.tags && params.tags.length > 0) {
        q = q.overlaps('tags', params.tags);
      }

      switch (sortBy) {
        case 'rating':
          q = q.order('rating_average', { ascending: false, nullsFirst: false });
          break;
        case 'installs':
          q = q.order('install_count', { ascending: false });
          break;
        case 'newest':
        default:
          q = q.order('created_at', { ascending: false });
          break;
      }

      q = q.range(from, to);

      const { data, error, count } = await q;
      if (error) throw new Error(`Search failed: ${error.message}`);

      const total = count ?? 0;
      const items = (data ?? []).map((row) => rowToListing(row as Record<string, unknown>));

      return {
        items,
        total,
        page,
        pageSize,
        hasMore: from + items.length < total,
      };
    },

    async getFeatured(): Promise<MarketplaceWidgetListing[]> {
      const { data, error } = await supabase
        .from('widgets')
        .select(LISTING_COLUMNS)
        .eq('is_published', true)
        .eq('is_deprecated', false)
        .order('rating_average', { ascending: false, nullsFirst: false })
        .limit(12);

      if (error) throw new Error(`Failed to fetch featured: ${error.message}`);
      return (data ?? []).map((row) => rowToListing(row as Record<string, unknown>));
    },

    async getWidget(widgetId: string): Promise<MarketplaceWidgetDetail | null> {
      const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('id', widgetId)
        .single();

      if (error) return null;
      return rowToDetail(data as Record<string, unknown>);
    },

    async getWidgetBySlug(slug: string): Promise<MarketplaceWidgetDetail | null> {
      const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) return null;
      return rowToDetail(data as Record<string, unknown>);
    },

    async install(
      userId: string,
      widgetId: string,
    ): Promise<{ htmlContent: string; manifest: WidgetManifest }> {
      // Fetch widget detail
      const { data, error } = await supabase
        .from('widgets')
        .select('html_content,manifest')
        .eq('id', widgetId)
        .eq('is_published', true)
        .single();

      if (error || !data) throw new Error(`Widget not found or not published`);

      const manifestResult = WidgetManifestSchema.safeParse(data.manifest);
      if (!manifestResult.success) {
        throw new Error(
          `Invalid manifest: ${manifestResult.error.issues.map((i) => i.message).join(', ')}`,
        );
      }

      // Record installation
      await supabase.from('user_installed_widgets').upsert({
        user_id: userId,
        widget_id: widgetId,
      });

      // Increment install count
      await supabase.rpc('increment_install_count', { widget_id_input: widgetId }).catch(() => {
        // RPC may not exist; fall back to manual increment
        return supabase
          .from('widgets')
          .update({ install_count: (data as Record<string, unknown>).install_count as number })
          .eq('id', widgetId);
      });

      return {
        htmlContent: data.html_content,
        manifest: manifestResult.data,
      };
    },

    async uninstall(userId: string, widgetId: string): Promise<void> {
      await supabase
        .from('user_installed_widgets')
        .delete()
        .eq('user_id', userId)
        .eq('widget_id', widgetId);
    },

    async getInstalledWidgets(userId: string): Promise<MarketplaceWidgetListing[]> {
      const { data, error } = await supabase
        .from('user_installed_widgets')
        .select(`widget_id, widgets(${LISTING_COLUMNS})`)
        .eq('user_id', userId);

      if (error) throw new Error(`Failed to get installed widgets: ${error.message}`);

      return (data ?? [])
        .map((row) => {
          const widget = (row as Record<string, unknown>).widgets;
          if (!widget) return null;
          return rowToListing(widget as Record<string, unknown>);
        })
        .filter((w): w is MarketplaceWidgetListing => w !== null);
    },

    async publish(
      authorId: string,
      html: string,
      manifest: WidgetManifest,
      thumbnail: Blob | null,
    ): Promise<{ widgetId: string }> {
      let thumbnailUrl: string | null = null;

      // Upload thumbnail if provided
      if (thumbnail) {
        const fileName = `widgets/${manifest.id}/thumbnail-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('widget-assets')
          .upload(fileName, thumbnail, { contentType: 'image/png', upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('widget-assets')
            .getPublicUrl(fileName);
          thumbnailUrl = urlData.publicUrl;
        }
      }

      const slug = generateSlug(manifest.name);

      const { data, error } = await supabase
        .from('widgets')
        .insert({
          name: manifest.name,
          slug,
          description: manifest.description ?? null,
          version: manifest.version,
          author_id: authorId,
          html_content: html,
          manifest: manifest as unknown as Json,
          thumbnail_url: thumbnailUrl,
          icon_url: null,
          category: manifest.category ?? null,
          tags: manifest.tags ?? [],
          license: manifest.license ?? 'MIT',
          is_published: true,
          is_deprecated: false,
          install_count: 0,
          rating_average: null,
          rating_count: 0,
          metadata: {},
        })
        .select('id')
        .single();

      if (error) throw new Error(`Publish failed: ${error.message}`);

      // Create initial version entry
      await supabase.from('widget_versions').insert({
        widget_id: data.id,
        version: manifest.version,
        html_content: html,
        manifest: manifest as unknown as Json,
        changelog: 'Initial release',
      });

      return { widgetId: data.id };
    },

    async updateWidget(
      widgetId: string,
      html: string,
      manifest: WidgetManifest,
      changelog?: string,
    ): Promise<void> {
      const { error: updateError } = await supabase
        .from('widgets')
        .update({
          html_content: html,
          manifest: manifest as unknown as Json,
          version: manifest.version,
          updated_at: new Date().toISOString(),
        })
        .eq('id', widgetId);

      if (updateError) throw new Error(`Update failed: ${updateError.message}`);

      // Create new version entry
      const { error: versionError } = await supabase.from('widget_versions').insert({
        widget_id: widgetId,
        version: manifest.version,
        html_content: html,
        manifest: manifest as unknown as Json,
        changelog: changelog ?? null,
      });

      if (versionError) throw new Error(`Version creation failed: ${versionError.message}`);
    },

    async deprecateWidget(widgetId: string): Promise<void> {
      const { error } = await supabase
        .from('widgets')
        .update({ is_deprecated: true, updated_at: new Date().toISOString() })
        .eq('id', widgetId);

      if (error) throw new Error(`Deprecate failed: ${error.message}`);
    },

    async deleteWidget(widgetId: string): Promise<void> {
      const { error } = await supabase.from('widgets').delete().eq('id', widgetId);

      if (error) throw new Error(`Delete failed: ${error.message}`);
    },

    async getPublishedByAuthor(authorId: string): Promise<MarketplaceWidgetListing[]> {
      const { data, error } = await supabase
        .from('widgets')
        .select(LISTING_COLUMNS)
        .eq('author_id', authorId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Failed to fetch author widgets: ${error.message}`);
      return (data ?? []).map((row) => rowToListing(row as Record<string, unknown>));
    },

    async getVersionHistory(widgetId: string): Promise<WidgetVersion[]> {
      const { data, error } = await supabase
        .from('widget_versions')
        .select('*')
        .eq('widget_id', widgetId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Failed to fetch versions: ${error.message}`);
      return (data ?? [])
        .map((row) => rowToVersion(row as Record<string, unknown>))
        .filter((v): v is WidgetVersion => v !== null);
    },

    async getReviews(
      widgetId: string,
      page: number,
      pageSize: number,
    ): Promise<PaginatedResult<WidgetReview>> {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('widget_reviews')
        .select('*', { count: 'exact' })
        .eq('widget_id', widgetId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);

      const total = count ?? 0;
      const items = (data ?? []).map((row) => rowToReview(row as Record<string, unknown>));

      return {
        items,
        total,
        page,
        pageSize,
        hasMore: from + items.length < total,
      };
    },

    async addReview(
      widgetId: string,
      userId: string,
      rating: number,
      text?: string,
    ): Promise<void> {
      const { error } = await supabase.from('widget_reviews').insert({
        widget_id: widgetId,
        user_id: userId,
        rating,
        review_text: text ?? null,
      });

      if (error) throw new Error(`Failed to add review: ${error.message}`);
    },

    async updateReview(
      widgetId: string,
      userId: string,
      rating: number,
      text?: string,
    ): Promise<void> {
      const { error } = await supabase
        .from('widget_reviews')
        .update({
          rating,
          review_text: text ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('widget_id', widgetId)
        .eq('user_id', userId);

      if (error) throw new Error(`Failed to update review: ${error.message}`);
    },

    async deleteReview(widgetId: string, userId: string): Promise<void> {
      const { error } = await supabase
        .from('widget_reviews')
        .delete()
        .eq('widget_id', widgetId)
        .eq('user_id', userId);

      if (error) throw new Error(`Failed to delete review: ${error.message}`);
    },
  };
}
