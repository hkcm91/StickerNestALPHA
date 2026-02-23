/**
 * Marketplace installation — install, uninstall, and list installed widgets
 * Extracted from marketplace-api.ts
 *
 * @module marketplace/api
 * @layer L5
 */

import { WidgetManifestSchema } from '@sn/types';
import type { WidgetManifest } from '@sn/types';

import { supabase } from '../../kernel/supabase';

import { rowToListing, LISTING_COLUMNS } from './mappers';
import type { MarketplaceWidgetListing } from './types';

export async function install(
  userId: string,
  widgetId: string,
): Promise<{ htmlContent: string; manifest: WidgetManifest }> {
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
    return supabase
      .from('widgets')
      .update({ install_count: (data as Record<string, unknown>).install_count as number })
      .eq('id', widgetId);
  });

  return {
    htmlContent: data.html_content,
    manifest: manifestResult.data,
  };
}

export async function uninstall(userId: string, widgetId: string): Promise<void> {
  await supabase
    .from('user_installed_widgets')
    .delete()
    .eq('user_id', userId)
    .eq('widget_id', widgetId);
}

export async function getInstalledWidgets(userId: string): Promise<MarketplaceWidgetListing[]> {
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
}
