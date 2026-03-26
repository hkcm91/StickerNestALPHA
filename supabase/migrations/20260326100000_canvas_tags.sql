-- Add tags column to canvases table for categorization and filtering
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- GIN index for efficient array containment queries (e.g. WHERE tags @> ARRAY['design'])
CREATE INDEX IF NOT EXISTS idx_canvases_tags ON canvases USING GIN (tags);
