/**
 * NotionPermissionModal — prompts user to grant a widget access to Notion databases.
 *
 * Triggered by bus event 'widget.notion.permissionRequired'.
 * Writes to widget_integration_permissions table via Supabase.
 * Emits 'widget.notion.permissionGranted' or 'widget.notion.permissionDenied'.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useEffect, useState } from 'react';

import { bus } from '../../kernel/bus';
import { supabase } from '../../kernel/supabase/client';
import { themeVar } from '../theme/theme-vars';

interface PermissionRequest {
  widgetId: string;
  widgetName: string;
  instanceId: string;
}

interface NotionDatabase {
  id: string;
  title: string;
  icon: string | null;
}

export const NotionPermissionModal: React.FC = () => {
  const [request, setRequest] = useState<PermissionRequest | null>(null);
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [accessLevel, setAccessLevel] = useState<'read' | 'read_write'>('read');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = bus.subscribe(
      'widget.notion.permissionRequired',
      (event: { payload: PermissionRequest }) => {
        setRequest(event.payload);
        setSelected(new Set());
        setAccessLevel('read');
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    setLoading(true);
    async function fetchDatabases() {
      try {
        const { data, error } = await supabase.functions.invoke('notion-proxy', {
          body: { operation: 'query', type: 'databases.list', params: {} },
        });
        if (cancelled) return;
        if (error || !data?.success) { setDatabases([]); return; }
        const results = (data.data?.results ?? []) as Array<{
          id: string;
          title?: Array<{ plain_text?: string }>;
          icon?: { emoji?: string } | null;
        }>;
        setDatabases(results.map((db) => ({
          id: db.id,
          title: db.title?.[0]?.plain_text ?? 'Untitled',
          icon: db.icon?.emoji ?? null,
        })));
      } catch {
        if (!cancelled) setDatabases([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDatabases();
    return () => { cancelled = true; };
  }, [request]);

  const toggleDatabase = useCallback((dbId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dbId)) next.delete(dbId); else next.add(dbId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(databases.map((db) => db.id)));
  }, [databases]);

  const handleGrant = useCallback(async () => {
    if (!request || selected.size === 0) return;
    setSaving(true);
    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 2. Find Notion integration for this user
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'notion')
        .maybeSingle();

      if (!integration) {
        // This shouldn't happen if they are here, but handle just in case
        throw new Error('Notion not connected');
      }

      // 3. Prepare allowed resources
      const allowedResources = {
        databases: Array.from(selected),
      };

      // 4. Upsert permission (using widget_id + integration_id + user_id unique constraint)
      const { error } = await supabase.from('widget_integration_permissions').upsert({
        user_id: user.id,
        widget_id: request.widgetId,
        integration_id: integration.id,
        allowed_resources: allowedResources,
        can_read: true,
        can_write: accessLevel === 'read_write',
        granted_at: new Date().toISOString(),
      });

      if (error) throw error;

      bus.emit('widget.notion.permissionGranted', {
        widgetId: request.widgetId,
        instanceId: request.instanceId,
        databases: Array.from(selected),
        accessLevel,
      });

      setRequest(null);
    } catch (err) {
      console.error('[NotionPermissionModal] Failed to grant permission:', err);
      // Keep modal open, maybe show an error toast
    } finally {
      setSaving(false);
    }
  }, [request, selected, accessLevel]);

  const handleDeny = useCallback(() => {
    if (request) {
      bus.emit('widget.notion.permissionDenied', {
        widgetId: request.widgetId, instanceId: request.instanceId,
      });
    }
    setRequest(null);
  }, [request]);

  if (!request) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000, fontFamily: themeVar('--sn-font-family'),
  };
  const modalStyle: React.CSSProperties = {
    background: themeVar('--sn-bg'), color: themeVar('--sn-text'),
    borderRadius: '12px', padding: '24px', width: '480px',
    maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  };
  const btnPrimary: React.CSSProperties = {
    padding: '8px 20px', border: 'none', borderRadius: '6px',
    background: themeVar('--sn-accent'), color: '#fff',
    cursor: saving || selected.size === 0 ? 'not-allowed' : 'pointer',
    fontSize: '14px', fontFamily: 'inherit',
    opacity: saving || selected.size === 0 ? 0.6 : 1,
  };
  const btnSecondary: React.CSSProperties = {
    padding: '8px 20px', border: `1px solid ${themeVar('--sn-border')}`,
    borderRadius: '6px', background: 'transparent', color: themeVar('--sn-text'),
    cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit',
  };

  return (
    <div style={overlayStyle} data-testid="notion-permission-modal">
      <div style={modalStyle}>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>Notion Access</h2>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: themeVar('--sn-text-muted') }}>
          <strong>{request.widgetName}</strong> wants to access your Notion databases.
          Select which databases to share:
        </p>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: themeVar('--sn-text-muted') }}>Loading databases...</div>
        ) : databases.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: themeVar('--sn-text-muted') }}>
            No databases found. Make sure Notion is connected in Settings.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <button type="button" onClick={selectAll} style={{ ...btnSecondary, padding: '4px 8px', fontSize: '12px' }}>Select all</button>
              <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value as 'read' | 'read_write')}
                style={{ padding: '4px 8px', border: `1px solid ${themeVar('--sn-border')}`, borderRadius: '4px', fontSize: '12px', background: themeVar('--sn-surface'), color: themeVar('--sn-text') }}>
                <option value="read">Read only</option>
                <option value="read_write">Read & Write</option>
              </select>
            </div>
            <div style={{ border: `1px solid ${themeVar('--sn-border')}`, borderRadius: '8px', maxHeight: '280px', overflow: 'auto' }}>
              {databases.map((db) => (
                <label key={db.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: `1px solid ${themeVar('--sn-border')}`, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.has(db.id)} onChange={() => toggleDatabase(db.id)} />
                  <span>{db.icon ?? 'D'}</span>
                  <span style={{ fontSize: '14px' }}>{db.title}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button type="button" onClick={handleDeny} style={btnSecondary}>Deny</button>
          <button type="button" onClick={handleGrant} disabled={saving || selected.size === 0}
            style={btnPrimary} data-testid="notion-permission-grant-btn">
            {saving ? 'Granting...' : `Grant access to ${selected.size} database${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};
