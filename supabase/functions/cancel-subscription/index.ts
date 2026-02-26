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
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return jsonResponse({ error: "Missing subscriptionId" }, 400);
    }

    const db = getServiceClient();

    // Look up the subscription and verify ownership
    const { data: subscription, error: subError } = await db
      .from("canvas_subscriptions")
      .select("*, canvases!inner(owner_id)")
      .eq("id", subscriptionId)
      .single();

    if (subError || !subscription) {
      return jsonResponse({ error: "Subscription not found" }, 404);
    }

    if (subscription.buyer_id !== user.id) {
      return jsonResponse({ error: "Forbidden" }, 403);
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

    // Cancel the Stripe subscription on the creator's connected account
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id, {
      stripeAccount: sellerAccount.stripe_connect_account_id,
    });

    // Update the local subscription record
    await db
      .from("canvas_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", subscriptionId);

    return jsonResponse({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`cancel-subscription error: ${message}`);
    return jsonResponse({ error: message }, 500);
  }
});
