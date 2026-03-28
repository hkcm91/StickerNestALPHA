-- Add review_status and security_scan columns to widgets table
-- for the widget upload system's automated security scanning

ALTER TABLE widgets
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved'
    CHECK (review_status IN ('pending', 'approved', 'flagged', 'rejected')),
  ADD COLUMN IF NOT EXISTS security_scan jsonb DEFAULT NULL;

-- Index for filtering by review status (admin review queue, marketplace search)
CREATE INDEX IF NOT EXISTS idx_widgets_review_status ON widgets(review_status);

-- Comment for documentation
COMMENT ON COLUMN widgets.review_status IS 'Widget review status: pending, approved, flagged, or rejected. Set by automated security scanner on upload.';
COMMENT ON COLUMN widgets.security_scan IS 'JSON result of automated security scan: { passed, score, flags[] }';
