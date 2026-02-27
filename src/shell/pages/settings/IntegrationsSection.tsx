/**
 * IntegrationsSection — Settings tab for managing external integrations.
 *
 * Currently supports Notion. Shows connection status, connect/disconnect actions.
 * OAuth flow handled via popup to notion-oauth edge function.
 *
 * @module shell/pages/settings
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../../../kernel/supabase/client';
import { themeVar } from '../../theme/theme-vars';

type ConnectionStatus = 'loading' | 'connected' | 'disconnected' | 'error';

interface NotionConnectionInfo {
  workspaceName: string | null;
  workspaceIcon: string | null;
  connectedAt: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';

export const IntegrationsSection: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [info, setInfo] = useState<NotionConnectionInfo>({
    workspaceName: null, workspaceIcon: null, connectedAt: null,
  });
  const [actionPending, setActionPending] = useState(false);
  const popupRef = useRef<Window | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('notion-oauth', {
        body: { action: 'status' },
      });
      if (error) { setStatus('error'); return; }
      if (data?.connected) {
        setStatus('connected');
        setInfo({
          workspaceName: data.workspace_name ?? null,
          workspaceIcon: data.workspace_icon ?? null,
          connectedAt: data.connected_at ?? null,
        });
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'notion-oauth-success') {
        popupRef.current?.close();
        popupRef.current = null;
        setActionPending(false);
        checkStatus();
      } else if (event.data?.type === 'notion-oauth-error') {
        popupRef.current?.close();
        popupRef.current = null;
        setActionPending(false);
        setStatus('error');
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkStatus]);

  const handleConnect = useCallback(() => {
    setActionPending(true);
    const width = 600, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    popupRef.current = window.open(
      `${SUPABASE_URL}/functions/v1/notion-oauth?action=authorize`,
      'notion-oauth',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`,
    );
    const interval = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(interval);
        setActionPending(false);
        checkStatus();
      }
    }, 1000);
    setTimeout(() => clearInterval(interval), 300000);
  }, [checkStatus]);

  const handleDisconnect = useCallback(async () => {
    setActionPending(true);
    try {
      await supabase.functions.invoke('notion-oauth', { body: { action: 'disconnect' } });
      setStatus('disconnected');
      setInfo({ workspaceName: null, workspaceIcon: null, connectedAt: null });
    } catch {
      setStatus('error');
    } finally {
      setActionPending(false);
    }
  }, []);

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${themeVar('--sn-border')}`,
    borderRadius: themeVar('--sn-radius'),
    padding: '20px',
    background: themeVar('--sn-surface'),
    marginBottom: '16px',
  };

  const badgeStyle = (connected: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
    fontSize: '12px', fontWeight: 600,
    background: connected ? '#dcfce7' : '#f3f4f6',
    color: connected ? '#166534' : '#6b7280',
    marginLeft: '8px',
  });

  const btnStyle: React.CSSProperties = {
    padding: '8px 16px', border: `1px solid ${themeVar('--sn-border')}`,
    borderRadius: '6px', background: themeVar('--sn-accent'), color: '#fff',
    cursor: actionPending ? 'not-allowed' : 'pointer',
    fontSize: '14px', fontFamily: 'inherit', opacity: actionPending ? 0.6 : 1,
  };

  const disconnectBtnStyle: React.CSSProperties = {
    ...btnStyle, background: 'transparent',
    color: themeVar('--sn-text-muted'),
    border: `1px solid ${themeVar('--sn-border')}`,
  };

  return (
    <div data-testid="integrations-section">
      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Integrations</h2>
      <div style={cardStyle} data-testid="notion-integration-card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '20px', marginRight: '8px' }}>{info.workspaceIcon || 'N'}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>
              Notion
              <span style={badgeStyle(status === 'connected')}>
                {status === 'loading' ? '...' : status === 'connected' ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted'), marginTop: '2px' }}>
              Connect your Notion workspace to use database widgets
            </div>
          </div>
        </div>

        {status === 'connected' && info.workspaceName && (
          <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted'), marginBottom: '12px' }}>
            Workspace: <strong>{info.workspaceName}</strong>
            {info.connectedAt && <span> — connected {new Date(info.connectedAt).toLocaleDateString()}</span>}
          </div>
        )}

        {status === 'error' && (
          <div style={{ fontSize: '13px', color: '#ef4444', marginBottom: '12px' }}>
            Failed to check connection status. Please try again.
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          {status !== 'connected' ? (
            <button type="button" onClick={handleConnect} disabled={actionPending}
              style={btnStyle} data-testid="notion-connect-btn">
              {actionPending ? 'Connecting...' : 'Connect Notion'}
            </button>
          ) : (
            <button type="button" onClick={handleDisconnect} disabled={actionPending}
              style={disconnectBtnStyle} data-testid="notion-disconnect-btn">
              {actionPending ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
