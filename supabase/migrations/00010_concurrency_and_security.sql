-- StickerNest V5 Concurrency & Security
-- Migration: 00010_concurrency_and_security
-- Description: Add revision-based concurrency control for tiers and shop items,
--              add cancelled_at / refund_requested_at timestamps for audit trails.

-- ============================================================================
-- REVISION COLUMNS for optimistic concurrency control
-- ============================================================================

ALTER TABLE canvas_subscription_tiers
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

ALTER TABLE shop_items
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- AUTO-INCREMENT REVISION TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_revision() RETURNS TRIGGER AS $$
BEGIN
  NEW.revision = OLD.revision + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- REVISION TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_tier_revision BEFORE UPDATE ON canvas_subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION increment_revision();

CREATE TRIGGER trg_item_revision BEFORE UPDATE ON shop_items
  FOR EACH ROW EXECUTE FUNCTION increment_revision();

-- ============================================================================
-- AUDIT TIMESTAMP COLUMNS
-- ============================================================================

-- Track when a subscription was cancelled (separate from status change)
ALTER TABLE canvas_subscriptions
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Track when a refund was requested on an order (separate from status change)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ;
