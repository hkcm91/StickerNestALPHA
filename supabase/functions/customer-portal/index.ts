import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

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

  try {
    const body = await req.json();
    const { canvasId } = body;

    if (!canvasId) {
      return jsonResponse({ error: "Missing canvasId" }, 400);
    }

    const db = getServiceClient();

    // Look up the user's subscription for this canvas to get the Stripe subscription ID
    const { data: subscription, error: subError } = await db
      .from("canvas_subscriptions")
      .select("*, canvases!inner(owner_id)")
      .eq("buyer_id", user.id)
      .eq("canvas_id", canvasId)
      .single();

    if (subError || !subscription) {
      return jsonResponse({ error: "No subscription found for this canvas" }, 404);
    }

    if (!subscription.stripe_subscription_id) {
      return jsonResponse({ error: "No Stripe subscription associated" }, 400);
    }

    // Get the seller's Connect account
    const sellerId = (subscription as unknown as { canvases: { owner_id: string } }).canvases.owner_id;
    const { data: sellerAccount } = await db
      .from("creator_accounts")
      .select("stripe_connect_account_id")
      .eq("user_id", sellerId)
      .single();

    if (!sellerAccount?.stripe_connect_account_id) {
      return jsonResponse({ error: "Seller Stripe account not found" }, 400);
    }

    // Retrieve the Stripe subscription to get the customer ID
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id,
      { stripeAccount: sellerAccount.stripe_connect_account_id },
    );

    const stripeCustomerId =
      typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id;

    if (!stripeCustomerId) {
      return jsonResponse({ error: "Stripe customer not found" }, 400);
    }

    // Create a billing portal session on the creator's connected account
    const session = await stripe.billingPortal.sessions.create(
      {
        customer: stripeCustomerId,
        return_url: `${SITE_URL}/canvas/${canvasId}`,
      },
      { stripeAccount: sellerAccount.stripe_connect_account_id },
    );

    return jsonResponse({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`customer-portal error: ${message}`);
    return jsonResponse({ error: message }, 500);
  }
});
