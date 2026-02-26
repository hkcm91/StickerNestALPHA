import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const CREATOR_WEBHOOK_SECRET = Deno.env.get("STRIPE_CREATOR_WEBHOOK_SECRET")!;

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
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ error: "Missing stripe-signature header" }, 400);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      CREATOR_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Creator webhook signature failed: ${message}`);
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  const db = getServiceClient();

  // Idempotency
  const { data: existing } = await db
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .single();

  if (existing) {
    return jsonResponse({ received: true, deduplicated: true });
  }

  await db.from("stripe_events").insert({ id: event.id, type: event.type });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCreatorCheckoutComplete(db, session);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleCreatorSubscriptionDeleted(db, subscription);
      break;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      await handleDisputeCreated(db, dispute);
      break;
    }
    default:
      console.log(`Unhandled creator event: ${event.type}`);
  }

  return jsonResponse({ received: true });
});

async function handleCreatorCheckoutComplete(
  db: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
) {
  const meta = session.metadata ?? {};
  const buyerId = meta.supabase_buyer_id;
  const sellerId = meta.seller_id;
  const orderType = meta.order_type;
  const canvasId = meta.canvas_id;

  if (!buyerId || !sellerId || !orderType) return;

  const amountTotal = session.amount_total ?? 0;
  // Stripe reports the application fee in the payment intent
  const platformFeeCents = Math.round(amountTotal * 0.12); // approximate; exact comes from Stripe fee

  // Create the order record
  await db.from("orders").insert({
    buyer_id: buyerId,
    seller_id: sellerId,
    order_type: orderType,
    item_id: meta.tier_id ?? meta.item_id,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    amount_cents: amountTotal,
    currency: session.currency ?? "usd",
    platform_fee_cents: platformFeeCents,
    status: "paid",
    shipping_address: session.shipping_details?.address
      ? JSON.stringify(session.shipping_details.address)
      : null,
  });

  // Handle canvas subscription specifically
  if (orderType === "canvas_subscription" && meta.tier_id && canvasId) {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    await db.from("canvas_subscriptions").upsert(
      {
        buyer_id: buyerId,
        canvas_id: canvasId,
        tier_id: meta.tier_id,
        stripe_subscription_id: subscriptionId,
        status: "active",
      },
      { onConflict: "buyer_id,canvas_id" },
    );

    // Grant the canvas role from the tier
    const { data: tier } = await db
      .from("canvas_subscription_tiers")
      .select("canvas_role")
      .eq("id", meta.tier_id)
      .single();

    if (tier?.canvas_role) {
      await db.from("canvas_members").upsert(
        {
          canvas_id: canvasId,
          user_id: buyerId,
          role: tier.canvas_role,
        },
        { onConflict: "canvas_id,user_id" },
      );
    }
  }

  // Handle shop item — fulfill digital instantly
  if (orderType === "shop_item" && meta.item_id) {
    const { data: item } = await db
      .from("shop_items")
      .select("item_type, stock_count")
      .eq("id", meta.item_id)
      .single();

    if (item?.item_type === "digital") {
      // Mark as fulfilled immediately
      await db
        .from("orders")
        .update({ status: "fulfilled" })
        .eq("stripe_checkout_session_id", session.id);
    }

    // Decrement stock
    if (item?.stock_count !== null) {
      await db.rpc("decrement_stock", { item_id: meta.item_id });
    }
  }
}

async function handleCreatorSubscriptionDeleted(
  db: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
) {
  // Revoke the canvas subscription and downgrade role
  await db
    .from("canvas_subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleDisputeCreated(
  db: ReturnType<typeof createClient>,
  dispute: Stripe.Dispute,
) {
  const paymentIntentId =
    typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

  if (!paymentIntentId) return;

  await db
    .from("orders")
    .update({ status: "disputed" })
    .eq("stripe_payment_intent_id", paymentIntentId);
}
