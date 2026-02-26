import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const CONNECT_WEBHOOK_SECRET = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET")!;

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
      CONNECT_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Connect webhook signature failed: ${message}`);
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
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await handleAccountUpdated(db, account);
      break;
    }
    default:
      console.log(`Unhandled Connect event: ${event.type}`);
  }

  return jsonResponse({ received: true });
});

async function handleAccountUpdated(
  db: ReturnType<typeof createClient>,
  account: Stripe.Account,
) {
  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  const onboardingComplete = chargesEnabled && payoutsEnabled;

  await db
    .from("creator_accounts")
    .update({
      onboarding_complete: onboardingComplete,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      country: account.country,
      default_currency: account.default_currency,
    })
    .eq("stripe_connect_account_id", account.id);
}
