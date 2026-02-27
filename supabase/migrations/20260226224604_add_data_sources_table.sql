CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    type data_source_type NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope data_source_scope NOT NULL DEFAULT 'canvas',
    canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT,
    schema JSONB,
    content JSONB,
    metadata JSONB DEFAULT '{}',
    revision INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT data_source_canvas_scope_check CHECK (
        scope != 'canvas' OR canvas_id IS NOT NULL
    )
);

CREATE INDEX idx_data_sources_owner_id ON data_sources(owner_id);
CREATE INDEX idx_data_sources_canvas_id ON data_sources(canvas_id) WHERE canvas_id IS NOT NULL;
CREATE INDEX idx_data_sources_type ON data_sources(type);
CREATE INDEX idx_data_sources_revision ON data_sources(id, revision);

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Data source owners have full access" ON data_sources
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Public data sources are readable" ON data_sources
    FOR SELECT USING (scope = 'public');;
