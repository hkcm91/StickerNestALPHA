import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

/** Platform fee % by buyer's tier (actually by seller's tier in practice) */
const PLATFORM_FEE_MAP: Record<string, number> = {
  creator: 12,
  pro: 8,
  enterprise: 5,
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": SITE_URL,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "subscribe":
      return handleSubscribe(user, body);
    case "buy":
      return handleBuyItem(user, body);
    default:
      return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  }
});

async function handleSubscribe(
  user: { id: string; email?: string },
  body: { tierId: string; canvasId: string },
) {
  const db = getServiceClient();

  // Fetch the subscription tier
  const { data: tier } = await db
    .from("canvas_subscription_tiers")
    .select("*, canvases!inner(owner_id)")
    .eq("id", body.tierId)
    .single();

  if (!tier) {
    return jsonResponse({ error: "Subscription tier not found" }, 404);
  }

  if (tier.price_cents === 0) {
    // Free tier — just create the subscription directly
    await db.from("canvas_subscriptions").upsert(
      {
        buyer_id: user.id,
        canvas_id: tier.canvas_id,
        tier_id: tier.id,
        status: "active",
      },
      { onConflict: "buyer_id,canvas_id" },
    );
    return jsonResponse({ free: true });
  }

  // Get seller's Connect account
  const sellerId = (tier as unknown as { canvases: { owner_id: string } }).canvases.owner_id;
  const { data: sellerAccount } = await db
    .from("creator_accounts")
    .select("stripe_connect_account_id")
    .eq("user_id", sellerId)
    .single();

  if (!sellerAccount?.stripe_connect_account_id) {
    return jsonResponse({ error: "Seller has not connected Stripe" }, 400);
  }

  // Get seller tier for platform fee
  const { data: sellerUser } = await db
    .from("users")
    .select("tier")
    .eq("id", sellerId)
    .single();

  const platformFee = PLATFORM_FEE_MAP[sellerUser?.tier ?? "creator"] ?? 12;

  // Create Stripe Checkout session on the seller's Connect account
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: tier.interval === "one_time" ? "payment" : "subscription",
    line_items: [
      {
        price_data: {
          currency: tier.currency,
          unit_amount: tier.price_cents,
          product_data: { name: tier.name },
          ...(tier.interval !== "one_time"
            ? { recurring: { interval: tier.interval === "year" ? "year" : "month" } }
            : {}),
        },
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/canvas/${tier.canvas_id}?subscribed=true`,
    cancel_url: `${SITE_URL}/canvas/${tier.canvas_id}?canceled=true`,
    metadata: {
      supabase_buyer_id: user.id,
      seller_id: sellerId,
      tier_id: tier.id,
      canvas_id: tier.canvas_id,
      order_type: "canvas_subscription",
    },
    payment_intent_data:
      tier.interval === "one_time"
        ? { application_fee_amount: Math.round(tier.price_cents * (platformFee / 100)) }
        : undefined,
    subscription_data:
      tier.interval !== "one_time"
        ? { application_fee_percent: platformFee }
        : undefined,
  };

  const session = await stripe.checkout.sessions.create(
    sessionParams,
    { stripeAccount: sellerAccount.stripe_connect_account_id },
  );

  return jsonResponse({ url: session.url });
}

async function handleBuyItem(
  user: { id: string; email?: string },
  body: { itemId: string },
) {
  const db = getServiceClient();

  const { data: item } = await db
    .from("shop_items")
    .select("*")
    .eq("id", body.itemId)
    .eq("is_active", true)
    .single();

  if (!item) {
    return jsonResponse({ error: "Item not found" }, 404);
  }

  // Check stock
  if (item.stock_count !== null && item.stock_count <= 0) {
    return jsonResponse({ error: "Out of stock" }, 400);
  }

  // Get seller's Connect account
  const { data: sellerAccount } = await db
    .from("creator_accounts")
    .select("stripe_connect_account_id")
    .eq("user_id", item.seller_id)
    .single();

  if (!sellerAccount?.stripe_connect_account_id) {
    return jsonResponse({ error: "Seller has not connected Stripe" }, 400);
  }

  // Platform fee
  const { data: sellerUser } = await db
    .from("users")
    .select("tier")
    .eq("id", item.seller_id)
    .single();

  const platformFee = PLATFORM_FEE_MAP[sellerUser?.tier ?? "creator"] ?? 12;
  const feeAmount = Math.round(item.price_cents * (platformFee / 100));

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: item.currency,
          unit_amount: item.price_cents,
          product_data: {
            name: item.name,
            ...(item.thumbnail_url ? { images: [item.thumbnail_url] } : {}),
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: feeAmount,
    },
    success_url: `${SITE_URL}/canvas/${item.canvas_id}?purchased=${item.id}`,
    cancel_url: `${SITE_URL}/canvas/${item.canvas_id}`,
    metadata: {
      supabase_buyer_id: user.id,
      seller_id: item.seller_id,
      item_id: item.id,
      canvas_id: item.canvas_id,
      order_type: "shop_item",
    },
    // Collect shipping address for physical items
    ...(item.requires_shipping
      ? { shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "JP"] } }
      : {}),
  };

  const session = await stripe.checkout.sessions.create(
    sessionParams,
    { stripeAccount: sellerAccount.stripe_connect_account_id },
  );

  return jsonResponse({ url: session.url });
}
