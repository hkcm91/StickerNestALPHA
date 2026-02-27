CREATE TABLE user_installed_widgets (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, widget_id)
);

CREATE INDEX idx_user_installed_widgets_widget_id ON user_installed_widgets(widget_id);

ALTER TABLE user_installed_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own widget installations" ON user_installed_widgets
    FOR ALL USING (auth.uid() = user_id);;
