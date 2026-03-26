-- Video Production Tables
-- Adds video project management and render job tracking.

-- Video Projects table
CREATE TABLE IF NOT EXISTS video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'rendering', 'completed', 'failed', 'archived')),
  timeline_data JSONB NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_projects_canvas ON video_projects(canvas_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_user ON video_projects(user_id);

ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_projects_owner_all" ON video_projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "video_projects_canvas_member_select" ON video_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = video_projects.canvas_id
        AND canvas_members.user_id = auth.uid()
    )
  );

-- Video Renders table (render job tracking)
CREATE TABLE IF NOT EXISTS video_renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'encoding', 'uploading', 'completed', 'failed', 'cancelled')),
  format TEXT NOT NULL,
  progress REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  output_url TEXT,
  output_storage_path TEXT,
  file_size_bytes BIGINT,
  error_message TEXT,
  render_config JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_renders_project ON video_renders(project_id);
CREATE INDEX IF NOT EXISTS idx_video_renders_user ON video_renders(user_id);
CREATE INDEX IF NOT EXISTS idx_video_renders_status ON video_renders(status)
  WHERE status IN ('queued', 'processing');

ALTER TABLE video_renders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_renders_owner_all" ON video_renders
  FOR ALL USING (auth.uid() = user_id);

-- Updated-at trigger for video_projects
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_projects_set_updated_at
  BEFORE UPDATE ON video_projects
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
