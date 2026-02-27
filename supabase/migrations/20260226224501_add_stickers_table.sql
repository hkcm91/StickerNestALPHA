CREATE TABLE stickers (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stickers_owner_id ON stickers(owner_id);
CREATE INDEX idx_stickers_public ON stickers(is_public) WHERE is_public = TRUE;

ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own stickers" ON stickers
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Public stickers are readable" ON stickers
    FOR SELECT USING (is_public = TRUE);;
