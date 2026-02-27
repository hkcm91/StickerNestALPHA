CREATE TABLE canvas_subscriptions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES canvas_subscription_tiers(id),
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
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
    FOR ALL USING (auth.role() = 'service_role');;
