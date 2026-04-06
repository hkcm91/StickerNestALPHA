/**
 * Marketplace operations backed by cloud Supabase.
 *
 * Adapted from src/marketplace/api/ — same Supabase queries but without
 * Vite import.meta.env, @sn/types, or WidgetManifestSchema dependencies.
 * This is a dev tool; pragmatism over purity.
 */

import { supabase } from './supabase-client.js';

// ── Constants ────────────────────────────────────────────────────────────────

const LISTING_COLUMNS =
  'id,name,slug,description,version,author_id,thumbnail_url,icon_url,category,tags,license,is_published,is_deprecated,install_count,rating_average,rating_count,is_free,price_cents,currency,stripe_price_id,metadata,review_status,security_scan,created_at,updated_at';

const MANIFEST_ID_RE = /^[a-z0-9\-_.]+$/i;
const SEMVER_RE = /^\d+\.\d+\.\d+/;
const VALID_CATEGORIES = ['productivity', 'data', 'social', 'utilities', 'games', 'media', 'commerce', 'other'];

// ── Types ────────────────────────────────────────────────────────────────────

interface WidgetListing {
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
  isFree: boolean;
  priceCents: number | null;
  currency: string;
  stripePriceId: string | null;
  metadata: Record<string, unknown>;
  reviewStatus: string;
  securityFlags: number;
  securityScan: unknown;
  createdAt: string;
  updatedAt: string;
}

interface WidgetDetail extends WidgetListing {
  htmlContent: string;
  manifest: Record<string, unknown>;
}

interface WidgetVersion {
  id: string;
  widgetId: string;
  version: string;
  htmlContent: string;
  manifest: Record<string, unknown>;
  changelog: string | null;
  createdAt: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function rowToListing(row: Record<string, unknown>): WidgetListing {
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
    reviewStatus: (row.review_status as string) ?? 'approved',
    securityFlags: Array.isArray((row.security_scan as any)?.flags)
      ? (row.security_scan as any).flags.length
      : 0,
    securityScan: row.security_scan ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToDetail(row: Record<string, unknown>): WidgetDetail {
  return {
    ...rowToListing(row),
    htmlContent: (row.html_content as string) ?? '',
    manifest: (row.manifest as Record<string, unknown>) ?? {},
  };
}

function rowToVersion(row: Record<string, unknown>): WidgetVersion {
  return {
    id: row.id as string,
    widgetId: row.widget_id as string,
    version: row.version as string,
    htmlContent: row.html_content as string,
    manifest: (row.manifest as Record<string, unknown>) ?? {},
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

function validateManifest(manifest: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!manifest.id || !MANIFEST_ID_RE.test(manifest.id as string)) {
    errors.push('manifest.id must be non-empty and match /^[a-z0-9-_.]+$/i');
  }
  if (!manifest.name || (manifest.name as string).length < 1 || (manifest.name as string).length > 50) {
    errors.push('manifest.name must be 1-50 characters');
  }
  if (!manifest.version || !SEMVER_RE.test(manifest.version as string)) {
    errors.push('manifest.version must be valid semver (e.g. 1.0.0)');
  }
  if (manifest.category && !VALID_CATEGORIES.includes(manifest.category as string)) {
    errors.push(`manifest.category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

// ── Operations ───────────────────────────────────────────────────────────────

export async function publish(
  authorId: string,
  htmlContent: string,
  manifest: Record<string, unknown>,
  options?: {
    isFree?: boolean;
    priceCents?: number;
    currency?: string;
    thumbnailUrl?: string;
    iconUrl?: string;
  },
): Promise<WidgetDetail> {
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    throw new Error(`Manifest validation failed: ${validation.errors.join('; ')}`);
  }

  const slug = generateSlug(manifest.name as string);

  const { data, error } = await supabase
    .from('widgets')
    .insert({
      name: manifest.name as string,
      slug,
      description: (manifest.description as string) ?? null,
      version: manifest.version as string,
      author_id: authorId,
      html_content: htmlContent,
      manifest,
      thumbnail_url: options?.thumbnailUrl ?? null,
      icon_url: options?.iconUrl ?? null,
      category: (manifest.category as string) ?? 'other',
      tags: (manifest.tags as string[]) ?? [],
      license: (manifest.license as string) ?? 'MIT',
      is_published: true,
      is_deprecated: false,
      install_count: 0,
      rating_average: null,
      rating_count: 0,
      is_free: options?.isFree ?? true,
      price_cents: options?.priceCents ?? null,
      currency: options?.currency ?? 'usd',
      review_status: 'approved',
      security_scan: null,
      metadata: {},
    })
    .select('*')
    .single();

  if (error) throw new Error(`Publish failed: ${error.message}`);

  // Create initial version entry
  await supabase.from('widget_versions').insert({
    widget_id: data.id,
    version: manifest.version as string,
    html_content: htmlContent,
    manifest,
    changelog: 'Initial release',
  });

  return rowToDetail(data as Record<string, unknown>);
}

export async function list(filter?: {
  category?: string;
  authorId?: string;
  isPublished?: boolean;
  isDeprecated?: boolean;
}): Promise<WidgetListing[]> {
  let q = supabase.from('widgets').select(LISTING_COLUMNS);

  if (filter?.category) q = q.eq('category', filter.category);
  if (filter?.authorId) q = q.eq('author_id', filter.authorId);
  if (filter?.isPublished !== undefined) q = q.eq('is_published', filter.isPublished);
  if (filter?.isDeprecated !== undefined) q = q.eq('is_deprecated', filter.isDeprecated);

  q = q.order('created_at', { ascending: false });

  const { data, error } = await q;
  if (error) throw new Error(`List failed: ${error.message}`);
  return (data ?? []).map((row) => rowToListing(row as Record<string, unknown>));
}

export async function search(params: {
  query?: string;
  category?: string;
  tags?: string[];
  sortBy?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: WidgetListing[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('widgets')
    .select(LISTING_COLUMNS, { count: 'exact' })
    .eq('is_published', true)
    .eq('is_deprecated', false);

  if (params.query) {
    q = q.or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%`);
  }
  if (params.category) {
    q = q.eq('category', params.category);
  }
  if (params.tags?.length) {
    q = q.overlaps('tags', params.tags);
  }

  switch (params.sortBy) {
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

  return { items, total, page, pageSize, hasMore: from + items.length < total };
}

export async function getWidget(widgetId: string): Promise<WidgetDetail | null> {
  const { data, error } = await supabase
    .from('widgets')
    .select('*')
    .eq('id', widgetId)
    .maybeSingle();

  if (error || !data) {
    // Fallback: try matching by slug
    const { data: slugData } = await supabase
      .from('widgets')
      .select('*')
      .eq('slug', widgetId)
      .maybeSingle();
    if (!slugData) return null;
    return rowToDetail(slugData as Record<string, unknown>);
  }
  return rowToDetail(data as Record<string, unknown>);
}

export async function getWidgetBySlug(slug: string): Promise<WidgetDetail | null> {
  const { data, error } = await supabase
    .from('widgets')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return rowToDetail(data as Record<string, unknown>);
}

export async function updateWidget(
  widgetId: string,
  htmlContent: string,
  manifest: Record<string, unknown>,
  changelog?: string,
): Promise<WidgetDetail | null> {
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    throw new Error(`Manifest validation failed: ${validation.errors.join('; ')}`);
  }

  const { data, error } = await supabase
    .from('widgets')
    .update({
      html_content: htmlContent,
      manifest,
      version: manifest.version as string,
      name: manifest.name as string,
      description: (manifest.description as string) ?? null,
      tags: (manifest.tags as string[]) ?? [],
      category: (manifest.category as string) ?? null,
      license: (manifest.license as string) ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', widgetId)
    .select('*')
    .single();

  if (error) throw new Error(`Update failed: ${error.message}`);

  await supabase.from('widget_versions').insert({
    widget_id: widgetId,
    version: manifest.version as string,
    html_content: htmlContent,
    manifest,
    changelog: changelog ?? null,
  });

  return rowToDetail(data as Record<string, unknown>);
}

export async function deprecateWidget(widgetId: string): Promise<boolean> {
  const { error } = await supabase
    .from('widgets')
    .update({ is_deprecated: true, updated_at: new Date().toISOString() })
    .eq('id', widgetId);

  if (error) throw new Error(`Deprecate failed: ${error.message}`);
  return true;
}

export async function deleteWidget(widgetId: string): Promise<boolean> {
  const { error } = await supabase.from('widgets').delete().eq('id', widgetId);
  if (error) throw new Error(`Delete failed: ${error.message}`);
  return true;
}

export async function getPublishedByAuthor(authorId: string): Promise<WidgetListing[]> {
  const { data, error } = await supabase
    .from('widgets')
    .select(LISTING_COLUMNS)
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch author widgets: ${error.message}`);
  return (data ?? []).map((row) => rowToListing(row as Record<string, unknown>));
}

export async function getVersionHistory(widgetId: string): Promise<WidgetVersion[]> {
  const { data, error } = await supabase
    .from('widget_versions')
    .select('*')
    .eq('widget_id', widgetId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch versions: ${error.message}`);
  return (data ?? []).map((row) => rowToVersion(row as Record<string, unknown>));
}

export async function install(
  userId: string,
  widgetId: string,
): Promise<{ htmlContent: string; manifest: Record<string, unknown> } | null> {
  const { data, error } = await supabase
    .from('widgets')
    .select('html_content,manifest')
    .eq('id', widgetId)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) return null;

  // Record installation
  await supabase.from('user_installed_widgets').upsert({
    user_id: userId,
    widget_id: widgetId,
  });

  // Increment install count (best-effort)
  try {
    await supabase.rpc('increment_install_count', { widget_id_input: widgetId });
  } catch {
    // Non-critical — swallow
  }

  return {
    htmlContent: (data as Record<string, unknown>).html_content as string,
    manifest: (data as Record<string, unknown>).manifest as Record<string, unknown>,
  };
}

export async function uninstall(userId: string, widgetId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_installed_widgets')
    .delete()
    .eq('user_id', userId)
    .eq('widget_id', widgetId);

  if (error) throw new Error(`Uninstall failed: ${error.message}`);
  return true;
}

export async function getInstalledWidgets(userId: string): Promise<WidgetListing[]> {
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
    .filter((w): w is WidgetListing => w !== null);
}

export async function stats(): Promise<{
  totalWidgets: number;
  published: number;
  deprecated: number;
  totalInstallations: number;
}> {
  const { count: total } = await supabase
    .from('widgets')
    .select('*', { count: 'exact', head: true });

  const { count: published } = await supabase
    .from('widgets')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true);

  const { count: deprecated } = await supabase
    .from('widgets')
    .select('*', { count: 'exact', head: true })
    .eq('is_deprecated', true);

  const { count: installations } = await supabase
    .from('user_installed_widgets')
    .select('*', { count: 'exact', head: true });

  return {
    totalWidgets: total ?? 0,
    published: published ?? 0,
    deprecated: deprecated ?? 0,
    totalInstallations: installations ?? 0,
  };
}
