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
    .select('html_content,manifest,is_free,price_cents')
    .eq('id', widgetId)
    .eq('is_published', true)
    .single();

  if (error || !data) throw new Error(`Widget not found or not published`);

  // Verify payment for paid widgets
  const widgetData = data as Record<string, unknown>;
  if (!widgetData.is_free && ((widgetData.price_cents as number) ?? 0) > 0) {
    const { data: purchase } = await supabase
      .from('orders')
      .select('id')
      .eq('buyer_id', userId)
      .eq('item_id', widgetId)
      .in('status', ['paid', 'fulfilled'])
      .maybeSingle();

    if (!purchase) {
      throw new Error('Widget requires purchase. Please complete payment first.');
    }
  }

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

  // Increment install count (best-effort — never block installation)
  try {
    await supabase.rpc('increment_install_count', { widget_id_input: widgetId });
  } catch {
    // RPC may not exist yet — fall back to manual increment
    try {
      const currentCount = ((data as Record<string, unknown>).install_count as number) ?? 0;
      await supabase
        .from('widgets')
        .update({ install_count: currentCount + 1 })
        .eq('id', widgetId);
    } catch {
      // install_count update is non-critical — swallow silently
    }
  }

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
