CREATE OR REPLACE FUNCTION increment_revision() RETURNS TRIGGER AS $$
BEGIN
  NEW.revision = OLD.revision + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add revision column to shop_items if not exists
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

-- Create triggers for revision
CREATE TRIGGER trg_item_revision BEFORE UPDATE ON shop_items
  FOR EACH ROW EXECUTE FUNCTION increment_revision();;
