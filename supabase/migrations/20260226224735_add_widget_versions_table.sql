CREATE TABLE widget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  html_content TEXT NOT NULL,
  manifest JSONB NOT NULL,
  changelog TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(widget_id, version)
);

CREATE INDEX idx_widget_versions_widget_id ON widget_versions(widget_id);

ALTER TABLE widget_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read widget versions"
  ON widget_versions FOR SELECT
  USING (true);

CREATE POLICY "Authors can create widget versions"
  ON widget_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM widgets
      WHERE widgets.id = widget_versions.widget_id
      AND widgets.author_id = auth.uid()
    )
  );;
