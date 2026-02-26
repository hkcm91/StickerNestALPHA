import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const PRICE_MAP: Record<string, string> = {
  creator: Deno.env.get("STRIPE_PRICE_CREATOR") ?? "",
  pro: Deno.env.get("STRIPE_PRICE_PRO") ?? "",
  enterprise: Deno.env.get("STRIPE_PRICE_ENTERPRISE") ?? "",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

  if (!tier || !PRICE_MAP[tier]) {
    return jsonResponse({ error: `Invalid tier: ${tier}` }, 400);
  }

  const priceId = PRICE_MAP[tier];
  if (!priceId) {
    return jsonResponse(
      { error: `Stripe price not configured for tier: ${tier}` },
      500,
    );
  }

  // Check if user already has a Stripe customer ID
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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
});
