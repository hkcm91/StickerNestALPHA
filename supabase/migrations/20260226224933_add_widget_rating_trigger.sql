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
  FOR EACH ROW EXECUTE FUNCTION update_widget_rating();;
