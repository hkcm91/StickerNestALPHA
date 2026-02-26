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
  action:
    | 'tiers' | 'my_subscription' | 'shop_items' | 'my_orders' | 'download'
    | 'connect_status' | 'my_tiers' | 'my_items' | 'seller_orders';
  canvasId?: string;
  orderId?: string;
}

interface CheckoutMutateParams {
  action:
    | 'subscribe' | 'buy'
    | 'connect_onboard' | 'connect_dashboard'
    | 'create_tier' | 'update_tier' | 'delete_tier'
    | 'create_item' | 'update_item' | 'delete_item';
  tierId?: string;
  itemId?: string;
  data?: Record<string, unknown>;
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
      const query = supabase
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

    // ── Creator management queries ──────────────────────────────────────

    case 'connect_status': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { connected: false, error: 'Not authenticated' };
      const { data } = await supabase
        .from('creator_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (!data) return { connected: false, chargesEnabled: false, payoutsEnabled: false };
      return {
        connected: true,
        chargesEnabled: data.charges_enabled,
        payoutsEnabled: data.payouts_enabled,
        onboardingComplete: data.onboarding_complete,
        stripeAccountId: data.stripe_account_id,
      };
    }

    case 'my_tiers': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('canvas_subscription_tiers')
        .select('*')
        .eq('creator_id', user.id)
        .order('sort_order', { ascending: true });
      return data ?? [];
    }

    case 'my_items': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('shop_items')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    }

    case 'seller_orders': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      return data ?? [];
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

    // ── Creator management mutations ────────────────────────────────────

    case 'connect_onboard': {
      const resp = await supabase.functions.invoke('connect-onboard', {});
      if (resp.error) return { error: resp.error.message };
      return resp.data;
    }

    case 'connect_dashboard': {
      const resp = await supabase.functions.invoke('connect-dashboard', {});
      if (resp.error) return { error: resp.error.message };
      return resp.data;
    }

    case 'create_tier': {
      if (!params.data) return { error: 'data required' };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const { data, error } = await supabase
        .from('canvas_subscription_tiers')
        .insert({
          creator_id: user.id,
          canvas_id: params.data.canvasId ?? contextCanvasId,
          name: params.data.name,
          description: params.data.description ?? null,
          price_cents: params.data.priceCents ?? 0,
          currency: params.data.currency ?? 'usd',
          interval: params.data.interval ?? 'month',
          benefits: params.data.benefits ?? [],
          is_active: true,
          sort_order: params.data.sortOrder ?? 0,
        })
        .select()
        .single();
      if (error) return { error: error.message };
      return data;
    }

    case 'update_tier': {
      if (!params.tierId || !params.data) return { error: 'tierId and data required' };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const updates: Record<string, unknown> = {};
      if (params.data.name !== undefined) updates.name = params.data.name;
      if (params.data.description !== undefined) updates.description = params.data.description;
      if (params.data.priceCents !== undefined) updates.price_cents = params.data.priceCents;
      if (params.data.currency !== undefined) updates.currency = params.data.currency;
      if (params.data.interval !== undefined) updates.interval = params.data.interval;
      if (params.data.benefits !== undefined) updates.benefits = params.data.benefits;
      if (params.data.isActive !== undefined) updates.is_active = params.data.isActive;
      if (params.data.sortOrder !== undefined) updates.sort_order = params.data.sortOrder;
      const { data, error } = await supabase
        .from('canvas_subscription_tiers')
        .update(updates)
        .eq('id', params.tierId)
        .eq('creator_id', user.id)
        .select()
        .single();
      if (error) return { error: error.message };
      return data;
    }

    case 'delete_tier': {
      if (!params.tierId) return { error: 'tierId required' };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const { error } = await supabase
        .from('canvas_subscription_tiers')
        .delete()
        .eq('id', params.tierId)
        .eq('creator_id', user.id);
      if (error) return { error: error.message };
      return { success: true };
    }

    case 'create_item': {
      if (!params.data) return { error: 'data required' };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const { data, error } = await supabase
        .from('shop_items')
        .insert({
          creator_id: user.id,
          canvas_id: params.data.canvasId ?? contextCanvasId,
          name: params.data.name,
          description: params.data.description ?? null,
          price_cents: params.data.priceCents ?? 0,
          currency: params.data.currency ?? 'usd',
          item_type: params.data.itemType ?? 'digital',
          fulfillment: params.data.fulfillment ?? 'auto',
          stock_count: params.data.stockCount ?? null,
          requires_shipping: params.data.requiresShipping ?? false,
          is_active: true,
        })
        .select()
        .single();
      if (error) return { error: error.message };
      return data;
    }

    case 'update_item': {
      if (!params.itemId || !params.data) return { error: 'itemId and data required' };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const updates: Record<string, unknown> = {};
      if (params.data.name !== undefined) updates.name = params.data.name;
      if (params.data.description !== undefined) updates.description = params.data.description;
      if (params.data.priceCents !== undefined) updates.price_cents = params.data.priceCents;
      if (params.data.currency !== undefined) updates.currency = params.data.currency;
      if (params.data.itemType !== undefined) updates.item_type = params.data.itemType;
      if (params.data.fulfillment !== undefined) updates.fulfillment = params.data.fulfillment;
      if (params.data.stockCount !== undefined) updates.stock_count = params.data.stockCount;
      if (params.data.requiresShipping !== undefined) updates.requires_shipping = params.data.requiresShipping;
      if (params.data.isActive !== undefined) updates.is_active = params.data.isActive;
      const { data, error } = await supabase
        .from('shop_items')
        .update(updates)
        .eq('id', params.itemId)
        .eq('creator_id', user.id)
        .select()
        .single();
      if (error) return { error: error.message };
      return data;
    }

    case 'delete_item': {
      if (!params.itemId) return { error: 'itemId required' };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const { error } = await supabase
        .from('shop_items')
        .delete()
        .eq('id', params.itemId)
        .eq('creator_id', user.id);
      if (error) return { error: error.message };
      return { success: true };
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
