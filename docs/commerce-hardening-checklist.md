# Commerce Widget System — Hardening Checklist

Everything needed to bring each rating dimension to 7-8/10.
Items are grouped by dimension, ordered by priority within each group.
Checkboxes are for tracking progress.

---

## A. Will It Work (4 → 8)

These are bugs and mismatches that prevent the system from functioning at all.

### A1. Schema ↔ Code Mismatches (BLOCKING)

- [ ] **Fix `creator_id` column on `canvas_subscription_tiers`** — The migration
  (`00008`) has no `creator_id` column. The checkout integration queries and
  inserts `creator_id`. Either:
  - Add a `creator_id UUID NOT NULL REFERENCES users(id)` column to the table
    via a new migration, OR
  - Rewrite all tier queries to join through `canvases.owner_id`
  - Affected code: `checkout-integration.ts` — `create_tier`, `update_tier`,
    `delete_tier`, `my_tiers`

- [ ] **Fix `creator_id` → `seller_id` on `shop_items`** — The migration uses
  `seller_id` but the checkout integration writes `creator_id`. Fix all
  references in `checkout-integration.ts`:
  - `create_item`: change `creator_id: user.id` → `seller_id: user.id`
  - `update_item`: change `.eq('creator_id', user.id)` → `.eq('seller_id', user.id)`
  - `delete_item`: change `.eq('creator_id', user.id)` → `.eq('seller_id', user.id)`
  - `my_items`: change `.eq('creator_id', user.id)` → `.eq('seller_id', user.id)`

### A2. Authorization Gaps

- [ ] **Validate canvas ownership on `create_tier`** — Currently accepts any
  `canvasId` from widget params. Before insert, verify the authenticated user
  owns the canvas: `SELECT 1 FROM canvases WHERE id = canvasId AND owner_id = user.id`

- [ ] **Validate canvas ownership on `create_item`** — Same issue as tiers.
  Verify canvas ownership before allowing item creation.

### A3. Input Validation

- [ ] **Add price validation** — Reject negative `priceCents` in `create_tier`,
  `update_tier`, `create_item`, `update_item`. Enforce `priceCents >= 0`.

- [ ] **Add name validation** — Reject empty or whitespace-only `name` fields
  in tier and item creation. Enforce reasonable max length (200 chars).

- [ ] **Add email format validation in signup widget** — The widget only checks
  `!email`. Add a basic regex check: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

- [ ] **Add password strength validation in signup widget** — Currently only
  checks `length < 6`. Add: at least one uppercase, one number, min 8 chars.

- [ ] **Add server-side validation in auth integration** — The auth integration
  handler (`auth-integration.ts`) should validate email format and password
  length before calling Supabase, not just `!email || !password`.

### A4. Error Handling Fixes

- [ ] **Show subscribe errors to user** — `wgt-subscribe` silently catches
  subscribe failures. Show an error message when `checkout.mutate({action: 'subscribe'})`
  fails.

- [ ] **Show buy errors to user** — `wgt-shop` silently catches buy failures.
  Show an error message.

- [ ] **Fix download button stuck state** — `wgt-orders` sets download button
  text to "Error" on failure with no way to retry. Add a retry mechanism or
  reset button text after 3 seconds.

- [ ] **Add error logging in checkout integration** — All catch blocks should
  `console.error()` the full error for production debugging. Currently errors
  are returned as `{ error: message }` but never logged server-side.

### A5. Functional E2E Tests

- [ ] **Write E2E test: signup → authenticated state** — Sign up via widget,
  verify auth session exists, verify other widgets can detect authenticated user.

- [ ] **Write E2E test: create tier → tier appears in subscribe widget** — Create
  a tier via tier-manager, verify it appears in the subscribe widget's tier list.

- [ ] **Write E2E test: create item → item appears in shop widget** — Same for
  shop items.

- [ ] **Write E2E test: subscribe flow** — Select tier → Stripe checkout created
  → webhook fires → subscription recorded → widget shows "Current" badge.

- [ ] **Write E2E test: buy flow** — Select item → Stripe checkout created →
  webhook fires → order recorded → download available.

- [ ] **Write E2E test: Connect onboarding** — Start onboarding → account
  created → status page shows connected.

---

## B. Scalability (5 → 7)

### B1. Pagination

- [ ] **Add pagination to `my_orders` query** — Accept `limit` and `offset`
  params. Default to `limit: 50`. Return `{ data, total, hasMore }`.

- [ ] **Add pagination to `my_tiers` query** — Default limit 100 (tiers are
  unlikely to be >100, but cap it).

- [ ] **Add pagination to `my_items` query** — Default limit 50.

- [ ] **Add pagination to `shop_items` query** — Default limit 50 for public
  storefront.

- [ ] **Add pagination to `seller_orders` query** — Default limit 50.

- [ ] **Update widget HTML to support pagination** — Add "Load more" buttons
  or infinite scroll to `wgt-orders`, `wgt-shop`, `wgt-tier-manager`,
  `wgt-item-manager`.

### B2. Caching

- [ ] **Add query result caching to integration proxy** — Implement a simple
  TTL cache (Map + timestamps) in `integration-proxy.ts`. Cache `tiers` and
  `shop_items` queries for 30 seconds. Cache `connect_status` for 60 seconds.
  Invalidate on related mutations.

- [ ] **Cache `my_subscription` result per canvas** — This is called every time
  the subscribe widget loads. Cache for 30 seconds with canvas-scoped key.

### B3. Stock Safety

- [ ] **Add stock reservation in `creator-checkout` edge function** — When
  creating a Stripe checkout session for an item with limited stock, decrement
  stock atomically (or use a `pending_stock` column). If the checkout session
  expires (30 min), release the reservation.

- [ ] **Add `FOR UPDATE` or atomic decrement** — The current `decrement_stock`
  RPC exists but the checkout edge function doesn't reserve stock before
  creating the session. Two simultaneous buyers can both pass the stock > 0
  check.

### B4. Realtime Updates

- [ ] **Subscribe to `orders` table changes in `wgt-orders`** — Use
  `StickerNest.subscribe('commerce.order.created', handler)` to refresh the
  orders list when a new order arrives (requires host-side Supabase Realtime
  subscription on the orders table, forwarded as a bus event).

- [ ] **Subscribe to tier/item changes in public widgets** — When `wgt-subscribe`
  is open and a creator adds a tier, the widget should refresh. Use the existing
  `commerce.tier.created` events.

### B5. SDK Cleanup

- [ ] **Add timeout to SDK pending requests** — In `sdk-template.ts`, add a
  10-second timeout for each pending request. If no response arrives, reject
  the promise and remove from `_pendingRequests`.

- [ ] **Add max queue depth before READY** — Cap the message queue at 100
  messages. Drop oldest if exceeded.

---

## C. Implementation Quality (5 → 8)

### C1. Cross-Widget Communication

- [ ] **Add `StickerNest.subscribe('auth.signed_in')` to all commerce widgets** —
  When a user signs in via `wgt-signup`, all other visible commerce widgets
  (subscribe, shop, orders) should re-fetch their data. Each widget should
  subscribe to `auth.signed_in` and `auth.signed_out` events and refresh.

- [ ] **Add `StickerNest.subscribe('commerce.tier.*')` to `wgt-subscribe`** —
  When tiers are created/updated/deleted, the subscribe widget should refresh
  its tier list.

- [ ] **Add `StickerNest.subscribe('commerce.item.*')` to `wgt-shop`** — When
  items are created/updated/deleted, the shop widget should refresh.

### C2. Concurrency Control

- [ ] **Add revision-based updates to `update_tier`** — Add a `revision` column
  to `canvas_subscription_tiers` (new migration). On update, include
  `lastSeenRevision` in params. Check that the current DB revision matches
  before applying. Return 409-equivalent error if stale.

- [ ] **Add revision-based updates to `update_item`** — Same for `shop_items`.

### C3. Integration Proxy Hardening

- [ ] **Add timeout to integration proxy calls** — In `integration-proxy.ts`,
  wrap handler calls with a 15-second timeout. Return `{ error: 'Request timed out' }`
  if exceeded.

- [ ] **Add request ID to integration errors** — Include a unique request ID in
  error responses so they can be correlated with logs.

### C4. Stripe Return Flow

- [ ] **Add return URL to Connect onboarding** — In `connect-onboard` edge
  function, set `return_url` to the canvas URL with a query param
  (e.g., `?connect=returning`). In `wgt-creator-setup`, detect this param on
  load and show "Checking your account status..." while polling.

- [ ] **Add return URL to checkout sessions** — In `creator-checkout` edge
  function, set `success_url` and `cancel_url` to return to the canvas. In
  subscribe/shop widgets, detect the return and show confirmation.

### C5. Idempotency

- [ ] **Add idempotency key to `creator-checkout` edge function** — Generate a
  deterministic key from `(userId, tierId/itemId, timestamp_bucket)`. Pass as
  Stripe's `idempotency_key` parameter to prevent duplicate checkout sessions.

### C6. Meaningful Tests

- [ ] **Add checkout integration unit tests** — Test each query/mutate action
  with mocked Supabase client. Verify correct table, correct filters, correct
  error returns. Test auth failure paths.

- [ ] **Add auth integration unit tests** — Test signup, signin, signout, session
  check with mocked Supabase auth.

- [ ] **Add integration proxy unit tests** — Test handler registration, unknown
  integration name, timeout behavior.

- [ ] **Add widget functional tests** — Use jsdom or happy-dom to actually render
  widget HTML, simulate button clicks, verify DOM state changes. Current tests
  only do string matching.

---

## D. Creativity / Novelty (7 → 8)

### D1. UX Polish

- [ ] **Add CSS transitions to page switches** — All multi-page widgets
  (creator-setup, tier-manager, item-manager) use instant show/hide. Add a
  simple fade or slide transition (200ms) between pages.

- [ ] **Add skeleton loading states** — Replace "Loading..." text with skeleton
  placeholders (pulsing gray rectangles matching the expected layout).

- [ ] **Add success animations** — After successful tier creation, item creation,
  or purchase, show a brief checkmark animation before returning to list.

### D2. Missing Workflows

- [ ] **Add subscription cancellation to `wgt-orders`** — On the subscriptions
  tab, add a "Cancel Subscription" button that calls a new `cancel_subscription`
  mutation. Route through Stripe's subscription cancellation API.

- [ ] **Add "Manage Subscription" link to `wgt-subscribe`** — For users with an
  active subscription, show a link to the Stripe customer portal (via a new
  `customer_portal` mutation).

- [ ] **Add refund request flow to `wgt-orders`** — On the purchases tab, add
  a "Request Refund" button for recent orders (within 30 days). Route to a
  new `request_refund` mutation that creates a refund request for the seller.

### D3. Creator Dashboard

- [ ] **Build `wgt-creator-dashboard` widget** — A new widget showing: total
  revenue, subscriber count, recent orders, payout schedule. Uses existing
  `seller_orders` query plus new aggregation queries. This makes the spatial
  canvas feel like a real business dashboard, not just a storefront.

---

## E. Completeness (6 → 8)

### E1. Accessibility

- [ ] **Add ARIA labels to all form inputs** — Every `<input>`, `<select>`,
  `<textarea>` in all 7 commerce widgets needs `aria-label` or an associated
  `<label>` with `for` attribute.

- [ ] **Add `role` attributes to interactive elements** — Tab buttons need
  `role="tab"`, tab panels need `role="tabpanel"`, page navigation needs
  `role="navigation"`.

- [ ] **Add keyboard navigation** — Enter key should submit forms. Tab should
  cycle through form fields. Escape should cancel/go back in multi-page widgets.

- [ ] **Add focus management on page transitions** — When switching pages in
  multi-page widgets, focus should move to the first interactive element on
  the new page.

### E2. Missing Widget Features

- [ ] **Add tier reordering to `wgt-tier-manager`** — The `sort_order` field
  exists but there's no UI. Add up/down arrows or drag handles on the tier list.

- [ ] **Add "Active/Inactive" toggle to tier and item lists** — Show inactive
  items with a visual indicator. Allow toggling without going to the edit form.

- [ ] **Add item image/thumbnail support to `wgt-item-manager`** — Shop items
  should support a thumbnail. Add a file upload field that uses
  `StickerNest.integration('storage')` (needs new storage integration).

- [ ] **Add search/filter to `wgt-orders`** — For users with many orders, add
  a search bar and status filter (all, paid, fulfilled, refunded).

### E3. Edge Function Completeness

- [ ] **Add `cancel-subscription` edge function** — Calls
  `stripe.subscriptions.cancel()` on the Connect account. Updates
  `canvas_subscriptions` status. Revokes canvas access.

- [ ] **Add `customer-portal` edge function** — Creates a Stripe customer portal
  session for buyers to manage their payment methods and subscriptions.

- [ ] **Add `request-refund` edge function** — Creates a refund on the Connect
  account. Updates order status. Notifies seller.

- [ ] **Add webhook handler for `invoice.payment_failed` on creator subscriptions** —
  The platform webhook handles this, but the creator webhook
  (`creator-webhook`) should also handle failed renewals and update
  `canvas_subscriptions.status` to `past_due`.

### E4. Security Hardening

- [ ] **Add rate limiting to auth integration** — Limit signup/signin attempts
  to 5 per minute per IP (or per widget instance as a proxy).

- [ ] **Add CSRF-like nonce to mutation calls** — Generate a nonce on widget
  init, include it in mutation calls, validate on host side. Prevents
  replay attacks through the bridge.

- [ ] **Validate `connect_onboard` caller is canvas owner** — Currently any
  authenticated user can call connect_onboard. Verify they own at least one
  canvas.

---

## Priority Order for Maximum Impact

If tackling these in sprints, this order gets ratings up fastest:

**Sprint 1 — Make It Work (4 → 7)**
1. A1 (schema mismatches) — nothing works without this
2. A2 (auth gaps)
3. A3 (input validation)
4. A4 (error handling)
5. C1 (cross-widget communication)

**Sprint 2 — Make It Solid (quality 5 → 7, scalability 5 → 7)**
6. B1 (pagination)
7. B2 (caching)
8. B3 (stock safety)
9. C3 (proxy hardening)
10. C4 (Stripe return flow)
11. C5 (idempotency)

**Sprint 3 — Make It Complete (completeness 6 → 8, creativity 7 → 8)**
12. A5 (E2E tests)
13. C6 (meaningful tests)
14. D1 (UX polish)
15. D2 (missing workflows — cancel, refund, portal)
16. E1 (accessibility)
17. E2 (missing widget features)

**Sprint 4 — Make It Scale (scalability 7 → 8)**
18. B4 (realtime updates)
19. B5 (SDK cleanup)
20. C2 (concurrency control)
21. D3 (creator dashboard widget)
22. E3 (edge function completeness)
23. E4 (security hardening)
