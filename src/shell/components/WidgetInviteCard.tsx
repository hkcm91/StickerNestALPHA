/**
 * Widget Invite Notification Card — renders a widget connection invite
 * in the notification/messages area.
 *
 * Shows sender info, widget name, invite mode, and accept/decline actions.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import type { WidgetInvite } from '@sn/types';

import { bus } from '../../kernel/bus';
import { acceptWidgetInvite, declineWidgetInvite } from '../../kernel/social-graph';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { palette, themeVar } from '../theme/theme-vars';

import { CanvasPickerDialog } from './CanvasPickerDialog';

export interface WidgetInviteCardProps {
  invite: WidgetInvite;
  senderName: string;
  senderAvatar?: string;
  onDismiss?: () => void;
}

export const WidgetInviteCard: React.FC<WidgetInviteCardProps> = ({
  invite,
  senderName,
  senderAvatar,
  onDismiss,
}) => {
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();
  const [showCanvasPicker, setShowCanvasPicker] = useState(false);
  const [status, setStatus] = useState<'idle' | 'accepting' | 'declining' | 'done'>('idle');

  const modeBadge = invite.mode === 'pipeline' ? 'Pipeline Connection' : 'Widget Share';
  const typeLabel = invite.isBroadcast ? 'Broadcast' : 'Invite';

  const handleAccept = () => {
    setShowCanvasPicker(true);
  };

  const handleCanvasSelected = async (canvasId: string) => {
    const effectiveUserId = userId ?? 'dev-user';
    setStatus('accepting');
    setShowCanvasPicker(false);

    // Emit ghost widget placement event so the canvas can render the glowy preview
    bus.emit('shell.widgetInvite.accepted', {
      invite,
      canvasId,
      userId: effectiveUserId,
    });

    const result = await acceptWidgetInvite(invite.id, canvasId, effectiveUserId);
    if (result.success || import.meta.env.DEV) {
      setStatus('done');
      // Navigate to canvas with the ghost widget ready for placement
      navigate(`/canvas/${canvasId}?ghostWidget=${encodeURIComponent(invite.widgetId)}&inviteId=${invite.id}`);
    } else {
      setStatus('idle');
    }
  };

  const handleDecline = async () => {
    const effectiveUserId = userId ?? 'dev-user';
    setStatus('declining');
    const result = await declineWidgetInvite(invite.id, effectiveUserId);
    if (result.success || import.meta.env.DEV) {
      setStatus('done');
      onDismiss?.();
    } else {
      setStatus('idle');
    }
  };

  if (status === 'done') {
    return null;
  }

  return (
    <>
      <div
        data-testid="widget-invite-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '14px 16px',
          borderRadius: '10px',
          background: palette.surfaceGlass,
          border: `1px solid ${palette.border}`,
          fontFamily: themeVar('--sn-font-family'),
        }}
      >
        {/* Header: avatar + sender name + type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderName}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: palette.storm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: palette.bg,
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {senderName.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: palette.text }}>
              {senderName}
            </div>
            <div style={{ fontSize: '12px', color: palette.textMuted }}>
              {typeLabel}
            </div>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '4px',
              background: invite.mode === 'pipeline' ? palette.violet : palette.opal,
              color: palette.bg,
            }}
          >
            {modeBadge}
          </span>
        </div>

        {/* Widget name */}
        <div style={{ fontSize: '13px', color: palette.text }}>
          Widget: <strong>{invite.widgetId}</strong>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            data-testid="invite-accept-btn"
            onClick={handleAccept}
            disabled={status !== 'idle'}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '6px',
              border: 'none',
              background: palette.opal,
              color: palette.bg,
              fontWeight: 600,
              fontSize: '13px',
              cursor: status === 'idle' ? 'pointer' : 'default',
              opacity: status === 'idle' ? 1 : 0.6,
            }}
          >
            {status === 'accepting' ? 'Connecting...' : 'Accept'}
          </button>
          <button
            data-testid="invite-decline-btn"
            onClick={handleDecline}
            disabled={status !== 'idle'}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '6px',
              border: `1px solid ${palette.border}`,
              background: 'transparent',
              color: palette.textMuted,
              fontWeight: 500,
              fontSize: '13px',
              cursor: status === 'idle' ? 'pointer' : 'default',
              opacity: status === 'idle' ? 1 : 0.6,
            }}
          >
            {status === 'declining' ? 'Declining...' : 'Decline'}
          </button>
        </div>
      </div>

      {showCanvasPicker &&
        createPortal(
          <CanvasPickerDialog
            onSelect={handleCanvasSelected}
            onClose={() => setShowCanvasPicker(false)}
          />,
          document.body,
        )}
    </>
  );
};
