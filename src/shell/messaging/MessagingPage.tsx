/**
 * MessagingPage — split-pane layout with conversation list + message thread.
 *
 * Routes: /messages (inbox) and /messages/:userId (specific conversation).
 *
 * @module shell/messaging
 * @layer L6
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getProfile } from '../../kernel/social-graph';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { themeVar } from '../theme/theme-vars';

import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { useMessageSubscription } from './useMessageSubscription';

export const MessagingPage: React.FC = () => {
  const { userId: activeUserId } = useParams<{ userId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const [otherUserName, setOtherUserName] = useState('');

  // Subscribe to real-time messages
  useMessageSubscription(currentUser?.id);

  // Fetch the active conversation partner's display name
  useEffect(() => {
    if (!activeUserId) {
      setOtherUserName('');
      return;
    }

    let cancelled = false;
    async function loadName() {
      const result = await getProfile(activeUserId!);
      if (!cancelled && result.success) {
        setOtherUserName(result.data.displayName);
      } else if (!cancelled) {
        setOtherUserName('User');
      }
    }
    loadName();
    return () => { cancelled = true; };
  }, [activeUserId]);

  return (
    <div
      data-testid="page-messaging"
      style={{
        display: 'flex',
        height: '100%',
        fontFamily: 'var(--sn-font-family, system-ui)',
        color: themeVar('--sn-text'),
        background: themeVar('--sn-bg'),
      }}
    >
      {/* Left: Conversation list */}
      <div style={{ width: 320, flexShrink: 0, height: '100%' }}>
        <ConversationList activeUserId={activeUserId} />
      </div>

      {/* Right: Message thread or empty state */}
      <div style={{ flex: 1, height: '100%', minWidth: 0 }}>
        {activeUserId ? (
          <MessageThread
            otherUserId={activeUserId}
            otherUserDisplayName={otherUserName || 'Loading...'}
          />
        ) : (
          <div
            data-testid="no-conversation-selected"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: themeVar('--sn-text-muted'),
              fontSize: 15,
            }}
          >
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
};
