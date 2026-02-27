CREATE TABLE data_source_acl (
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role acl_role NOT NULL DEFAULT 'viewer',
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (data_source_id, user_id)
);

CREATE INDEX idx_data_source_acl_user_id ON data_source_acl(user_id);

ALTER TABLE data_source_acl ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Data source owners can manage ACL" ON data_source_acl
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM data_sources
            WHERE data_sources.id = data_source_acl.data_source_id
            AND data_sources.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can see own ACL entries" ON data_source_acl
    FOR SELECT USING (auth.uid() = user_id);;
