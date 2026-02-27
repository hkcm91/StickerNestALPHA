CREATE TABLE canvas_members (
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role canvas_role NOT NULL DEFAULT 'viewer',
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (canvas_id, user_id)
);

CREATE INDEX idx_canvas_members_user_id ON canvas_members(user_id);

ALTER TABLE canvas_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can see own membership" ON canvas_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Canvas owners can manage members" ON canvas_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM canvases WHERE canvases.id = canvas_members.canvas_id AND canvases.owner_id = auth.uid()
        )
    );;
