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
import type { Database } from '../../kernel/supabase/types';

import type { IntegrationHandler } from './integration-proxy';

type CreatorAccountRow = Database['public']['Tables']['creator_accounts']['Row'];

// ── Nonce infrastructure ────────────────────────────────────────────────────
// Provides one-time-use nonces that widgets can include in mutation calls
// to guard against replay attacks. Opt-in: mutations without a _nonce are
// still accepted for backward compatibility.

const activeNonces = new Set<string>();

/** Generate a cryptographically random nonce and register it for one-time use. */
export function generateNonce(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  activeNonces.add(nonce);
  return nonce;
}

/**
 * Validate and consume a nonce. Returns true if the nonce was valid (present
 * and not yet consumed). Returns true when no nonce is provided (opt-in).
 */
function consumeNonce(nonce: string | undefined): boolean {
  if (nonce === undefined) return true; // opt-in — no nonce supplied is fine
  if (!activeNonces.has(nonce)) return false;
  activeNonces.delete(nonce);
  return true;
}

interface CheckoutQueryParams {
  action:
  | 'tiers' | 'my_subscription' | 'shop_items' | 'my_orders' | 'download'
  | 'connect_status' | 'my_tiers' | 'my_items' | 'seller_orders'
  | 'dashboard_stats' | 'recent_activity';
  canvasId?: string;
  orderId?: string;
  limit?: number;
  offset?: number;
}

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

function clampLimit(raw?: number): number {
  if (raw == null || raw <= 0) return DEFAULT_PAGE_LIMIT;
  return Math.min(raw, MAX_PAGE_LIMIT);
}

function clampOffset(raw?: number): number {
  return raw != null && raw > 0 ? raw : 0;
}

const MAX_NAME_LENGTH = 200;

interface CheckoutMutateParams {
  action:
  | 'subscribe' | 'buy'
  | 'cancel_subscription' | 'customer_portal' | 'request_refund'
  | 'connect_onboard' | 'connect_dashboard'
  | 'create_tier' | 'update_tier' | 'delete_tier'
  | 'create_item' | 'update_item' | 'delete_item';
  tierId?: string;
  itemId?: string;
  subscriptionId?: string;
  orderId?: string;
  data?: Record<string, unknown>;
  /** Revision-based concurrency: the revision the client last read */
  lastSeenRevision?: number;
  /** Optional one-time nonce to prevent replay attacks */
  _nonce?: string;
}


async function handleCheckoutQuery(
  params: CheckoutQueryParams,
  /** Canvas ID from the widget's host context */
  contextCanvasId?: string,
): Promise<unknown> {
  const canvasId = params.canvasId ?? contextCanvasId;
  // Generate a nonce that the widget can attach to its next mutation call
  const _nonce = generateNonce();

  /** Attach the nonce to any query result before returning. */
  function withNonce(result: unknown): unknown {
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      return { ...(result as Record<string, unknown>), _nonce };
    }
    // For array or null/primitive results, wrap in an envelope
    return { data: result, _nonce };
  }

  switch (params.action) {
    case 'tiers': {
      if (!canvasId) return withNonce([]);
      const { data } = await supabase
        .from('canvas_subscription_tiers')
        .select('*')
        .eq('canvas_id', canvasId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return withNonce(data ?? []);
    }

    case 'my_subscription': {
      if (!canvasId) return withNonce(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return withNonce(null);
      const { data } = await supabase
        .from('canvas_subscriptions')
        .select('*')
        .eq('buyer_id', user.id)
        .eq('canvas_id', canvasId)
        .eq('status', 'active')
        .maybeSingle();
      return withNonce(data);
    }

    case 'shop_items': {
      if (!canvasId) return withNonce({ data: [], total: 0, hasMore: false });
      const limit = clampLimit(params.limit);
      const offset = clampOffset(params.offset);
      const { data, count } = await supabase
        .from('shop_items')
        .select('*', { count: 'exact' })
        .eq('canvas_id', canvasId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return withNonce({ data: data ?? [], total: count ?? 0, hasMore: (count ?? 0) > offset + limit });
    }

    case 'my_orders': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return withNonce([]);
      const limit = clampLimit(params.limit);
      const offset = clampOffset(params.offset);
      const { data, count } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return withNonce({ data: data ?? [], total: count ?? 0, hasMore: (count ?? 0) > offset + limit });
    }

    case 'download': {
      if (!params.orderId) return { error: 'orderId required', _nonce };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated', _nonce };

      // Verify the user owns this order and it's fulfilled
      const { data: order } = await supabase
        .from('orders')
        .select('*, shop_items!inner(digital_asset_url)')
        .eq('id', params.orderId)
        .eq('buyer_id', user.id)
        .in('status', ['paid', 'fulfilled'])
        .maybeSingle();

      if (!order) return { error: 'Order not found or not fulfilled', _nonce };

      const assetUrl = (order as unknown as { shop_items: { digital_asset_url: string } }).shop_items?.digital_asset_url;
      if (!assetUrl) return { error: 'No digital asset', _nonce };

      // Return a signed/proxied URL (in production, this would be a signed Supabase Storage URL)
      return { downloadUrl: assetUrl, _nonce };
    }

    // ── Creator management queries ──────────────────────────────────────

    case 'connect_status': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { connected: false, error: 'Not authenticated', _nonce };
      const { data } = (await supabase
        .from('creator_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()) as { data: CreatorAccountRow | null; error: unknown };
      if (!data) return { connected: false, chargesEnabled: false, payoutsEnabled: false, _nonce };
      return {
        connected: true,
        chargesEnabled: data.charges_enabled,
        payoutsEnabled: data.payouts_enabled,
        onboardingComplete: data.onboarding_complete,
        stripeAccountId: data.stripe_account_id,
        _nonce,
      };
    }

    case 'my_tiers': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return withNonce({ data: [], total: 0, hasMore: false });
      const limit = clampLimit(params.limit);
      const offset = clampOffset(params.offset);
      const { data, count } = await supabase
        .from('canvas_subscription_tiers')
        .select('*', { count: 'exact' })
        .eq('creator_id', user.id)
        .order('sort_order', { ascending: true })
        .range(offset, offset + limit - 1);
      return withNonce({ data: data ?? [], total: count ?? 0, hasMore: (count ?? 0) > offset + limit });
    }

    case 'my_items': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return withNonce([]);
      const limit = clampLimit(params.limit);
      const offset = clampOffset(params.offset);
      const { data, count } = await supabase
        .from('shop_items')
        .select('*', { count: 'exact' })
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return withNonce({ data: data ?? [], total: count ?? 0, hasMore: (count ?? 0) > offset + limit });
    }

    case 'seller_orders': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return withNonce([]);
      const limit = clampLimit(params.limit);
      const offset = clampOffset(params.offset);
      const { data, count } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return withNonce({ data: data ?? [], total: count ?? 0, hasMore: (count ?? 0) > offset + limit });
    }

    // ── Creator dashboard queries ───────────────────────────────────────

    case 'dashboard_stats': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return withNonce({ totalRevenue: 0, activeSubscribers: 0, totalOrders: 0 });

      const [revenueResult, subscriberResult, orderCountResult] = await Promise.all([
        supabase
          .from('orders')
          .select('amount_cents')
          .eq('seller_id', user.id)
          .in('status', ['paid', 'fulfilled']),
        supabase
          .from('canvas_subscriptions')
          .select('id', { count: 'exact', head: true })
          .in('canvas_id', (
            await supabase
              .from('canvases')
              .select('id')
              .eq('owner_id', user.id)
          ).data?.map((c: { id: string }) => c.id) ?? [])
          .eq('status', 'active'),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', user.id),
      ]);

      const totalRevenue = ((revenueResult.data ?? []) as unknown as Array<{ amount_cents: number }>).reduce(
        (sum, row) => sum + (row.amount_cents ?? 0),
        0,
      );
      const activeSubscribers = subscriberResult.count ?? 0;
      const totalOrders = orderCountResult.count ?? 0;

      return withNonce({ totalRevenue, activeSubscribers, totalOrders });
    }

    case 'recent_activity': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return withNonce([]);
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return withNonce(data ?? []);
    }

    default:
      throw new Error(`Unknown checkout query action: ${(params as { action: string }).action}`);
  }
}

async function handleCheckoutMutate(
  params: CheckoutMutateParams,
  contextCanvasId?: string,
): Promise<unknown> {
  // Validate nonce if provided (opt-in replay protection)
  if (!consumeNonce(params._nonce)) {
    return { error: 'Invalid or already-used nonce. Please refresh and try again.' };
  }

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

    case 'cancel_subscription': {
      if (!params.subscriptionId) return { error: 'subscriptionId required' };
      const { data: { user: cancelUser } } = await supabase.auth.getUser();
      if (!cancelUser) return { error: 'Not authenticated' };

      // Verify the authenticated user owns this subscription
      const { data: sub } = await supabase
        .from('canvas_subscriptions')
        .select('id')
        .eq('id', params.subscriptionId)
        .eq('buyer_id', cancelUser.id)
        .maybeSingle();

      if (!sub) return { error: 'Subscription not found or not owned by you' };

      const { error: cancelError } = await supabase
        .from('canvas_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', params.subscriptionId)
        .eq('buyer_id', cancelUser.id);

      if (cancelError) return { error: cancelError.message };
      return { success: true };
    }

    case 'customer_portal': {
      const { data: { user: portalUser } } = await supabase.auth.getUser();
      if (!portalUser) return { error: 'Not authenticated' };

      const resp = await supabase.functions.invoke('customer-portal', {
        body: { userId: portalUser.id },
      });

      if (resp.error) return { error: resp.error.message };
      return resp.data;
    }

    case 'request_refund': {
      if (!params.orderId) return { error: 'orderId required' };

      // Delegate to the request-refund edge function which owns all
      // validation: ownership, 30-day window, status checks, dedup.
      const resp = await supabase.functions.invoke('request-refund', {
        body: { orderId: params.orderId },
      });

      if (resp.error) return { error: resp.error.message };
      const body = resp.data as Record<string, unknown> | null;
      if (body?.error) return { error: String(body.error) };
      return { success: true };
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

      const canvasId = (params.data.canvasId ?? contextCanvasId) as string | undefined;
      if (!canvasId) return { error: 'canvasId required' };

      // Validate name
      const tierName = String(params.data.name ?? '').trim();
      if (!tierName) return { error: 'name is required' };
      if (tierName.length > MAX_NAME_LENGTH) return { error: `name must be ${MAX_NAME_LENGTH} characters or fewer` };

      // Validate price
      const priceCents = Number(params.data.priceCents ?? 0);
      if (!Number.isFinite(priceCents) || priceCents < 0) return { error: 'priceCents must be a non-negative number' };

      // Verify canvas ownership
      const { data: canvas } = await supabase
        .from('canvases')
        .select('id')
        .eq('id', canvasId)
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!canvas) return { error: 'Canvas not found or you are not the owner' };

      const { data, error } = (await supabase
        .from('canvas_subscription_tiers')
        .insert({
          creator_id: user.id,
          canvas_id: canvasId,
          name: tierName,
          description: params.data.description ?? null,
          price_cents: priceCents,
          currency: params.data.currency ?? 'usd',
          interval: params.data.interval ?? 'month',
          benefits: params.data.benefits ?? [],
          is_active: true,
          sort_order: params.data.sortOrder ?? 0,
        } as any)
        .select()
        .single()) as { data: Record<string, unknown> | null; error: { message: string } | null };
      if (error) return { error: error.message };
      return data;
    }

    case 'update_tier': {
      if (!params.tierId || !params.data) return { error: 'tierId and data required' };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const updates: Record<string, unknown> = {};
      if (params.data.name !== undefined) {
        const name = String(params.data.name).trim();
        if (!name) return { error: 'name cannot be empty' };
        if (name.length > MAX_NAME_LENGTH) return { error: `name must be ${MAX_NAME_LENGTH} characters or fewer` };
        updates.name = name;
      }
      if (params.data.description !== undefined) updates.description = params.data.description;
      if (params.data.priceCents !== undefined) {
        const pc = Number(params.data.priceCents);
        if (!Number.isFinite(pc) || pc < 0) return { error: 'priceCents must be a non-negative number' };
        updates.price_cents = pc;
      }
      if (params.data.currency !== undefined) updates.currency = params.data.currency;
      if (params.data.interval !== undefined) updates.interval = params.data.interval;
      if (params.data.benefits !== undefined) updates.benefits = params.data.benefits;
      if (params.data.isActive !== undefined) updates.is_active = params.data.isActive;
      if (params.data.sortOrder !== undefined) updates.sort_order = params.data.sortOrder;

      // Build the query with ownership check
      let query = supabase
        .from('canvas_subscription_tiers')
        .update(updates)
        .eq('id', params.tierId)
        .eq('creator_id', user.id);

      // Revision-based concurrency: if the client provides lastSeenRevision,
      // only update if the row's current revision matches (optimistic lock).
      if (params.lastSeenRevision !== undefined) {
        query = query.eq('revision', params.lastSeenRevision);
      }

      const { data, error } = await query.select();
      if (error) return { error: error.message };

      // If revision filtering was active and no rows matched, it means the
      // tier was modified by someone else since the client last read it.
      if (params.lastSeenRevision !== undefined && (!data || data.length === 0)) {
        return { error: 'This tier was modified by someone else. Please refresh and try again.' };
      }

      return data?.[0] ?? null;
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

      const canvasId = (params.data.canvasId ?? contextCanvasId) as string | undefined;
      if (!canvasId) return { error: 'canvasId required' };

      // Validate name
      const itemName = String(params.data.name ?? '').trim();
      if (!itemName) return { error: 'name is required' };
      if (itemName.length > MAX_NAME_LENGTH) return { error: `name must be ${MAX_NAME_LENGTH} characters or fewer` };

      // Validate price
      const priceCents = Number(params.data.priceCents ?? 0);
      if (!Number.isFinite(priceCents) || priceCents < 0) return { error: 'priceCents must be a non-negative number' };

      // Verify canvas ownership
      const { data: canvas } = await supabase
        .from('canvases')
        .select('id')
        .eq('id', canvasId)
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!canvas) return { error: 'Canvas not found or you are not the owner' };

      const { data, error } = (await supabase
        .from('shop_items')
        .insert({
          seller_id: user.id,
          canvas_id: canvasId,
          name: itemName,
          description: params.data.description ?? null,
          price_cents: priceCents,
          currency: params.data.currency ?? 'usd',
          item_type: params.data.itemType ?? 'digital',
          fulfillment: params.data.fulfillment ?? 'auto',
          stock_count: params.data.stockCount ?? null,
          requires_shipping: params.data.requiresShipping ?? false,
          is_active: true,
        } as any)
        .select()
        .single()) as { data: Record<string, unknown> | null; error: { message: string } | null };
      if (error) return { error: error.message };
      return data;
    }

    case 'update_item': {
      if (!params.itemId || !params.data) return { error: 'itemId and data required' };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const updates: Record<string, unknown> = {};
      if (params.data.name !== undefined) {
        const name = String(params.data.name).trim();
        if (!name) return { error: 'name cannot be empty' };
        if (name.length > MAX_NAME_LENGTH) return { error: `name must be ${MAX_NAME_LENGTH} characters or fewer` };
        updates.name = name;
      }
      if (params.data.description !== undefined) updates.description = params.data.description;
      if (params.data.priceCents !== undefined) {
        const pc = Number(params.data.priceCents);
        if (!Number.isFinite(pc) || pc < 0) return { error: 'priceCents must be a non-negative number' };
        updates.price_cents = pc;
      }
      if (params.data.currency !== undefined) updates.currency = params.data.currency;
      if (params.data.itemType !== undefined) updates.item_type = params.data.itemType;
      if (params.data.fulfillment !== undefined) updates.fulfillment = params.data.fulfillment;
      if (params.data.stockCount !== undefined) updates.stock_count = params.data.stockCount;
      if (params.data.requiresShipping !== undefined) updates.requires_shipping = params.data.requiresShipping;
      if (params.data.isActive !== undefined) updates.is_active = params.data.isActive;

      // Build the query with ownership check
      let query = supabase
        .from('shop_items')
        .update(updates)
        .eq('id', params.itemId)
        .eq('seller_id', user.id);

      // Revision-based concurrency: if the client provides lastSeenRevision,
      // only update if the row's current revision matches (optimistic lock).
      if (params.lastSeenRevision !== undefined) {
        query = query.eq('revision', params.lastSeenRevision);
      }

      const { data, error } = await query.select();
      if (error) return { error: error.message };

      // If revision filtering was active and no rows matched, it means the
      // item was modified by someone else since the client last read it.
      if (params.lastSeenRevision !== undefined && (!data || data.length === 0)) {
        return { error: 'This item was modified by someone else. Please refresh and try again.' };
      }

      return data?.[0] ?? null;
    }

    case 'delete_item': {
      if (!params.itemId) return { error: 'itemId required' };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const { error } = await supabase
        .from('shop_items')
        .delete()
        .eq('id', params.itemId)
        .eq('seller_id', user.id);
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
