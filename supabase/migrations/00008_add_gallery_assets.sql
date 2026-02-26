-- Gallery Assets Table
-- Migration: 00008_add_gallery_assets
-- Description: Creates table for tracking user-uploaded gallery assets with metadata.
--              Works alongside the 'assets' storage bucket for file storage.

-- ============================================================================
-- GALLERY_ASSETS TABLE
-- ============================================================================
-- Tracks metadata for user-uploaded assets in the gallery.
-- Files are stored in Supabase Storage (assets bucket), this table tracks metadata.

CREATE TABLE gallery_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- File identity
    name TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE, -- Path in Supabase Storage (e.g., gallery/user_id/filename.jpg)

    -- File metadata
    file_type TEXT NOT NULL, -- MIME type (e.g., 'image/png', 'image/gif')
    file_size INTEGER NOT NULL DEFAULT 0, -- Size in bytes
    width INTEGER, -- Image width in pixels (nullable for non-images)
    height INTEGER, -- Image height in pixels (nullable for non-images)

    -- Optional metadata
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    thumbnail_path TEXT, -- Optional thumbnail storage path

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for owner lookups (primary query pattern)
CREATE INDEX idx_gallery_assets_owner_id ON gallery_assets(owner_id);

-- Index for storage path lookups (for deletion sync)
CREATE INDEX idx_gallery_assets_storage_path ON gallery_assets(storage_path);

-- Index for tag searches
CREATE INDEX idx_gallery_assets_tags ON gallery_assets USING GIN(tags);

-- Index for recent assets (sorted by creation date)
CREATE INDEX idx_gallery_assets_created_at ON gallery_assets(owner_id, created_at DESC);

-- Enable RLS
ALTER TABLE gallery_assets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own gallery assets
CREATE POLICY "Users can read own gallery assets" ON gallery_assets
    FOR SELECT USING (auth.uid() = owner_id);

-- Users can insert their own gallery assets
CREATE POLICY "Users can insert own gallery assets" ON gallery_assets
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own gallery assets
CREATE POLICY "Users can update own gallery assets" ON gallery_assets
    FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own gallery assets
CREATE POLICY "Users can delete own gallery assets" ON gallery_assets
    FOR DELETE USING (auth.uid() = owner_id);

-- Apply updated_at trigger
CREATE TRIGGER update_gallery_assets_updated_at
    BEFORE UPDATE ON gallery_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE gallery_assets IS 'User-uploaded gallery assets metadata. Files stored in Supabase Storage (assets bucket).';
