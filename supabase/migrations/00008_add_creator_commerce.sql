-- StickerNest V5 Creator Commerce
-- Migration: 00008_add_creator_commerce
-- Description: Stripe Connect accounts, canvas subscription tiers, shop items,
--              orders, and widget marketplace pricing.

-- ============================================================================
-- CREATOR STRIPE CONNECT ACCOUNTS
-- ============================================================================

CREATE TABLE creator_accounts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    stripe_connect_account_id TEXT NOT NULL UNIQUE,
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    country TEXT,
    default_currency TEXT DEFAULT 'usd',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE creator_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own creator account" ON creator_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages creator accounts" ON creator_accounts
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- CANVAS SUBSCRIPTION TIERS (creator-defined pricing)
-- ============================================================================

CREATE TABLE canvas_subscription_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    stripe_price_id TEXT,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    interval TEXT DEFAULT 'month',  -- month | year | one_time
    benefits JSONB DEFAULT '[]',
    canvas_role canvas_role NOT NULL DEFAULT 'viewer',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canvas_sub_tiers_canvas ON canvas_subscription_tiers(canvas_id);

ALTER TABLE canvas_subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tiers" ON canvas_subscription_tiers
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Canvas owners manage tiers" ON canvas_subscription_tiers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM canvases WHERE canvases.id = canvas_id AND canvases.owner_id = auth.uid())
    );

-- ============================================================================
-- CANVAS SUBSCRIPTIONS (buyer → creator canvas)
-- ============================================================================

CREATE TABLE canvas_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES canvas_subscription_tiers(id),
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(buyer_id, canvas_id)
);

CREATE INDEX idx_canvas_subs_canvas ON canvas_subscriptions(canvas_id);
CREATE INDEX idx_canvas_subs_buyer ON canvas_subscriptions(buyer_id);

ALTER TABLE canvas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers see own subscriptions" ON canvas_subscriptions
    FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Canvas owners see subscribers" ON canvas_subscriptions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM canvases WHERE canvases.id = canvas_id AND canvases.owner_id = auth.uid())
    );

CREATE POLICY "Service role manages canvas subscriptions" ON canvas_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SHOP ITEMS (physical or digital goods sold via canvas)
-- ============================================================================

CREATE TYPE shop_item_type AS ENUM ('digital', 'physical');
CREATE TYPE shop_item_fulfillment AS ENUM ('instant', 'manual', 'external');

CREATE TABLE shop_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    item_type shop_item_type NOT NULL DEFAULT 'digital',
    fulfillment shop_item_fulfillment NOT NULL DEFAULT 'instant',
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    stripe_price_id TEXT,
    thumbnail_url TEXT,
    images JSONB DEFAULT '[]',
    digital_asset_url TEXT,
    requires_shipping BOOLEAN NOT NULL DEFAULT FALSE,
    shipping_note TEXT,
    stock_count INTEGER,        -- NULL = unlimited
    max_per_buyer INTEGER DEFAULT 1,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_items_canvas ON shop_items(canvas_id) WHERE is_active;
CREATE INDEX idx_shop_items_seller ON shop_items(seller_id);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active items" ON shop_items
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Sellers manage own items" ON shop_items
    FOR ALL USING (auth.uid() = seller_id);

-- ============================================================================
-- ORDERS (tracks all purchases: subscriptions, shop items, widgets)
-- ============================================================================

CREATE TYPE order_type AS ENUM ('canvas_subscription', 'shop_item', 'widget');
CREATE TYPE order_status AS ENUM (
    'pending',
    'paid',
    'fulfilled',
    'shipped',
    'delivered',
    'refunded',
    'disputed',
    'canceled'
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id),
    order_type order_type NOT NULL,
    item_id UUID NOT NULL,
    stripe_payment_intent_id TEXT,
    stripe_checkout_session_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    platform_fee_cents INTEGER NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    shipping_address JSONB,
    tracking_number TEXT,
    tracking_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_seller ON orders(seller_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('fulfilled', 'delivered');

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers see own orders" ON orders
    FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers see incoming orders" ON orders
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers update own orders" ON orders
    FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Service role manages orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- WIDGET MARKETPLACE PRICING
-- ============================================================================

ALTER TABLE widgets ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0;
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS is_free BOOLEAN
    GENERATED ALWAYS AS (price_cents = 0) STORED;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER creator_accounts_updated_at
    BEFORE UPDATE ON creator_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER canvas_subscription_tiers_updated_at
    BEFORE UPDATE ON canvas_subscription_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER canvas_subscriptions_updated_at
    BEFORE UPDATE ON canvas_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER shop_items_updated_at
    BEFORE UPDATE ON shop_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
