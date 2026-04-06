-- Leaderboard entries table
-- Tracks per-widget-type scores at canvas (local) and global scopes.
-- One entry per user per widget per scope (canvas or global).

CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id TEXT NOT NULL,
  canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  score NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one entry per user per widget per scope
-- COALESCE maps NULL canvas_id (global) to a sentinel UUID for uniqueness
CREATE UNIQUE INDEX leaderboard_unique_entry
  ON leaderboard_entries (widget_id, COALESCE(canvas_id, '00000000-0000-0000-0000-000000000000'::uuid), user_id);

-- Fast lookups for canvas-scoped leaderboards ordered by score DESC
CREATE INDEX leaderboard_canvas_score_idx
  ON leaderboard_entries (widget_id, canvas_id, score DESC)
  WHERE canvas_id IS NOT NULL;

-- Fast lookups for global leaderboards ordered by score DESC
CREATE INDEX leaderboard_global_score_idx
  ON leaderboard_entries (widget_id, score DESC)
  WHERE canvas_id IS NULL;

-- Row Level Security
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can read leaderboard entries
CREATE POLICY leaderboard_select ON leaderboard_entries FOR SELECT USING (true);

-- Users can only insert their own entries
CREATE POLICY leaderboard_insert ON leaderboard_entries FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update their own entries
CREATE POLICY leaderboard_update ON leaderboard_entries FOR UPDATE USING (user_id = auth.uid());

-- Enable Realtime for live leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_entries;
