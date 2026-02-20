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
