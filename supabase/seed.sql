-- StickerNest V5 Seed Data
-- Description: Sample data for local development and testing
-- Note: This seed file creates test users via auth.users and corresponding profiles

-- ============================================================================
-- IMPORTANT: This seed file is for LOCAL DEVELOPMENT ONLY
-- Do NOT run this on production databases
-- ============================================================================

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================
-- Note: In local development, Supabase Auth uses a test user system.
-- The UUIDs below are predetermined for testing purposes.

-- Create test users in auth.users (Supabase local dev only)
-- Password for all test users: 'password123'
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES
    -- Admin User: Kimber
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'woahitskimber@gmail.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Kimber Admin"}'
    ),
    -- Test User 1: Alice (Creator tier)
    (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'alice@example.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Alice Developer"}'
    ),
    -- Test User 2: Bob (Free tier)
    (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'bob@example.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Bob User"}'
    ),
    -- Test User 3: Charlie (Pro tier)
    (
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'charlie@example.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Charlie Pro"}'
    )
ON CONFLICT (id) DO NOTHING;

-- Create corresponding user profiles
INSERT INTO users (id, email, display_name, tier, metadata) VALUES
    ('00000000-0000-0000-0000-000000000000', 'woahitskimber@gmail.com', 'Kimber Admin', 'pro', '{"bio": "System Administrator"}'),
    ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'Alice Developer', 'creator', '{"bio": "Widget creator and canvas enthusiast"}'),
    ('22222222-2222-2222-2222-222222222222', 'bob@example.com', 'Bob User', 'free', '{"bio": "Just getting started"}'),
    ('33333333-3333-3333-3333-333333333333', 'charlie@example.com', 'Charlie Pro', 'pro', '{"bio": "Power user"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE CANVASES
-- ============================================================================

INSERT INTO canvases (id, owner_id, name, slug, description, is_public, default_role, settings) VALUES
    -- Alice's public demo canvas
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'Welcome to StickerNest',
        'welcome-demo',
        'A demo canvas showcasing StickerNest features',
        TRUE,
        'viewer',
        '{"gridSize": 20, "snapToGrid": true, "backgroundColor": "#f5f5f5"}'
    ),
    -- Alice's private workspace
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
        '11111111-1111-1111-1111-111111111111',
        'Alice''s Workshop',
        NULL,
        'Private development workspace',
        FALSE,
        'viewer',
        '{"gridSize": 10, "snapToGrid": false}'
    ),
    -- Bob's personal canvas
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222222',
        'Bob''s Board',
        NULL,
        'Personal organization board',
        FALSE,
        'viewer',
        '{}'
    ),
    -- Charlie's shared canvas
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '33333333-3333-3333-3333-333333333333',
        'Team Workspace',
        'team-workspace',
        'Shared team collaboration space',
        FALSE,
        'viewer',
        '{"gridSize": 25, "snapToGrid": true}'
    )
ON CONFLICT (id) DO NOTHING;

-- Add canvas members
INSERT INTO canvas_members (canvas_id, user_id, role, invited_by) VALUES
    -- Bob is an editor on Charlie's team workspace
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'editor', '33333333-3333-3333-3333-333333333333'),
    -- Alice is a viewer on Charlie's team workspace
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'viewer', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (canvas_id, user_id) DO NOTHING;

-- ============================================================================
-- SAMPLE WIDGETS
-- ============================================================================

INSERT INTO widgets (id, name, slug, description, version, author_id, html_content, manifest, category, tags, license, is_published) VALUES
    -- Sticky Note widget (built-in)
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'Sticky Note',
        'sticky-note',
        'A simple sticky note for quick notes and reminders',
        '1.0.0',
        '11111111-1111-1111-1111-111111111111',
        '<!DOCTYPE html><html><head><style>body{font-family:sans-serif;padding:16px;background:#fff9c4;min-height:100%;box-sizing:border-box;}</style></head><body><div id="content" contenteditable="true">Write your note here...</div><script>StickerNest.register({name:"Sticky Note",version:"1.0.0"});StickerNest.ready();</script></body></html>',
        '{"name": "Sticky Note", "version": "1.0.0", "inputs": [], "outputs": [], "config": {"defaultColor": {"type": "color", "default": "#fff9c4"}}}',
        'productivity',
        ARRAY['note', 'text', 'productivity'],
        'MIT',
        TRUE
    ),
    -- Counter widget (built-in)
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'Counter',
        'counter',
        'A simple counter with increment and decrement buttons',
        '1.0.0',
        '11111111-1111-1111-1111-111111111111',
        '<!DOCTYPE html><html><head><style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;margin:0;}button{padding:8px 16px;margin:4px;cursor:pointer;}</style></head><body><div id="count">0</div><div><button id="dec">-</button><button id="inc">+</button></div><script>let count=0;const el=document.getElementById("count");document.getElementById("inc").onclick=()=>{count++;el.textContent=count;StickerNest.emit("countChanged",{count})};document.getElementById("dec").onclick=()=>{count--;el.textContent=count;StickerNest.emit("countChanged",{count})};StickerNest.register({name:"Counter",version:"1.0.0",outputs:[{name:"countChanged",schema:{type:"object",properties:{count:{type:"number"}}}}]});StickerNest.ready();</script></body></html>',
        '{"name": "Counter", "version": "1.0.0", "inputs": [], "outputs": [{"name": "countChanged", "schema": {"type": "object", "properties": {"count": {"type": "number"}}}}], "config": {}}',
        'utilities',
        ARRAY['counter', 'interactive', 'utilities'],
        'MIT',
        TRUE
    ),
    -- Clock widget (built-in)
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'Clock',
        'clock',
        'A live clock displaying the current time',
        '1.0.0',
        '11111111-1111-1111-1111-111111111111',
        '<!DOCTYPE html><html><head><style>body{font-family:monospace;font-size:2em;display:flex;align-items:center;justify-content:center;height:100%;margin:0;}</style></head><body><div id="time"></div><script>function tick(){document.getElementById("time").textContent=new Date().toLocaleTimeString()}setInterval(tick,1000);tick();StickerNest.register({name:"Clock",version:"1.0.0"});StickerNest.ready();</script></body></html>',
        '{"name": "Clock", "version": "1.0.0", "inputs": [], "outputs": [], "config": {"format": {"type": "select", "options": ["12h", "24h"], "default": "12h"}}}',
        'utilities',
        ARRAY['clock', 'time', 'utilities'],
        'MIT',
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- Install widgets for users
INSERT INTO user_installed_widgets (user_id, widget_id) VALUES
    ('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
    ('11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
    ('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    ('33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
ON CONFLICT (user_id, widget_id) DO NOTHING;

-- ============================================================================
-- SAMPLE ENTITIES
-- ============================================================================

INSERT INTO entities (id, canvas_id, type, position_x, position_y, width, height, z_order, properties, created_by) VALUES
    -- Welcome canvas entities
    (
        '10000000-0000-0000-0000-000000000001',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'text',
        100,
        100,
        400,
        80,
        1,
        '{"text": "Welcome to StickerNest V5!", "fontSize": 32, "fontWeight": "bold"}',
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'text',
        100,
        200,
        600,
        40,
        2,
        '{"text": "The spatial operating system for creative minds", "fontSize": 18}',
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'widget_container',
        100,
        300,
        200,
        200,
        3,
        '{}',
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'widget_container',
        350,
        300,
        150,
        150,
        4,
        '{}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Shape examples
    (
        '10000000-0000-0000-0000-000000000005',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'shape',
        550,
        300,
        100,
        100,
        5,
        '{"shapeType": "rectangle", "fill": "#e3f2fd", "stroke": "#1976d2", "strokeWidth": 2}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Alice's workshop entities
    (
        '10000000-0000-0000-0000-000000000010',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
        'text',
        50,
        50,
        300,
        40,
        1,
        '{"text": "Development Notes", "fontSize": 24}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Bob's board entities
    (
        '10000000-0000-0000-0000-000000000020',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'widget_container',
        100,
        100,
        250,
        300,
        1,
        '{}',
        '22222222-2222-2222-2222-222222222222'
    )
ON CONFLICT (id) DO NOTHING;

-- Create widget instances for widget_container entities
INSERT INTO widget_instances (id, entity_id, widget_id, config, state) VALUES
    -- Sticky note on welcome canvas
    (
        '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000003',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '{"defaultColor": "#fff9c4"}',
        '{"content": "This is a sample sticky note. Try editing me!"}'
    ),
    -- Counter on welcome canvas
    (
        '20000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000004',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        '{}',
        '{"count": 42}'
    ),
    -- Sticky note on Bob's board
    (
        '20000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000020',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '{"defaultColor": "#c8e6c9"}',
        '{"content": "My personal notes"}'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE DATA SOURCES
-- ============================================================================

INSERT INTO data_sources (id, type, owner_id, scope, canvas_id, name, content, metadata) VALUES
    -- Alice's canvas-scoped doc
    (
        '30000000-0000-0000-0000-000000000001',
        'doc',
        '11111111-1111-1111-1111-111111111111',
        'canvas',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Welcome Guide',
        '{"content": "# Welcome to StickerNest\n\nThis is a collaborative canvas platform."}',
        '{}'
    ),
    -- Alice's user-scoped note
    (
        '30000000-0000-0000-0000-000000000002',
        'note',
        '11111111-1111-1111-1111-111111111111',
        'user',
        NULL,
        'Personal Ideas',
        '{"content": "Ideas for new widgets..."}',
        '{}'
    ),
    -- Shared table data source
    (
        '30000000-0000-0000-0000-000000000003',
        'table',
        '33333333-3333-3333-3333-333333333333',
        'shared',
        NULL,
        'Team Tasks',
        '{"columns": ["Task", "Assignee", "Status"], "rows": [["Design review", "Alice", "In Progress"], ["API integration", "Bob", "Done"]]}',
        '{}'
    )
ON CONFLICT (id) DO NOTHING;

-- Add ACL for shared data source
INSERT INTO data_source_acl (data_source_id, user_id, role, granted_by) VALUES
    ('30000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'editor', '33333333-3333-3333-3333-333333333333'),
    ('30000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'viewer', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (data_source_id, user_id) DO NOTHING;

-- ============================================================================
-- SAMPLE PIPELINE
-- ============================================================================

INSERT INTO pipelines (id, canvas_id, name, description, nodes, edges, created_by) VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Counter to Note Pipeline',
        'Updates a sticky note when the counter changes',
        '[
            {"id": "node-1", "type": "widget", "widgetInstanceId": "20000000-0000-0000-0000-000000000002", "position": {"x": 100, "y": 100}},
            {"id": "node-2", "type": "widget", "widgetInstanceId": "20000000-0000-0000-0000-000000000001", "position": {"x": 400, "y": 100}}
        ]'::jsonb,
        '[
            {"id": "edge-1", "source": "node-1", "sourcePort": "countChanged", "target": "node-2", "targetPort": "input"}
        ]'::jsonb,
        '11111111-1111-1111-1111-111111111111'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREATOR COMMERCE: STRIPE CONNECT ACCOUNTS
-- ============================================================================

INSERT INTO creator_accounts (user_id, stripe_connect_account_id, onboarding_complete, charges_enabled, payouts_enabled, country, default_currency) VALUES
    -- Alice is a fully onboarded creator with Stripe Connect
    (
        '11111111-1111-1111-1111-111111111111',
        'acct_test_alice_creator',
        TRUE,
        TRUE,
        TRUE,
        'US',
        'usd'
    )
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- CREATOR COMMERCE: ALICE'S ART SHOP CANVAS
-- ============================================================================

INSERT INTO canvases (id, owner_id, name, slug, description, is_public, default_role, settings) VALUES
    -- Alice's Art Shop - public shopping canvas
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Alice''s Art Shop',
        'alice-art-shop',
        'Digital art, stickers, and exclusive content from Alice',
        TRUE,
        'viewer',
        '{"gridSize": 20, "snapToGrid": true, "backgroundColor": "#fff5f5", "isShop": true}'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREATOR COMMERCE: SUBSCRIPTION TIERS
-- ============================================================================

INSERT INTO canvas_subscription_tiers (id, canvas_id, name, description, price_cents, currency, interval, benefits, canvas_role, sort_order, is_active) VALUES
    -- Free tier
    (
        '50000000-0000-0000-0000-000000000001',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'Free Supporter',
        'Follow along with my art journey — totally free!',
        0,
        'usd',
        'month',
        '["Access to community chat", "Early previews of new work", "Monthly wallpaper"]',
        'viewer',
        0,
        TRUE
    ),
    -- Paid tier - $5/month
    (
        '50000000-0000-0000-0000-000000000002',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'Art Patron',
        'Support my work and get exclusive perks!',
        500,
        'usd',
        'month',
        '["Everything in Free tier", "HD artwork downloads", "Behind-the-scenes content", "Vote on next artwork"]',
        'commenter',
        1,
        TRUE
    ),
    -- Premium tier - $15/month
    (
        '50000000-0000-0000-0000-000000000003',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'VIP Collector',
        'The ultimate supporter experience with exclusive access',
        1500,
        'usd',
        'month',
        '["Everything in Art Patron", "Monthly exclusive sticker pack", "1-on-1 art critique sessions", "Name in credits", "Early access to shop items"]',
        'editor',
        2,
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREATOR COMMERCE: SHOP ITEMS
-- ============================================================================

INSERT INTO shop_items (id, canvas_id, seller_id, name, description, item_type, fulfillment, price_cents, currency, stock_count, max_per_buyer, tags, is_active) VALUES
    -- Free starter pack
    (
        '60000000-0000-0000-0000-000000000001',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Starter Sticker Pack',
        'A free pack of 5 cute cat stickers to get you started!',
        'digital',
        'instant',
        0,
        'usd',
        NULL,
        1,
        ARRAY['free', 'stickers', 'cats', 'starter'],
        TRUE
    ),
    -- Paid digital item - $3
    (
        '60000000-0000-0000-0000-000000000002',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Kawaii Animals Bundle',
        '20 adorable kawaii animal stickers - cats, dogs, bunnies, and more!',
        'digital',
        'instant',
        300,
        'usd',
        NULL,
        3,
        ARRAY['stickers', 'kawaii', 'animals', 'bundle'],
        TRUE
    ),
    -- Paid digital item - $8
    (
        '60000000-0000-0000-0000-000000000003',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Artist Wallpaper Collection',
        'High-resolution wallpapers for desktop and mobile - 10 unique designs',
        'digital',
        'instant',
        800,
        'usd',
        100,
        NULL,
        ARRAY['wallpaper', 'hd', 'collection', 'digital-art'],
        TRUE
    ),
    -- Physical item - $25
    (
        '60000000-0000-0000-0000-000000000004',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Holographic Sticker Sheet',
        'A beautiful holographic sticker sheet with 15 unique stickers - ships worldwide!',
        'physical',
        'manual',
        2500,
        'usd',
        50,
        2,
        ARRAY['physical', 'holographic', 'stickers', 'premium'],
        TRUE
    ),
    -- Limited edition - $50
    (
        '60000000-0000-0000-0000-000000000005',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Signed Art Print (Limited Edition)',
        'Hand-signed 11x14 art print on premium paper - only 25 available!',
        'physical',
        'manual',
        5000,
        'usd',
        25,
        1,
        ARRAY['physical', 'signed', 'limited-edition', 'art-print'],
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREATOR COMMERCE: SAMPLE ORDERS
-- ============================================================================

INSERT INTO orders (id, buyer_id, seller_id, order_type, item_id, amount_cents, currency, platform_fee_cents, status, metadata) VALUES
    -- Bob subscribes to Free tier
    (
        '70000000-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'canvas_subscription',
        '50000000-0000-0000-0000-000000000001',
        0,
        'usd',
        0,
        'paid',
        '{"tier_name": "Free Supporter"}'
    ),
    -- Bob buys free starter pack
    (
        '70000000-0000-0000-0000-000000000002',
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'shop_item',
        '60000000-0000-0000-0000-000000000001',
        0,
        'usd',
        0,
        'fulfilled',
        '{"item_name": "Starter Sticker Pack"}'
    ),
    -- Charlie subscribes to Art Patron tier ($5)
    (
        '70000000-0000-0000-0000-000000000003',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'canvas_subscription',
        '50000000-0000-0000-0000-000000000002',
        500,
        'usd',
        60,
        'paid',
        '{"tier_name": "Art Patron", "stripe_payment_intent": "pi_test_charlie_sub"}'
    ),
    -- Charlie buys Kawaii Animals Bundle ($3)
    (
        '70000000-0000-0000-0000-000000000004',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'shop_item',
        '60000000-0000-0000-0000-000000000002',
        300,
        'usd',
        36,
        'fulfilled',
        '{"item_name": "Kawaii Animals Bundle"}'
    ),
    -- Charlie buys Holographic Sticker Sheet ($25) - shipped
    (
        '70000000-0000-0000-0000-000000000005',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'shop_item',
        '60000000-0000-0000-0000-000000000004',
        2500,
        'usd',
        300,
        'shipped',
        '{"item_name": "Holographic Sticker Sheet", "tracking_number": "1Z999AA10123456784"}'
    )
ON CONFLICT (id) DO NOTHING;

-- Create canvas subscription records for Bob and Charlie
INSERT INTO canvas_subscriptions (id, buyer_id, canvas_id, tier_id, status, current_period_end) VALUES
    -- Bob's free subscription
    (
        '80000000-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '50000000-0000-0000-0000-000000000001',
        'active',
        NOW() + INTERVAL '30 days'
    ),
    -- Charlie's paid subscription
    (
        '80000000-0000-0000-0000-000000000002',
        '33333333-3333-3333-3333-333333333333',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '50000000-0000-0000-0000-000000000002',
        'active',
        NOW() + INTERVAL '30 days'
    )
ON CONFLICT (buyer_id, canvas_id) DO NOTHING;

-- ============================================================================
-- ALICE'S ART SHOP ENTITIES
-- ============================================================================

INSERT INTO entities (id, canvas_id, type, position_x, position_y, width, height, z_order, properties, created_by) VALUES
    -- Shop welcome header
    (
        '10000000-0000-0000-0000-000000000101',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'text',
        100,
        50,
        500,
        80,
        1,
        '{"text": "🎨 Welcome to Alice''s Art Shop!", "fontSize": 36, "fontWeight": "bold", "color": "#e91e63"}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Shop description
    (
        '10000000-0000-0000-0000-000000000102',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'text',
        100,
        140,
        600,
        60,
        2,
        '{"text": "Digital stickers, wallpapers, and exclusive content for art lovers", "fontSize": 18, "color": "#666"}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Decorative shape
    (
        '10000000-0000-0000-0000-000000000103',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'shape',
        100,
        220,
        600,
        4,
        3,
        '{"shapeType": "rectangle", "fill": "#e91e63", "stroke": "none"}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Featured items section header
    (
        '10000000-0000-0000-0000-000000000104',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'text',
        100,
        260,
        300,
        40,
        4,
        '{"text": "✨ Featured Items", "fontSize": 24, "fontWeight": "bold"}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Subscription section header
    (
        '10000000-0000-0000-0000-000000000105',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'text',
        100,
        550,
        300,
        40,
        5,
        '{"text": "💖 Support My Work", "fontSize": 24, "fontWeight": "bold"}',
        '11111111-1111-1111-1111-111111111111'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- OUTPUT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE 'Test users created:';
    RAISE NOTICE '  - alice@example.com (Creator tier) - password: password123';
    RAISE NOTICE '  - bob@example.com (Free tier) - password: password123';
    RAISE NOTICE '  - charlie@example.com (Pro tier) - password: password123';
    RAISE NOTICE '';
    RAISE NOTICE 'Commerce test data:';
    RAISE NOTICE '  - Alice''s Art Shop canvas: /canvas/alice-art-shop';
    RAISE NOTICE '  - 3 subscription tiers (Free, $5/mo, $15/mo)';
    RAISE NOTICE '  - 5 shop items (free to $50)';
    RAISE NOTICE '  - 5 sample orders from Bob and Charlie';
END $$;
