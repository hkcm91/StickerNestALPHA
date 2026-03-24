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
    const { orderId, action, reason } = body as {
      orderId?: string;
      action?: "approve" | "deny";
      reason?: string;
    };

    if (!orderId) {
      return jsonResponse({ error: "Missing orderId" }, 400);
    }

    if (action !== "approve" && action !== "deny") {
      return jsonResponse({ error: "action must be 'approve' or 'deny'" }, 400);
    }

    const db = getServiceClient();

    // Look up the order
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found" }, 404);
    }

    // Verify the authenticated user is the seller
    if (order.seller_id !== user.id) {
      return jsonResponse({ error: "Forbidden — you are not the seller for this order" }, 403);
    }

    // Verify the order is in refund_requested status
    if (order.status !== "refund_requested") {
      return jsonResponse({ error: `Order status is '${order.status}', expected 'refund_requested'` }, 400);
    }

    if (action === "deny") {
      // Restore to previous status (saved in metadata by request-refund) or default to 'paid'
      const previousStatus = order.metadata?.previous_status ?? "paid";

      await db
        .from("orders")
        .update({ status: previousStatus })
        .eq("id", orderId);

      // Log the denial to seller_events
      await db.from("seller_events").insert({
        canvas_id: order.canvas_id,
        event_type: "refund_denied",
        payload: {
          order_id: orderId,
          buyer_id: order.buyer_id,
          reason: reason ?? null,
          amount_cents: order.amount_cents,
        },
      });

      return jsonResponse({ success: true });
    }

    // action === 'approve'

    // Get the seller's Stripe Connect account
    const { data: creatorAccount } = await db
      .from("creator_accounts")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .single();

    if (!creatorAccount?.stripe_account_id) {
      return jsonResponse({ error: "Stripe Connect account not found" }, 400);
    }

    // Issue the Stripe refund on the Connect account
    if (order.stripe_payment_intent_id) {
      await stripe.refunds.create(
        { payment_intent: order.stripe_payment_intent_id },
        { stripeAccount: creatorAccount.stripe_account_id },
      );
    }

    // Update order status to 'refunded'
    await db
      .from("orders")
      .update({ status: "refunded" })
      .eq("id", orderId);

    // Restore stock for shop items
    if (order.item_id) {
      await db.rpc("increment_stock", { item_id: order.item_id, amount: 1 });
    }

    // Log the approval to seller_events
    await db.from("seller_events").insert({
      canvas_id: order.canvas_id,
      event_type: "refund_approved",
      payload: {
        order_id: orderId,
        buyer_id: order.buyer_id,
        amount_cents: order.amount_cents,
        stripe_payment_intent_id: order.stripe_payment_intent_id,
      },
    });

    return jsonResponse({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`process-refund error: ${message}`);
    return jsonResponse({ error: message }, 500);
  }
});
