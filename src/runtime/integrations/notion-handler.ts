/**
 * Notion Integration Handler
 *
 * Proxies Notion API requests from widgets to the `notion-proxy` Supabase
 * Edge Function, which holds user OAuth tokens and makes authenticated calls.
 *
 * Widgets never receive Notion credentials — all calls are proxied through
 * the host and Edge Function.
 *
 * @module runtime/integrations
 * @layer L3
 */

import { NotionMutationSchema, NotionQuerySchema } from '@sn/types';

import { supabase } from '../../kernel/supabase/client';

import type { IntegrationHandler } from './integration-proxy';

/**
 * Response shape from the Notion proxy Edge Function.
 */
interface NotionProxyResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  code?: string;
}

/**
 * Widget instance context passed to the handler.
 */
export interface NotionHandlerContext {
  /** Current user ID */
  userId: string | null;
  /** Widget ID making the request */
  widgetId?: string;
  /** Widget instance ID making the request */
  instanceId?: string;
}

/**
 * Creates a Notion integration handler that proxies requests
 * to the `notion-proxy` Supabase Edge Function.
 *
 * @param getContext - Function that returns the current request context
 */
export function createNotionHandler(
  getContext: () => NotionHandlerContext,
): IntegrationHandler {
  return {
    async query(params: unknown): Promise<unknown> {
      const context = getContext();

      if (!context.userId) {
        throw new Error('Authentication required for Notion integration');
      }

      // Validate the query params against our schema
      const parsed = NotionQuerySchema.safeParse(params);
      if (!parsed.success) {
        throw new Error(
          `Invalid Notion query params: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        );
      }

      const { type, ...queryParams } = parsed.data;

      // Call the Notion proxy Edge Function
      const { data, error } = await supabase.functions.invoke<NotionProxyResponse>(
        'notion-proxy',
        {
          body: {
            operation: 'query',
            type,
            params: queryParams,
            widgetId: context.widgetId,
            instanceId: context.instanceId,
          },
        },
      );

      if (error) {
        throw new Error(`Notion query failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('Notion query returned empty response');
      }

      if (!data.success) {
        // Map Notion API error codes to user-friendly messages
        const errorMessage = mapNotionError(data.error, data.code);
        throw new Error(errorMessage);
      }

      return data.data;
    },

    async mutate(params: unknown): Promise<unknown> {
      const context = getContext();

      if (!context.userId) {
        throw new Error('Authentication required for Notion integration');
      }

      // Validate the mutation params against our schema
      const parsed = NotionMutationSchema.safeParse(params);
      if (!parsed.success) {
        throw new Error(
          `Invalid Notion mutation params: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        );
      }

      const { type, ...mutationParams } = parsed.data;

      // Call the Notion proxy Edge Function
      const { data, error } = await supabase.functions.invoke<NotionProxyResponse>(
        'notion-proxy',
        {
          body: {
            operation: 'mutate',
            type,
            params: mutationParams,
            widgetId: context.widgetId,
            instanceId: context.instanceId,
          },
        },
      );

      if (error) {
        throw new Error(`Notion mutation failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('Notion mutation returned empty response');
      }

      if (!data.success) {
        const errorMessage = mapNotionError(data.error, data.code);
        throw new Error(errorMessage);
      }

      return data.data;
    },
  };
}

/**
 * Maps Notion API error codes to user-friendly messages.
 */
function mapNotionError(error?: string, code?: string): string {
  switch (code) {
    case 'unauthorized':
      return 'Notion connection expired. Please reconnect your Notion account.';
    case 'forbidden':
      return 'This widget does not have permission to access this Notion resource.';
    case 'not_found':
      return 'The requested Notion page or database was not found.';
    case 'rate_limited':
      return 'Too many Notion requests. Please wait a moment and try again.';
    case 'invalid_request':
      return error ?? 'Invalid request to Notion API.';
    case 'conflict':
      return 'Conflict: The Notion resource was modified. Please refresh and try again.';
    case 'internal_error':
      return 'Notion API encountered an error. Please try again.';
    case 'service_unavailable':
      return 'Notion is temporarily unavailable. Please try again later.';
    case 'not_connected':
      return 'Notion is not connected. Please connect your Notion account in settings.';
    case 'permission_denied':
      return 'This widget does not have access to the requested Notion database.';
    default:
      return error ?? 'Unknown Notion error occurred.';
  }
}

/**
 * Row shape from user_integrations table.
 * Defined locally since table doesn't exist in generated types yet.
 */
interface UserIntegrationRow {
  provider_data: {
    workspace_name?: string;
    workspace_icon?: string;
  } | null;
  status: string;
}

/**
 * Row shape from widget_integration_permissions table.
 * Defined locally since table doesn't exist in generated types yet.
 */
interface WidgetPermissionRow {
  can_read: boolean;
  can_write: boolean;
  allowed_resources: {
    databases?: string[];
  } | null;
}

/**
 * Check if user has a connected Notion account.
 * Used for UI to show connection status.
 */
export async function checkNotionConnection(userId: string): Promise<{
  connected: boolean;
  workspaceName?: string;
  workspaceIcon?: string;
}> {
  // Cast to unknown first since table types aren't generated yet
  const { data, error } = (await supabase
    .from('user_integrations')
    .select('provider_data, status')
    .eq('user_id', userId)
    .eq('provider', 'notion')
    .single()) as { data: UserIntegrationRow | null; error: unknown };

  if (error || !data) {
    return { connected: false };
  }

  if (data.status !== 'active') {
    return { connected: false };
  }

  return {
    connected: true,
    workspaceName: data.provider_data?.workspace_name,
    workspaceIcon: data.provider_data?.workspace_icon,
  };
}

/**
 * Get the list of databases the user has granted access to for a widget.
 * Returns empty array if no specific permissions are set (widget has access to all).
 */
export async function getWidgetNotionPermissions(
  userId: string,
  widgetId: string,
): Promise<{
  hasAccess: boolean;
  canWrite: boolean;
  allowedDatabases: string[];
}> {
  // Cast to unknown first since table types aren't generated yet
  const { data, error } = (await supabase
    .from('widget_integration_permissions')
    .select(
      `
      can_read,
      can_write,
      allowed_resources,
      user_integrations!inner(provider, status)
    `,
    )
    .eq('user_id', userId)
    .eq('widget_id', widgetId)
    .eq('user_integrations.provider', 'notion')
    .eq('user_integrations.status', 'active')
    .single()) as { data: WidgetPermissionRow | null; error: unknown };

  if (error || !data) {
    return { hasAccess: false, canWrite: false, allowedDatabases: [] };
  }

  return {
    hasAccess: data.can_read,
    canWrite: data.can_write,
    allowedDatabases: data.allowed_resources?.databases ?? [],
  };
}
