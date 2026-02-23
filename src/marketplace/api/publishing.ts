/**
 * Marketplace publishing — publish, update, deprecate, delete widgets
 * Extracted from marketplace-api.ts
 *
 * @module marketplace/api
 * @layer L5
 */

import type { WidgetManifest } from '@sn/types';

import { supabase } from '../../kernel/supabase';
import type { Json } from '../../kernel/supabase/types';

import { rowToListing, rowToVersion, generateSlug, LISTING_COLUMNS } from './mappers';
import type { MarketplaceWidgetListing, WidgetVersion } from './types';

export async function publish(
  authorId: string,
  html: string,
  manifest: WidgetManifest,
  thumbnail: Blob | null,
): Promise<{ widgetId: string }> {
  let thumbnailUrl: string | null = null;

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

  await supabase.from('widget_versions').insert({
    widget_id: data.id,
    version: manifest.version,
    html_content: html,
    manifest: manifest as unknown as Json,
    changelog: 'Initial release',
  });

  return { widgetId: data.id };
}

export async function updateWidget(
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

  const { error: versionError } = await supabase.from('widget_versions').insert({
    widget_id: widgetId,
    version: manifest.version,
    html_content: html,
    manifest: manifest as unknown as Json,
    changelog: changelog ?? null,
  });

  if (versionError) throw new Error(`Version creation failed: ${versionError.message}`);
}

export async function deprecateWidget(widgetId: string): Promise<void> {
  const { error } = await supabase
    .from('widgets')
    .update({ is_deprecated: true, updated_at: new Date().toISOString() })
    .eq('id', widgetId);

  if (error) throw new Error(`Deprecate failed: ${error.message}`);
}

export async function deleteWidget(widgetId: string): Promise<void> {
  const { error } = await supabase.from('widgets').delete().eq('id', widgetId);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

export async function getPublishedByAuthor(authorId: string): Promise<MarketplaceWidgetListing[]> {
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
  return (data ?? [])
    .map((row) => rowToVersion(row as Record<string, unknown>))
    .filter((v): v is WidgetVersion => v !== null);
}
