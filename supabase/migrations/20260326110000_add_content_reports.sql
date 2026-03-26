-- Content Reports — user-submitted reports for moderation review.

CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id),
  content_type text NOT NULL CHECK (content_type IN ('widget', 'sticker', 'canvas', 'profile', 'comment', 'post')),
  content_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'nsfw', 'copyright', 'other')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for moderation queue
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_id);

-- RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Reporter can see their own reports
CREATE POLICY "Reporter sees own reports" ON content_reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Any authenticated user can submit a report
CREATE POLICY "Authenticated user can report" ON content_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());

-- Service role can read all reports (admin moderation queue)
CREATE POLICY "Service role full access" ON content_reports
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
