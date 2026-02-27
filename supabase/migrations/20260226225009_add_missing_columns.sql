-- Add stripe_customer_id to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add creator_id to canvas_subscription_tiers if not exists
ALTER TABLE canvas_subscription_tiers ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Backfill creator_id from the canvas owner
UPDATE canvas_subscription_tiers
  SET creator_id = canvases.owner_id
  FROM canvases
  WHERE canvas_subscription_tiers.canvas_id = canvases.id
    AND canvas_subscription_tiers.creator_id IS NULL;

-- Add revision to canvas_subscription_tiers
ALTER TABLE canvas_subscription_tiers ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

-- Add refund_requested_at to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_canvas_sub_tiers_creator ON canvas_subscription_tiers(creator_id);

-- Add trigger for revision on tiers
CREATE TRIGGER trg_tier_revision BEFORE UPDATE ON canvas_subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION increment_revision();;
