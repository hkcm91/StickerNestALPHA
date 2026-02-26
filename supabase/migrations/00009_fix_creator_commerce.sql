-- StickerNest V5 Creator Commerce — schema fixes
-- Migration: 00009_fix_creator_commerce
-- Description: Add missing creator_id to canvas_subscription_tiers, add
--              pagination-friendly indexes, and add stock reservation support.

-- ============================================================================
-- FIX: Add creator_id to canvas_subscription_tiers
-- The checkout integration needs to query tiers by creator. The RLS policy
-- uses a join through canvases.owner_id, but the application layer needs a
-- direct column for efficient queries and inserts.
-- ============================================================================

ALTER TABLE canvas_subscription_tiers
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Backfill creator_id from the canvas owner
UPDATE canvas_subscription_tiers
  SET creator_id = canvases.owner_id
  FROM canvases
  WHERE canvas_subscription_tiers.canvas_id = canvases.id
    AND canvas_subscription_tiers.creator_id IS NULL;

-- Now make it NOT NULL after backfill
ALTER TABLE canvas_subscription_tiers
  ALTER COLUMN creator_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_canvas_sub_tiers_creator
  ON canvas_subscription_tiers(creator_id);

-- ============================================================================
-- Stock management RPC for atomic increment/release
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_stock(item_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE shop_items
    SET stock_count = stock_count + amount
    WHERE id = item_id
      AND stock_count IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Pagination-friendly indexes for orders and items
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shop_items_canvas_active_created
  ON shop_items(canvas_id, created_at DESC) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_orders_buyer_created
  ON orders(buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_seller_created
  ON orders(seller_id, created_at DESC);
