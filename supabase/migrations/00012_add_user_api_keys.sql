-- StickerNest V5 User API Keys Schema
-- Migration: 00012_add_user_api_keys
-- Description: Creates table for storing user-provided API keys (BYOK model)
-- Separate from OAuth-based user_integrations (simpler lifecycle, no token refresh)

-- ============================================================================
-- ENABLE PGCRYPTO (if not already enabled)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Supported API key providers
CREATE TYPE api_key_provider AS ENUM (
    'replicate',
    'openai',
    'anthropic',
    'custom'
);

-- API key status
CREATE TYPE api_key_status AS ENUM (
    'active',      -- Key validated and working
    'invalid',     -- Key failed validation
    'pending'      -- Awaiting validation (initial state)
);

-- ============================================================================
-- USER_API_KEYS TABLE
-- ============================================================================
-- Stores user-provided API keys for BYOK integrations
-- Keys are encrypted at rest using pgcrypto with a server-side secret

CREATE TABLE user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider api_key_provider NOT NULL,

    -- For custom providers, a user-defined name
    name TEXT,

    -- Encrypted API key (never exposed to client)
    -- Encryption uses pgcrypto pgp_sym_encrypt with server-side secret
    encrypted_key BYTEA NOT NULL,

    -- Last 6 characters of the key for display purposes (e.g., "...abc123")
    key_suffix TEXT NOT NULL CHECK (char_length(key_suffix) <= 6),

    -- Validation status
    status api_key_status NOT NULL DEFAULT 'pending',
    validation_error TEXT,
    last_validated_at TIMESTAMPTZ,

    -- Usage tracking
    last_used_at TIMESTAMPTZ,

    -- Custom provider configuration (only used when provider = 'custom')
    custom_base_url TEXT,
    custom_header_name TEXT DEFAULT 'Authorization',
    custom_header_prefix TEXT DEFAULT 'Bearer',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each user can have one key per provider (except custom)
    -- Custom providers are distinguished by name
    UNIQUE(user_id, provider, name)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for user lookups
CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);

-- Index for provider lookups
CREATE INDEX idx_user_api_keys_provider ON user_api_keys(provider);

-- Index for active keys lookup
CREATE INDEX idx_user_api_keys_active ON user_api_keys(user_id, provider)
    WHERE status = 'active';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only access their own API keys
CREATE POLICY "Users can manage own api keys" ON user_api_keys
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- UPDATE TRIGGER
-- ============================================================================

CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user has an active API key for a provider
CREATE OR REPLACE FUNCTION has_active_api_key(
    p_user_id UUID,
    p_provider api_key_provider
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_api_keys
        WHERE user_id = p_user_id
        AND provider = p_provider
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get decrypted API key (only callable by edge functions via service role)
-- Requires SUPABASE_API_KEY_SECRET to be set in environment
CREATE OR REPLACE FUNCTION get_decrypted_api_key(
    p_user_id UUID,
    p_provider api_key_provider
) RETURNS TABLE (
    id UUID,
    key_value TEXT,
    custom_base_url TEXT,
    custom_header_name TEXT,
    custom_header_prefix TEXT
) AS $$
DECLARE
    v_secret TEXT;
BEGIN
    -- Get the encryption secret from environment
    v_secret := current_setting('app.api_key_secret', true);

    IF v_secret IS NULL OR v_secret = '' THEN
        RAISE EXCEPTION 'API key secret not configured';
    END IF;

    RETURN QUERY
    SELECT
        uak.id,
        pgp_sym_decrypt(uak.encrypted_key, v_secret)::TEXT,
        uak.custom_base_url,
        uak.custom_header_name,
        uak.custom_header_prefix
    FROM user_api_keys uak
    WHERE uak.user_id = p_user_id
    AND uak.provider = p_provider
    AND uak.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last_used_at timestamp
CREATE OR REPLACE FUNCTION update_api_key_last_used(
    p_key_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE user_api_keys
    SET last_used_at = NOW()
    WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_api_keys IS 'User-provided API keys for BYOK integrations (Replicate, OpenAI, etc.)';
COMMENT ON COLUMN user_api_keys.encrypted_key IS 'API key encrypted with pgcrypto pgp_sym_encrypt';
COMMENT ON COLUMN user_api_keys.key_suffix IS 'Last 6 characters of the key for display (e.g., shows as "...abc123")';
COMMENT ON COLUMN user_api_keys.custom_base_url IS 'Base URL for custom API providers';
COMMENT ON COLUMN user_api_keys.custom_header_name IS 'Header name for custom API authentication (default: Authorization)';
COMMENT ON COLUMN user_api_keys.custom_header_prefix IS 'Header value prefix for custom API authentication (default: Bearer)';
COMMENT ON FUNCTION has_active_api_key IS 'Check if user has an active API key for a provider';
COMMENT ON FUNCTION get_decrypted_api_key IS 'Get decrypted API key (service role only)';
COMMENT ON FUNCTION update_api_key_last_used IS 'Update the last_used_at timestamp for an API key';
