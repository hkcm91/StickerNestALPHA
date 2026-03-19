# StickerNest V5 — Master TODO

> Updated 2026-03-19. Organized by build order (layer dependencies) then priority.
> Build order: L0 Kernel → L1 Social → L3 Runtime → L2 Lab → L4A/4B Canvas/Spatial → L5 Marketplace → L6 Shell

---

## COMPLETED ✓

### SaaS Billing & Subscriptions (MOSTLY COMPLETE)
- [x] Stripe edge functions (checkout, webhook, portal, cancel-subscription)
- [x] Pricing page, billing settings UI, live usage meters
- [x] Quota enforcement module + useQuotaCheck hook + UpgradePrompt
- [ ] Wire quota checks into canvas creation, widget placement, collaborator adds
- [ ] Storage usage tracking (backend aggregate)

### Layer 1 — Social + Sync (COMPLETE)
- [x] Channel, presence, cursor, entity sync, conflict resolution, edit locks, offline — 123 tests

### Canvas Interaction Polish (MOSTLY COMPLETE)
- [x] Keyboard shortcuts (37 tests), resize handles, alignment, group/ungroup, crop
- [x] Gesture interpreter: pinch rotation + pan velocity
- [ ] Group transform propagation (move/resize as unit)
- [ ] Crop aspect presets

### Widget Uninstall UI (COMPLETE)
- [x] Uninstall button, confirmation dialog, bus event, error feedback

---

## BUILD PHASE 1 — Kernel + Social Foundation (L0, L1)

### 1A. User Search & Social Graph (`src/kernel/social-graph/`)
> L0 — no layer dependencies. Foundation for friends, follows, messaging.
- [ ] User search API (by username, display name, email)
- [ ] User profile page (public canvases, bio, avatar)
- [ ] Follow / unfollow system
- [ ] Friend request / accept / decline system
- [ ] Block / unblock users
- [ ] User privacy settings (who can message, who can see canvases)

### 1B. Messaging System (`src/social/messaging/` or `src/kernel/messaging/`)
> L0/L1 — uses Supabase Realtime, social-graph for permissions.
- [ ] Direct messages (1:1 between users)
- [ ] Message persistence (Supabase table)
- [ ] Real-time message delivery via Realtime channel
- [ ] Unread count tracking
- [ ] Block enforcement (blocked users cannot message)
- [ ] Message UI component in shell

### 1C. Canvas Invites & Multi-User Canvas Types (`src/kernel/`, `src/social/`)
> L0/L1 — extends canvas sharing model.
- [ ] Invite-to-canvas flow (generate invite link / send to user)
- [ ] `/invite/:token` acceptance page (currently a stub — needs real logic)
- [ ] Email invitation sending (Supabase edge function)
- [ ] Role assignment on invite accept (owner, editor, commenter, viewer)
- [ ] Multi-user canvas types in gallery (collaborative, view-only, mixed)
- [ ] Canvas gallery shows shared-with-me canvases
- [ ] Canvas member management UI (add/remove/change roles)

---

## BUILD PHASE 2 — Runtime & Event Bus Hardening (L3)

### 2A. Event Bus Controls — Widget Channel Management
> L3 Runtime — bus subscriptions must be toggleable per widget instance.
- [ ] Per-widget event bus subscribe/unsubscribe controls (UI toggle)
- [ ] Widget channel isolation (widgets can opt in/out of specific event types)
- [ ] Cross-canvas sync toggle (enable/disable per widget via manifest permission)
- [ ] Event bus inspector panel shows which widgets subscribe to which events
- [ ] Broadcast channel naming and management UI

### 2B. Database ↔ Widget Integration
> L3 Runtime — DataSource API must be accessible from widget SDK.
- [ ] DataSource CRUD accessible via `StickerNest.integration('database')` in widgets
- [ ] Table DataSource renders in widget (query, filter, sort)
- [ ] Doc DataSource (Yjs) accessible from widget for collaborative editing
- [ ] Widget config can bind to a DataSource (e.g., table widget shows a specific table)
- [ ] Database page (`/database` or `/data`) — dedicated view for managing DataSources

### 2C. Notion Sync Integration
> L3 Runtime — external integration via proxy.
- [ ] Notion integration handler (`src/runtime/integrations/notion-handler.ts` — exists, verify)
- [ ] OAuth flow for Notion connection (edge function)
- [ ] Sync Notion databases → StickerNest Table DataSources
- [ ] Sync Notion pages → StickerNest Doc DataSources
- [ ] Bi-directional sync (or one-way with conflict resolution)
- [ ] Notion sync status indicator in UI

---

## BUILD PHASE 3 — Widget Lab (L2)

### 3A. Widget Lab IDE
> L2 — depends on L0, L1, L3. Full IDE for widget development.
- [ ] Monaco editor wrapper with HTML/JS/CSS highlighting
- [ ] Live preview pane (runs in Runtime sandbox)
- [ ] Event inspector panel (shows widget bus events)
- [ ] Manifest editor GUI (Zod schema validation)
- [ ] AI generation panel (prompt → widget HTML)
- [ ] Version history (snapshot save/restore)
- [ ] Node graph editor (no-code widget composition)
- [ ] Publish pipeline UI (validate → test → thumbnail → submit)
- [ ] Import/fork from Marketplace
- [ ] Creator+ access gate (route-level)

---

## BUILD PHASE 4A — Canvas Core + Panels + Tools (L4A)

### 4A-1. Canvas Panel UI Overhaul
> L4A-4 — panels are the main editing interface.
- [ ] Properties panel redesign (entity-specific config, multi-select "mixed" values)
- [ ] Layers panel (z-order list, visibility toggles, rename, drag reorder)
- [ ] Asset panel (sticker library, widget library, media uploads)
- [ ] Toolbar redesign (tool selector, zoom controls, mode toggle)
- [ ] Context menu (right-click on entity/canvas)
- [ ] Floating action bar (near selected entities)
- [ ] Pipeline inspector panel (selected pipeline node details)

### 4A-2. Canvas Display Options
> L4A / L6 Shell — display modes for the canvas page.
- [ ] Split-screen mode on main canvas page (not just dev harness)
- [ ] Up to 4-way split (quad view)
- [ ] Each split can show a different canvas or same canvas at different zoom
- [ ] Split controls: drag divider, collapse, maximize
- [ ] Persist split layout per user session

### 4A-3. Canvas Appearance
> L4A-1 Canvas Core — entity and canvas rendering.
- [ ] Resizable canvases (canvas has explicit bounds, not just infinite)
- [ ] Distinct canvas border option (visible boundary, customizable style)
- [ ] Canvas background options (color, grid, image, gradient)

### 4A-4. Pipeline Wiring — Widgets, Stickers, Pipelines in Marketplace
> L4A-3 — get the full pipeline graph working end to end.
- [ ] Pipeline graph editor renders correctly (nodes, edges, ports)
- [ ] Drag-to-connect output → input port
- [ ] Pipeline execution routes events between widgets
- [ ] Built-in transform nodes (filter, map, merge, delay)
- [ ] Stickers trigger pipeline events (sticker → widget connection)
- [ ] Pipeline templates in Marketplace (importable pipeline presets)

### 4A-5. Game Controller Support
> L4A-2 Canvas Tools / L4A-1 Canvas Core — input extension.
- [ ] Gamepad API integration (`navigator.getGamepads()`)
- [ ] Controller input mapping (buttons → canvas actions)
- [ ] Controller support in all canvas types (2D, 3D, VR)
- [ ] Configurable button mapping UI
- [ ] Controller presence indicator in toolbar

---

## BUILD PHASE 4B — Spatial / VR (L4B)

### 4B-1. Virtual Reality & 3D Canvases
> L4B — Three.js + WebXR. Peer of L4A, communicates via bus.
- [ ] Three.js scene rendering of canvas entities
- [ ] WebXR session management (enter/exit VR)
- [ ] VR controller input (ray cast, trigger, grip, thumbstick)
- [ ] 3D entity positioning (2D entities placed in 3D space)
- [ ] VR entry button in canvas toolbar
- [ ] Spatial audio (optional, per canvas setting)
- [ ] 3D canvas type in gallery (create canvas as 3D space)

---

## BUILD PHASE 5 — Marketplace (L5)

### 5A. Marketplace Redesign
> L5 — depends on L0, L1, L3, L4A-1.
- [ ] Widget Library redesign (better browsing, filtering, visual cards)
- [ ] Sticker marketplace (browse/install sticker packs)
- [ ] Widget pipeline templates in marketplace
- [ ] Ratings & reviews (submission UI, star display, moderation)
- [ ] Widget pricing (paid widgets via Stripe, license tracking)
- [ ] Publisher dashboard polish (version history, deprecation, analytics)
- [ ] Widget slugs (addressable widgets via `/widget/:slug`)

### 5B. Widget & Canvas Embeds
> L5/L6 — public distribution.
- [ ] Widget embed codes (embed a single widget in external site)
- [ ] Canvas embed route (`/embed/:slug` — iframe-friendly, stripped UI)
- [ ] Widget slugs — unique URL per published widget
- [ ] Embed customization (theme, size, border)
- [ ] oEmbed support for auto-embedding in platforms

---

## BUILD PHASE 6 — Shell Integration (L6)

### 6A. Auth & Onboarding
- [ ] OAuth providers (Google, GitHub, Discord)
- [ ] Onboarding wizard (workspace creation, first canvas)
- [ ] Invite acceptance flow (wire the stub at `/invite/:token`)

### 6B. Social UI Components
- [ ] Presence avatars bar
- [ ] Remote cursor overlays
- [ ] Edit lock indicator (colored border + avatar)
- [ ] Offline status banner
- [ ] User search + profile cards
- [ ] Friend list panel
- [ ] Message inbox / chat panel
- [ ] Notification system (follows, invites, messages)

### 6C. Canvas Gallery Enhancements
- [ ] Multi-user canvas types displayed in gallery
- [ ] "Shared with me" section
- [ ] Canvas type badges (collaborative, public, 3D, VR)
- [ ] Invite links from gallery

### 6D. Database Page
> Custom DataSource library as a dedicated page.
- [ ] `/database` route — list all user DataSources
- [ ] Create/edit/delete DataSources from UI
- [ ] Table DataSource spreadsheet view
- [ ] Doc DataSource editor view
- [ ] Link DataSources to widgets from this page

### 6E. Landing Page
- [ ] Public landing page at `/` for unauthenticated users
- [ ] Feature showcase, pricing link, sign-up CTA
- [ ] Responsive design (mobile + desktop)

---

## BUILD PHASE 7 — Polish & Hardening

### 7A. Code Refactoring
- [ ] Audit and remove dead code
- [ ] Consolidate duplicate patterns
- [ ] Ensure all modules have co-located tests
- [ ] Dependency-cruiser clean pass (zero boundary violations)
- [ ] ESLint clean pass (zero warnings)

### 7B. Production Hardening
- [ ] Security audit (RLS policies, CSP, widget sandbox)
- [ ] Performance profiling (1000+ entities, bus throughput)
- [ ] Bundle size analysis + code splitting
- [ ] E2E test suite expansion (Playwright + swiftshader)
- [ ] CI pipeline for E2E tests

### 7C. Try to Break the App
- [ ] Adversarial testing: XSS attempts via widget sandbox
- [ ] Stress test: 100+ concurrent users on one canvas
- [ ] Edge cases: offline → online transitions, token expiry mid-edit
- [ ] Widget crash isolation: crashed widget must not affect others
- [ ] Race conditions: simultaneous entity edits, rapid tool switching
- [ ] Memory leaks: long sessions, many widget mounts/unmounts

### 7D. Analytics & Observability
- [ ] Sentry integration (error boundary, source maps)
- [ ] PostHog integration (user events, feature flags)

### 7E. Backup & Recovery
- [ ] Database backup procedures
- [ ] Point-in-time recovery testing
- [ ] Data export for users

---

## Minor Code TODOs

- [x] Gesture interpreter: pinch rotation + pan velocity
- [ ] `src/canvas/tools/direct-select/direct-select-tool.ts:142` — path segment subdivision on double-click

---

## Creator Commerce — Stripe Connect (Phase 3)

Database schema `00008_add_creator_commerce.sql` exists but is unwired.

- [ ] Stripe Connect onboarding (edge function, identity verification, payouts)
- [ ] Commerce widgets (signup, subscribe, shop — currently stubs)
- [ ] Canvas subscriptions (creator pricing tiers, checkout, webhooks)
- [ ] Canvas shop (digital + physical items, stock reservation)
- [ ] Creator dashboard (revenue, orders, payouts)
- [ ] Commerce hardening (see `docs/commerce-hardening-checklist.md`)
