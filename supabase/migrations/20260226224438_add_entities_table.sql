CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
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
    spatial_position JSONB,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entities_canvas_id ON entities(canvas_id);
CREATE INDEX idx_entities_canvas_z_order ON entities(canvas_id, z_order);
CREATE INDEX idx_entities_canvas_position ON entities(canvas_id, position_x, position_y);
CREATE INDEX idx_entities_parent_id ON entities(parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

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
    );;
