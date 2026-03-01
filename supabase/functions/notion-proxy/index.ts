import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Notion Proxy Edge Function
 *
 * Proxies authenticated Notion API requests from widgets.
 * User OAuth tokens are stored securely in the database and never
 * exposed to the client.
 *
 * Supported operations:
 * - query: database.query, database.retrieve, page.retrieve, search, etc.
 * - mutate: page.create, page.update, page.archive, blocks.*, etc.
 */

const NOTION_API_VERSION = "2022-06-28";
const NOTION_API_BASE = "https://api.notion.com/v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface NotionProxyRequest {
  operation: "query" | "mutate";
  type: string;
  params: Record<string, unknown>;
  widgetId?: string;
  instanceId?: string;
}

interface UserIntegration {
  id: string;
  access_token: string;
  status: string;
  provider_data: {
    workspace_id?: string;
    workspace_name?: string;
  } | null;
}

interface WidgetPermission {
  can_read: boolean;
  can_write: boolean;
  allowed_resources: {
    databases?: string[];
    pages?: string[];
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function jsonResponse(
  data: { success: boolean; data?: unknown; error?: string; code?: string },
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function isValidRequest(body: unknown): body is NotionProxyRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    (b.operation === "query" || b.operation === "mutate") &&
    typeof b.type === "string" &&
    typeof b.params === "object" &&
    b.params !== null
  );
}

/**
 * Maps Notion API errors to our error codes.
 */
function mapNotionErrorCode(status: number, notionCode?: string): string {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "internal_error";
  if (notionCode === "validation_error") return "invalid_request";
  return "unknown_error";
}

/**
 * Builds the Notion API URL and method for a given operation type.
 */
function getNotionEndpoint(
  type: string,
  params: Record<string, unknown>,
): { url: string; method: string; body?: Record<string, unknown> } {
  switch (type) {
    // Query operations
    case "search":
      return {
        url: `${NOTION_API_BASE}/search`,
        method: "POST",
        body: {
          query: params.query,
          filter: params.filter,
          sort: params.sort,
          start_cursor: params.start_cursor,
          page_size: params.page_size,
        },
      };

    case "database.query":
      return {
        url: `${NOTION_API_BASE}/databases/${params.database_id}/query`,
        method: "POST",
        body: {
          filter: params.filter,
          sorts: params.sorts,
          start_cursor: params.start_cursor,
          page_size: params.page_size,
        },
      };

    case "database.retrieve":
      return {
        url: `${NOTION_API_BASE}/databases/${params.database_id}`,
        method: "GET",
      };

    case "databases.list":
      return {
        url: `${NOTION_API_BASE}/search`,
        method: "POST",
        body: {
          filter: { property: "object", value: "database" },
          page_size: params.page_size ?? 100,
          start_cursor: params.start_cursor,
        },
      };

    case "page.retrieve":
      return {
        url: `${NOTION_API_BASE}/pages/${params.page_id}`,
        method: "GET",
      };

    case "blocks.children.list":
      return {
        url: `${NOTION_API_BASE}/blocks/${params.block_id}/children`,
        method: "GET",
      };

    // Mutation operations
    case "page.create":
      return {
        url: `${NOTION_API_BASE}/pages`,
        method: "POST",
        body: {
          parent: params.parent,
          properties: params.properties,
          children: params.children,
          icon: params.icon,
          cover: params.cover,
        },
      };

    case "page.update":
      return {
        url: `${NOTION_API_BASE}/pages/${params.page_id}`,
        method: "PATCH",
        body: {
          properties: params.properties,
          icon: params.icon,
          cover: params.cover,
          archived: params.archived,
        },
      };

    case "page.archive":
      return {
        url: `${NOTION_API_BASE}/pages/${params.page_id}`,
        method: "PATCH",
        body: { archived: params.archived ?? true },
      };

    case "blocks.children.append":
      return {
        url: `${NOTION_API_BASE}/blocks/${params.block_id}/children`,
        method: "PATCH",
        body: { children: params.children },
      };

    case "block.update":
      return {
        url: `${NOTION_API_BASE}/blocks/${params.block_id}`,
        method: "PATCH",
        body: params.block,
      };

    case "block.delete":
      return {
        url: `${NOTION_API_BASE}/blocks/${params.block_id}`,
        method: "DELETE",
      };

    default:
      throw new Error(`Unsupported operation type: ${type}`);
  }
}

/**
 * Checks if the widget has permission to access the requested resource.
 */
function checkResourcePermission(
  permission: WidgetPermission,
  operation: "query" | "mutate",
  type: string,
  params: Record<string, unknown>,
): { allowed: boolean; reason?: string } {
  // Check read/write permission
  if (operation === "query" && !permission.can_read) {
    return { allowed: false, reason: "Widget does not have read access" };
  }
  if (operation === "mutate" && !permission.can_write) {
    return { allowed: false, reason: "Widget does not have write access" };
  }

  // If no allowed_resources specified, widget has access to all
  if (!permission.allowed_resources) {
    return { allowed: true };
  }

  const allowedDatabases = permission.allowed_resources.databases ?? [];
  const allowedPages = permission.allowed_resources.pages ?? [];

  // If no restrictions, allow all
  if (allowedDatabases.length === 0 && allowedPages.length === 0) {
    return { allowed: true };
  }

  // Check database access
  if (type === "database.query" || type === "database.retrieve") {
    const dbId = params.database_id as string;
    if (allowedDatabases.length > 0 && !allowedDatabases.includes(dbId)) {
      return {
        allowed: false,
        reason: "Widget does not have access to this database",
      };
    }
  }

  // Check page access for mutations
  if (type === "page.create") {
    const parent = params.parent as { database_id?: string } | undefined;
    if (parent?.database_id) {
      if (
        allowedDatabases.length > 0 &&
        !allowedDatabases.includes(parent.database_id)
      ) {
        return {
          allowed: false,
          reason: "Widget does not have access to create pages in this database",
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Logs API usage for auditing.
 */
async function logUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  integrationId: string,
  operation: string,
  type: string,
  widgetInstanceId?: string,
  success = true,
  errorCode?: string,
): Promise<void> {
  try {
    await supabase.from("integration_usage_log").insert({
      user_id: userId,
      integration_id: integrationId,
      operation: `${operation}:${type}`,
      widget_instance_id: widgetInstanceId,
      success,
      error_code: errorCode,
    });
  } catch {
    // Don't fail the request if logging fails
    console.error("Failed to log usage");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed", code: "method_error" },
      405,
    );
  }

  // Check auth header exists
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(
      { success: false, error: "Unauthorized", code: "unauthorized" },
      401,
    );
  }

  // Create Supabase client with service role for DB access
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error", code: "config_error" },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Verify JWT and get user
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse(
      { success: false, error: "Invalid token", code: "unauthorized" },
      401,
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON body", code: "invalid_request" },
      400,
    );
  }

  if (!isValidRequest(body)) {
    return jsonResponse(
      {
        success: false,
        error: "Invalid request format",
        code: "invalid_request",
      },
      400,
    );
  }

  const { operation, type, params, widgetId, instanceId } = body;

  // Get user's Notion integration
  const { data: integration, error: integrationError } = await supabase
    .from("user_integrations")
    .select("id, access_token, status, provider_data")
    .eq("user_id", user.id)
    .eq("provider", "notion")
    .single();

  if (integrationError || !integration) {
    return jsonResponse(
      {
        success: false,
        error: "Notion is not connected",
        code: "not_connected",
      },
      400,
    );
  }

  const typedIntegration = integration as UserIntegration;

  if (typedIntegration.status !== "active") {
    return jsonResponse(
      {
        success: false,
        error: "Notion connection is inactive",
        code: "unauthorized",
      },
      401,
    );
  }

  // Check widget permissions if widgetId is provided
  if (widgetId) {
    const { data: permission } = await supabase
      .from("widget_integration_permissions")
      .select("can_read, can_write, allowed_resources")
      .eq("user_id", user.id)
      .eq("widget_id", widgetId)
      .eq("integration_id", typedIntegration.id)
      .single();

    if (permission) {
      const typedPermission = permission as WidgetPermission;
      const permCheck = checkResourcePermission(
        typedPermission,
        operation,
        type,
        params,
      );

      if (!permCheck.allowed) {
        await logUsage(
          supabase,
          user.id,
          typedIntegration.id,
          operation,
          type,
          instanceId,
          false,
          "permission_denied",
        );

        return jsonResponse(
          {
            success: false,
            error: permCheck.reason,
            code: "permission_denied",
          },
          403,
        );
      }
    }
    // If no permission record exists, allow access (default open)
  }

  // Build Notion API request
  let endpoint: { url: string; method: string; body?: Record<string, unknown> };
  try {
    endpoint = getNotionEndpoint(type, params);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      { success: false, error: message, code: "invalid_request" },
      400,
    );
  }

  // Make request to Notion API
  try {
    const fetchOptions: RequestInit = {
      method: endpoint.method,
      headers: {
        Authorization: `Bearer ${typedIntegration.access_token}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
    };

    if (endpoint.body && endpoint.method !== "GET") {
      // Remove undefined values from body
      const cleanBody = Object.fromEntries(
        Object.entries(endpoint.body).filter(([, v]) => v !== undefined),
      );
      fetchOptions.body = JSON.stringify(cleanBody);
    }

    const notionRes = await fetch(endpoint.url, fetchOptions);

    if (!notionRes.ok) {
      const errorBody = await notionRes.json().catch(() => ({}));
      const notionCode = errorBody.code as string | undefined;
      const errorCode = mapNotionErrorCode(notionRes.status, notionCode);

      await logUsage(
        supabase,
        user.id,
        typedIntegration.id,
        operation,
        type,
        instanceId,
        false,
        errorCode,
      );

      // If token is invalid, mark integration as expired
      if (notionRes.status === 401) {
        await supabase
          .from("user_integrations")
          .update({ status: "expired" })
          .eq("id", typedIntegration.id);
      }

      return jsonResponse(
        {
          success: false,
          error: errorBody.message || "Notion API error",
          code: errorCode,
        },
        notionRes.status >= 500 ? 502 : notionRes.status,
      );
    }

    const data = await notionRes.json();

    // Log successful usage
    await logUsage(
      supabase,
      user.id,
      typedIntegration.id,
      operation,
      type,
      instanceId,
      true,
    );

    return jsonResponse({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await logUsage(
      supabase,
      user.id,
      typedIntegration.id,
      operation,
      type,
      instanceId,
      false,
      "network_error",
    );

    return jsonResponse(
      { success: false, error: message, code: "network_error" },
      502,
    );
  }
});
