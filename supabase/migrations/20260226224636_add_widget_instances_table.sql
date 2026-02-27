CREATE TABLE widget_instances (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    config JSONB DEFAULT '{}',
    state JSONB DEFAULT '{}',
    state_size INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_widget_instances_entity_id ON widget_instances(entity_id);
CREATE INDEX idx_widget_instances_widget_id ON widget_instances(widget_id);

ALTER TABLE widget_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inherit entity access for widget instances" ON widget_instances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM entities
            WHERE entities.id = widget_instances.entity_id
            AND EXISTS (
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
        )
    );;
