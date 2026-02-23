-- StickerNest V5 Social Graph Tables
-- Migration: 00005_add_social_graph
-- Description: Creates tables for the social graph layer (profiles, follows, posts, reactions, comments, notifications)
--
-- DESIGN PHILOSOPHY:
-- The social graph is a hidden data layer that widgets render. Different widget sets
-- (MySpace-style, AOL-style, Twitter-style) can render the same social data in
-- completely different ways. This is NOT a visible social media layer - it's
-- platform infrastructure that widgets query via the social integration.

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Profile visibility settings
CREATE TYPE profile_visibility AS ENUM ('public', 'followers', 'private');

-- Follow relationship status
CREATE TYPE follow_status AS ENUM ('active', 'pending', 'blocked');

-- Post visibility settings
CREATE TYPE post_visibility AS ENUM ('public', 'followers', 'mentioned', 'private');

-- Post content type
CREATE TYPE post_content_type AS ENUM ('text', 'rich', 'canvas', 'widget', 'media', 'repost');

-- Reaction types (intentionally minimal - widgets map to emoji/icons)
CREATE TYPE reaction_type AS ENUM ('like', 'love', 'laugh', 'wow', 'sad', 'angry');

-- Reaction target types
CREATE TYPE reaction_target_type AS ENUM ('post', 'comment', 'canvas', 'widget');

-- Comment target types
CREATE TYPE comment_target_type AS ENUM ('post', 'canvas', 'widget');

-- Notification types
CREATE TYPE notification_type AS ENUM (
    'follow',
    'follow_request',
    'like',
    'comment',
    'reply',
    'mention',
    'repost',
    'canvas_invite',
    'canvas_comment',
    'widget_share'
);

-- ============================================================================
-- USER_PROFILES TABLE
-- ============================================================================
-- Social profile data extending the base users table

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    location TEXT,
    website_url TEXT,
    visibility profile_visibility NOT NULL DEFAULT 'public',
    follower_count INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER NOT NULL DEFAULT 0,
    post_count INTEGER NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Username constraints
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
    CONSTRAINT display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 50),
    CONSTRAINT bio_length CHECK (bio IS NULL OR char_length(bio) <= 500),
    CONSTRAINT location_length CHECK (location IS NULL OR char_length(location) <= 100)
);

-- Index for username lookups
CREATE UNIQUE INDEX idx_user_profiles_username ON user_profiles(LOWER(username));

-- Full-text search on profile
CREATE INDEX idx_user_profiles_search ON user_profiles
    USING GIN(to_tsvector('english', display_name || ' ' || username || ' ' || COALESCE(bio, '')));

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Public profiles are readable by anyone
CREATE POLICY "Public profiles are readable" ON user_profiles
    FOR SELECT USING (visibility = 'public');

-- Users can read own profile regardless of visibility
CREATE POLICY "Users can read own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FOLLOWS TABLE
-- ============================================================================
-- Follow relationships between users

CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status follow_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent self-follows
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    -- One follow per pair
    UNIQUE(follower_id, following_id)
);

-- Index for follower lookups (who am I following?)
CREATE INDEX idx_follows_follower_id ON follows(follower_id) WHERE status = 'active';

-- Index for following lookups (who follows me?)
CREATE INDEX idx_follows_following_id ON follows(following_id) WHERE status = 'active';

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see active follows
CREATE POLICY "Active follows are readable" ON follows
    FOR SELECT USING (status = 'active');

-- Users can see pending follows they're involved in
CREATE POLICY "Users can see own pending follows" ON follows
    FOR SELECT USING (
        status = 'pending' AND (auth.uid() = follower_id OR auth.uid() = following_id)
    );

-- Users can create follows
CREATE POLICY "Users can create follows" ON follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follows
CREATE POLICY "Users can delete own follows" ON follows
    FOR DELETE USING (auth.uid() = follower_id);

-- Users can update follows they're the target of (accept/reject pending)
CREATE POLICY "Users can update incoming follow requests" ON follows
    FOR UPDATE USING (auth.uid() = following_id);

-- ============================================================================
-- POSTS TABLE
-- ============================================================================
-- Social posts/updates

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type post_content_type NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    visibility post_visibility NOT NULL DEFAULT 'public',
    attachments JSONB DEFAULT '[]',
    canvas_id UUID REFERENCES canvases(id) ON DELETE SET NULL,
    widget_id UUID REFERENCES widgets(id) ON DELETE SET NULL,
    reply_to_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    repost_of_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    mentioned_user_ids UUID[] DEFAULT '{}',
    reply_count INTEGER NOT NULL DEFAULT 0,
    repost_count INTEGER NOT NULL DEFAULT 0,
    reaction_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    -- Content length constraint
    CONSTRAINT content_length CHECK (char_length(content) <= 5000)
);

-- Index for author's posts (user timeline)
CREATE INDEX idx_posts_author_id ON posts(author_id, created_at DESC) WHERE NOT is_deleted;

-- Index for replies
CREATE INDEX idx_posts_reply_to_id ON posts(reply_to_id) WHERE reply_to_id IS NOT NULL AND NOT is_deleted;

-- Index for reposts
CREATE INDEX idx_posts_repost_of_id ON posts(repost_of_id) WHERE repost_of_id IS NOT NULL AND NOT is_deleted;

-- Index for feed generation (public posts by timestamp)
CREATE INDEX idx_posts_feed ON posts(created_at DESC) WHERE visibility = 'public' AND NOT is_deleted;

-- Index for canvas shares
CREATE INDEX idx_posts_canvas_id ON posts(canvas_id) WHERE canvas_id IS NOT NULL AND NOT is_deleted;

-- Index for widget shares
CREATE INDEX idx_posts_widget_id ON posts(widget_id) WHERE widget_id IS NOT NULL AND NOT is_deleted;

-- Full-text search on posts
CREATE INDEX idx_posts_search ON posts
    USING GIN(to_tsvector('english', content)) WHERE NOT is_deleted;

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Public posts are readable by anyone
CREATE POLICY "Public posts are readable" ON posts
    FOR SELECT USING (visibility = 'public' AND NOT is_deleted);

-- Authors can read their own posts
CREATE POLICY "Authors can read own posts" ON posts
    FOR SELECT USING (auth.uid() = author_id);

-- Followers can read follower-only posts
CREATE POLICY "Followers can read follower-only posts" ON posts
    FOR SELECT USING (
        visibility = 'followers'
        AND NOT is_deleted
        AND EXISTS (
            SELECT 1 FROM follows
            WHERE follows.follower_id = auth.uid()
            AND follows.following_id = posts.author_id
            AND follows.status = 'active'
        )
    );

-- Mentioned users can read mentioned-only posts
CREATE POLICY "Mentioned users can read mentioned posts" ON posts
    FOR SELECT USING (
        visibility = 'mentioned'
        AND NOT is_deleted
        AND auth.uid() = ANY(mentioned_user_ids)
    );

-- Authors can create posts
CREATE POLICY "Users can create posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Authors can update their own posts
CREATE POLICY "Authors can update own posts" ON posts
    FOR UPDATE USING (auth.uid() = author_id);

-- Authors can soft-delete their own posts
CREATE POLICY "Authors can delete own posts" ON posts
    FOR DELETE USING (auth.uid() = author_id);

-- ============================================================================
-- REACTIONS TABLE
-- ============================================================================
-- Reactions to posts, comments, canvases, and widgets

CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type reaction_target_type NOT NULL,
    target_id UUID NOT NULL,
    type reaction_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- One reaction per user per target
    UNIQUE(user_id, target_type, target_id)
);

-- Index for target reactions
CREATE INDEX idx_reactions_target ON reactions(target_type, target_id);

-- Index for user's reactions
CREATE INDEX idx_reactions_user_id ON reactions(user_id);

-- Enable RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Reactions are readable by anyone
CREATE POLICY "Reactions are readable" ON reactions
    FOR SELECT USING (TRUE);

-- Users can create their own reactions
CREATE POLICY "Users can create reactions" ON reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions" ON reactions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================
-- Comments on posts, canvases, and widgets

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type comment_target_type NOT NULL,
    target_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    mentioned_user_ids UUID[] DEFAULT '{}',
    reply_count INTEGER NOT NULL DEFAULT 0,
    reaction_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    -- Content length constraint
    CONSTRAINT comment_content_length CHECK (char_length(content) <= 2000)
);

-- Index for target comments
CREATE INDEX idx_comments_target ON comments(target_type, target_id, created_at DESC) WHERE NOT is_deleted;

-- Index for nested replies
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL AND NOT is_deleted;

-- Index for author's comments
CREATE INDEX idx_comments_author_id ON comments(author_id) WHERE NOT is_deleted;

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Comments are readable based on target visibility
-- For posts: follow post visibility rules
-- For canvases: follow canvas visibility rules
-- For widgets: all published widget comments are readable
CREATE POLICY "Comments are readable" ON comments
    FOR SELECT USING (NOT is_deleted);

-- Users can create comments
CREATE POLICY "Users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Authors can update their own comments
CREATE POLICY "Authors can update own comments" ON comments
    FOR UPDATE USING (auth.uid() = author_id);

-- Authors can soft-delete their own comments
CREATE POLICY "Authors can delete own comments" ON comments
    FOR DELETE USING (auth.uid() = author_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- User notifications

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    target_type TEXT,
    target_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user's unread notifications
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, created_at DESC)
    WHERE NOT is_read;

-- Index for user's all notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);

-- System can create notifications (via service role)
-- For user-generated notifications, we'll use a function
CREATE POLICY "Users can mark own notifications as read" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = recipient_id);

-- ============================================================================
-- BOOKMARKS TABLE
-- ============================================================================
-- Saved/bookmarked posts

CREATE TABLE bookmarks (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- Index for user's bookmarks
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can manage their own bookmarks
CREATE POLICY "Users can manage own bookmarks" ON bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- BLOCKS TABLE
-- ============================================================================
-- User blocks

CREATE TABLE blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    -- Prevent self-blocks
    CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- Index for checking if someone is blocked
CREATE INDEX idx_blocks_blocked_id ON blocks(blocked_id);

-- Enable RLS
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Users can manage their own blocks
CREATE POLICY "Users can manage own blocks" ON blocks
    FOR ALL USING (auth.uid() = blocker_id);

-- ============================================================================
-- FUNCTIONS FOR DENORMALIZED COUNTS
-- ============================================================================

-- Function to update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
        UPDATE user_profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = OLD.follower_id;
        UPDATE user_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = OLD.following_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
            UPDATE user_profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
        ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = NEW.follower_id;
            UPDATE user_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = NEW.following_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_follow_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON follows
    FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Function to update post count
CREATE OR REPLACE FUNCTION update_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
        UPDATE user_profiles SET post_count = post_count + 1 WHERE user_id = NEW.author_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_deleted AND NOT NEW.is_deleted THEN
            UPDATE user_profiles SET post_count = post_count + 1 WHERE user_id = NEW.author_id;
        ELSIF NOT OLD.is_deleted AND NEW.is_deleted THEN
            UPDATE user_profiles SET post_count = GREATEST(0, post_count - 1) WHERE user_id = NEW.author_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND NOT OLD.is_deleted THEN
        UPDATE user_profiles SET post_count = GREATEST(0, post_count - 1) WHERE user_id = OLD.author_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_post_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_post_count();

-- Function to update reaction counts on posts
CREATE OR REPLACE FUNCTION update_post_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.target_type = 'post' THEN
        UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = NEW.target_id;
    ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'post' THEN
        UPDATE posts SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = OLD.target_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_post_reaction_count_trigger
    AFTER INSERT OR DELETE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_post_reaction_count();

-- Function to update reply counts on posts
CREATE OR REPLACE FUNCTION update_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.reply_to_id IS NOT NULL AND NOT NEW.is_deleted THEN
        UPDATE posts SET reply_count = reply_count + 1 WHERE id = NEW.reply_to_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.reply_to_id IS NOT NULL THEN
        IF OLD.is_deleted AND NOT NEW.is_deleted THEN
            UPDATE posts SET reply_count = reply_count + 1 WHERE id = NEW.reply_to_id;
        ELSIF NOT OLD.is_deleted AND NEW.is_deleted THEN
            UPDATE posts SET reply_count = GREATEST(0, reply_count - 1) WHERE id = NEW.reply_to_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.reply_to_id IS NOT NULL AND NOT OLD.is_deleted THEN
        UPDATE posts SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.reply_to_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_post_reply_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_post_reply_count();

-- Function to update repost counts on posts
CREATE OR REPLACE FUNCTION update_post_repost_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.repost_of_id IS NOT NULL AND NOT NEW.is_deleted THEN
        UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.repost_of_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.repost_of_id IS NOT NULL THEN
        IF OLD.is_deleted AND NOT NEW.is_deleted THEN
            UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.repost_of_id;
        ELSIF NOT OLD.is_deleted AND NEW.is_deleted THEN
            UPDATE posts SET repost_count = GREATEST(0, repost_count - 1) WHERE id = NEW.repost_of_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.repost_of_id IS NOT NULL AND NOT OLD.is_deleted THEN
        UPDATE posts SET repost_count = GREATEST(0, repost_count - 1) WHERE id = OLD.repost_of_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_post_repost_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_post_repost_count();

-- ============================================================================
-- FUNCTION TO CREATE NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
    p_recipient_id UUID,
    p_actor_id UUID,
    p_type notification_type,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Don't notify yourself
    IF p_recipient_id = p_actor_id THEN
        RETURN NULL;
    END IF;

    -- Check if actor is blocked by recipient
    IF EXISTS (SELECT 1 FROM blocks WHERE blocker_id = p_recipient_id AND blocked_id = p_actor_id) THEN
        RETURN NULL;
    END IF;

    INSERT INTO notifications (recipient_id, actor_id, type, target_type, target_id)
    VALUES (p_recipient_id, p_actor_id, p_type, p_target_type, p_target_id)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'Social profile data extending base users - visible to widgets via social integration';
COMMENT ON TABLE follows IS 'Follow relationships between users';
COMMENT ON TABLE posts IS 'Social posts/updates - rendered by social widgets';
COMMENT ON TABLE reactions IS 'Reactions to posts, comments, canvases, and widgets';
COMMENT ON TABLE comments IS 'Comments on posts, canvases, and widgets';
COMMENT ON TABLE notifications IS 'User notifications for social activity';
COMMENT ON TABLE bookmarks IS 'Saved/bookmarked posts';
COMMENT ON TABLE blocks IS 'User blocks';
