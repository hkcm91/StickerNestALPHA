/**
 * IntegrationsSection — Settings tab for managing external integrations.
 *
 * Supports:
 * - Notion OAuth integration
 * - BYOK API keys for AI providers (Replicate, OpenAI, Anthropic)
 *
 * @module shell/pages/settings
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { ApiKeyProvider, UserApiKey, CreateApiKeyInput } from '@sn/types';
import { API_KEY_PROVIDER_INFO } from '@sn/types';

import {
  listApiKeys,
  saveApiKey,
  deleteApiKey,
  revalidateApiKey,
} from '../../../kernel/api-keys';
import { supabase } from '../../../kernel/supabase/client';
import { themeVar } from '../../theme/theme-vars';

// =============================================================================
// Notion OAuth Types & State
// =============================================================================

type NotionConnectionStatus = 'loading' | 'connected' | 'disconnected' | 'error';

interface NotionConnectionInfo {
  workspaceName: string | null;
  workspaceIcon: string | null;
  connectedAt: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';

// =============================================================================
// API Key Types
// =============================================================================

interface ProviderCardProps {
  provider: ApiKeyProvider;
  apiKey: UserApiKey | null;
  onSave: (input: CreateApiKeyInput) => Promise<void>;
  onDelete: (keyId: string) => Promise<void>;
  onRevalidate: (keyId: string) => Promise<void>;
  isSaving: boolean;
}

// =============================================================================
// Status Badge Component
// =============================================================================

function StatusBadge({ status }: { status: UserApiKey['status'] }) {
  const styles: Record<string, React.CSSProperties> = {
    active: {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    },
    invalid: {
      background: '#fee2e2',
      color: '#991b1b',
      border: '1px solid #fca5a5',
    },
    pending: {
      background: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fcd34d',
    },
  };

  return (
    <span
      data-testid="status-badge"
      style={{
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        ...styles[status],
      }}
    >
      {status}
    </span>
  );
}

// =============================================================================
// Provider Card Component (for API Keys)
// =============================================================================

function ProviderCard({
  provider,
  apiKey,
  onSave,
  onDelete,
  onRevalidate,
  isSaving,
}: ProviderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const info = API_KEY_PROVIDER_INFO[provider];
  const hasKey = apiKey !== null;

  const handleSave = useCallback(async () => {
    if (!keyInput.trim()) {
      setError('Please enter an API key');
      return;
    }

    setError(null);
    try {
      await onSave({ provider, key: keyInput.trim() });
      setKeyInput('');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key');
    }
  }, [keyInput, provider, onSave]);

  const handleDelete = useCallback(async () => {
    if (!apiKey) return;

    const confirmed = window.confirm(
      `Remove your ${info.label} API key? Any features using this key will stop working.`
    );

    if (confirmed) {
      await onDelete(apiKey.id);
    }
  }, [apiKey, info.label, onDelete]);

  const handleRevalidate = useCallback(async () => {
    if (!apiKey) return;
    await onRevalidate(apiKey.id);
  }, [apiKey, onRevalidate]);

  const handleCancel = useCallback(() => {
    setKeyInput('');
    setError(null);
    setIsEditing(false);
  }, []);

  return (
    <div
      data-testid={`provider-card-${provider}`}
      style={{
        border: '1px solid var(--sn-border, #e5e7eb)',
        borderRadius: 'var(--sn-radius, 12px)',
        padding: 20,
        background: 'var(--sn-surface, #fff)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{info.label}</div>
          <div style={{ fontSize: 13, color: 'var(--sn-text-muted, #6b7280)' }}>
            {info.description}
          </div>
        </div>
        {hasKey && <StatusBadge status={apiKey.status} />}
      </div>

      {hasKey && !isEditing && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'var(--sn-bg, #f9fafb)',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'monospace',
            }}
          >
            <span>•••••••••••{apiKey.keySuffix}</span>
          </div>
          {apiKey.validationError && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 12px',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {apiKey.validationError}
            </div>
          )}
          {apiKey.lastUsedAt && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--sn-text-muted, #6b7280)' }}>
              Last used: {new Date(apiKey.lastUsedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={`Enter your ${info.label} API key`}
            data-testid={`key-input-${provider}`}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${error ? '#ef4444' : 'var(--sn-border, #e5e7eb)'}`,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
            autoFocus
          />
          {error && (
            <div style={{ marginTop: 8, color: '#ef4444', fontSize: 13 }}>{error}</div>
          )}
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--sn-text-muted, #6b7280)' }}>
            Get your API key at{' '}
            <a
              href={info.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--sn-accent, #6366f1)' }}
            >
              {info.docsUrl.replace('https://', '')}
            </a>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              data-testid={`save-key-${provider}`}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 'var(--sn-radius, 8px)',
                background: 'var(--sn-accent, #6366f1)',
                color: '#fff',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? 'Validating...' : 'Save & Validate'}
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--sn-border, #e5e7eb)',
                borderRadius: 'var(--sn-radius, 8px)',
                background: 'var(--sn-surface, #fff)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
          </>
        ) : hasKey ? (
          <>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--sn-border, #e5e7eb)',
                borderRadius: 'var(--sn-radius, 8px)',
                background: 'var(--sn-surface, #fff)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Update Key
            </button>
            {apiKey.status === 'invalid' && (
              <button
                onClick={handleRevalidate}
                disabled={isSaving}
                data-testid={`revalidate-key-${provider}`}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--sn-border, #e5e7eb)',
                  borderRadius: 'var(--sn-radius, 8px)',
                  background: 'var(--sn-surface, #fff)',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                {isSaving ? 'Retrying...' : 'Retry Validation'}
              </button>
            )}
            <button
              onClick={handleDelete}
              data-testid={`delete-key-${provider}`}
              style={{
                padding: '8px 16px',
                border: '1px solid #fca5a5',
                borderRadius: 'var(--sn-radius, 8px)',
                background: '#fee2e2',
                color: '#991b1b',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Remove
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            data-testid={`add-key-${provider}`}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 'var(--sn-radius, 8px)',
              background: 'var(--sn-accent, #6366f1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Add API Key
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Notion Integration Card
// =============================================================================

function NotionIntegrationCard() {
  const [status, setStatus] = useState<NotionConnectionStatus>('loading');
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
  );
}

// =============================================================================
// Main Component
// =============================================================================

export const IntegrationsSection: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load API keys on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await listApiKeys();
      if (result.success) {
        setApiKeys(result.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Get API key for a specific provider
  const getKeyForProvider = useCallback(
    (provider: ApiKeyProvider): UserApiKey | null => {
      return apiKeys.find((k) => k.provider === provider) ?? null;
    },
    [apiKeys]
  );

  // Save handler
  const handleSave = useCallback(async (input: CreateApiKeyInput) => {
    setIsSaving(true);
    try {
      const result = await saveApiKey(input);
      if (result.success) {
        setApiKeys((prev) => {
          // Replace existing key for this provider or add new
          const filtered = prev.filter((k) => k.provider !== input.provider);
          return [result.data, ...filtered];
        });
      } else {
        throw new Error(result.error.message);
      }
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Delete handler
  const handleDelete = useCallback(async (keyId: string) => {
    const result = await deleteApiKey(keyId);
    if (result.success) {
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
    }
  }, []);

  // Revalidate handler
  const handleRevalidate = useCallback(async (keyId: string) => {
    setIsSaving(true);
    try {
      const result = await revalidateApiKey(keyId);
      if (result.success) {
        setApiKeys((prev) =>
          prev.map((k) => (k.id === keyId ? result.data : k))
        );
      }
    } finally {
      setIsSaving(false);
    }
  }, []);

  if (loading) {
    return <div data-testid="integrations-loading">Loading integrations...</div>;
  }

  // Define which providers to show (excluding 'custom' for now)
  const providers: ApiKeyProvider[] = ['replicate', 'openai', 'anthropic'];

  return (
    <div data-testid="integrations-section" style={{ maxWidth: 560 }}>
      <h2 style={{ marginBottom: 8 }}>Integrations</h2>
      <p style={{ marginBottom: 24, color: 'var(--sn-text-muted, #6b7280)', fontSize: 14 }}>
        Connect external services and add your own API keys to enable AI features.
      </p>

      {/* OAuth Integrations */}
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Connected Services</h3>
      <div style={{ marginBottom: 24 }}>
        <NotionIntegrationCard />
      </div>

      {/* API Keys */}
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>API Keys</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {providers.map((provider) => (
          <ProviderCard
            key={provider}
            provider={provider}
            apiKey={getKeyForProvider(provider)}
            onSave={handleSave}
            onDelete={handleDelete}
            onRevalidate={handleRevalidate}
            isSaving={isSaving}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: 'var(--sn-bg, #f9fafb)',
          borderRadius: 8,
          fontSize: 13,
          color: 'var(--sn-text-muted, #6b7280)',
        }}
      >
        <strong>Security:</strong> Your API keys are encrypted at rest and never exposed to the browser.
        Only our server-side functions can access them to make API calls on your behalf.
      </div>
    </div>
  );
};
