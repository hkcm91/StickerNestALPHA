-- Commerce fixes: decrement_stock RPC, seller_events table, storage tracking RPC

-- 1. decrement_stock RPC — atomically decrements stock, returns whether it succeeded
CREATE OR REPLACE FUNCTION decrement_stock(item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE shop_items
    SET stock_count = stock_count - 1
    WHERE id = item_id
      AND stock_count IS NOT NULL
      AND stock_count >= 1;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. seller_events table — logs payment failures, refunds, etc. for canvas owners
CREATE TABLE IF NOT EXISTS seller_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_events_canvas_created
  ON seller_events(canvas_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_events_type
  ON seller_events(event_type);

ALTER TABLE seller_events ENABLE ROW LEVEL SECURITY;

-- Canvas owners can read their own seller events
CREATE POLICY "Canvas owners can read seller events" ON seller_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM canvases
            WHERE canvases.id = seller_events.canvas_id
              AND canvases.owner_id = auth.uid()
        )
    );

-- Service role can manage all seller events (webhook inserts)
CREATE POLICY "Service role manages seller events" ON seller_events
    FOR ALL USING (auth.role() = 'service_role');

-- 3. get_user_storage_bytes RPC — sums file_size from gallery_assets + stickers
CREATE OR REPLACE FUNCTION get_user_storage_bytes(target_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
  gallery_total BIGINT;
  sticker_total BIGINT;
BEGIN
  SELECT COALESCE(SUM(file_size), 0) INTO gallery_total
    FROM gallery_assets WHERE owner_id = target_user_id;

  SELECT COALESCE(SUM(file_size), 0) INTO sticker_total
    FROM stickers WHERE owner_id = target_user_id;

  RETURN gallery_total + sticker_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
