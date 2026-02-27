CREATE TABLE widget_connections (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    source_widget_instance_id UUID NOT NULL,
    source_port TEXT NOT NULL,
    target_widget_instance_id UUID NOT NULL,
    target_port TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_widget_connections_pipeline_id ON widget_connections(pipeline_id);
CREATE INDEX idx_widget_connections_source ON widget_connections(source_widget_instance_id);
CREATE INDEX idx_widget_connections_target ON widget_connections(target_widget_instance_id);

ALTER TABLE widget_connections ENABLE ROW LEVEL SECURITY;

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
    );;
