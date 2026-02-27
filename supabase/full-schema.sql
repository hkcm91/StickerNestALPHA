-- StickerNest V5 Initial Database Schema
-- Migration: 00001_initial_schema
-- Description: Creates all tables required by Layer 0 (Kernel)
-- Tables: users, canvases, entities, widgets, stickers, pipelines, widget_connections,
--         presence, data_sources, data_source_acl, widget_instances, user_installed_widgets, user_widget_state

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- DataSource types (doc | table | note | folder | file | custom)
CREATE TYPE data_source_type AS ENUM ('doc', 'table', 'note', 'folder', 'file', 'custom');

-- DataSource scope (canvas | user | shared | public)
CREATE TYPE data_source_scope AS ENUM ('canvas', 'user', 'shared', 'public');

-- DataSource ACL roles (owner | editor | commenter | viewer)
CREATE TYPE acl_role AS ENUM ('owner', 'editor', 'commenter', 'viewer');

-- Canvas sharing roles
CREATE TYPE canvas_role AS ENUM ('owner', 'editor', 'commenter', 'viewer');

-- Entity types for the canvas
CREATE TYPE entity_type AS ENUM ('sticker', 'text', 'widget_container', 'shape', 'drawing', 'group');

-- Pipeline node types
CREATE TYPE pipeline_node_type AS ENUM ('widget', 'transform_filter', 'transform_map', 'transform_merge', 'transform_delay', 'input', 'output');

-- User subscription tiers
CREATE TYPE user_tier AS ENUM ('free', 'creator', 'pro', 'enterprise');

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Extends Supabase auth.users with application-specific profile data

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    tier user_tier NOT NULL DEFAULT 'free',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- CANVASES TABLE
-- ============================================================================
-- Represents a canvas workspace (infinite 2D/3D workspace)

CREATE TABLE canvases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    thumbnail_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    default_role canvas_role NOT NULL DEFAULT 'viewer',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for owner lookups
CREATE INDEX idx_canvases_owner_id ON canvases(owner_id);

-- Index for public/slug lookups
CREATE INDEX idx_canvases_slug ON canvases(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_canvases_public ON canvases(is_public) WHERE is_public = TRUE;

-- Enable RLS
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

-- Canvas owners can do anything
CREATE POLICY "Canvas owners have full access" ON canvases
    FOR ALL USING (auth.uid() = owner_id);

-- Public canvases are readable by anyone
CREATE POLICY "Public canvases are readable" ON canvases
    FOR SELECT USING (is_public = TRUE);

-- ============================================================================
-- CANVAS MEMBERS TABLE
-- ============================================================================
-- Tracks canvas membership and roles

CREATE TABLE canvas_members (
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role canvas_role NOT NULL DEFAULT 'viewer',
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (canvas_id, user_id)
);

-- Index for user's canvases lookup
CREATE INDEX idx_canvas_members_user_id ON canvas_members(user_id);

-- Enable RLS
ALTER TABLE canvas_members ENABLE ROW LEVEL SECURITY;

-- Members can see their own membership
CREATE POLICY "Members can see own membership" ON canvas_members
    FOR SELECT USING (auth.uid() = user_id);

-- Canvas owners can manage members
CREATE POLICY "Canvas owners can manage members" ON canvas_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM canvases WHERE canvases.id = canvas_members.canvas_id AND canvases.owner_id = auth.uid()
        )
    );

-- ============================================================================
-- ENTITIES TABLE
-- ============================================================================
-- Canvas entities with spatial properties

CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    type entity_type NOT NULL,
    position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_z DOUBLE PRECISION DEFAULT 0,
    width DOUBLE PRECISION NOT NULL DEFAULT 100,
    height DOUBLE PRECISION NOT NULL DEFAULT 100,
    rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
    scale_x DOUBLE PRECISION NOT NULL DEFAULT 1,
    scale_y DOUBLE PRECISION NOT NULL DEFAULT 1,
    z_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    parent_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    properties JSONB DEFAULT '{}',
    spatial_position JSONB, -- For 3D/VR: { position: Vector3, rotation: Quaternion, normal: Vector3 }
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for canvas entity lookups (most common query)
CREATE INDEX idx_entities_canvas_id ON entities(canvas_id);

-- Index for z-order sorting
CREATE INDEX idx_entities_canvas_z_order ON entities(canvas_id, z_order);

-- Index for spatial queries
CREATE INDEX idx_entities_canvas_position ON entities(canvas_id, position_x, position_y);

-- Index for parent lookups (grouping)
CREATE INDEX idx_entities_parent_id ON entities(parent_id) WHERE parent_id IS NOT NULL;

-- Enable RLS
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- Canvas members can read entities
CREATE POLICY "Canvas members can read entities" ON entities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = entities.canvas_id
            AND (
                canvases.owner_id = auth.uid()
                OR canvases.is_public = TRUE
                OR EXISTS (
                    SELECT 1 FROM canvas_members
                    WHERE canvas_members.canvas_id = canvases.id
                    AND canvas_members.user_id = auth.uid()
                )
            )
        )
    );

-- Canvas editors can modify entities
CREATE POLICY "Canvas editors can modify entities" ON entities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = entities.canvas_id
            AND (
                canvases.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM canvas_members
                    WHERE canvas_members.canvas_id = canvases.id
                    AND canvas_members.user_id = auth.uid()
                    AND canvas_members.role IN ('owner', 'editor')
                )
            )
        )
    );

-- ============================================================================
-- WIDGETS TABLE
-- ============================================================================
-- Widget definitions from the marketplace

CREATE TABLE widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    html_content TEXT NOT NULL,
    manifest JSONB NOT NULL,
    thumbnail_url TEXT,
    icon_url TEXT,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    license TEXT NOT NULL DEFAULT 'MIT',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    is_deprecated BOOLEAN NOT NULL DEFAULT FALSE,
    install_count INTEGER NOT NULL DEFAULT 0,
    rating_average DOUBLE PRECISION,
    rating_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for marketplace browsing
CREATE INDEX idx_widgets_published ON widgets(is_published, is_deprecated) WHERE is_published = TRUE AND is_deprecated = FALSE;
CREATE INDEX idx_widgets_category ON widgets(category) WHERE is_published = TRUE;
CREATE INDEX idx_widgets_author_id ON widgets(author_id);
CREATE INDEX idx_widgets_slug ON widgets(slug);

-- Full-text search index
CREATE INDEX idx_widgets_search ON widgets USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Enable RLS
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;

-- Published widgets are readable by anyone
CREATE POLICY "Published widgets are readable" ON widgets
    FOR SELECT USING (is_published = TRUE);

-- Authors can manage their own widgets
CREATE POLICY "Authors can manage own widgets" ON widgets
    FOR ALL USING (auth.uid() = author_id);

-- ============================================================================
-- STICKERS TABLE
-- ============================================================================
-- Visual asset library (images, GIFs, videos)

CREATE TABLE stickers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_type TEXT NOT NULL, -- 'image/png', 'image/gif', 'video/mp4', etc.
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for owner lookups
CREATE INDEX idx_stickers_owner_id ON stickers(owner_id);

-- Index for public stickers
CREATE INDEX idx_stickers_public ON stickers(is_public) WHERE is_public = TRUE;

-- Enable RLS
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

-- Users can manage their own stickers
CREATE POLICY "Users can manage own stickers" ON stickers
    FOR ALL USING (auth.uid() = owner_id);

-- Public stickers are readable
CREATE POLICY "Public stickers are readable" ON stickers
    FOR SELECT USING (is_public = TRUE);

-- ============================================================================
-- PIPELINES TABLE
-- ============================================================================
-- Visual pipeline graphs connecting widget outputs to inputs

CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    nodes JSONB NOT NULL DEFAULT '[]', -- Array of pipeline nodes
    edges JSONB NOT NULL DEFAULT '[]', -- Array of pipeline edges
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for canvas pipelines
CREATE INDEX idx_pipelines_canvas_id ON pipelines(canvas_id);

-- Enable RLS
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

-- Canvas members can read pipelines
CREATE POLICY "Canvas members can read pipelines" ON pipelines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = pipelines.canvas_id
            AND (
                canvases.owner_id = auth.uid()
                OR canvases.is_public = TRUE
                OR EXISTS (
                    SELECT 1 FROM canvas_members
                    WHERE canvas_members.canvas_id = canvases.id
                    AND canvas_members.user_id = auth.uid()
                )
            )
        )
    );

-- Canvas editors can modify pipelines
CREATE POLICY "Canvas editors can modify pipelines" ON pipelines
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = pipelines.canvas_id
            AND (
                canvases.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM canvas_members
                    WHERE canvas_members.canvas_id = canvases.id
                    AND canvas_members.user_id = auth.uid()
                    AND canvas_members.role IN ('owner', 'editor')
                )
            )
        )
    );

-- ============================================================================
-- WIDGET_CONNECTIONS TABLE
-- ============================================================================
-- Maps widget instance ports to pipeline edges (denormalized for query performance)

CREATE TABLE widget_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    source_widget_instance_id UUID NOT NULL,
    source_port TEXT NOT NULL,
    target_widget_instance_id UUID NOT NULL,
    target_port TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for source/target lookups
CREATE INDEX idx_widget_connections_pipeline_id ON widget_connections(pipeline_id);
CREATE INDEX idx_widget_connections_source ON widget_connections(source_widget_instance_id);
CREATE INDEX idx_widget_connections_target ON widget_connections(target_widget_instance_id);

-- Enable RLS
ALTER TABLE widget_connections ENABLE ROW LEVEL SECURITY;

-- Inherit pipeline access
CREATE POLICY "Inherit pipeline access" ON widget_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM pipelines
            WHERE pipelines.id = widget_connections.pipeline_id
            AND EXISTS (
                SELECT 1 FROM canvases
                WHERE canvases.id = pipelines.canvas_id
                AND (
                    canvases.owner_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM canvas_members
                        WHERE canvas_members.canvas_id = canvases.id
                        AND canvas_members.user_id = auth.uid()
                        AND canvas_members.role IN ('owner', 'editor')
                    )
                )
            )
        )
    );

-- ============================================================================
-- PRESENCE TABLE
-- ============================================================================
-- Real-time user presence on canvases (used with Supabase Realtime)

CREATE TABLE presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    color TEXT NOT NULL, -- Hex color for cursor/avatar
    cursor_x DOUBLE PRECISION,
    cursor_y DOUBLE PRECISION,
    status TEXT DEFAULT 'active', -- 'active', 'idle', 'away'
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(canvas_id, user_id)
);

-- Index for canvas presence lookups
CREATE INDEX idx_presence_canvas_id ON presence(canvas_id);

-- Index for cleanup of stale presence
CREATE INDEX idx_presence_last_seen_at ON presence(last_seen_at);

-- Enable RLS
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Canvas members can see presence
CREATE POLICY "Canvas members can see presence" ON presence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = presence.canvas_id
            AND (
                canvases.owner_id = auth.uid()
                OR canvases.is_public = TRUE
                OR EXISTS (
                    SELECT 1 FROM canvas_members
                    WHERE canvas_members.canvas_id = canvases.id
                    AND canvas_members.user_id = auth.uid()
                )
            )
        )
    );

-- Users can update their own presence
CREATE POLICY "Users can update own presence" ON presence
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- DATA_SOURCES TABLE
-- ============================================================================
-- Persistent data records independent of widgets

CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type data_source_type NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope data_source_scope NOT NULL DEFAULT 'canvas',
    canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT,
    schema JSONB, -- Schema definition for structured data sources
    content JSONB, -- The actual data content
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Constraint: canvas-scoped data sources must have a canvas_id
    CONSTRAINT data_source_canvas_scope_check CHECK (
        scope != 'canvas' OR canvas_id IS NOT NULL
    )
);

-- Index for owner lookups
CREATE INDEX idx_data_sources_owner_id ON data_sources(owner_id);

-- Index for canvas data sources
CREATE INDEX idx_data_sources_canvas_id ON data_sources(canvas_id) WHERE canvas_id IS NOT NULL;

-- Index for type filtering
CREATE INDEX idx_data_sources_type ON data_sources(type);

-- Enable RLS
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- Owners have full access
CREATE POLICY "Data source owners have full access" ON data_sources
    FOR ALL USING (auth.uid() = owner_id);

-- Public data sources are readable
CREATE POLICY "Public data sources are readable" ON data_sources
    FOR SELECT USING (scope = 'public');

-- ============================================================================
-- DATA_SOURCE_ACL TABLE
-- ============================================================================
-- Access control for data sources (separate from canvas roles)

CREATE TABLE data_source_acl (
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role acl_role NOT NULL DEFAULT 'viewer',
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (data_source_id, user_id)
);

-- Index for user's data source access
CREATE INDEX idx_data_source_acl_user_id ON data_source_acl(user_id);

-- Enable RLS
ALTER TABLE data_source_acl ENABLE ROW LEVEL SECURITY;

-- Data source owners can manage ACL
CREATE POLICY "Data source owners can manage ACL" ON data_source_acl
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM data_sources
            WHERE data_sources.id = data_source_acl.data_source_id
            AND data_sources.owner_id = auth.uid()
        )
    );

-- Users can see their own ACL entries
CREATE POLICY "Users can see own ACL entries" ON data_source_acl
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- WIDGET_INSTANCES TABLE
-- ============================================================================
-- Instances of widgets placed on canvases with their state

CREATE TABLE widget_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    config JSONB DEFAULT '{}', -- User-configured values
    state JSONB DEFAULT '{}', -- Widget instance state (< 1MB limit enforced at API level)
    state_size INTEGER NOT NULL DEFAULT 0, -- Cached size for limit checks
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for entity lookup (one-to-one)
CREATE UNIQUE INDEX idx_widget_instances_entity_id ON widget_instances(entity_id);

-- Index for widget lookup (analytics)
CREATE INDEX idx_widget_instances_widget_id ON widget_instances(widget_id);

-- Enable RLS
ALTER TABLE widget_instances ENABLE ROW LEVEL SECURITY;

-- Inherit entity access
CREATE POLICY "Inherit entity access for widget instances" ON widget_instances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM entities
            WHERE entities.id = widget_instances.entity_id
            AND EXISTS (
                SELECT 1 FROM canvases
                WHERE canvases.id = entities.canvas_id
                AND (
                    canvases.owner_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM canvas_members
                        WHERE canvas_members.canvas_id = canvases.id
                        AND canvas_members.user_id = auth.uid()
                        AND canvas_members.role IN ('owner', 'editor')
                    )
                )
            )
        )
    );

-- ============================================================================
-- USER_INSTALLED_WIDGETS TABLE
-- ============================================================================
-- Tracks which widgets a user has installed

CREATE TABLE user_installed_widgets (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, widget_id)
);

-- Index for widget install counts
CREATE INDEX idx_user_installed_widgets_widget_id ON user_installed_widgets(widget_id);

-- Enable RLS
ALTER TABLE user_installed_widgets ENABLE ROW LEVEL SECURITY;

-- Users can manage their own installations
CREATE POLICY "Users can manage own widget installations" ON user_installed_widgets
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- USER_WIDGET_STATE TABLE
-- ============================================================================
-- Cross-canvas user state for widgets (10MB total per user limit enforced at API level)

CREATE TABLE user_widget_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    value_size INTEGER NOT NULL DEFAULT 0, -- Cached size for limit checks
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, widget_id, key)
);

-- Index for user widget state lookups
CREATE INDEX idx_user_widget_state_user_widget ON user_widget_state(user_id, widget_id);

-- Enable RLS
ALTER TABLE user_widget_state ENABLE ROW LEVEL SECURITY;

-- Users can manage their own widget state
CREATE POLICY "Users can manage own widget state" ON user_widget_state
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_canvases_updated_at BEFORE UPDATE ON canvases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_widgets_updated_at BEFORE UPDATE ON widgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stickers_updated_at BEFORE UPDATE ON stickers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_canvas_members_updated_at BEFORE UPDATE ON canvas_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_source_acl_updated_at BEFORE UPDATE ON data_source_acl FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_widget_instances_updated_at BEFORE UPDATE ON widget_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_widget_state_updated_at BEFORE UPDATE ON user_widget_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE canvases IS 'Canvas workspaces - the infinite 2D/3D workspace';
COMMENT ON TABLE canvas_members IS 'Canvas membership and role assignments';
COMMENT ON TABLE entities IS 'Canvas entities with spatial properties';
COMMENT ON TABLE widgets IS 'Widget definitions from the marketplace';
COMMENT ON TABLE stickers IS 'Visual asset library (images, GIFs, videos)';
COMMENT ON TABLE pipelines IS 'Visual pipeline graphs connecting widget outputs to inputs';
COMMENT ON TABLE widget_connections IS 'Maps widget instance ports to pipeline edges';
COMMENT ON TABLE presence IS 'Real-time user presence on canvases';
COMMENT ON TABLE data_sources IS 'Persistent data records independent of widgets';
COMMENT ON TABLE data_source_acl IS 'Access control for data sources (separate from canvas roles)';
COMMENT ON TABLE widget_instances IS 'Instances of widgets placed on canvases with their state';
COMMENT ON TABLE user_installed_widgets IS 'Tracks which widgets a user has installed';
COMMENT ON TABLE user_widget_state IS 'Cross-canvas user state for widgets';
-- Add revision column for conflict detection on table/custom data sources
ALTER TABLE data_sources ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_data_sources_revision ON data_sources(id, revision);
-- Migration: Add widget_snapshots table for Lab version history
-- Required by Layer 2 (Lab) version manager

CREATE TABLE widget_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id TEXT NOT NULL,
  label TEXT NOT NULL,
  html_content TEXT NOT NULL,
  manifest JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_widget_snapshots_widget_id ON widget_snapshots(widget_id);
CREATE INDEX idx_widget_snapshots_created_by ON widget_snapshots(created_by);

ALTER TABLE widget_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON widget_snapshots FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create own snapshots"
  ON widget_snapshots FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own snapshots"
  ON widget_snapshots FOR DELETE
  USING (auth.uid() = created_by);
-- Migration: Add marketplace tables for widget reviews and version history
-- Required by Layer 5 (Marketplace)

-- Widget reviews table (one review per user per widget)
CREATE TABLE widget_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(widget_id, user_id)
);

CREATE INDEX idx_widget_reviews_widget_id ON widget_reviews(widget_id);
CREATE INDEX idx_widget_reviews_user_id ON widget_reviews(user_id);

ALTER TABLE widget_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read widget reviews"
  ON widget_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create own reviews"
  ON widget_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON widget_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON widget_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Widget versions table (publish history)
CREATE TABLE widget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  html_content TEXT NOT NULL,
  manifest JSONB NOT NULL,
  changelog TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(widget_id, version)
);

CREATE INDEX idx_widget_versions_widget_id ON widget_versions(widget_id);

ALTER TABLE widget_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read widget versions"
  ON widget_versions FOR SELECT
  USING (true);

CREATE POLICY "Authors can create widget versions"
  ON widget_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM widgets
      WHERE widgets.id = widget_versions.widget_id
      AND widgets.author_id = auth.uid()
    )
  );

-- Trigger to automatically update rating_average and rating_count on widgets table
CREATE OR REPLACE FUNCTION update_widget_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE widgets SET
    rating_average = (
      SELECT AVG(rating)::DOUBLE PRECISION
      FROM widget_reviews
      WHERE widget_id = COALESCE(NEW.widget_id, OLD.widget_id)
    ),
    rating_count = (
      SELECT COUNT(*)::INTEGER
      FROM widget_reviews
      WHERE widget_id = COALESCE(NEW.widget_id, OLD.widget_id)
    )
  WHERE id = COALESCE(NEW.widget_id, OLD.widget_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON widget_reviews
  FOR EACH ROW EXECUTE FUNCTION update_widget_rating();
-- StickerNest V5 Billing & Subscriptions
-- Migration: 00007_add_billing
-- Description: Adds platform subscription management, Stripe integration,
--              and tier-based quota enforcement tables.

-- ============================================================================
-- PLATFORM SUBSCRIPTIONS TABLE
-- ============================================================================
-- Links StickerNest users to their Stripe subscription for platform tiers.

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    tier user_tier NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',  -- active, past_due, canceled, trialing
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status != 'canceled';

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role (webhooks) can insert/update subscriptions
-- Client-side inserts are blocked — all writes go through edge functions
CREATE POLICY "Service role manages subscriptions" ON subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- STRIPE EVENTS TABLE (idempotency log)
-- ============================================================================
-- Prevents duplicate processing of Stripe webhook events.

CREATE TABLE stripe_events (
    id TEXT PRIMARY KEY,  -- Stripe event ID (evt_...)
    type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup old events (older than 30 days)
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed_at);

-- No RLS — only accessed by service role in edge functions
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages stripe events" ON stripe_events
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TIER QUOTAS TABLE
-- ============================================================================
-- Defines resource limits per subscription tier. -1 = unlimited.

CREATE TABLE tier_quotas (
    tier user_tier PRIMARY KEY,
    max_canvases INTEGER NOT NULL,
    max_storage_mb INTEGER NOT NULL,
    max_widgets_per_canvas INTEGER NOT NULL,
    max_collaborators_per_canvas INTEGER NOT NULL,
    can_use_custom_domain BOOLEAN NOT NULL DEFAULT FALSE,
    can_use_integrations BOOLEAN NOT NULL DEFAULT FALSE,
    can_publish_widgets BOOLEAN NOT NULL DEFAULT FALSE,
    can_sell BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed default quota values
INSERT INTO tier_quotas (tier, max_canvases, max_storage_mb, max_widgets_per_canvas,
    max_collaborators_per_canvas, can_use_custom_domain, can_use_integrations,
    can_publish_widgets, can_sell)
VALUES
    ('free',       3,    100,  10,  3,  FALSE, FALSE, FALSE, FALSE),
    ('creator',   10,   1000,  50, 10,  FALSE, TRUE,  TRUE,  TRUE),
    ('pro',       50,   5000, 200, 50,  TRUE,  TRUE,  TRUE,  TRUE),
    ('enterprise', -1, 50000,  -1, -1,  TRUE,  TRUE,  TRUE,  TRUE);

-- Tier quotas are publicly readable (no secrets), only service role can modify
ALTER TABLE tier_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tier quotas" ON tier_quotas
    FOR SELECT USING (true);

CREATE POLICY "Service role manages tier quotas" ON tier_quotas
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- StickerNest V5 Creator Commerce
-- Migration: 00008_add_creator_commerce
-- Description: Stripe Connect accounts, canvas subscription tiers, shop items,
--              orders, and widget marketplace pricing.

-- ============================================================================
-- CREATOR STRIPE CONNECT ACCOUNTS
-- ============================================================================

CREATE TABLE creator_accounts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    stripe_connect_account_id TEXT NOT NULL UNIQUE,
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    country TEXT,
    default_currency TEXT DEFAULT 'usd',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE creator_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own creator account" ON creator_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages creator accounts" ON creator_accounts
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- CANVAS SUBSCRIPTION TIERS (creator-defined pricing)
-- ============================================================================

CREATE TABLE canvas_subscription_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    stripe_price_id TEXT,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    interval TEXT DEFAULT 'month',  -- month | year | one_time
    benefits JSONB DEFAULT '[]',
    canvas_role canvas_role NOT NULL DEFAULT 'viewer',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canvas_sub_tiers_canvas ON canvas_subscription_tiers(canvas_id);

ALTER TABLE canvas_subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tiers" ON canvas_subscription_tiers
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Canvas owners manage tiers" ON canvas_subscription_tiers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM canvases WHERE canvases.id = canvas_id AND canvases.owner_id = auth.uid())
    );

-- ============================================================================
-- CANVAS SUBSCRIPTIONS (buyer → creator canvas)
-- ============================================================================

CREATE TABLE canvas_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES canvas_subscription_tiers(id),
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(buyer_id, canvas_id)
);

CREATE INDEX idx_canvas_subs_canvas ON canvas_subscriptions(canvas_id);
CREATE INDEX idx_canvas_subs_buyer ON canvas_subscriptions(buyer_id);

ALTER TABLE canvas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers see own subscriptions" ON canvas_subscriptions
    FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Canvas owners see subscribers" ON canvas_subscriptions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM canvases WHERE canvases.id = canvas_id AND canvases.owner_id = auth.uid())
    );

CREATE POLICY "Service role manages canvas subscriptions" ON canvas_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SHOP ITEMS (physical or digital goods sold via canvas)
-- ============================================================================

CREATE TYPE shop_item_type AS ENUM ('digital', 'physical');
CREATE TYPE shop_item_fulfillment AS ENUM ('instant', 'manual', 'external');

CREATE TABLE shop_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    item_type shop_item_type NOT NULL DEFAULT 'digital',
    fulfillment shop_item_fulfillment NOT NULL DEFAULT 'instant',
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    stripe_price_id TEXT,
    thumbnail_url TEXT,
    images JSONB DEFAULT '[]',
    digital_asset_url TEXT,
    requires_shipping BOOLEAN NOT NULL DEFAULT FALSE,
    shipping_note TEXT,
    stock_count INTEGER,        -- NULL = unlimited
    max_per_buyer INTEGER DEFAULT 1,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_items_canvas ON shop_items(canvas_id) WHERE is_active;
CREATE INDEX idx_shop_items_seller ON shop_items(seller_id);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active items" ON shop_items
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Sellers manage own items" ON shop_items
    FOR ALL USING (auth.uid() = seller_id);

-- ============================================================================
-- ORDERS (tracks all purchases: subscriptions, shop items, widgets)
-- ============================================================================

CREATE TYPE order_type AS ENUM ('canvas_subscription', 'shop_item', 'widget');
CREATE TYPE order_status AS ENUM (
    'pending',
    'paid',
    'fulfilled',
    'shipped',
    'delivered',
    'refunded',
    'disputed',
    'canceled'
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id),
    order_type order_type NOT NULL,
    item_id UUID NOT NULL,
    stripe_payment_intent_id TEXT,
    stripe_checkout_session_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    platform_fee_cents INTEGER NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    shipping_address JSONB,
    tracking_number TEXT,
    tracking_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_seller ON orders(seller_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('fulfilled', 'delivered');

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers see own orders" ON orders
    FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers see incoming orders" ON orders
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers update own orders" ON orders
    FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Service role manages orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- WIDGET MARKETPLACE PRICING
-- ============================================================================

ALTER TABLE widgets ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0;
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS is_free BOOLEAN
    GENERATED ALWAYS AS (price_cents = 0) STORED;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER creator_accounts_updated_at
    BEFORE UPDATE ON creator_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER canvas_subscription_tiers_updated_at
    BEFORE UPDATE ON canvas_subscription_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER canvas_subscriptions_updated_at
    BEFORE UPDATE ON canvas_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER shop_items_updated_at
    BEFORE UPDATE ON shop_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- StickerNest V5 Creator Commerce — schema fixes
-- Migration: 00009_fix_creator_commerce
-- Description: Add missing creator_id to canvas_subscription_tiers, add
--              pagination-friendly indexes, and add stock reservation support.

-- ============================================================================
-- FIX: Add creator_id to canvas_subscription_tiers
-- The checkout integration needs to query tiers by creator. The RLS policy
-- uses a join through canvases.owner_id, but the application layer needs a
-- direct column for efficient queries and inserts.
-- ============================================================================

ALTER TABLE canvas_subscription_tiers
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Backfill creator_id from the canvas owner
UPDATE canvas_subscription_tiers
  SET creator_id = canvases.owner_id
  FROM canvases
  WHERE canvas_subscription_tiers.canvas_id = canvases.id
    AND canvas_subscription_tiers.creator_id IS NULL;

-- Now make it NOT NULL after backfill
ALTER TABLE canvas_subscription_tiers
  ALTER COLUMN creator_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_canvas_sub_tiers_creator
  ON canvas_subscription_tiers(creator_id);

-- ============================================================================
-- Stock management RPC for atomic increment/release
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_stock(item_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE shop_items
    SET stock_count = stock_count + amount
    WHERE id = item_id
      AND stock_count IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Pagination-friendly indexes for orders and items
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shop_items_canvas_active_created
  ON shop_items(canvas_id, created_at DESC) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_orders_buyer_created
  ON orders(buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_seller_created
  ON orders(seller_id, created_at DESC);
-- StickerNest V5 Concurrency & Security
-- Migration: 00010_concurrency_and_security
-- Description: Add revision-based concurrency control for tiers and shop items,
--              add cancelled_at / refund_requested_at timestamps for audit trails.

-- ============================================================================
-- REVISION COLUMNS for optimistic concurrency control
-- ============================================================================

ALTER TABLE canvas_subscription_tiers
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

ALTER TABLE shop_items
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- AUTO-INCREMENT REVISION TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_revision() RETURNS TRIGGER AS $$
BEGIN
  NEW.revision = OLD.revision + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- REVISION TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_tier_revision BEFORE UPDATE ON canvas_subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION increment_revision();

CREATE TRIGGER trg_item_revision BEFORE UPDATE ON shop_items
  FOR EACH ROW EXECUTE FUNCTION increment_revision();

-- ============================================================================
-- AUDIT TIMESTAMP COLUMNS
-- ============================================================================

-- Track when a subscription was cancelled (separate from status change)
ALTER TABLE canvas_subscriptions
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Track when a refund was requested on an order (separate from status change)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ;
-- Migration 00011: Fix order_status enum — add missing values
--
-- The order_status enum (created in 00008) is missing 'refund_requested' which
-- is written by both checkout-integration.ts and the request-refund edge function.
-- Without this value, those UPDATE statements fail at the Postgres level.

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refund_requested';
