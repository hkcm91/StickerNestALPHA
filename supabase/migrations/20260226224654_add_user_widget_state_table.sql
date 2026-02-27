CREATE TABLE user_widget_state (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    value_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, widget_id, key)
);

CREATE INDEX idx_user_widget_state_user_widget ON user_widget_state(user_id, widget_id);

ALTER TABLE user_widget_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own widget state" ON user_widget_state
    FOR ALL USING (auth.uid() = user_id);;
