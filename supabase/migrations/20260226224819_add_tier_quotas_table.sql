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

INSERT INTO tier_quotas (tier, max_canvases, max_storage_mb, max_widgets_per_canvas,
    max_collaborators_per_canvas, can_use_custom_domain, can_use_integrations,
    can_publish_widgets, can_sell)
VALUES
    ('free',       3,    100,  10,  3,  FALSE, FALSE, FALSE, FALSE),
    ('creator',   10,   1000,  50, 10,  FALSE, TRUE,  TRUE,  TRUE),
    ('pro',       50,   5000, 200, 50,  TRUE,  TRUE,  TRUE,  TRUE),
    ('enterprise', -1, 50000,  -1, -1,  TRUE,  TRUE,  TRUE,  TRUE);

ALTER TABLE tier_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tier quotas" ON tier_quotas
    FOR SELECT USING (true);

CREATE POLICY "Service role manages tier quotas" ON tier_quotas
    FOR ALL USING (auth.role() = 'service_role');;
