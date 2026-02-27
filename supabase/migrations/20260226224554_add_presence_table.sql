CREATE TABLE presence (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    color TEXT NOT NULL,
    cursor_x DOUBLE PRECISION,
    cursor_y DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(canvas_id, user_id)
);

CREATE INDEX idx_presence_canvas_id ON presence(canvas_id);
CREATE INDEX idx_presence_last_seen_at ON presence(last_seen_at);

ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can update own presence" ON presence
    FOR ALL USING (auth.uid() = user_id);;
