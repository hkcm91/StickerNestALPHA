/**
 * Checkout Integration Handler — proxies commerce calls from widget iframes
 * to the Supabase backend and Stripe edge functions.
 * Widgets call StickerNest.integration('checkout').query/mutate() and the host
 * routes those calls here.
 *
 * @module runtime/integrations
 * @layer L3
 */

import { supabase } from '../../kernel/supabase';

import type { IntegrationHandler } from './integration-proxy';

interface CheckoutQueryParams {
  action: 'tiers' | 'my_subscription' | 'shop_items' | 'my_orders' | 'download';
  canvasId?: string;
  orderId?: string;
}

interface CheckoutMutateParams {
  action: 'subscribe' | 'buy';
  tierId?: string;
  itemId?: string;
}

async function handleCheckoutQuery(
  params: CheckoutQueryParams,
  /** Canvas ID from the widget's host context */
  contextCanvasId?: string,
): Promise<unknown> {
  const canvasId = params.canvasId ?? contextCanvasId;

  switch (params.action) {
    case 'tiers': {
      if (!canvasId) return [];
      const { data } = await supabase
        .from('canvas_subscription_tiers')
        .select('*')
        .eq('canvas_id', canvasId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return data ?? [];
    }

    case 'my_subscription': {
      if (!canvasId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('canvas_subscriptions')
        .select('*')
        .eq('buyer_id', user.id)
        .eq('canvas_id', canvasId)
        .eq('status', 'active')
        .single();
      return data;
    }

    case 'shop_items': {
      if (!canvasId) return [];
      const { data } = await supabase
        .from('shop_items')
        .select('*')
        .eq('canvas_id', canvasId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      return data ?? [];
    }

    case 'my_orders': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let query = supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
      if (canvasId) {
        // Filter orders to items from this canvas — requires a join or metadata
        // For now, return all buyer orders; filtering by canvas can be added later
      }
      const { data } = await query;
      return data ?? [];
    }

    case 'download': {
      if (!params.orderId) return { error: 'orderId required' };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };

      // Verify the user owns this order and it's fulfilled
      const { data: order } = await supabase
        .from('orders')
        .select('*, shop_items!inner(digital_asset_url)')
        .eq('id', params.orderId)
        .eq('buyer_id', user.id)
        .in('status', ['paid', 'fulfilled'])
        .single();

      if (!order) return { error: 'Order not found or not fulfilled' };

      const assetUrl = (order as unknown as { shop_items: { digital_asset_url: string } }).shop_items?.digital_asset_url;
      if (!assetUrl) return { error: 'No digital asset' };

      // Return a signed/proxied URL (in production, this would be a signed Supabase Storage URL)
      return { downloadUrl: assetUrl };
    }

    default:
      throw new Error(`Unknown checkout query action: ${(params as { action: string }).action}`);
  }
}

async function handleCheckoutMutate(
  params: CheckoutMutateParams,
  contextCanvasId?: string,
): Promise<unknown> {
  switch (params.action) {
    case 'subscribe': {
      if (!params.tierId) return { error: 'tierId required' };

      const response = await supabase.functions.invoke('creator-checkout', {
        body: {
          action: 'subscribe',
          tierId: params.tierId,
          canvasId: contextCanvasId,
        },
      });

      if (response.error) {
        return { error: response.error.message };
      }
      return response.data;
    }

    case 'buy': {
      if (!params.itemId) return { error: 'itemId required' };

      const response = await supabase.functions.invoke('creator-checkout', {
        body: {
          action: 'buy',
          itemId: params.itemId,
        },
      });

      if (response.error) {
        return { error: response.error.message };
      }
      return response.data;
    }

    default:
      throw new Error(`Unknown checkout mutate action: ${(params as { action: string }).action}`);
  }
}

/**
 * Creates a checkout integration handler for the widget bridge.
 *
 * @param getCanvasId - Callback that returns the current canvas ID from host context
 */
export function createCheckoutHandler(
  getCanvasId: () => string | null,
): IntegrationHandler {
  return {
    query: (params: unknown) =>
      handleCheckoutQuery(params as CheckoutQueryParams, getCanvasId() ?? undefined),
    mutate: (params: unknown) =>
      handleCheckoutMutate(params as CheckoutMutateParams, getCanvasId() ?? undefined),
  };
}
