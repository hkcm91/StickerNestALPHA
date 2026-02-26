# StickerNest V5 — SaaS Launch Plan

## Current State Assessment

StickerNest V5 has a strong architectural foundation with 488 source files across
7 layers, comprehensive Supabase schema (6 migrations, RLS on all tables), CI/CD
via GitHub Actions + Vercel, and a 4-tier user system (`free | creator | pro | enterprise`).

**What's solid:**
- Layered architecture with enforced boundaries (dependency-cruiser)
- Database schema for canvases, entities, widgets, marketplace, social graph, integrations
- Canvas slug + `is_public` fields, RLS policies for public access
- Route system (`/canvas/:slug` → preview mode, `/canvas/:uuid` → edit mode)
- Auth store with tier tracking, route guards (AuthGuard, TierGuard)
- Widget Runtime with sandboxed iframes, bridge protocol, SDK
- Event bus with typed pub/sub for cross-layer communication
- Vercel production deployment workflow

**What's missing for SaaS launch:**
- No payment/billing integration (Stripe)
- No subscription management tables or lifecycle
- No tier-based quota enforcement (canvas count, storage, etc.)
- No creator commerce layer (creator-set pricing, canvas shops, item sales)
- No Stripe Connect for creator payouts
- No settings/billing UI
- No analytics or error monitoring
- OAuth providers configured but not enabled
- Marketplace UI is stubs
- No SEO/OG tags for public slug canvases
- No embed route for iframe embedding
- No custom domain support for slugs

---

## Phase 1: Billing & Subscriptions (Critical Path)

### 1.1 Stripe Integration — Two Modes

StickerNest uses Stripe in two distinct modes:

1. **Stripe Direct** — Platform subscriptions (Free/Creator/Pro/Enterprise tiers).
   StickerNest collects revenue for its own plans.
2. **Stripe Connect** — Creator commerce. Creators set their own prices for
   canvas subscriptions, widget sales, and shop items. Stripe handles payouts
   directly to creators. StickerNest takes a platform fee. Creators handle
   their own shipping and fulfillment for physical items — the platform never
   touches inventory or logistics.

### 1.2 Platform Subscriptions — Supabase Edge Functions

**New files:**
- `supabase/functions/stripe-checkout/index.ts` — Create Stripe Checkout session (platform plans)
- `supabase/functions/stripe-webhook/index.ts` — Handle all Stripe webhook events
- `supabase/functions/stripe-portal/index.ts` — Create Customer Portal session

**Implementation:**
- Use Stripe Checkout for subscription creation (no custom payment form needed)
- Use Stripe Customer Portal for plan changes, cancellation, payment method updates
- Webhook handler processes: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`
- Webhook idempotency via `stripe_events` audit log table
- All Stripe API calls happen server-side in edge functions — no Stripe secret key in client

### 1.3 Database Schema — New Migration

**New file:** `supabase/migrations/00007_add_billing.sql`

```sql
-- Platform subscriptions (StickerNest tiers)
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

-- Stripe event idempotency log
CREATE TABLE stripe_events (
    id TEXT PRIMARY KEY,  -- Stripe event ID
    type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tier quotas definition
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

-- Seed default tier quotas
INSERT INTO tier_quotas VALUES
    ('free',       3,    100,  10,  3,  FALSE, FALSE, FALSE, FALSE),
    ('creator',   10,   1000,  50, 10,  FALSE, TRUE,  TRUE,  TRUE),
    ('pro',       50,   5000, 200, 50,  TRUE,  TRUE,  TRUE,  TRUE),
    ('enterprise', -1, 50000,  -1, -1,  TRUE,  TRUE,  TRUE,  TRUE);  -- -1 = unlimited
```

### 1.4 Tier Sync — Webhook → User Tier

When Stripe subscription changes, the webhook edge function:
1. Validates webhook signature
2. Checks idempotency in `stripe_events`
3. Updates `subscriptions` table
4. Updates `users.tier` to match the subscription product
5. Emits a Supabase Realtime event so the client's `authStore` picks up the change

### 1.5 Pricing Page Component

**New file:** `src/shell/pages/PricingPage.tsx`

- Route: `/pricing`
- Shows the 4 tiers with features and prices
- "Get Started" buttons link to Stripe Checkout (via edge function)
- Highlight current plan for authenticated users
- Free tier has no checkout — it's the default

### 1.6 Billing Settings UI

**New files in:** `src/shell/pages/settings/`
- `BillingSection.tsx` — Current plan display, usage meters, "Manage Subscription" button
- "Manage Subscription" opens Stripe Customer Portal (via edge function)
- Shows current period end date, next billing date
- Usage bars: canvases used / max, storage used / max

---

## Phase 2: Quota Enforcement

### 2.1 Quota Check API — Kernel Layer

**New file:** `src/kernel/quota/quota.ts`

- `checkQuota(userId, resource)` — checks tier_quotas against current usage
- Resources: `canvas_count`, `storage_mb`, `widgets_per_canvas`, `collaborators_per_canvas`
- Returns `{ allowed: boolean, current: number, limit: number, tier: string }`
- Called before any create operation (new canvas, upload, add collaborator, place widget)

### 2.2 Enforcement Points

| Action | Where enforced | Behavior on limit |
|--------|---------------|-------------------|
| Create canvas | `canvasStore.createCanvas()` | Show upgrade prompt with usage info |
| Upload asset | Asset panel upload handler | Show "Storage limit reached" + upgrade link |
| Place widget | Widget placement tool | Show "Widget limit reached" + upgrade link |
| Add collaborator | Canvas sharing settings | Show "Collaborator limit reached" + upgrade link |
| Publish widget | Lab publish pipeline | Already gated by Creator+ tier guard |
| Use integrations | Integration proxy handler | Show "Integrations require Creator+" |

### 2.3 Upgrade Prompt Component

**New file:** `src/shell/components/UpgradePrompt.tsx`

- Reusable modal/banner that shows: current usage, limit, and the next tier that unlocks it
- CTA button goes to `/pricing` or directly to Stripe Checkout
- Used by all enforcement points above

---

## Phase 3: Creator Commerce (Stripe Connect)

The core idea: creators set their own prices. StickerNest never handles money,
inventory, or shipping directly. Stripe Connect handles payouts to creators.
Stripe handles tax calculation. Creators handle their own fulfillment for
physical items. StickerNest takes a platform application fee on each transaction.

### 3.1 Stripe Connect Onboarding

**New files:**
- `supabase/functions/connect-onboard/index.ts` — Create Stripe Connect Account Link
- `supabase/functions/connect-dashboard/index.ts` — Create Express Dashboard Link
- `supabase/functions/connect-webhook/index.ts` — Handle Connect-specific webhook events

**Flow:**
1. Creator navigates to Settings → Selling (requires Creator+ tier)
2. Clicks "Connect with Stripe" → edge function creates a Stripe Connect Express account
3. Creator completes Stripe's hosted onboarding (identity verification, bank account, tax info)
4. On completion, webhook fires `account.updated` → store `stripe_connect_account_id` on user
5. Creator can now set prices on canvases, widgets, and shop items

**Why Express accounts (not Standard or Custom):**
- Stripe handles all compliance, identity verification, 1099 tax forms, and payout scheduling
- Creators manage their own Stripe Express Dashboard for payout details and tax docs
- StickerNest never touches or stores bank account info, tax IDs, or payout schedules
- Minimal platform liability — Stripe owns the relationship with the creator

### 3.2 Database Schema — Creator Commerce

**New file:** `supabase/migrations/00008_add_creator_commerce.sql`

```sql
-- Creator Stripe Connect accounts
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

-- Canvas subscription tiers (creator-defined pricing)
CREATE TABLE canvas_subscription_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                 -- e.g. "Free", "Supporter", "VIP"
    description TEXT,
    stripe_price_id TEXT,               -- Stripe Price object (on creator's Connect account)
    price_cents INTEGER NOT NULL,       -- 0 = free tier
    currency TEXT NOT NULL DEFAULT 'usd',
    interval TEXT DEFAULT 'month',      -- month | year | one_time
    benefits JSONB DEFAULT '[]',        -- Array of benefit descriptions
    canvas_role canvas_role NOT NULL DEFAULT 'viewer',  -- Role granted to subscribers
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canvas_sub_tiers_canvas ON canvas_subscription_tiers(canvas_id);

-- Canvas subscriptions (buyer → creator canvas)
CREATE TABLE canvas_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES canvas_subscription_tiers(id),
    stripe_subscription_id TEXT,         -- NULL for free tiers
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(buyer_id, canvas_id)
);

-- Shop items (physical or digital goods sold via canvas)
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
    stripe_price_id TEXT,               -- Stripe Price on creator's Connect account
    thumbnail_url TEXT,
    images JSONB DEFAULT '[]',
    -- Digital delivery
    digital_asset_url TEXT,             -- For digital: proxied download link
    -- Physical shipping
    requires_shipping BOOLEAN NOT NULL DEFAULT FALSE,
    shipping_note TEXT,                 -- Creator's shipping policy/note
    -- Inventory
    stock_count INTEGER,                -- NULL = unlimited
    max_per_buyer INTEGER DEFAULT 1,
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_items_canvas ON shop_items(canvas_id) WHERE is_active;
CREATE INDEX idx_shop_items_seller ON shop_items(seller_id);

-- Orders (tracks all purchases: subscriptions, items, widgets)
CREATE TYPE order_type AS ENUM ('canvas_subscription', 'shop_item', 'widget');
CREATE TYPE order_status AS ENUM (
    'pending',           -- Checkout started
    'paid',              -- Payment confirmed
    'fulfilled',         -- Digital delivered or physical shipped
    'shipped',           -- Physical: creator marked as shipped
    'delivered',         -- Physical: confirmed delivered
    'refunded',          -- Refunded by creator
    'disputed',          -- Stripe dispute opened
    'canceled'           -- Canceled before fulfillment
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id),
    order_type order_type NOT NULL,
    item_id UUID NOT NULL,              -- References shop_items.id, canvas_subscription_tiers.id, or widgets.id
    stripe_payment_intent_id TEXT,
    stripe_checkout_session_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    platform_fee_cents INTEGER NOT NULL, -- StickerNest's cut
    status order_status NOT NULL DEFAULT 'pending',
    -- Shipping info (physical items only, entered by buyer at checkout)
    shipping_address JSONB,             -- Stripe Checkout collects this
    tracking_number TEXT,               -- Creator fills in after shipping
    tracking_url TEXT,
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_seller ON orders(seller_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('fulfilled', 'delivered');

-- RLS
ALTER TABLE creator_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Creator accounts: owners only
CREATE POLICY "Users manage own creator account" ON creator_accounts
    FOR ALL USING (auth.uid() = user_id);

-- Subscription tiers: canvas owners write, anyone reads active
CREATE POLICY "Anyone can read active tiers" ON canvas_subscription_tiers
    FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Canvas owners manage tiers" ON canvas_subscription_tiers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM canvases WHERE canvases.id = canvas_id AND canvases.owner_id = auth.uid())
    );

-- Canvas subscriptions: buyers see own, sellers see their canvas subs
CREATE POLICY "Buyers see own subscriptions" ON canvas_subscriptions
    FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Canvas owners see subscribers" ON canvas_subscriptions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM canvases WHERE canvases.id = canvas_id AND canvases.owner_id = auth.uid())
    );

-- Shop items: sellers write, anyone reads active
CREATE POLICY "Anyone can read active items" ON shop_items
    FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Sellers manage own items" ON shop_items
    FOR ALL USING (auth.uid() = seller_id);

-- Orders: buyers and sellers see own
CREATE POLICY "Buyers see own orders" ON orders
    FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers see incoming orders" ON orders
    FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers update own orders" ON orders
    FOR UPDATE USING (auth.uid() = seller_id);
```

### 3.3 Creator-Set Canvas Subscriptions

**How it works:**
1. Creator opens canvas settings → "Monetization" tab
2. Creates subscription tiers with names, prices, and benefits
   - e.g., Free ($0, viewer role), Supporter ($5/mo, commenter role), VIP ($15/mo, editor role)
3. Each paid tier creates a Stripe Price on the creator's Connect account
4. Visitors to the canvas slug see tier options if any exist
5. Clicking a paid tier → Stripe Checkout (with `application_fee_percent` for StickerNest's cut)
6. On successful checkout, buyer gets `canvas_subscriptions` entry → grants the canvas role
7. Stripe pays the creator directly; StickerNest never touches their money

**Edge functions:**
- `supabase/functions/creator-checkout/index.ts` — Creates Stripe Checkout for canvas sub or shop item
  - Uses `stripe.checkout.sessions.create({ ... stripe_account: creatorConnectId, application_fee_percent: PLATFORM_FEE })`
  - For physical items: `shipping_address_collection: { allowed_countries: [...] }` — Stripe collects address
- `supabase/functions/creator-webhook/index.ts` — Handles Connect events:
  - `checkout.session.completed` → create `orders` row + `canvas_subscriptions` row + grant role
  - `customer.subscription.deleted` → revoke canvas role
  - `charge.dispute.created` → flag order as disputed

**Platform fee:** Configurable `application_fee_percent` (e.g., 10%). Stripe deducts this
from each payment and sends it to StickerNest's platform account automatically. Creators
see the net amount in their Stripe Express Dashboard.

### 3.4 Canvas Shop — Physical & Digital Items

**What creators can sell from their canvas:**
- **Digital:** downloadable files (art packs, templates, widget bundles, etc.)
  - Fulfillment: `instant` — buyer gets a download link immediately after payment
  - Download link is proxied through StickerNest (never a raw bucket URL in the client)
- **Physical:** merchandise, prints, stickers (real ones), etc.
  - Fulfillment: `manual` — creator ships it themselves
  - Stripe Checkout collects the buyer's shipping address
  - Creator sees the shipping address in their order dashboard
  - Creator marks order as "shipped" with optional tracking number
  - Buyer gets a notification with tracking info

**Shipping — the platform's role is minimal:**
- StickerNest does NOT handle shipping rates, label printing, or fulfillment
- Stripe Checkout collects the shipping address from the buyer
- Creator sets a flat shipping price per item (or free shipping) — baked into the item price
  or added as a separate Stripe Shipping Rate on their Connect account
- Creator is responsible for actually shipping the item and providing tracking
- The `orders` table stores `shipping_address`, `tracking_number`, `tracking_url`
- Creators can optionally add a `shipping_note` to their items (e.g., "Ships within 5 business days, US only")
- If a creator wants sophisticated shipping (calculated rates, multiple carriers),
  they can use Stripe Shipping Rates or link to an external store (Shopify, Printful)
  and embed it as a widget in their canvas

**No returns/refunds platform:**
- Refunds are handled through Stripe — creator initiates from their Express Dashboard
- StickerNest surfaces a "Contact Seller" button on order history
- Disputes go through Stripe's dispute resolution process
- StickerNest does not arbitrate between buyers and sellers

### 3.5 Widget Marketplace Pricing

**Update existing `widgets` table:**
```sql
ALTER TABLE widgets ADD COLUMN price_cents INTEGER DEFAULT 0;
ALTER TABLE widgets ADD COLUMN currency TEXT DEFAULT 'usd';
ALTER TABLE widgets ADD COLUMN stripe_price_id TEXT;
ALTER TABLE widgets ADD COLUMN is_free BOOLEAN GENERATED ALWAYS AS (price_cents = 0) STORED;
```

**Marketplace flow for paid widgets:**
- Creator publishes widget in Lab with a price (or free)
- Price creates a Stripe Price on the creator's Connect account
- Buyer clicks "Install" on a paid widget → Stripe Checkout with `application_fee_percent`
- On successful payment → `orders` entry + `user_installed_widgets` entry
- Widget HTML is only delivered after successful payment (not before)
- Free widgets install immediately (existing flow, unchanged)

**Update `MarketplaceWidgetListing` type:**
```typescript
export interface MarketplaceWidgetListing {
  // ... existing fields ...
  priceCents: number;        // 0 = free
  currency: string;
  isFree: boolean;
}
```

### 3.6 Creator Dashboard

**New files in:** `src/shell/pages/creator-dashboard/`

Route: `/dashboard/creator` (Creator+ tier only)

**Sections:**
- **Earnings overview:** Total revenue, platform fees deducted, payout schedule
  - Reads from Stripe Connect via Express Dashboard link (no need to build custom analytics)
  - "Open Stripe Dashboard" button → `supabase/functions/connect-dashboard/index.ts`
- **Canvas subscriptions:** List of subscriber counts per canvas, revenue per tier
- **Shop orders:** Incoming orders, status management (mark shipped, add tracking)
  - Filter by: pending, paid, shipped, delivered
  - For physical items: "Mark Shipped" button → enter tracking number
  - Buyer gets notification when order status changes
- **Widget sales:** Revenue from marketplace widget sales
- **Quick action:** Link to Stripe Express Dashboard for payout details, tax docs, bank info

**Key principle:** The creator dashboard shows order management (what to ship, what's pending).
Financial details (bank accounts, tax forms, payout schedules) live in Stripe's Express
Dashboard — StickerNest never displays or stores that sensitive information.

### 3.7 Buyer Experience

**Canvas subscription flow (buyer perspective):**
1. Visit `/canvas/:slug` → see the canvas in preview mode
2. If creator has set subscription tiers, see a tier selector overlay
3. Free tier: immediate access at viewer role
4. Paid tier: Stripe Checkout → payment → role upgraded → canvas unlocks
5. Manage subscriptions in Settings → "My Subscriptions"

**Shop purchase flow (buyer perspective):**
1. Canvas has a "Shop" widget/panel embedded by the creator
2. Browse items → click "Buy" → Stripe Checkout
3. Digital items: download link appears immediately in order confirmation
4. Physical items: order appears in "My Orders" with status tracking
5. "My Orders" page: view history, track shipments, contact seller

**New files:**
- `src/shell/pages/settings/MySubscriptionsSection.tsx` — Active canvas subscriptions
- `src/shell/pages/settings/MyOrdersSection.tsx` — Purchase history + order tracking

### 3.8 What StickerNest Handles vs What It Doesn't

| Responsibility | Who handles it |
|---|---|
| Payment processing | **Stripe** (via Connect) |
| Payout to creators | **Stripe** (automatic, per creator's schedule) |
| Tax calculation (sales tax, VAT) | **Stripe Tax** (optional, creator enables) |
| 1099 / tax reporting | **Stripe** (for Express accounts) |
| Shipping address collection | **Stripe Checkout** (built-in) |
| Actual shipping / fulfillment | **Creator** (manually, or via external service) |
| Shipping rate calculation | **Creator** (flat rate in price, or Stripe Shipping Rates) |
| Refunds | **Creator** (via Stripe Express Dashboard) |
| Disputes | **Stripe** (dispute resolution process) |
| Platform fee collection | **Stripe** (automatic `application_fee_percent`) |
| Order status tracking | **StickerNest** (orders table, creator dashboard) |
| Digital asset delivery | **StickerNest** (proxied download after payment) |
| Creator onboarding / KYC | **Stripe** (Express account onboarding) |
| Canvas role grants on subscription | **StickerNest** (webhook → canvas_subscriptions → role) |

---

## Phase 4: Public Canvases & Slug Distribution

### 4.1 Slug Resolution — Complete the Flow

**Current gap:** `CanvasPage` detects slug vs UUID but doesn't actually fetch canvas data from Supabase for slug routes.

**Fix in:** `src/shell/router/pages.tsx`
- When `canvasParam` is a slug (not UUID, not "demo"):
  1. Call `supabase.from('canvases').select('*').eq('slug', slug).eq('is_public', true).single()`
  2. If found: load canvas entities, set `canvasInteractionMode: 'preview'`, set `chromeMode: 'clean'`
  3. If not found: show 404 page
  4. No auth required for public slug access

### 4.2 SEO & Open Graph Tags for Public Canvases

**New file:** `supabase/functions/og-image/index.ts`
- Edge function that renders a canvas thumbnail as an OG image
- Uses canvas thumbnail_url if available, otherwise generates one

**Vercel middleware or edge function** for dynamic `<head>` injection:
- When a bot/crawler requests `/canvas/:slug`, inject:
  ```html
  <meta property="og:title" content="Canvas Name — StickerNest" />
  <meta property="og:description" content="Canvas description" />
  <meta property="og:image" content="https://stickernest.com/api/og/:slug" />
  <meta property="og:url" content="https://stickernest.com/canvas/:slug" />
  <meta name="twitter:card" content="summary_large_image" />
  ```
- SPA fallback for non-bot requests (normal Vite index.html)

### 4.3 Embed Route

**New route:** `/embed/:slug`
- Renders the canvas in a stripped-down iframe-friendly view
- No header, no sidebar, no navigation — just the canvas in preview mode
- Provides an embed code snippet in the canvas sharing settings:
  ```html
  <iframe src="https://stickernest.com/embed/my-canvas" width="800" height="600"></iframe>
  ```
- Vercel `X-Frame-Options` header must be relaxed for `/embed/*` routes only

### 4.4 Canvas Sharing Settings UI

**New panel in:** `src/canvas/panels/sharing/SharingPanel.tsx`
- Toggle `isPublic`
- Set/edit slug (with availability check)
- Copy public URL button
- Copy embed code button
- Set default role for public visitors (viewer / commenter)
- Invite collaborators by email (creates canvas_members entry)
- Manage existing collaborator roles

### 4.5 Custom Domain Support (Pro+ Tier)

**Database addition:** `canvases.custom_domain TEXT UNIQUE`

- Pro/Enterprise users can map a custom domain to a canvas slug
- Verification via DNS TXT record
- Vercel custom domain API for certificate provisioning
- This is a premium differentiator — keep it Pro+ only

---

## Phase 5: Analytics, Monitoring & Observability

### 5.1 Error Tracking — Sentry

**New dependency:** `@sentry/react`

- Initialize in `src/main.tsx`
- Configure source maps upload in Vite build
- Set user context from `authStore` on login
- Tag errors with canvas ID, widget ID when available
- WidgetFrame errors already caught by error boundary — forward to Sentry

### 5.2 Product Analytics — PostHog

**New dependency:** `posthog-js`

- Track key events:
  - `canvas.created`, `canvas.shared`, `canvas.slug.set`
  - `widget.installed`, `widget.placed`, `widget.removed`
  - `subscription.started`, `subscription.upgraded`, `subscription.canceled`
  - `lab.widget.created`, `lab.widget.published`
  - `user.signed_up`, `user.invited_collaborator`
  - `creator.connect.started`, `creator.connect.completed`
  - `creator.tier.created`, `creator.item.listed`, `creator.order.fulfilled`
  - `buyer.canvas_sub.started`, `buyer.shop.purchased`
- Feature flags via PostHog for gradual rollout
- Funnel tracking: signup → create canvas → share → upgrade
- Creator funnel: upgrade to Creator → connect Stripe → set prices → first sale

### 5.3 Uptime Monitoring

- Vercel Analytics (built-in, enable in project settings)
- Supabase Dashboard for database metrics
- Optional: Checkly or Better Uptime for external monitoring
- Health check endpoint: `/api/health` (Vercel serverless function)

---

## Phase 6: Auth & Onboarding Polish

### 6.1 OAuth Provider Activation

**Config changes in:** `supabase/config.toml`
- Enable Google OAuth (requires Google Cloud Console credentials)
- Enable GitHub OAuth (requires GitHub App credentials)
- Enable Discord OAuth (optional, community-oriented)
- Store provider secrets as Supabase project secrets

### 6.2 Onboarding Flow

**New files in:** `src/shell/pages/onboarding/`
- Step 1: Welcome + choose display name
- Step 2: Create first canvas (or use template)
- Step 3: Quick tour overlay (highlight key UI elements)
- Skip option always available
- Onboarding state tracked in `users.metadata.onboarding_completed`

### 6.3 Login/Signup Page Polish

**Update:** `src/shell/router/pages.tsx` — `LoginPage`
- Email/password form with validation
- OAuth buttons (Google, GitHub)
- "Forgot password" flow via Supabase Auth
- Link to `/pricing` for tier comparison

### 6.4 Workspace Invite Flow

**Update:** `InvitePage` component
- Accept invite token → join canvas with assigned role
- If not authenticated: sign up first, then auto-join
- Show canvas preview before accepting

---

## Phase 7: Production Hardening

### 7.1 Security Audit Checklist

- [ ] All RLS policies tested with role-based access scenarios
- [ ] Stripe Direct webhook signature validation confirmed
- [ ] Stripe Connect webhook signature validation confirmed (separate endpoint secret)
- [ ] Connect account status verified before allowing price creation (charges_enabled = true)
- [ ] No API keys or secrets in client bundle (verify with `vite build` output inspection)
- [ ] CSP headers reviewed for production (currently `X-Frame-Options: DENY` — relax for `/embed/*`)
- [ ] Rate limiting on edge functions (Supabase built-in or custom)
- [ ] CORS configuration for Supabase (restrict to production domain)
- [ ] Widget sandbox escape testing (postMessage origin validation)
- [ ] SQL injection audit (Supabase parameterized queries — verify no raw SQL)
- [ ] File upload validation (type, size limits) for sticker assets

### 7.2 Performance

- Enable Vercel Edge caching for static assets
- Configure Supabase connection pooling (PgBouncer)
- Add database indexes for any slow queries identified in testing
- Canvas render performance: verify 60fps target with 100+ entities
- Widget load time budget: READY signal within 500ms

### 7.3 E2E Test Suite — Enable and Expand

**Update:** `.github/workflows/ci.yml` — remove `if: false` from E2E job

**Priority E2E scenarios:**
1. Sign up → create canvas → place widget → save → reload → verify state
2. Set canvas slug → visit public URL → see canvas in preview mode
3. Upgrade flow → Stripe Checkout → tier updated → feature unlocked
4. Invite collaborator → collaborator joins → see cursor presence
5. Install widget from marketplace → place on canvas → verify functionality
6. Creator Connect onboarding → set canvas subscription tiers → buyer subscribes → role granted
7. Creator lists shop item → buyer purchases → order appears in creator dashboard
8. Physical item purchase → shipping address collected → creator marks shipped → buyer sees tracking

### 7.4 Backup & Recovery

- Supabase automatic backups (enabled on Pro plan)
- Point-in-time recovery configured
- Database migration rollback scripts for each migration
- Documented recovery procedure for Stripe webhook failures

---

## Phase 8: Launch Checklist

### Pre-Launch (1 week before)
- [ ] Stripe Direct products and prices created in production (4 tiers)
- [ ] Stripe Connect application approved and configured
- [ ] Platform fee percentages configured per tier (12% / 8% / 5%)
- [ ] DNS configured for production domain
- [ ] SSL certificates verified
- [ ] Supabase project on paid plan (for production features)
- [ ] Environment secrets set in Vercel and Supabase
- [ ] OAuth provider credentials set for production domain
- [ ] Sentry + PostHog projects created and configured
- [ ] Terms of Service and Privacy Policy pages added
- [ ] Cookie consent banner (if required by jurisdiction)
- [ ] Email templates configured in Supabase Auth (welcome, password reset, invite)
- [ ] Support email / help desk set up

### Launch Day
- [ ] Deploy to production via `main` branch push
- [ ] Verify Stripe Direct webhooks receiving events (platform subs)
- [ ] Verify Stripe Connect webhooks receiving events (creator commerce)
- [ ] Verify OAuth sign-in works
- [ ] Test creator onboarding flow end-to-end (Connect → set price → purchase)
- [ ] Create 3-5 template canvases with public slugs for landing page
- [ ] Monitor Sentry for errors
- [ ] Monitor Supabase dashboard for database load
- [ ] Announce on social channels

### Post-Launch (first 2 weeks)
- [ ] Monitor conversion funnel: signup → activation → upgrade
- [ ] Review Sentry error reports daily
- [ ] Monitor Stripe for failed payments
- [ ] Collect user feedback via in-app prompt
- [ ] Iterate on onboarding based on drop-off data

---

## Tier Feature Matrix (Proposed)

| Feature | Free | Creator ($9/mo) | Pro ($29/mo) | Enterprise (custom) |
|---------|------|-----------------|--------------|---------------------|
| Canvases | 3 | 10 | 50 | Unlimited |
| Storage | 100 MB | 1 GB | 5 GB | 50 GB |
| Widgets per canvas | 10 | 50 | 200 | Unlimited |
| Collaborators per canvas | 3 | 10 | 50 | Unlimited |
| Public slug URLs | 1 | 5 | Unlimited | Unlimited |
| Widget Lab (IDE) | - | Yes | Yes | Yes |
| Publish to Marketplace | - | Yes | Yes | Yes |
| **Sell widgets (creator pricing)** | - | **Yes** | **Yes** | **Yes** |
| **Canvas subscriptions (creator pricing)** | - | **Yes** | **Yes** | **Yes** |
| **Canvas shop (digital items)** | - | **Yes** | **Yes** | **Yes** |
| **Canvas shop (physical items + shipping)** | - | - | **Yes** | **Yes** |
| External integrations | - | Yes | Yes | Yes |
| Custom domains | - | - | Yes | Yes |
| Canvas embeds | - | - | Yes | Yes |
| Priority support | - | - | Yes | Yes |
| SSO / SAML | - | - | - | Yes |
| Dedicated instance | - | - | - | Yes |

### Platform Fee on Creator Sales

StickerNest takes a platform fee (`application_fee_percent`) on every creator transaction:

| Tier | Platform fee |
|------|-------------|
| Creator | 12% |
| Pro | 8% |
| Enterprise | 5% (negotiable) |

Stripe's own processing fees (2.9% + 30c) are separate and paid by the creator from their share.
Lower platform fees incentivize upgrades — this is the primary revenue lever beyond subscriptions.

---

## Implementation Priority Order

1. **Stripe Direct + Billing migration** (Phase 1) — blocks all revenue
2. **Quota enforcement** (Phase 2) — blocks tier value differentiation
3. **Stripe Connect + Creator onboarding** (Phase 3.1-3.2) — blocks creator economy
4. **Canvas subscriptions** (Phase 3.3) — first creator revenue stream
5. **Slug resolution + sharing UI** (Phase 4.1, 4.4) — blocks public canvas product
6. **Canvas shop — digital items** (Phase 3.4) — second creator revenue stream
7. **SEO/OG tags** (Phase 4.2) — blocks social sharing/virality
8. **Sentry + PostHog** (Phase 5.1, 5.2) — blocks operational visibility
9. **Widget marketplace pricing** (Phase 3.5) — third creator revenue stream
10. **Creator dashboard** (Phase 3.6) — order management for sellers
11. **OAuth activation** (Phase 6.1) — blocks frictionless signup
12. **Onboarding** (Phase 6.2) — blocks activation rate
13. **Canvas shop — physical items** (Phase 3.4) — requires shipping address collection
14. **Embed route** (Phase 4.3) — unlocks distribution channel
15. **Custom domains** (Phase 4.5) — premium feature, can wait
16. **E2E tests** (Phase 7.3) — confidence for iteration speed
