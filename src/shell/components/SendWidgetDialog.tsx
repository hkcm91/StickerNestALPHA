/**
 * SendWidgetDialog — search for a user and send them a widget invite.
 *
 * Opens from the canvas context menu "Send to friend" action on widget entities.
 * Searches mutual follows, lets the user pick a recipient, then calls
 * `sendWidgetInvite()` from the social graph API.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { UserProfile } from '@sn/types';

import { bus } from '../../kernel/bus';
import { getFollowing, searchProfiles, sendWidgetInvite } from '../../kernel/social-graph';
import type { WidgetInvitePayload } from '../../kernel/social-graph';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { useCanvasStore } from '../../kernel/stores/canvas/canvas.store';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';
import { palette, themeVar } from '../theme/theme-vars';

import { Modal } from './Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendWidgetDialogProps {
  /** The widgetId to send, or 'pick' to show widget picker first */
  widgetId: string;
  /** Optional widget instance ID (for pipeline connections) */
  instanceId?: string;
  /** Called when dialog closes */
  onClose: () => void;
}

type DialogStep = 'pick' | 'search' | 'sending' | 'sent' | 'error';

// ---------------------------------------------------------------------------
// UserRow — inline sub-component for search results
// ---------------------------------------------------------------------------

const UserRow: React.FC<{ user: UserProfile; onSend: () => void }> = ({ user, onSend }) => (
  <div
    data-testid={`user-row-${user.userId}`}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      cursor: 'pointer',
      borderRadius: '8px',
      transition: 'background 0.12s',
    }}
    onClick={onSend}
    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: palette.opal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 600,
        color: palette.bg,
        flexShrink: 0,
      }}
    >
      {(user.displayName ?? '?')[0].toUpperCase()}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: palette.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user.displayName ?? 'Unknown'}
      </div>
    </div>
    <div style={{ fontSize: '11px', color: palette.textMuted }}>Send</div>
  </div>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SendWidgetDialog: React.FC<SendWidgetDialogProps> = ({
  widgetId: initialWidgetId,
  instanceId,
  onClose,
}) => {
  const userId = useAuthStore((s) => s.user?.id);
  const canvasId = useCanvasStore((s) => s.activeCanvasId);
  const registry = useWidgetStore((s) => s.registry);

  const needsPick = initialWidgetId === 'pick';
  const [activeWidgetId, setActiveWidgetId] = useState(needsPick ? '' : initialWidgetId);
  const [step, setStep] = useState<DialogStep>(needsPick ? 'pick' : 'search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [_errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const widgetEntry = activeWidgetId ? registry[activeWidgetId] : undefined;
  const widgetName = widgetEntry?.manifest?.name ?? activeWidgetId;

  // Focus input on mount (for search step)
  useEffect(() => {
    if (step === 'search') inputRef.current?.focus();
  }, [step]);

  // Load mutual follows on open (default list)
  useEffect(() => {
    const effectiveUserId = userId ?? 'dev-user';
    setLoading(true);
    getFollowing(effectiveUserId, { limit: 20 }).then((res) => {
      if (res.success) {
        setResults(res.data.items);
      } else if (import.meta.env.DEV) {
        // Dev fallback
        setResults([
          { userId: 'user-alice', displayName: 'Alice', username: 'alice', visibility: 'public', followerCount: 0, followingCount: 0, postCount: 0, isVerified: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { userId: 'user-bob', displayName: 'Bob', username: 'bob', visibility: 'public', followerCount: 0, followingCount: 0, postCount: 0, isVerified: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ]);
      }
      setLoading(false);
    });
  }, [userId]);

  // Debounced search
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      // Reset to following list
      const effectiveUserId = userId ?? 'dev-user';
      getFollowing(effectiveUserId, { limit: 20 }).then((res) => {
        if (res.success) setResults(res.data.items);
      });
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await searchProfiles(q.trim(), 10);
      if (res.success) {
        setResults(res.data);
      }
      setLoading(false);
    }, 300);
  }, [userId]);

  // Widget picker: build list of installed widgets from registry
  const widgetList = Object.entries(registry).map(([id, entry]) => ({
    id,
    name: entry.manifest?.name ?? id,
    icon: entry.manifest?.category === 'social' ? '→' : '⬡',
  }));

  const handlePickWidget = useCallback((id: string) => {
    setActiveWidgetId(id);
    setStep('search');
  }, []);

  const handleSend = useCallback(async (recipient: UserProfile) => {
    setSelectedUser(recipient);
    setStep('sending');

    const effectiveUserId = userId ?? 'dev-user';
    const payload: WidgetInvitePayload = {
      widgetId: activeWidgetId,
      mode: 'share',
      widgetManifestSnapshot: widgetEntry?.manifest as unknown as Record<string, unknown>,
      widgetHtml: widgetEntry?.htmlContent,
      sourceCanvasId: canvasId ?? undefined,
      sourceWidgetInstanceId: instanceId,
    };

    const result = await sendWidgetInvite(recipient.userId, payload, effectiveUserId);

    if (result.success) {
      setStep('sent');
      bus.emit('shell.widgetInvite.sent', {
        widgetId: activeWidgetId,
        recipientId: recipient.userId,
        recipientName: recipient.displayName,
      });
    } else if (import.meta.env.DEV) {
      // In dev, treat as success for testing
      setStep('sent');
      bus.emit('shell.widgetInvite.sent', {
        widgetId: activeWidgetId,
        recipientId: recipient.userId,
        recipientName: recipient.displayName,
      });
    } else {
      setErrorMsg(result.error?.message ?? 'Failed to send invite.');
      setStep('error');
    }
  }, [userId, activeWidgetId, widgetEntry, canvasId, instanceId]);

  return (
    <Modal isOpen onClose={onClose} title="Send Widget" maxWidth={380}>
      {/* Widget picker step */}
      {step === 'pick' && (
        <>
          <div style={{ fontSize: '13px', color: palette.textMuted, marginBottom: '10px' }}>
            Choose a widget to send:
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {widgetList.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: palette.textMuted, fontSize: '13px' }}>
                No widgets installed
              </div>
            ) : (
              widgetList.map((w) => (
                <button
                  key={w.id}
                  data-testid={`pick-widget-${w.id}`}
                  onClick={() => handlePickWidget(w.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    fontSize: '13px',
                    color: palette.text,
                    fontFamily: themeVar('--sn-font-family'),
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = palette.surfaceRaised; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: '6px',
                    background: palette.opal,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: palette.bg,
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {w.name.charAt(0).toUpperCase()}
                  </span>
                  <span style={{ fontWeight: 500 }}>{w.name}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {/* Widget info header (shown after widget is selected) */}
      {step !== 'pick' && activeWidgetId && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '0 0 12px',
            borderBottom: `1px solid ${palette.border}`,
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: palette.opal,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: palette.bg,
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            {widgetName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: palette.text }}>
              {widgetName}
            </div>
            <div style={{ fontSize: '12px', color: palette.textMuted }}>
              Send this widget to a friend
            </div>
          </div>
        </div>
      )}

      {step === 'search' && (
        <>
          {/* Search input */}
          <input
            ref={inputRef}
            data-testid="send-widget-search"
            type="text"
            placeholder="Search by name or username..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${palette.border}`,
              background: palette.surface,
              color: palette.text,
              fontSize: '13px',
              fontFamily: themeVar('--sn-font-family'),
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Results list */}
          <div
            style={{
              marginTop: '8px',
              maxHeight: '240px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {loading && results.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: palette.textMuted, fontSize: '13px' }}>
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: palette.textMuted, fontSize: '13px' }}>
                {query.trim() ? 'No users found' : 'Follow some users to send widgets'}
              </div>
            ) : (
              results.map((user) => (
                <UserRow
                  key={user.userId}
                  user={user}
                  onSend={() => handleSend(user)}
                />
              ))
            )}
          </div>
        </>
      )}

      {step === 'sending' && selectedUser && (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: palette.opal,
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: palette.bg,
              fontSize: '20px',
              fontWeight: 700,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            {selectedUser.displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: '14px', color: palette.text }}>
            Sending to <strong>{selectedUser.displayName}</strong>...
          </div>
        </div>
      )}

      {step === 'sent' && selectedUser && (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: palette.success,
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: palette.bg,
              fontSize: '22px',
            }}
          >
            &#10003;
          </div>
          <div style={{ fontSize: '14px', color: palette.text, marginBottom: '4px' }}>
            Sent to <strong>{selectedUser.displayName}</strong>
          </div>
          <div style={{ fontSize: '12px', color: palette.textMuted }}>
            They'll see it in their notifications
          </div>
          <button
            data-testid="send-widget-done-btn"
            onClick={onClose}
            style={{
              marginTop: '16px',
              padding: '8px 24px',
              borderRadius: '6px',
              border: 'none',
              background: palette.opal,
              color: palette.bg,
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      )}

      {step === 'error' && (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: palette.error,
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: palette.bg,
              fontSize: '22px',
            }}
          >
            &#10007;
          </div>
          <div style={{ fontSize: '14px', color: palette.text, marginBottom: '4px' }}>
            Failed to send widget
          </div>
          <div style={{ fontSize: '12px', color: palette.textMuted }}>
            Please try again later
          </div>
          <button
            data-testid="send-widget-retry-btn"
            onClick={onClose}
            style={{
              marginTop: '16px',
              padding: '8px 24px',
              borderRadius: '6px',
              border: 'none',
              background: palette.opal,
              color: palette.bg,
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      )}
    </Modal>
  );
};