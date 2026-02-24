import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Notion OAuth Edge Function
 *
 * Handles OAuth flow for connecting Notion accounts:
 * - GET /notion-oauth?action=authorize - Redirects to Notion OAuth page
 * - GET /notion-oauth?action=callback&code=... - Handles OAuth callback
 * - POST /notion-oauth { action: "disconnect" } - Disconnects Notion account
 * - POST /notion-oauth { action: "status" } - Gets connection status
 */

const NOTION_OAUTH_URL = "https://api.notion.com/v1/oauth/authorize";
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function jsonResponse(
  data: { success: boolean; data?: unknown; error?: string; code?: string },
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function redirectResponse(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth Handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initiates OAuth flow by redirecting to Notion.
 */
function handleAuthorize(
  clientId: string,
  redirectUri: string,
  state: string,
): Response {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
    state,
  });

  return redirectResponse(`${NOTION_OAUTH_URL}?${params.toString()}`);
}

/**
 * Handles OAuth callback from Notion.
 */
async function handleCallback(
  supabase: ReturnType<typeof createClient>,
  code: string,
  state: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  appUrl: string,
): Promise<Response> {
  // Decode state to get user ID
  let userId: string;
  try {
    const decoded = JSON.parse(atob(state));
    userId = decoded.userId;
    if (!userId) throw new Error("Missing userId in state");
  } catch {
    return htmlResponse(
      errorPage("Invalid OAuth state. Please try connecting again.", appUrl),
      400,
    );
  }

  // Exchange code for access token
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const tokenRes = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const error = await tokenRes.text();
    console.error("Notion token exchange failed:", error);
    return htmlResponse(
      errorPage(
        "Failed to connect to Notion. Please try again.",
        appUrl,
      ),
      400,
    );
  }

  const tokenData = await tokenRes.json();

  // Store the integration in database
  const { error: upsertError } = await supabase.from("user_integrations").upsert(
    {
      user_id: userId,
      provider: "notion",
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      status: "active",
      provider_data: {
        workspace_id: tokenData.workspace_id,
        workspace_name: tokenData.workspace_name,
        workspace_icon: tokenData.workspace_icon,
        bot_id: tokenData.bot_id,
        owner: tokenData.owner,
      },
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,provider",
    },
  );

  if (upsertError) {
    console.error("Failed to store integration:", upsertError);
    return htmlResponse(
      errorPage("Failed to save Notion connection. Please try again.", appUrl),
      500,
    );
  }

  // Return success page that closes the popup
  return htmlResponse(successPage(tokenData.workspace_name, appUrl));
}

/**
 * Disconnects user's Notion account.
 */
async function handleDisconnect(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Response> {
  // Revoke the integration (we keep the record but mark as revoked)
  const { error } = await supabase
    .from("user_integrations")
    .update({
      status: "revoked",
      access_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "notion");

  if (error) {
    return jsonResponse(
      { success: false, error: "Failed to disconnect", code: "db_error" },
      500,
    );
  }

  // Also clear any widget permissions
  await supabase
    .from("widget_integration_permissions")
    .delete()
    .eq("user_id", userId)
    .eq("integration_id", (
      await supabase
        .from("user_integrations")
        .select("id")
        .eq("user_id", userId)
        .eq("provider", "notion")
        .single()
    ).data?.id);

  return jsonResponse({ success: true });
}

/**
 * Gets current connection status.
 */
async function handleStatus(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Response> {
  const { data, error } = await supabase
    .from("user_integrations")
    .select("status, provider_data, created_at, updated_at")
    .eq("user_id", userId)
    .eq("provider", "notion")
    .single();

  if (error || !data) {
    return jsonResponse({
      success: true,
      data: { connected: false },
    });
  }

  const providerData = data.provider_data as {
    workspace_name?: string;
    workspace_icon?: string;
  } | null;

  return jsonResponse({
    success: true,
    data: {
      connected: data.status === "active",
      status: data.status,
      workspaceName: providerData?.workspace_name,
      workspaceIcon: providerData?.workspace_icon,
      connectedAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML Templates
// ─────────────────────────────────────────────────────────────────────────────

function successPage(workspaceName: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notion Connected - StickerNest</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    .checkmark {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
    p { margin: 0; opacity: 0.9; }
    .workspace { font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">✓</div>
    <h1>Notion Connected!</h1>
    <p>Successfully connected to <span class="workspace">${escapeHtml(workspaceName)}</span></p>
    <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">This window will close automatically...</p>
  </div>
  <script>
    // Notify parent window and close
    if (window.opener) {
      window.opener.postMessage({ type: 'notion-oauth-success', workspace: '${escapeHtml(workspaceName)}' }, '${appUrl}');
      setTimeout(() => window.close(), 2000);
    } else {
      // If not a popup, redirect to app
      setTimeout(() => window.location.href = '${appUrl}/settings', 2000);
    }
  </script>
</body>
</html>
`;
}

function errorPage(message: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Failed - StickerNest</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 400px;
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
    p { margin: 0; opacity: 0.9; }
    a {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: white;
      color: #c0392b;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
    a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✕</div>
    <h1>Connection Failed</h1>
    <p>${escapeHtml(message)}</p>
    <a href="${appUrl}/settings">Return to Settings</a>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'notion-oauth-error', error: '${escapeHtml(message)}' }, '${appUrl}');
    }
  </script>
</body>
</html>
`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Get required environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const notionClientId = Deno.env.get("NOTION_OAUTH_CLIENT_ID");
  const notionClientSecret = Deno.env.get("NOTION_OAUTH_CLIENT_SECRET");
  const appUrl = Deno.env.get("APP_URL") || "https://stickernest.app";

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error", code: "config_error" },
      500,
    );
  }

  if (!notionClientId || !notionClientSecret) {
    return jsonResponse(
      { success: false, error: "Notion OAuth not configured", code: "config_error" },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const redirectUri = `${supabaseUrl}/functions/v1/notion-oauth`;

  // Handle GET requests (authorize and callback)
  if (req.method === "GET") {
    const action = url.searchParams.get("action");

    // OAuth callback
    if (action === "callback" || url.searchParams.has("code")) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        return htmlResponse(
          errorPage(`Notion authorization was denied: ${error}`, appUrl),
          400,
        );
      }

      if (!code || !state) {
        return htmlResponse(
          errorPage("Invalid OAuth callback parameters.", appUrl),
          400,
        );
      }

      return handleCallback(
        supabase,
        code,
        state,
        notionClientId,
        notionClientSecret,
        redirectUri,
        appUrl,
      );
    }

    // Authorize - initiate OAuth flow
    if (action === "authorize") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return jsonResponse(
          { success: false, error: "Unauthorized", code: "unauthorized" },
          401,
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return jsonResponse(
          { success: false, error: "Invalid token", code: "unauthorized" },
          401,
        );
      }

      // Create state with user ID for callback
      const state = btoa(JSON.stringify({ userId: user.id, ts: Date.now() }));
      return handleAuthorize(notionClientId, redirectUri, state);
    }

    return jsonResponse(
      { success: false, error: "Invalid action", code: "invalid_request" },
      400,
    );
  }

  // Handle POST requests (disconnect, status)
  if (req.method === "POST") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        { success: false, error: "Unauthorized", code: "unauthorized" },
        401,
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse(
        { success: false, error: "Invalid token", code: "unauthorized" },
        401,
      );
    }

    let body: { action?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, error: "Invalid JSON body", code: "invalid_request" },
        400,
      );
    }

    switch (body.action) {
      case "disconnect":
        return handleDisconnect(supabase, user.id);

      case "status":
        return handleStatus(supabase, user.id);

      default:
        return jsonResponse(
          { success: false, error: "Invalid action", code: "invalid_request" },
          400,
        );
    }
  }

  return jsonResponse(
    { success: false, error: "Method not allowed", code: "method_error" },
    405,
  );
});
