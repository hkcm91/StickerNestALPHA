# StickerNest V5 — Master TODO

> Generated 2026-03-19 from codebase audit. Organized by priority and layer.

---

## 1. SaaS Billing & Subscriptions (Phase 1 — CRITICAL PATH)

Blocks all revenue. Database schema `00007_add_billing.sql` exists but nothing consumes it.

- [ ] **Stripe Direct Integration**
  - [ ] Initialize Stripe SDK client in kernel
  - [ ] Create `checkout-session` edge function (Free → Creator/Pro/Enterprise)
  - [ ] Create `customer-portal` edge function (manage subscription)
  - [ ] Create `stripe-webhook` edge function (subscription lifecycle events)
  - [ ] Idempotency log for webhook events (`stripe_events` table)
- [ ] **Pricing Page**
  - [ ] Build `src/shell/pages/PricingPage.tsx` with tier comparison
  - [ ] Wire checkout button to Stripe checkout session
- [ ] **Billing Settings UI**
  - [ ] Build `src/shell/pages/settings/BillingSection.tsx`
  - [ ] Show current tier, usage, next billing date
  - [ ] Link to Stripe Customer Portal for plan changes
- [ ] **Quota Enforcement**
  - [ ] Implement `src/kernel/quota/quota.ts` module
  - [ ] Define per-tier limits (canvas count, storage, widgets, collaborators)
  - [ ] Enforce at: create canvas, upload asset, place widget, add collaborator
  - [ ] Build `src/shell/components/UpgradePrompt.tsx` for limit-hit UX

---

## 2. Layer 1 — Social + Sync (NOT STARTED)

Real-time collaboration infrastructure. Files exist in `src/social/` but are minimal scaffolds.

- [ ] **Channel Management** (`src/social/channel/`)
  - [ ] Supabase Realtime channel lifecycle (one per canvas: `canvas:{canvasId}`)
  - [ ] Join/leave handling tied to canvas route mount/unmount
  - [ ] Channel cleanup on disconnect
- [ ] **Presence Tracking** (`src/social/presence/`)
  - [ ] Track join/leave for all users including Guests
  - [ ] Maintain presence map in `socialStore` via bus events
  - [ ] Guest users get label `"Guest"` + random color
  - [ ] Remove user from presence on disconnect/leave
- [ ] **Cursor Broadcast** (`src/social/cursor/`)
  - [ ] Broadcast cursor positions at 30fps max (33ms throttle)
  - [ ] Include `userId`, `position` (canvas-space), `color`
  - [ ] Update `socialStore` via `social.cursor.moved` bus events
  - [ ] Remove stale cursors on user leave/disconnect
- [ ] **Entity Transform Sync** (`src/social/entity-sync/`)
  - [ ] Optimistic broadcast during drag (no server wait)
  - [ ] LWW reconciliation on drop (server timestamp wins)
  - [ ] Emit `social.entity.transformed` bus event after reconcile
- [ ] **Conflict Resolution** (`src/social/conflict/`)
  - [ ] Canvas entities + Notes: LWW silent (no UI)
  - [ ] Doc DataSources: Yjs CRDT (`Y.Doc` per DataSource, `y-protocols` over Realtime)
  - [ ] Table/Custom DataSources: revision-based (409 → re-fetch → retry → toast)
- [ ] **Edit Locks** (`src/social/edit-lock/`)
  - [ ] Advisory per-entity locks with 30s inactivity timeout
  - [ ] Visual indicator (colored border + avatar) for locked entities
  - [ ] Release on drop, leave, or timeout
- [ ] **Offline Degradation** (`src/social/offline/`)
  - [ ] Hide remote cursors on disconnect
  - [ ] Queue local edits during offline
  - [ ] Suppress error states for interruptions < 5s
  - [ ] Reconcile queued edits on reconnect
- [ ] **Gate Tests (mandatory)**
  - [ ] Two-session cursor visibility
  - [ ] Simultaneous entity move convergence (LWW)
  - [ ] Doc co-edit via Yjs (no keystroke loss)
  - [ ] Table row revision conflict (409 → refresh → retry)

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

## 5. Canvas Interaction Polish

Per approved design: `docs/plans/2026-02-24-canvas-interactions-design.md`

- [ ] **Keyboard Shortcuts**
  - [ ] Delete/Backspace → delete selected entities
  - [ ] Escape → deselect all / cancel current tool
  - [ ] Ctrl+A → select all entities
  - [ ] Arrow keys → nudge selected entities
  - [ ] Z-order shortcuts (Ctrl+], Ctrl+[, etc.)
  - [ ] Tool hotkeys (V=select, M=move, P=pen, T=text, etc.)
  - [ ] Build `src/shell/canvas/hooks/useCanvasShortcuts.ts`
- [ ] **Resize Handles**
  - [ ] 8-handle interactive resize on selection overlay
  - [ ] Shift+drag for aspect ratio lock
  - [ ] Alt+drag for resize from center
  - [ ] Build into `src/shell/canvas/components/SelectionOverlay.tsx`
- [ ] **Alignment & Distribution**
  - [ ] Multi-select alignment (left, center, right, top, middle, bottom)
  - [ ] Distribute evenly (horizontal, vertical)
  - [ ] Build `src/shell/canvas/utils/align.ts`
- [ ] **Group / Ungroup**
  - [ ] Schema and events exist; build handler
  - [ ] `src/shell/canvas/handlers/groupHandler.ts`
  - [ ] Grouped entities move/resize as unit
- [ ] **Crop Tool**
  - [ ] Add `cropRect` schema field to entity
  - [ ] Interactive crop UI with aspect presets in SelectionOverlay

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

## 7. Widget Uninstall UI

Backend complete. Only missing UI. Per `docs/plans/2026-03-02-widget-uninstall-design.md`.

- [ ] Add uninstall button to `src/shell/pages/MarketplacePageFull.tsx`
- [ ] Confirmation dialog: "This will delete all saved state for this widget"
- [ ] Emit `marketplace.widget.uninstalled` bus event on confirm
- [ ] Success/error feedback

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

- [ ] `src/canvas/core/input/gesture-interpreter.ts:384` — Implement pinch rotation calculation (currently `0`)
- [ ] `src/canvas/core/input/gesture-interpreter.ts:459` — Implement pan velocity calculation (currently `{x:0, y:0}`)
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
