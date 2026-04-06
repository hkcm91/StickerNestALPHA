-- StickerNest V5 Deleted Conversations (Soft Delete)
-- Migration: add_deleted_conversations
-- Description: Tracks which conversations a user has soft-deleted.
-- Messages remain in direct_messages; this table controls visibility only.

CREATE TABLE deleted_conversations (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, partner_id),
    CONSTRAINT no_self_delete CHECK (user_id != partner_id)
);

-- Enable RLS
ALTER TABLE deleted_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own deletion records
CREATE POLICY "Users can read own deleted conversations" ON deleted_conversations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can delete (soft-delete) their own conversations
CREATE POLICY "Users can insert own deleted conversations" ON deleted_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can remove a deletion record (un-delete / conversation reappears)
CREATE POLICY "Users can delete own deleted conversations" ON deleted_conversations
    FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE deleted_conversations IS 'Soft-delete tracking for conversations. One-sided: only affects the deleting user.';
