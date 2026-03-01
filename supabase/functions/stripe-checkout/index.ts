import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

// Price IDs - if empty or "free", tier is granted without payment
const PRICE_MAP: Record<string, string> = {
  creator: Deno.env.get("STRIPE_PRICE_CREATOR") ?? "",
  pro: Deno.env.get("STRIPE_PRICE_PRO") ?? "",
  enterprise: Deno.env.get("STRIPE_PRICE_ENTERPRISE") ?? "",
};

// Valid tier names
const VALID_TIERS = ["creator", "pro", "enterprise"];

// Only initialize Stripe if we have a key (needed for paid tiers)
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2024-06-20" })
  : null;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Authenticate the request via Supabase JWT
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
    const tier = body.tier as string;

    if (!tier || !VALID_TIERS.includes(tier)) {
      return jsonResponse({ error: `Invalid tier: ${tier}` }, 400);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const priceId = PRICE_MAP[tier];
    const isFree = !priceId || priceId === "free";

    // ─── FREE TIER: Grant immediately without Stripe ───────────────────
    if (isFree) {
      // Update user's tier directly
      const { error: updateError } = await serviceClient
        .from("users")
        .update({ tier })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to update user tier:", updateError.message);
        return jsonResponse({ error: "Failed to update tier" }, 500);
      }

      // Redirect to success page
      return jsonResponse({
        url: `${SITE_URL}/settings?billing=success`,
        free: true
      });
    }

    // ─── PAID TIER: Use Stripe Checkout ────────────────────────────────
    if (!stripe) {
      return jsonResponse(
        { error: "Stripe is not configured. Cannot process paid tiers." },
        500,
      );
    }

    // Check if user already has a Stripe customer ID
    const { data: existingSub } = await serviceClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/settings?billing=success`,
      cancel_url: `${SITE_URL}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          tier,
        },
      },
      metadata: {
        supabase_user_id: user.id,
        tier,
      },
    });

    return jsonResponse({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : "";
    console.error(`stripe-checkout error: ${message}`);
    console.error(`Stack trace: ${stack}`);
    return jsonResponse({ error: message }, 500);
  }
});
