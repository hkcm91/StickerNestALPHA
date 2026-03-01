-- StickerNest V5 Direct Messages
-- Migration: 00007_add_direct_messages
-- Description: Creates direct_messages table for user-to-user messaging

CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Content length constraint
    CONSTRAINT dm_content_length CHECK (char_length(content) BETWEEN 1 AND 2000),
    -- No self-messages
    CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);

-- Index for fetching conversations
CREATE INDEX idx_direct_messages_conversation ON direct_messages(
    LEAST(sender_id, recipient_id),
    GREATEST(sender_id, recipient_id),
    created_at DESC
);

-- Index for unread messages
CREATE INDEX idx_direct_messages_unread ON direct_messages(recipient_id, created_at DESC)
    WHERE NOT is_read;

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY "Users can read own messages" ON direct_messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send messages
CREATE POLICY "Users can send messages" ON direct_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Recipients can mark messages as read
CREATE POLICY "Recipients can update messages" ON direct_messages
    FOR UPDATE USING (auth.uid() = recipient_id);

COMMENT ON TABLE direct_messages IS 'Direct messages between users';
