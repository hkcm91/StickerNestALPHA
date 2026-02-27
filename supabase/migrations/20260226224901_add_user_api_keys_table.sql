CREATE TABLE user_api_keys (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider api_key_provider NOT NULL,
    name TEXT,
    encrypted_key BYTEA NOT NULL,
    key_suffix TEXT NOT NULL CHECK (char_length(key_suffix) <= 6),
    status api_key_status NOT NULL DEFAULT 'pending',
    validation_error TEXT,
    last_validated_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    custom_base_url TEXT,
    custom_header_name TEXT DEFAULT 'Authorization',
    custom_header_prefix TEXT DEFAULT 'Bearer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider, name)
);

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX idx_user_api_keys_active ON user_api_keys(user_id, provider)
    WHERE status = 'active';

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own api keys" ON user_api_keys
    FOR ALL USING (auth.uid() = user_id);;
