-- StickerNest V5 User Integrations Schema
-- Migration: 00006_add_user_integrations
-- Description: Creates tables for storing external integration credentials and permissions
-- Tables: user_integrations, widget_integration_permissions

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Supported integration providers
CREATE TYPE integration_provider AS ENUM (
    'notion',
    'google_sheets',
    'airtable',
    'github',
    'spotify',
    'weather',
    'openai'
);

-- Integration connection status
CREATE TYPE integration_status AS ENUM (
    'active',      -- Connected and working
    'expired',     -- Token expired, needs refresh
    'revoked',     -- User revoked access
    'error'        -- Connection error
);

-- ============================================================================
-- USER_INTEGRATIONS TABLE
-- ============================================================================
-- Stores OAuth tokens and credentials for external integrations
-- Credentials are encrypted at rest via Supabase Vault

CREATE TABLE user_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider integration_provider NOT NULL,

    -- OAuth tokens (encrypted via Supabase Vault in production)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',

    -- Token expiration
    expires_at TIMESTAMPTZ,

    -- Provider-specific data (workspace ID, account info, etc.)
    provider_data JSONB DEFAULT '{}',

    -- Scopes granted by the user
    scopes TEXT[] DEFAULT '{}',

    -- Connection status
    status integration_status NOT NULL DEFAULT 'active',
    last_error TEXT,
    last_used_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each user can have one connection per provider
    UNIQUE(user_id, provider)
);

-- Index for user lookups
CREATE INDEX idx_user_integrations_user_id ON user_integrations(user_id);

-- Index for provider lookups (for admin/analytics)
CREATE INDEX idx_user_integrations_provider ON user_integrations(provider);

-- Index for token refresh (find expiring tokens)
CREATE INDEX idx_user_integrations_expires_at ON user_integrations(expires_at)
    WHERE status = 'active' AND expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own integrations
CREATE POLICY "Users can manage own integrations" ON user_integrations
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- WIDGET_INTEGRATION_PERMISSIONS TABLE
-- ============================================================================
-- Tracks which databases/resources a user has granted access to per widget
-- This allows fine-grained permission control (e.g., widget can only access specific Notion databases)

CREATE TABLE widget_integration_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,

    -- Specific resources the widget can access
    -- e.g., for Notion: { "databases": ["db-id-1", "db-id-2"], "pages": ["page-id-1"] }
    allowed_resources JSONB NOT NULL DEFAULT '{}',

    -- Permission level
    can_read BOOLEAN NOT NULL DEFAULT TRUE,
    can_write BOOLEAN NOT NULL DEFAULT FALSE,

    -- When the user granted permission
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique per user/widget/integration combo
    UNIQUE(user_id, widget_id, integration_id)
);

-- Index for widget permission lookups
CREATE INDEX idx_widget_integration_permissions_widget ON widget_integration_permissions(widget_id);
CREATE INDEX idx_widget_integration_permissions_user ON widget_integration_permissions(user_id);
CREATE INDEX idx_widget_integration_permissions_integration ON widget_integration_permissions(integration_id);

-- Enable RLS
ALTER TABLE widget_integration_permissions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own widget permissions
CREATE POLICY "Users can manage own widget permissions" ON widget_integration_permissions
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- INTEGRATION_USAGE_LOG TABLE
-- ============================================================================
-- Audit log for integration API calls (for rate limiting and debugging)

CREATE TABLE integration_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,
    widget_instance_id UUID, -- NULL if called from non-widget context

    -- API call details
    operation TEXT NOT NULL, -- e.g., 'notion.database.query', 'notion.page.create'
    request_hash TEXT, -- Hash of request for deduplication

    -- Response tracking
    success BOOLEAN NOT NULL,
    error_code TEXT,
    response_time_ms INTEGER,

    -- Rate limiting metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rate limiting (count calls per user per integration in time window)
CREATE INDEX idx_integration_usage_log_rate_limit
    ON integration_usage_log(user_id, integration_id, created_at DESC);

-- Index for widget usage tracking
CREATE INDEX idx_integration_usage_log_widget
    ON integration_usage_log(widget_instance_id) WHERE widget_instance_id IS NOT NULL;

-- Automatically clean up old logs (keep 30 days)
-- Note: This should be run via a scheduled function
CREATE INDEX idx_integration_usage_log_cleanup
    ON integration_usage_log(created_at);

-- Enable RLS
ALTER TABLE integration_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage logs
CREATE POLICY "Users can view own usage logs" ON integration_usage_log
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert logs (via service role)
CREATE POLICY "Service can insert logs" ON integration_usage_log
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

CREATE TRIGGER update_user_integrations_updated_at
    BEFORE UPDATE ON user_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user has an active integration
CREATE OR REPLACE FUNCTION has_active_integration(
    p_user_id UUID,
    p_provider integration_provider
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_integrations
        WHERE user_id = p_user_id
        AND provider = p_provider
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get integration for API calls
CREATE OR REPLACE FUNCTION get_user_integration(
    p_user_id UUID,
    p_provider integration_provider
) RETURNS TABLE (
    id UUID,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    provider_data JSONB,
    scopes TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ui.id,
        ui.access_token,
        ui.refresh_token,
        ui.expires_at,
        ui.provider_data,
        ui.scopes
    FROM user_integrations ui
    WHERE ui.user_id = p_user_id
    AND ui.provider = p_provider
    AND ui.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check widget permission for a specific resource
CREATE OR REPLACE FUNCTION check_widget_integration_permission(
    p_user_id UUID,
    p_widget_id UUID,
    p_provider integration_provider,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_requires_write BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN AS $$
DECLARE
    v_allowed_resources JSONB;
    v_can_write BOOLEAN;
BEGIN
    SELECT allowed_resources, can_write
    INTO v_allowed_resources, v_can_write
    FROM widget_integration_permissions wip
    JOIN user_integrations ui ON wip.integration_id = ui.id
    WHERE wip.user_id = p_user_id
    AND wip.widget_id = p_widget_id
    AND ui.provider = p_provider
    AND ui.status = 'active';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check write permission if required
    IF p_requires_write AND NOT v_can_write THEN
        RETURN FALSE;
    END IF;

    -- Check if resource is in allowed list
    -- Empty array means "all resources"
    IF jsonb_array_length(v_allowed_resources -> p_resource_type) = 0 THEN
        RETURN TRUE;
    END IF;

    RETURN v_allowed_resources -> p_resource_type ? p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_integrations IS 'OAuth tokens and credentials for external integrations (Notion, etc.)';
COMMENT ON TABLE widget_integration_permissions IS 'Fine-grained permissions for which resources each widget can access';
COMMENT ON TABLE integration_usage_log IS 'Audit log for integration API calls (rate limiting, debugging)';
COMMENT ON FUNCTION has_active_integration IS 'Check if user has an active integration for a provider';
COMMENT ON FUNCTION get_user_integration IS 'Get integration credentials for API calls';
COMMENT ON FUNCTION check_widget_integration_permission IS 'Check if a widget has permission to access a specific resource';
