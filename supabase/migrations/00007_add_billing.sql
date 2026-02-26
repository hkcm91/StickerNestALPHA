-- StickerNest V5 Billing & Subscriptions
-- Migration: 00007_add_billing
-- Description: Adds platform subscription management, Stripe integration,
--              and tier-based quota enforcement tables.

-- ============================================================================
-- PLATFORM SUBSCRIPTIONS TABLE
-- ============================================================================
-- Links StickerNest users to their Stripe subscription for platform tiers.

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    tier user_tier NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',  -- active, past_due, canceled, trialing
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status != 'canceled';

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role (webhooks) can insert/update subscriptions
-- Client-side inserts are blocked — all writes go through edge functions
CREATE POLICY "Service role manages subscriptions" ON subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- STRIPE EVENTS TABLE (idempotency log)
-- ============================================================================
-- Prevents duplicate processing of Stripe webhook events.

CREATE TABLE stripe_events (
    id TEXT PRIMARY KEY,  -- Stripe event ID (evt_...)
    type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup old events (older than 30 days)
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed_at);

-- No RLS — only accessed by service role in edge functions
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages stripe events" ON stripe_events
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TIER QUOTAS TABLE
-- ============================================================================
-- Defines resource limits per subscription tier. -1 = unlimited.

CREATE TABLE tier_quotas (
    tier user_tier PRIMARY KEY,
    max_canvases INTEGER NOT NULL,
    max_storage_mb INTEGER NOT NULL,
    max_widgets_per_canvas INTEGER NOT NULL,
    max_collaborators_per_canvas INTEGER NOT NULL,
    can_use_custom_domain BOOLEAN NOT NULL DEFAULT FALSE,
    can_use_integrations BOOLEAN NOT NULL DEFAULT FALSE,
    can_publish_widgets BOOLEAN NOT NULL DEFAULT FALSE,
    can_sell BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed default quota values
INSERT INTO tier_quotas (tier, max_canvases, max_storage_mb, max_widgets_per_canvas,
    max_collaborators_per_canvas, can_use_custom_domain, can_use_integrations,
    can_publish_widgets, can_sell)
VALUES
    ('free',       3,    100,  10,  3,  FALSE, FALSE, FALSE, FALSE),
    ('creator',   10,   1000,  50, 10,  FALSE, TRUE,  TRUE,  TRUE),
    ('pro',       50,   5000, 200, 50,  TRUE,  TRUE,  TRUE,  TRUE),
    ('enterprise', -1, 50000,  -1, -1,  TRUE,  TRUE,  TRUE,  TRUE);

-- Tier quotas are publicly readable (no secrets), only service role can modify
ALTER TABLE tier_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tier quotas" ON tier_quotas
    FOR SELECT USING (true);

CREATE POLICY "Service role manages tier quotas" ON tier_quotas
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
