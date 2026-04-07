/**
 * WidgetEmbedPage — renders a single widget for iframe embedding on external sites.
 *
 * - No GlobalNav, sidebar, or shell chrome
 * - Token-based authentication via embed_tokens table
 * - Full SDK support: DataSource, integrations, state persistence
 * - Setup flow for first-time Notion connection
 *
 * Route: /w/:token
 *
 * @module shell/pages
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { validateEmbedToken } from '../../kernel/auth';
import { listNotionDatabases, importNotionDatabase } from '../../kernel/datasource';
import type { NotionDatabaseSummary } from '../../kernel/datasource';
import type { WidgetManifest } from '../../kernel/schemas';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';
import { supabase } from '../../kernel/supabase';
import type { ThemeTokens } from '../../runtime/bridge/message-types';
import { initRuntime } from '../../runtime/init';
import { InlineWidgetFrame } from '../../runtime/InlineWidgetFrame';
import { checkNotionConnection } from '../../runtime/integrations/notion-handler';
import { WidgetFrame } from '../../runtime/WidgetFrame';
import { BUILT_IN_WIDGET_HTML } from '../../runtime/widgets';
import { BUILT_IN_WIDGET_COMPONENTS } from '../../runtime/widgets/built-in-components';
import { THEME_TOKENS } from '../theme/theme-tokens';
import { themeVar } from '../theme/theme-vars';

// Ensure built-in widgets are registered against THIS module instance of the
// widget store (avoids Vite module-graph isolation when /w/:token is loaded
// via a different entry path than the main app).
initRuntime();

// =============================================================================
// Types
// =============================================================================

type EmbedState =
  | 'validating'
  | 'loading-widget'
  | 'needs-auth'
  | 'needs-notion-connect'
  | 'needs-database-select'
  | 'ready'
  | 'error';

interface WidgetData {
  widgetId: string;
  instanceId: string;
  userId: string;
  htmlContent: string;
  manifest: WidgetManifest | null;
}

// =============================================================================
// Styles
// =============================================================================

const containerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--sn-font-family, system-ui, -apple-system, sans-serif)',
};

const cardStyle: React.CSSProperties = {
  maxWidth: '400px',
  padding: '32px',
  borderRadius: '12px',
  textAlign: 'center' as const,
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
};

// =============================================================================
// Component
// =============================================================================

export const WidgetEmbedPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [state, setState] = useState<EmbedState>('validating');
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [notionDatabases, setNotionDatabases] = useState<NotionDatabaseSummary[]>([]);
  const [selectedDbId, setSelectedDbId] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Validate token on mount
  useEffect(() => {
    let cancelled = false;

    async function validate() {
      const result = await validateEmbedToken(token);
      if (cancelled) return;

      if (!result.success) {
        setErrorMsg(result.error.message);
        setState('needs-auth');
        return;
      }

      const { userId, widgetId, widgetInstanceId } = result.data;

      // Built-in widgets are registered in-memory at app boot (see runtime/init.ts).
      // They are not rows in the `widgets` table, so look them up in the widget
      // store registry first before falling back to Supabase.
      const builtInHtml = BUILT_IN_WIDGET_HTML[widgetId];
      const reg = useWidgetStore.getState().registry;
      const builtInEntry = reg[widgetId];
      let htmlContent: string | null = null;
      let manifest: WidgetManifest | null = null;

      if (builtInHtml) {
        htmlContent = builtInHtml;
        manifest = (builtInEntry?.manifest as WidgetManifest | null) ?? null;
      } else if (BUILT_IN_WIDGET_COMPONENTS[widgetId]) {
        // Inline React built-in widget — no HTML needed; rendered via InlineWidgetFrame
        htmlContent = '';
        manifest = (builtInEntry?.manifest as WidgetManifest | null) ?? null;
      } else if (builtInEntry?.htmlContent) {
        htmlContent = builtInEntry.htmlContent;
        manifest = (builtInEntry.manifest as WidgetManifest | null) ?? null;
      } else {
        const { data, error } = await supabase
          .from('widgets')
          .select('html_content, manifest')
          .eq('id', widgetId)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data?.html_content) {
          setErrorMsg('Widget not found or unavailable.');
          setState('error');
          return;
        }

        htmlContent = data.html_content as string;
        manifest = data.manifest as WidgetManifest | null;
      }

      setWidgetData({
        widgetId,
        instanceId: widgetInstanceId,
        userId,
        htmlContent,
        manifest,
      });

      // Check if widget needs Notion integration
      const needsNotion = manifest?.integrations?.includes('notion') ||
        manifest?.permissions?.includes('integrations') ||
        manifest?.permissions?.includes('datasource');

      if (needsNotion) {
        const connection = await checkNotionConnection(userId);
        if (cancelled) return;

        if (!connection.connected) {
          setState('needs-notion-connect');
          return;
        }

        // Check if widget instance has a bound DataSource
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: instanceData } = (await (supabase.from('widget_instances') as any)
          .select('metadata')
          .eq('instance_id', widgetInstanceId)
          .maybeSingle()) as { data: { metadata: Record<string, unknown> } | null };

        if (cancelled) return;

        if (!instanceData?.metadata?.boundDataSourceId) {
          // Load available databases for picker
          const dbResult = await listNotionDatabases(userId);
          if (cancelled) return;
          if (dbResult.success) {
            setNotionDatabases(dbResult.data);
          }
          setState('needs-database-select');
          return;
        }
      }

      setState('ready');
    }

    validate().catch((err) => {
      if (!cancelled) {
        setErrorMsg(err instanceof Error ? err.message : 'Unexpected error');
        setState('error');
      }
    });

    return () => { cancelled = true; };
  }, [token]);

  // Handle Notion database selection
  const handleDatabaseSelect = useCallback(async () => {
    if (!selectedDbId || !widgetData) return;
    setConnecting(true);

    // Import the selected Notion database as a DataSource
    const importResult = await importNotionDatabase(
      selectedDbId,
      widgetData.userId,
      'user',
    );

    if (!importResult.success) {
      setErrorMsg('Failed to import database. Please try again.');
      setConnecting(false);
      return;
    }

    // Bind the DataSource to this widget instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('widget_instances') as any)
      .upsert({
        instance_id: widgetData.instanceId,
        widget_id: widgetData.widgetId,
        user_id: widgetData.userId,
        metadata: { boundDataSourceId: importResult.data.dataSourceId },
      });

    setConnecting(false);
    setState('ready');
  }, [selectedDbId, widgetData]);

  // Theme tokens for the widget
  const theme: ThemeTokens = useMemo(() => ({ ...THEME_TOKENS['midnight-aurora'] }), []);

  // ---- Render states ----

  if (state === 'validating' || state === 'loading-widget') {
    return (
      <div data-testid="embed-validating" style={{ ...containerStyle, background: themeVar('--sn-bg'), color: themeVar('--sn-text-muted') }}>
        Loading...
      </div>
    );
  }

  if (state === 'needs-auth') {
    return (
      <div data-testid="embed-needs-auth" style={{ ...containerStyle, background: themeVar('--sn-bg'), color: themeVar('--sn-text') }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>Authentication Required</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: themeVar('--sn-text-muted'), lineHeight: '1.5' }}>
            This embed requires a StickerNest account. Sign in to continue.
          </p>
          <a
            href={`${window.location.origin}/login?redirect=${encodeURIComponent(window.location.pathname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...buttonStyle, background: themeVar('--sn-accent'), color: '#fff', textDecoration: 'none', display: 'inline-block' }}
          >
            Sign in to StickerNest
          </a>
        </div>
      </div>
    );
  }

  if (state === 'needs-notion-connect') {
    return (
      <div data-testid="embed-needs-notion" style={{ ...containerStyle, background: themeVar('--sn-bg'), color: themeVar('--sn-text') }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>Connect Notion</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: themeVar('--sn-text-muted'), lineHeight: '1.5' }}>
            This widget needs access to your Notion workspace. Connect your account to get started.
          </p>
          <a
            href={`${window.location.origin}/settings#integrations`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...buttonStyle, background: themeVar('--sn-accent'), color: '#fff', textDecoration: 'none', display: 'inline-block' }}
          >
            Connect Notion
          </a>
        </div>
      </div>
    );
  }

  if (state === 'needs-database-select') {
    return (
      <div data-testid="embed-needs-db" style={{ ...containerStyle, background: themeVar('--sn-bg'), color: themeVar('--sn-text') }}>
        <div style={{ ...cardStyle, textAlign: 'left' as const }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>Select a Notion Database</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: themeVar('--sn-text-muted'), lineHeight: '1.5' }}>
            Choose which Notion database this widget should connect to.
          </p>
          {notionDatabases.length === 0 ? (
            <p style={{ fontSize: '13px', color: themeVar('--sn-text-muted') }}>No databases found in your Notion workspace.</p>
          ) : (
            <>
              <select
                data-testid="notion-db-select"
                value={selectedDbId}
                onChange={(e) => setSelectedDbId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${themeVar('--sn-border')}`,
                  background: themeVar('--sn-surface'),
                  color: themeVar('--sn-text'),
                  fontSize: '13px',
                  marginBottom: '12px',
                }}
              >
                <option value="">Select a database...</option>
                {notionDatabases.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.icon ? `${db.icon} ` : ''}{db.title} ({db.propertyCount} properties)
                  </option>
                ))}
              </select>
              <button
                data-testid="connect-db-btn"
                onClick={handleDatabaseSelect}
                disabled={!selectedDbId || connecting}
                style={{
                  ...buttonStyle,
                  width: '100%',
                  background: selectedDbId ? themeVar('--sn-accent') : themeVar('--sn-border'),
                  color: selectedDbId ? '#fff' : themeVar('--sn-text-muted'),
                  opacity: connecting ? 0.6 : 1,
                }}
              >
                {connecting ? 'Connecting...' : 'Connect Database'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div data-testid="embed-error" style={{ ...containerStyle, background: themeVar('--sn-bg'), color: themeVar('--sn-text-muted') }}>
        <div style={cardStyle}>
          <p style={{ margin: 0, fontSize: '14px' }}>{errorMsg || 'Failed to load widget'}</p>
        </div>
      </div>
    );
  }

  // Ready state — render the widget
  if (!widgetData) return null;

  return (
    <div data-testid="embed-widget" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {BUILT_IN_WIDGET_COMPONENTS[widgetData.widgetId] ? (
        <InlineWidgetFrame
          widgetId={widgetData.widgetId}
          instanceId={widgetData.instanceId}
          Component={BUILT_IN_WIDGET_COMPONENTS[widgetData.widgetId]}
          config={{}}
          theme={theme}
          visible
          width={window.innerWidth}
          height={window.innerHeight}
        />
      ) : (
        <WidgetFrame
          widgetId={widgetData.widgetId}
          instanceId={widgetData.instanceId}
          widgetHtml={widgetData.htmlContent}
          config={{}}
          theme={theme}
          visible
          width={window.innerWidth}
          height={window.innerHeight}
        />
      )}
    </div>
  );
};
