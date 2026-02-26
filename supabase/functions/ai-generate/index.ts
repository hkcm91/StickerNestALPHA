import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

interface AiRequest {
  action: string;
  model: string; // "owner/model-name" or specific version ID
  input: Record<string, unknown>;
}

function isValidRequest(body: unknown): body is AiRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    b.action === "generate-image" &&
    typeof b.model === "string" &&
    b.model.length > 0 &&
    typeof b.input === "object" &&
    b.input !== null
  );
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function pollPrediction(
  id: string,
  token: string,
): Promise<{ output: unknown; id: string; status: string }> {
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const res = await fetch(`${REPLICATE_API_BASE}/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Replicate poll failed (${res.status}): ${text}`);
    }

    const prediction = await res.json();

    if (prediction.status === "succeeded") {
      return {
        output: prediction.output,
        id: prediction.id,
        status: prediction.status,
      };
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(
        prediction.error || `Prediction ${prediction.status}`,
      );
    }

    // Still processing — wait and poll again
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error("Generation timed out after 120 seconds");
}

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed", code: "METHOD_ERROR" },
      405,
    );
  }

  // Check auth header exists (Supabase validates the JWT)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(
      { success: false, error: "Unauthorized", code: "AUTH_ERROR" },
      401,
    );
  }

  // Get API token from secrets
  const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
  if (!replicateToken) {
    return jsonResponse(
      { success: false, error: "AI service not configured on server (REPLICATE_API_TOKEN missing)", code: "CONFIG_ERROR" },
      500,
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON body", code: "INVALID_REQUEST" },
      400,
    );
  }

  if (!isValidRequest(body)) {
    return jsonResponse(
      {
        success: false,
        error:
          'Invalid request: requires { action: "generate-image", model: string, input: object }',
        code: "INVALID_REQUEST",
      },
      400,
    );
  }

  // Create prediction on Replicate
  try {
    const isFullModelPath = body.model.includes("/");
    const url = isFullModelPath 
      ? `${REPLICATE_API_BASE}/models/${body.model}/predictions`
      : `${REPLICATE_API_BASE}/predictions`;

    const createBody = isFullModelPath
      ? { input: body.input }
      : { version: body.model, input: body.input };

    const createRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      return jsonResponse(
        {
          success: false,
          error: `Replicate error: ${errorText}`,
          code: "PROVIDER_ERROR",
        },
        createRes.status,
      );
    }

    const prediction = await createRes.json();

    // If already succeeded (some models return immediately)
    if (prediction.status === "succeeded") {
      return jsonResponse({
        success: true,
        data: {
          output: prediction.output,
          id: prediction.id,
          status: prediction.status,
        },
      });
    }

    // Poll until complete
    const result = await pollPrediction(prediction.id, replicateToken);
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("timed out")) {
      return jsonResponse(
        { success: false, error: message, code: "TIMEOUT" },
        504,
      );
    }

    return jsonResponse(
      { success: false, error: message, code: "GENERATION_FAILED" },
      502,
    );
  }
});
