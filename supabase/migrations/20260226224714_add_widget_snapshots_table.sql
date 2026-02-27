CREATE TABLE widget_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id TEXT NOT NULL,
  label TEXT NOT NULL,
  html_content TEXT NOT NULL,
  manifest JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_widget_snapshots_widget_id ON widget_snapshots(widget_id);
CREATE INDEX idx_widget_snapshots_created_by ON widget_snapshots(created_by);

ALTER TABLE widget_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON widget_snapshots FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create own snapshots"
  ON widget_snapshots FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own snapshots"
  ON widget_snapshots FOR DELETE
  USING (auth.uid() = created_by);;
