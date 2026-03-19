# StickerNest V5 — Master TODO

> Generated 2026-03-19 from codebase audit. Organized by priority and layer.

---

## 1. SaaS Billing & Subscriptions (Phase 1 — MOSTLY COMPLETE ✓)

Backend fully wired. Frontend built and tested. Quota hook ready for integration.

- [x] **Stripe Direct Integration**
  - [x] Edge function: `stripe-checkout` (checkout session creation, free tier fast-path)
  - [x] Edge function: `stripe-webhook` (checkout.session.completed, subscription.updated/deleted, invoice.paid/failed)
  - [x] Edge function: `stripe-portal` (Stripe Customer Portal session)
  - [x] Edge function: `cancel-subscription` (Stripe Connect subscription cancellation)
  - [x] Idempotency log (`stripe_events` table, dedup in webhook)
  - [x] DB migration: `00007_add_billing.sql` (subscriptions, stripe_events, tier_quotas + RLS)
- [x] **Pricing Page** — `PricingPage.tsx` with 4-tier comparison, Stripe checkout wiring (6 tests)
- [x] **Billing Settings UI** — `BillingSection.tsx` with live usage meters, portal link (8 tests)
- [x] **Quota Enforcement**
  - [x] `src/kernel/quota/quota.ts` — checkQuota + checkFeature (18 tests)
  - [x] `src/kernel/quota/useQuotaCheck.ts` — React hook for gating actions
  - [x] `src/shell/components/UpgradePrompt.tsx` — limit-hit modal with upgrade CTA
  - [x] `src/kernel/billing/billing-api.ts` — getSubscription, getTierQuota, getUsageCounts (16 tests)
- [ ] **Remaining: Quota enforcement call sites**
  - [ ] Call `useQuotaCheck().gateResource('canvas_count')` before canvas creation
  - [ ] Call `useQuotaCheck().gateResource('widgets_per_canvas', canvasId)` before widget placement
  - [ ] Call `useQuotaCheck().gateResource('collaborators_per_canvas', canvasId)` before adding collaborators
  - [ ] Storage usage tracking (currently returns 0 — needs backend aggregate)

---

## 2. Layer 1 — Social + Sync (COMPLETE ✓)

Real-time collaboration infrastructure. 9 modules, 123 passing tests.

- [x] **Channel Management** (`src/social/channel/`) — Supabase Realtime, one channel per canvas
- [x] **Presence Tracking** (`src/social/presence/`) — join/leave, Guest support, socialStore via bus
- [x] **Cursor Broadcast** (`src/social/cursor/`) — 30fps throttle, canvas-space positions
- [x] **Entity Transform Sync** (`src/social/entity-sync/`) — optimistic drag, LWW on drop
- [x] **Conflict Resolution** (`src/social/conflict/`) — LWW, Yjs CRDT, revision-based strategies
- [x] **Edit Locks** (`src/social/edit-lock/`) — advisory, 30s timeout, broadcast
- [x] **Offline Degradation** (`src/social/offline/`) — 5s grace, queue + replay
- [x] **Init/Teardown** (`src/social/init.ts`) — orchestrates all managers
- [x] **Gate Tests** — all 123 tests passing

---

## 3. Creator Commerce — Stripe Connect (Phase 3)

Database schema `00008_add_creator_commerce.sql` exists but is unwired.

- [ ] **Stripe Connect Onboarding**
  - [ ] `creator-onboard` edge function (Express Account Link)
  - [ ] Identity verification flow
  - [ ] Bank account / payout setup
  - [ ] `creator_accounts` table wiring
- [ ] **Commerce Widgets**
  - [ ] `wgt-signup` — canvas-level user signup (currently stub)
  - [ ] `wgt-subscribe` — canvas subscription tier selection (currently stub)
  - [ ] `wgt-shop` — shop item listing & purchasing (currently stub)
- [ ] **Canvas Subscriptions**
  - [ ] Creator-defined pricing tiers (`canvas_subscription_tiers` table)
  - [ ] `creator-checkout` edge function (Connect checkout session)
  - [ ] `creator-webhook` edge function (Connect events)
  - [ ] Platform fee collection
- [ ] **Canvas Shop**
  - [ ] Digital item delivery (download links)
  - [ ] Physical item order management & fulfillment tracking
  - [ ] Stock reservation during checkout (prevent race conditions)
- [ ] **Creator Dashboard**
  - [ ] Revenue analytics, subscriber counts
  - [ ] Order management UI
  - [ ] Payout history
- [ ] **Commerce Hardening** (per `docs/commerce-hardening-checklist.md`)
  - [ ] Fix `creator_id` → `seller_id` mismatch on `shop_items`
  - [ ] Add authorization checks (verify canvas ownership on tier/item creation)
  - [ ] Add input validation (price, name, email, password strength)
  - [ ] Add pagination to `my_orders`, `my_tiers`, `my_items`, `shop_items` queries
  - [ ] Add 30s TTL caching for tier/item queries
  - [ ] Add Stripe return flow handling
  - [ ] Add idempotency keys for checkout
  - [ ] Rate limiting on auth endpoints
  - [ ] CSRF nonce protection
  - [ ] CSS transitions, skeleton loaders, success animations
  - [ ] Subscription cancellation UI + refund request flow
  - [ ] ARIA labels and keyboard navigation for all commerce widgets

---

## 4. Public Canvas & Slug Distribution (Phase 4)

- [ ] **Slug Resolution**
  - [ ] Wire `/canvas/:slug` route to query by slug + `is_public`
  - [ ] Auto-load in preview mode for public canvases
- [ ] **SEO & Open Graph**
  - [ ] Dynamic OG image generation edge function
  - [ ] Middleware for `<head>` tag injection (title, description, image)
- [ ] **Embed Route**
  - [ ] Build `/embed/:slug` stripped-down iframe-friendly view
  - [ ] Relax `X-Frame-Options` for embed route only
- [ ] **Sharing Settings Panel**
  - [ ] Public toggle, slug editor, slug availability check
  - [ ] Copy URL / embed code snippets
- [ ] **Custom Domain Support** (Pro+ tier)
  - [ ] DNS TXT verification
  - [ ] Vercel custom domain API integration

---

## 5. Canvas Interaction Polish (MOSTLY COMPLETE ✓)

Per approved design: `docs/plans/2026-02-24-canvas-interactions-design.md`

- [x] **Keyboard Shortcuts** — `useCanvasShortcuts.ts` (37 tests)
  - [x] Delete/Backspace, Escape, Ctrl+A, arrow nudge (10px/50px)
  - [x] Z-order: Ctrl+]/[, Ctrl+Shift+]/[
  - [x] Tool hotkeys: V, H, M, T, R, P, E (no selection required)
  - [x] Ctrl+D duplicate, Ctrl+G group, Ctrl+Shift+G ungroup
  - [x] C crop toggle, Ctrl+=/- zoom, Ctrl+0 reset
- [x] **Resize Handles** — `SelectionOverlay.tsx` (8-handle resize + crop handles)
- [x] **Alignment & Distribution** — `align.ts` + `alignHandler.ts`
- [x] **Group / Ungroup** — `groupHandler.ts` (bus-driven)
- [x] **Crop Tool** — `cropHandler.ts` + crop UI in SelectionOverlay
- [ ] **Remaining polish**
  - [ ] Grouped entities move/resize as unit (group transform propagation)
  - [ ] Aspect presets in crop UI

---

## 6. Auth & Onboarding (Phase 6)

- [ ] **OAuth Provider Activation**
  - [ ] Enable Google OAuth in production Supabase
  - [ ] Enable GitHub OAuth
  - [ ] Enable Discord OAuth
- [ ] **Onboarding Flow**
  - [ ] Build `src/shell/pages/onboarding/` route
  - [ ] Workspace creation wizard
  - [ ] First canvas setup
- [ ] **Workspace Invite Flow**
  - [ ] `/invite/:token` acceptance page
  - [ ] Email invitation sending
  - [ ] Role assignment on accept

---

## 7. Widget Uninstall UI (COMPLETE ✓)

- [x] Uninstall button on marketplace detail page (`data-testid="marketplace-uninstall-btn"`)
- [x] Confirmation dialog: "This will remove the widget and delete all saved state"
- [x] `marketplace.widget.uninstalled` bus event emitted via install-flow service
- [x] Success/error feedback with status tracking
- [x] Built-in widgets show "Built-in" label (no uninstall)

---

## 8. Marketplace Enhancements

- [ ] **Ratings & Reviews**
  - [ ] Review submission UI on widget detail page
  - [ ] Star rating display on listing cards
  - [ ] Review moderation (flag/report)
- [ ] **Widget Pricing**
  - [ ] Paid widget schema (price field on listing)
  - [ ] Purchase flow via Stripe
  - [ ] License key / entitlement tracking
- [ ] **Publisher Dashboard Polish**
  - [ ] Version history view per widget
  - [ ] Deprecation workflow
  - [ ] Download/install analytics

---

## 9. Analytics & Observability (Phase 5)

- [ ] **Sentry Integration**
  - [ ] Configure Sentry DSN
  - [ ] Error boundary integration
  - [ ] Source map uploads in CI
- [ ] **PostHog Integration**
  - [ ] Configure PostHog project
  - [ ] Track key user events (canvas created, widget installed, etc.)
  - [ ] Feature flag support

---

## 10. UI Components Buildout

Per `docs/UI_COMPONENTS_NEEDED.md` — 64 components across all layers.

- [ ] **Shell Components** (4)
  - [ ] App layout shell
  - [ ] Theme selector
  - [ ] Shortcuts help overlay
  - [ ] Application error boundary
- [ ] **Social Components** (12)
  - [ ] Presence avatars bar
  - [ ] Remote cursor overlays
  - [ ] Edit lock indicator
  - [ ] Offline status banner
  - [ ] User profile cards
  - [ ] (7 more per docs)
- [ ] **Canvas Components** (17)
  - [ ] Viewport controls
  - [ ] Toolbar
  - [ ] Selection overlay with handles
  - [ ] Tool option bars (pen, text, shape)
  - [ ] Pipeline graph editor UI
  - [ ] Properties panel
  - [ ] Layers panel
  - [ ] Asset panel
  - [ ] Context menu
  - [ ] Floating action bar
  - [ ] (7 more per docs)
- [ ] **Spatial/VR Components** (3)
  - [ ] VR entry button
  - [ ] VR session UI overlay
  - [ ] Spatial position editor
- [ ] **Lab Components** (10)
  - [ ] Monaco editor wrapper
  - [ ] Live preview pane
  - [ ] Event inspector
  - [ ] Manifest editor
  - [ ] AI generation panel
  - [ ] Version history panel
  - [ ] Import/fork UI
  - [ ] Node graph editor
  - [ ] Publish pipeline UI
  - [ ] Creator+ access gate
- [ ] **Marketplace Components** (6)
  - [ ] Browse/search grid
  - [ ] Widget detail page
  - [ ] Install/uninstall buttons
  - [ ] Publisher dashboard
  - [ ] Reviews section
  - [ ] Category navigation

---

## 11. Minor Code TODOs

- [x] `gesture-interpreter.ts` — Pinch rotation via atan2 angle delta between touch points
- [x] `gesture-interpreter.ts` — Pan velocity via EMA-smoothed instantaneous velocity (px/s)
- [ ] `src/canvas/tools/direct-select/direct-select-tool.ts:142` — Path segment subdivision on double-click

---

## 12. Production Hardening (Phase 7)

- [ ] **Security Audit**
  - [ ] RLS policy review for all Supabase tables
  - [ ] CSP header audit
  - [ ] Widget sandbox escape testing
- [ ] **Performance**
  - [ ] Bundle size analysis and code splitting
  - [ ] Canvas render performance profiling at 1000+ entities
  - [ ] Event bus throughput under load
- [ ] **E2E Test Suite**
  - [ ] Expand Playwright tests (currently configured but sparse)
  - [ ] Enable E2E in CI pipeline
  - [ ] GPU-free rendering via `--use-gl=swiftshader`
- [ ] **Backup & Recovery**
  - [ ] Database backup procedures
  - [ ] Point-in-time recovery testing
  - [ ] Data export for users
