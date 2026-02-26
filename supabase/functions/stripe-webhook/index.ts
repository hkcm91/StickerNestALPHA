import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

/** Map Stripe price IDs back to StickerNest tiers */
const TIER_BY_PRICE: Record<string, string> = {
  [Deno.env.get("STRIPE_PRICE_CREATOR") ?? ""]: "creator",
  [Deno.env.get("STRIPE_PRICE_PRO") ?? ""]: "pro",
  [Deno.env.get("STRIPE_PRICE_ENTERPRISE") ?? ""]: "enterprise",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Service-role Supabase client for writing to protected tables */
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

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  const db = getServiceClient();

  // Idempotency check
  const { data: existing } = await db
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .single();

  if (existing) {
    return jsonResponse({ received: true, deduplicated: true });
  }

  // Log the event for idempotency
  await db.from("stripe_events").insert({ id: event.id, type: event.type });

  // Process events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(db, session);
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(db, subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(db, subscription);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(db, invoice);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(db, invoice);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return jsonResponse({ received: true });
});

async function handleCheckoutComplete(
  db: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.supabase_user_id;
  const tier = session.metadata?.tier;
  if (!userId || !tier) return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!subscriptionId || !customerId) return;

  // Fetch the subscription to get price and period info
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = sub.items.data[0]?.price?.id;

  // Upsert the subscription record
  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      tier,
      status: "active",
      current_period_start: new Date(
        sub.current_period_start * 1000,
      ).toISOString(),
      current_period_end: new Date(
        sub.current_period_end * 1000,
      ).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
    },
    { onConflict: "user_id" },
  );

  // Update the user's tier
  await db.from("users").update({ tier }).eq("id", userId);
}

async function handleSubscriptionUpdated(
  db: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? (TIER_BY_PRICE[priceId] ?? "free") : "free";
  const status = subscription.status === "active" ? "active" : subscription.status;

  await db
    .from("subscriptions")
    .update({
      stripe_price_id: priceId,
      tier,
      status,
      current_period_start: new Date(
        subscription.current_period_start * 1000,
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("stripe_subscription_id", subscription.id);

  // Sync the user tier
  await db.from("users").update({ tier }).eq("id", userId);
}

async function handleSubscriptionDeleted(
  db: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  await db
    .from("subscriptions")
    .update({ status: "canceled", tier: "free" })
    .eq("stripe_subscription_id", subscription.id);

  // Revert user to free tier
  await db.from("users").update({ tier: "free" }).eq("id", userId);
}

async function handlePaymentFailed(
  db: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice,
) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId) return;

  await db
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);
}

async function handleInvoicePaid(
  db: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice,
) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId) return;

  // Restore active status after successful payment
  await db
    .from("subscriptions")
    .update({ status: "active" })
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "past_due");
}
