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
- No settings/billing UI
- No analytics or error monitoring
- OAuth providers configured but not enabled
- Marketplace UI is stubs
- No SEO/OG tags for public slug canvases
- No embed route for iframe embedding
- No custom domain support for slugs

---

## Phase 1: Billing & Subscriptions (Critical Path)

### 1.1 Stripe Integration — Supabase Edge Functions

**New files:**
- `supabase/functions/stripe-checkout/index.ts` — Create Stripe Checkout session
- `supabase/functions/stripe-webhook/index.ts` — Handle Stripe webhook events
- `supabase/functions/stripe-portal/index.ts` — Create Customer Portal session

**Implementation:**
- Use Stripe Checkout for subscription creation (no custom payment form needed)
- Use Stripe Customer Portal for plan changes, cancellation, payment method updates
- Webhook handler processes: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`
- Webhook idempotency via `stripe_events` audit log table
- All Stripe API calls happen server-side in edge functions — no Stripe secret key in client

### 1.2 Database Schema — New Migration

**New file:** `supabase/migrations/00007_add_billing.sql`

```sql
-- Subscriptions table
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
    can_publish_widgets BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed default tier quotas
INSERT INTO tier_quotas VALUES
    ('free',       3,    100,  10,  3,  FALSE, FALSE, FALSE),
    ('creator',   10,   1000,  50, 10,  FALSE, TRUE,  TRUE),
    ('pro',       50,   5000, 200, 50,  TRUE,  TRUE,  TRUE),
    ('enterprise', -1, 50000,  -1, -1,  TRUE,  TRUE,  TRUE);  -- -1 = unlimited
```

### 1.3 Tier Sync — Webhook → User Tier

When Stripe subscription changes, the webhook edge function:
1. Validates webhook signature
2. Checks idempotency in `stripe_events`
3. Updates `subscriptions` table
4. Updates `users.tier` to match the subscription product
5. Emits a Supabase Realtime event so the client's `authStore` picks up the change

### 1.4 Pricing Page Component

**New file:** `src/shell/pages/PricingPage.tsx`

- Route: `/pricing`
- Shows the 4 tiers with features and prices
- "Get Started" buttons link to Stripe Checkout (via edge function)
- Highlight current plan for authenticated users
- Free tier has no checkout — it's the default

### 1.5 Billing Settings UI

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

## Phase 3: Public Canvases & Slug Monetization

### 3.1 Slug Resolution — Complete the Flow

**Current gap:** `CanvasPage` detects slug vs UUID but doesn't actually fetch canvas data from Supabase for slug routes.

**Fix in:** `src/shell/router/pages.tsx`
- When `canvasParam` is a slug (not UUID, not "demo"):
  1. Call `supabase.from('canvases').select('*').eq('slug', slug).eq('is_public', true).single()`
  2. If found: load canvas entities, set `canvasInteractionMode: 'preview'`, set `chromeMode: 'clean'`
  3. If not found: show 404 page
  4. No auth required for public slug access

### 3.2 SEO & Open Graph Tags for Public Canvases

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

### 3.3 Embed Route

**New route:** `/embed/:slug`
- Renders the canvas in a stripped-down iframe-friendly view
- No header, no sidebar, no navigation — just the canvas in preview mode
- Provides an embed code snippet in the canvas sharing settings:
  ```html
  <iframe src="https://stickernest.com/embed/my-canvas" width="800" height="600"></iframe>
  ```
- Vercel `X-Frame-Options` header must be relaxed for `/embed/*` routes only

### 3.4 Canvas Sharing Settings UI

**New panel in:** `src/canvas/panels/sharing/SharingPanel.tsx`
- Toggle `isPublic`
- Set/edit slug (with availability check)
- Copy public URL button
- Copy embed code button
- Set default role for public visitors (viewer / commenter)
- Invite collaborators by email (creates canvas_members entry)
- Manage existing collaborator roles

### 3.5 Custom Domain Support (Pro+ Tier)

**Database addition:** `canvases.custom_domain TEXT UNIQUE`

- Pro/Enterprise users can map a custom domain to a canvas slug
- Verification via DNS TXT record
- Vercel custom domain API for certificate provisioning
- This is a premium differentiator — keep it Pro+ only

---

## Phase 4: Analytics, Monitoring & Observability

### 4.1 Error Tracking — Sentry

**New dependency:** `@sentry/react`

- Initialize in `src/main.tsx`
- Configure source maps upload in Vite build
- Set user context from `authStore` on login
- Tag errors with canvas ID, widget ID when available
- WidgetFrame errors already caught by error boundary — forward to Sentry

### 4.2 Product Analytics — PostHog

**New dependency:** `posthog-js`

- Track key events:
  - `canvas.created`, `canvas.shared`, `canvas.slug.set`
  - `widget.installed`, `widget.placed`, `widget.removed`
  - `subscription.started`, `subscription.upgraded`, `subscription.canceled`
  - `lab.widget.created`, `lab.widget.published`
  - `user.signed_up`, `user.invited_collaborator`
- Feature flags via PostHog for gradual rollout
- Funnel tracking: signup → create canvas → share → upgrade

### 4.3 Uptime Monitoring

- Vercel Analytics (built-in, enable in project settings)
- Supabase Dashboard for database metrics
- Optional: Checkly or Better Uptime for external monitoring
- Health check endpoint: `/api/health` (Vercel serverless function)

---

## Phase 5: Auth & Onboarding Polish

### 5.1 OAuth Provider Activation

**Config changes in:** `supabase/config.toml`
- Enable Google OAuth (requires Google Cloud Console credentials)
- Enable GitHub OAuth (requires GitHub App credentials)
- Enable Discord OAuth (optional, community-oriented)
- Store provider secrets as Supabase project secrets

### 5.2 Onboarding Flow

**New files in:** `src/shell/pages/onboarding/`
- Step 1: Welcome + choose display name
- Step 2: Create first canvas (or use template)
- Step 3: Quick tour overlay (highlight key UI elements)
- Skip option always available
- Onboarding state tracked in `users.metadata.onboarding_completed`

### 5.3 Login/Signup Page Polish

**Update:** `src/shell/router/pages.tsx` — `LoginPage`
- Email/password form with validation
- OAuth buttons (Google, GitHub)
- "Forgot password" flow via Supabase Auth
- Link to `/pricing` for tier comparison

### 5.4 Workspace Invite Flow

**Update:** `InvitePage` component
- Accept invite token → join canvas with assigned role
- If not authenticated: sign up first, then auto-join
- Show canvas preview before accepting

---

## Phase 6: Production Hardening

### 6.1 Security Audit Checklist

- [ ] All RLS policies tested with role-based access scenarios
- [ ] Stripe webhook signature validation confirmed
- [ ] No API keys or secrets in client bundle (verify with `vite build` output inspection)
- [ ] CSP headers reviewed for production (currently `X-Frame-Options: DENY` — relax for `/embed/*`)
- [ ] Rate limiting on edge functions (Supabase built-in or custom)
- [ ] CORS configuration for Supabase (restrict to production domain)
- [ ] Widget sandbox escape testing (postMessage origin validation)
- [ ] SQL injection audit (Supabase parameterized queries — verify no raw SQL)
- [ ] File upload validation (type, size limits) for sticker assets

### 6.2 Performance

- Enable Vercel Edge caching for static assets
- Configure Supabase connection pooling (PgBouncer)
- Add database indexes for any slow queries identified in testing
- Canvas render performance: verify 60fps target with 100+ entities
- Widget load time budget: READY signal within 500ms

### 6.3 E2E Test Suite — Enable and Expand

**Update:** `.github/workflows/ci.yml` — remove `if: false` from E2E job

**Priority E2E scenarios:**
1. Sign up → create canvas → place widget → save → reload → verify state
2. Set canvas slug → visit public URL → see canvas in preview mode
3. Upgrade flow → Stripe Checkout → tier updated → feature unlocked
4. Invite collaborator → collaborator joins → see cursor presence
5. Install widget from marketplace → place on canvas → verify functionality

### 6.4 Backup & Recovery

- Supabase automatic backups (enabled on Pro plan)
- Point-in-time recovery configured
- Database migration rollback scripts for each migration
- Documented recovery procedure for Stripe webhook failures

---

## Phase 7: Launch Checklist

### Pre-Launch (1 week before)
- [ ] Stripe products and prices created in production
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
- [ ] Verify Stripe webhooks receiving events
- [ ] Verify OAuth sign-in works
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
| External integrations | - | Yes | Yes | Yes |
| Custom domains | - | - | Yes | Yes |
| Canvas embeds | - | - | Yes | Yes |
| Priority support | - | - | Yes | Yes |
| SSO / SAML | - | - | - | Yes |
| Dedicated instance | - | - | - | Yes |

---

## Implementation Priority Order

1. **Stripe + Billing migration** (Phase 1) — blocks revenue
2. **Quota enforcement** (Phase 2) — blocks tier value differentiation
3. **Slug resolution + sharing UI** (Phase 3.1, 3.4) — blocks public canvas product
4. **SEO/OG tags** (Phase 3.2) — blocks social sharing/virality
5. **Sentry + PostHog** (Phase 4.1, 4.2) — blocks operational visibility
6. **OAuth activation** (Phase 5.1) — blocks frictionless signup
7. **Onboarding** (Phase 5.2) — blocks activation rate
8. **Embed route** (Phase 3.3) — unlocks distribution channel
9. **Custom domains** (Phase 3.5) — premium feature, can wait
10. **E2E tests** (Phase 6.3) — confidence for iteration speed
