-- Migration: Add marketplace tables for widget reviews and version history
-- Required by Layer 5 (Marketplace)

-- Widget reviews table (one review per user per widget)
CREATE TABLE widget_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(widget_id, user_id)
);

CREATE INDEX idx_widget_reviews_widget_id ON widget_reviews(widget_id);
CREATE INDEX idx_widget_reviews_user_id ON widget_reviews(user_id);

ALTER TABLE widget_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read widget reviews"
  ON widget_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create own reviews"
  ON widget_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON widget_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON widget_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Widget versions table (publish history)
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
  );

-- Trigger to automatically update rating_average and rating_count on widgets table
CREATE OR REPLACE FUNCTION update_widget_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE widgets SET
    rating_average = (
      SELECT AVG(rating)::DOUBLE PRECISION
      FROM widget_reviews
      WHERE widget_id = COALESCE(NEW.widget_id, OLD.widget_id)
    ),
    rating_count = (
      SELECT COUNT(*)::INTEGER
      FROM widget_reviews
      WHERE widget_id = COALESCE(NEW.widget_id, OLD.widget_id)
    )
  WHERE id = COALESCE(NEW.widget_id, OLD.widget_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON widget_reviews
  FOR EACH ROW EXECUTE FUNCTION update_widget_rating();
