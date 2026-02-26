import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/** 30 days in milliseconds */
const REFUND_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

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
    const { orderId } = body;

    if (!orderId) {
      return jsonResponse({ error: "Missing orderId" }, 400);
    }

    const db = getServiceClient();

    // Look up the order and verify ownership
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found" }, 404);
    }

    if (order.buyer_id !== user.id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // Check the order is within the 30-day refund window
    const orderDate = new Date(order.created_at).getTime();
    const now = Date.now();

    if (now - orderDate > REFUND_WINDOW_MS) {
      return jsonResponse({ error: "Refund window has expired (30 days)" }, 400);
    }

    // Check the order is in a refundable status
    if (order.status === "refund_requested") {
      return jsonResponse({ error: "Refund already requested" }, 400);
    }

    if (order.status === "refunded") {
      return jsonResponse({ error: "Order already refunded" }, 400);
    }

    // Mark the order as refund_requested — seller will review and approve
    await db
      .from("orders")
      .update({ status: "refund_requested" })
      .eq("id", orderId);

    return jsonResponse({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`request-refund error: ${message}`);
    return jsonResponse({ error: message }, 500);
  }
});
