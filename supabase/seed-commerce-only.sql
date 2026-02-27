-- StickerNest Commerce Seed Data (Remote Supabase)
-- Run this in your Supabase Dashboard SQL Editor

-- First, ensure Alice exists as a creator
UPDATE users SET tier = 'creator' WHERE email = 'alice@example.com';

-- Create Alice's Stripe Connect account
INSERT INTO creator_accounts (user_id, stripe_connect_account_id, onboarding_complete, charges_enabled, payouts_enabled, country, default_currency)
SELECT id, 'acct_test_alice_creator', TRUE, TRUE, TRUE, 'US', 'usd'
FROM users WHERE email = 'alice@example.com'
ON CONFLICT (user_id) DO UPDATE SET
  onboarding_complete = TRUE,
  charges_enabled = TRUE;

-- Create Alice's Art Shop canvas
INSERT INTO canvases (id, owner_id, name, slug, description, is_public, default_role, settings)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  id,
  'Alice''s Art Shop',
  'alice-art-shop',
  'Digital art, stickers, and exclusive content from Alice',
  TRUE,
  'viewer',
  '{"gridSize": 20, "snapToGrid": true, "backgroundColor": "#fff5f5", "isShop": true}'::jsonb
FROM users WHERE email = 'alice@example.com'
ON CONFLICT (id) DO NOTHING;

-- Create subscription tiers
INSERT INTO canvas_subscription_tiers (id, canvas_id, name, description, price_cents, currency, interval, benefits, canvas_role, sort_order, is_active) VALUES
  ('50000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Free Supporter', 'Follow along with my art journey!', 0, 'usd', 'month', '["Community chat access", "Early previews", "Monthly wallpaper"]'::jsonb, 'viewer', 0, TRUE),
  ('50000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Art Patron', 'Support my work with exclusive perks!', 500, 'usd', 'month', '["Everything in Free tier", "HD downloads", "Behind-the-scenes", "Vote on artwork"]'::jsonb, 'commenter', 1, TRUE),
  ('50000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'VIP Collector', 'Ultimate supporter experience', 1500, 'usd', 'month', '["Everything in Art Patron", "Monthly sticker pack", "1-on-1 critique", "Name in credits"]'::jsonb, 'editor', 2, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Create shop items
INSERT INTO shop_items (id, canvas_id, seller_id, name, description, item_type, fulfillment, price_cents, currency, stock_count, max_per_buyer, tags, is_active)
SELECT
  '60000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  id,
  'Starter Sticker Pack',
  'A free pack of 5 cute cat stickers!',
  'digital',
  'instant',
  0,
  'usd',
  NULL,
  1,
  ARRAY['free', 'stickers', 'cats'],
  TRUE
FROM users WHERE email = 'alice@example.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO shop_items (id, canvas_id, seller_id, name, description, item_type, fulfillment, price_cents, currency, stock_count, max_per_buyer, tags, is_active)
SELECT
  '60000000-0000-0000-0000-000000000002',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  id,
  'Kawaii Animals Bundle',
  '20 adorable kawaii animal stickers!',
  'digital',
  'instant',
  300,
  'usd',
  NULL,
  3,
  ARRAY['stickers', 'kawaii', 'animals'],
  TRUE
FROM users WHERE email = 'alice@example.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO shop_items (id, canvas_id, seller_id, name, description, item_type, fulfillment, price_cents, currency, stock_count, max_per_buyer, tags, is_active)
SELECT
  '60000000-0000-0000-0000-000000000003',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  id,
  'Artist Wallpaper Collection',
  'High-res wallpapers - 10 unique designs',
  'digital',
  'instant',
  800,
  'usd',
  100,
  NULL,
  ARRAY['wallpaper', 'hd', 'collection'],
  TRUE
FROM users WHERE email = 'alice@example.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO shop_items (id, canvas_id, seller_id, name, description, item_type, fulfillment, price_cents, currency, stock_count, max_per_buyer, tags, is_active)
SELECT
  '60000000-0000-0000-0000-000000000004',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  id,
  'Holographic Sticker Sheet',
  '15 unique holographic stickers - ships worldwide!',
  'physical',
  'manual',
  2500,
  'usd',
  50,
  2,
  ARRAY['physical', 'holographic', 'premium'],
  TRUE
FROM users WHERE email = 'alice@example.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO shop_items (id, canvas_id, seller_id, name, description, item_type, fulfillment, price_cents, currency, stock_count, max_per_buyer, tags, is_active)
SELECT
  '60000000-0000-0000-0000-000000000005',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  id,
  'Signed Art Print (Limited Edition)',
  'Hand-signed 11x14 print - only 25 available!',
  'physical',
  'manual',
  5000,
  'usd',
  25,
  1,
  ARRAY['physical', 'signed', 'limited-edition'],
  TRUE
FROM users WHERE email = 'alice@example.com'
ON CONFLICT (id) DO NOTHING;

-- Verify results
SELECT 'Canvases' as table_name, count(*) as count FROM canvases WHERE slug = 'alice-art-shop'
UNION ALL
SELECT 'Tiers', count(*) FROM canvas_subscription_tiers WHERE canvas_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
UNION ALL
SELECT 'Shop Items', count(*) FROM shop_items WHERE canvas_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
