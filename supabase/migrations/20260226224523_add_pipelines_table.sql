CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pipelines_canvas_id ON pipelines(canvas_id);

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

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
    );;
