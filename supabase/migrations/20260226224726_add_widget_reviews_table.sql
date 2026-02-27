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
  USING (auth.uid() = user_id);;
