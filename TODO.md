# StickerNest V5 — Master TODO

> Updated 2026-03-23 (audit pass 2). Organized by build order (layer dependencies) then priority.
> Build order: L0 Kernel → L1 Social → L3 Runtime → L2 Lab → L4A/4B Canvas/Spatial → L5 Marketplace → L6 Shell
> Cross-referenced against Master Feature Spec (146 features) and actual codebase audit on 2026-03-23.
> See `docs/feature-spec-vs-codebase-2026-03-23.md` for full comparison.
> **Audit pass 2**: Reconciled all unchecked items against 786 source files, 212 test files, 48 migrations. Social graph APIs significantly more complete than previously recorded.

---

## COMPLETED ✅

### Layer 0 — Kernel (COMPLETE)
- [x] Zod schema registry (`@sn/types`) — 722-line barrel, 18 schema domains
- [x] Typed event bus with ring buffer + bench() API (<1ms contract)
- [x] 9 Zustand stores (auth, workspace, canvas, history, widget, social, ui, docker, gallery)
- [x] Supabase client (single instance), auth (email + OAuth), DataSource CRUD + ACL
- [x] Billing API + quota enforcement + useQuotaCheck hook + UpgradePrompt
- [x] Social graph schemas (profiles, follows, posts, reactions, comments, notifications)
- [x] API key management (BYOK), world manager, entity systems

### Layer 1 — Social + Sync (COMPLETE)
- [x] Channel, presence, cursor, entity sync, conflict resolution, edit locks, offline — 123 tests
- [x] Yjs CRDT for Doc DataSources, revision-based for Table/Custom, LWW for entities/notes

### Layer 3 — Runtime (MOSTLY COMPLETE)
- [x] WidgetFrame sandbox (srcdoc, CSP, origin validation, error boundary)
- [x] Bridge protocol — typed postMessage, Zod validation, message queue (958 lines tests)
- [x] Widget SDK — full API surface (emit, subscribe, state, config, integrations, theme, resize)
- [x] Cross-canvas router (318 lines + 1,500+ lines tests)
- [x] Security: rate limiter, sandbox policy, CSP
- [x] Integration proxies: Notion handler (273 lines), checkout integration (646 lines), social handler, AI handler
- [x] Iframe pool (103 lines), lifecycle manager, lazy loader
- [x] DataSource bridge handler (362 lines) — widget SDK DataSource access
- [x] Widget permissions: 13 types (storage, user-state, integrations, clipboard, notifications, media, geolocation, cross-canvas, ai, checkout, auth, datasource, datasource-write)

### Layer 2 — Lab (MOSTLY COMPLETE)
- [x] AI generator (463 lines) + context (308 lines) + prompt questions (200 lines) + manifest extractor
- [x] Voice input + voice command parser
- [x] Graph compiler (322 lines), scene compiler (250 lines), graph sync
- [x] Event inspector (82 lines)
- [x] Publish pipeline: validator, tester, thumbnail, submitter
- [x] Lab import/fork with license checking
- [x] Creator+ route guard
- [x] Prompt refinement overlay, atmosphere effects, ghost pipeline wireframe
- [x] Creator mode layout with preview-primary split

### Canvas System (MOSTLY COMPLETE)
- [x] Canvas Core: viewport, scene graph, hittest, renderer, drag, grid, background, geometry, input, interaction, layout, persistence, transforms
- [x] Layout modes: freeform, bento, desktop, artboard
- [x] Canvas Tools: select, direct-select, move, resize, pen, pen-path, text, shape, sticker, widget, grid-paint, ghost-widget, pathfinder-tool
- [x] Canvas Wiring: pipeline graph (139 lines), execution engine (178 lines), validator (147 lines), cross-canvas edges, persistence
- [x] Canvas Panels: toolbar, properties, layers, assets, context-menu, floating-bar, pipeline-inspector, minimap
- [x] Keyboard shortcuts (37 tests), resize handles, alignment, group/ungroup, crop
- [x] Gesture interpreter: pinch rotation + pan velocity
- [x] Widget uninstall: button, confirmation dialog, bus event, error feedback
- [x] Canvas backgrounds: solid, gradient, image (schemas + implementation)
- [x] Fullscreen preview mode
- [x] Platform view switching + canvas size presets
- [x] Undo/redo system (historyStore, 181 lines)
- [x] 14 entity types: sticker, text, widget, shape, drawing, group, docker, lottie, audio, svg, path, object3d, artboard, folder

### Spatial/VR (SCAFFOLDED)
- [x] Three.js scene + SpatialRoot/SpatialScene components
- [x] Controller input + ControllerBridge, HandBridge, Pointer
- [x] Entity mapping (2D↔3D)
- [x] Locomotion, MR (plane/mesh detection, hit testing, anchors)
- [x] Legacy adapter

### Marketplace (SCAFFOLDED)
- [x] API layer (discovery, installation, publishing, reviews, mappers)
- [x] Listing, detail, install flow, publisher dashboard, review manager
- [x] Widget manifest validation on install

### Shell (SCAFFOLDED)
- [x] Router with route guards (auth, tier gating)
- [x] Theme system (light/dark/high-contrast, token injection, bus events)
- [x] Error boundary, keyboard shortcut registry
- [x] Pages: Embed, Marketplace, Pricing, Settings (billing, integrations, creator commerce, purchases)

---

## REMAINING WORK — by priority

### 🔴 P0 — CRITICAL GAPS (blocks business model or core UX)

#### Storefronts & Commerce
> The revenue engine. DB schema exists (`00008_add_creator_commerce.sql`) but almost nothing is wired. Checkout integration (646 lines), billing API (172 lines), and CreatorCommerceSection (313 lines) exist as scaffolding but not wired end-to-end.
- [ ] Stripe Connect onboarding
  - [ ] Create Supabase edge function for Stripe Connect OAuth flow (L0: kernel)
  - [ ] Add Connect account status to seller profile schema (L0: kernel)
  - [ ] Build identity verification UI — upload ID, business info (L6: shell)
  - [ ] Implement payout schedule configuration (L6: shell)
  - [ ] Add Connect webhook handler for `account.updated` events (L0: kernel)
  - [ ] Wire seller dashboard to show payout history (L6: shell)
- [ ] Storefront canvas type (slug canvas configured as a store)
- [ ] Digital + physical product catalog schema and CRUD
  - [ ] Define product schema in `@sn/types` — digital + physical variants (L0: kernel)
  - [ ] Product CRUD API in kernel (L0: kernel)
  - [ ] Product management UI in seller dashboard (L6: shell)
- [ ] Commerce widgets (signup, subscribe, shop — currently stubs in `built-in-html.ts`, 16 TODOs remaining)
- [ ] Canvas subscriptions (creator pricing tiers, checkout, webhooks)
- [ ] Canvas shop (digital + physical items, stock reservation)
- [ ] Seller dashboard (revenue, orders, payouts, refund handling)
- [ ] Tax handling (Stripe Tax or equivalent)
- [ ] Refund policy + dispute resolution flow
- [ ] Commerce hardening (see `docs/commerce-hardening-checklist.md`)

#### Security & Compliance
> Must-have before public launch. Currently no GDPR, no moderation, no audit trail.
- [ ] GDPR compliance (right to deletion, data export, consent management)
- [ ] Content moderation system (flagging, review queue, takedown flow)
- [ ] Two-factor authentication (especially for sellers handling money)
- [ ] Audit trail (full log of significant actions)
- [ ] Legal pages (ToS, privacy policy, DMCA, cookie policy, refund policy)
- [ ] Security audit (formal review of RLS policies, CSP, widget sandbox)

#### User Experience — First Run
> Without onboarding, new users bounce.
- [ ] Onboarding wizard (workspace creation, sample canvas, tutorial widget)
- [ ] Public landing page at `/` for unauthenticated users (feature showcase, pricing, sign-up CTA)
- [ ] SEO for public canvases & storefronts (meta tags, Open Graph, structured data)

---

### 🟡 P1 — HIGH PRIORITY (fills major feature gaps in MVP)

#### Automation / Pipeline System (Zapier/n8n Layer)
> Pipeline engine exists (L4A-3: execution engine 178 lines, validator 147 lines, graph 139 lines). But the node library, triggers, logging, and tooling are all missing. Feature Spec §8.
- [ ] Trigger types: cron/time-based, webhook, manual button (event-based exists)
  - [ ] Define `TriggerNode` schema in `@sn/types` with `type: 'cron' | 'webhook' | 'manual' | 'event'` (L0: kernel)
  - [ ] Cron trigger: schedule storage, cron parser, Supabase edge function for tick (L0: kernel)
  - [ ] Webhook trigger: inbound webhook endpoint, signature verification (L0: kernel)
  - [ ] Manual button trigger: UI button in canvas toolbar (L4A-4: panels)
- [ ] Action types: send email, update DB, call external API, create canvas item
  - [ ] Define `ActionNode` base schema in `@sn/types` (L0: kernel)
  - [ ] HTTP request action node (L4A-3: wiring)
  - [ ] DataSource mutation action node (L4A-3: wiring)
  - [ ] Canvas entity creation action node (L4A-3: wiring)
  - [ ] Email send action node via Supabase edge function (L0: kernel)
- [ ] Conditional logic: if/then branching, filter nodes, loops
- [ ] Pre-built entity node library (HTTP request, data transform, email, AI completion)
- [ ] Custom entity nodes (users build their own automation nodes)
- [ ] Automation testing / dry-run mode (run without firing actions)
- [ ] Execution logs (per-run: trigger, steps, results, failures, timestamps)
  - [ ] Define `PipelineRun` schema (L0: kernel)
  - [ ] Execution log persistence to Supabase (L0: kernel)
  - [ ] Execution log viewer panel (L4A-4: panels)
- [ ] Rate limiting on automations (infinite loop protection, per-user throttle)
- [ ] Job queue with retry logic and dead letter handling
- [ ] Data transformation layer (field mapping, date formatting, array ops)
- [ ] Scheduled actions (cron-like: widget fires at 9am daily)

#### Widget Ecosystem — Content Widgets
> Platform core is strong but almost no end-user widgets exist. Feature Spec §7, §9.
- [ ] Rich text / document widget (headings, bold, lists, embeds, code blocks)
- [ ] Link preview widget (paste URL → auto-generates preview card)
- [ ] PDF viewer widget
- [ ] File attachment widget (attach any file, preview where possible)
- [ ] Charts / data visualization widget
- [ ] Form builder widget
- [ ] Video player widget / entity
- [ ] Database table view widget, gallery view widget, calendar view widget

#### Widget Dependency Management
> Feature Spec §4.5. Currently no handling of "Widget A depends on Widget B."
- [ ] Widget dependency graph (declared in manifest)
- [ ] Update/deprecation/deletion cascade handling
- [ ] Dependency health indicators in marketplace

#### Connecting Lines / Arrows
> Feature Spec §7.5. Mind-map style visual connections between arbitrary entities.
- [ ] Arrow/connection tool (entity-to-entity, not just pipeline ports)
- [ ] Line styles: straight, curved, orthogonal
- [ ] Arrowhead options, labels, colors

#### Billing Wiring (Remaining)
- [ ] Wire quota checks into canvas creation, widget placement, collaborator adds (partial: `useQuotaCheck` hook exists in `kernel/quota/`, referenced in 3 files — needs wiring into canvas creation flow, widget placement, and collaborator add actions)
- [ ] Storage usage tracking (backend aggregate) (partial: quota.ts has storage reference — needs backend aggregate query + UI display)

---

### 🟢 P2 — MEDIUM PRIORITY (important for completeness)

#### Canvas System — Remaining
- [ ] Group transform propagation (move/resize as unit)
- [ ] Crop aspect presets
- [ ] Canvas types as first-class concept (dashboard, storefront, portfolio, game, document — each with default tools/layouts)
- [ ] Canvas navigation modes from spec: static, vertical scroll, grid-map (Stardew), side-scroller, point-and-click (code has freeform/bento/desktop/artboard — different set)
- [ ] Artboard system completion (half-started per spec)
- [ ] Canvas performance budgets (virtualization, lazy loading, off-screen widget suspension for 200+ widgets)
- [ ] Split-screen mode (up to 4-way split, drag dividers, per-session persistence)
- [ ] Resizable canvases (explicit bounds option, distinct border)
- [ ] Clipboard system (copy/paste widgets between canvases with full config)

#### User Search & Social Graph (`src/kernel/social-graph/`)
> 3,928 lines of API code across profiles, follows, blocks, messages, notifications, posts, reactions, comments, widget-invites, canvases — with tests. Much more complete than previously recorded. Feature Spec §14.
- [x] User search API (by username, display name, email) — `searchProfiles()` + `isUsernameAvailable()` in `profiles.ts` (235 lines)
- [x] User profile page (public canvases, bio, avatar) — `ProfilePage.tsx` (562 lines) in `src/shell/profile/`
- [x] Follow / unfollow system — `followUser()`, `unfollowUser()`, `getFollowers()`, `getFollowing()` in `follows.ts` (468 lines)
- [x] Friend request / accept / decline — `acceptFollowRequest()`, `rejectFollowRequest()`, `getPendingFollowRequests()` in `follows.ts` (private profile → pending status)
- [x] Block / unblock users — `blockUser()`, `unblockUser()`, `isBlocked()`, `isBlockedEitherWay()` in `blocks.ts` (135 lines + 203 lines tests)
- [ ] User privacy settings (partial: profile visibility field exists in follows logic — needs dedicated privacy settings UI in shell)

#### Messaging System
> API layer and DB table exist. `messages.ts` (158 lines) has `sendMessage()`, `getConversation()`, `canMessage()`. DB migration `20260227135100_add_direct_messages.sql` creates `direct_messages` table with RLS policies.
- [x] Direct messages (1:1 between users) — `sendMessage()`, `getConversation()` in `messages.ts`
- [x] Message persistence (Supabase table) — `direct_messages` table with sender/recipient, content, is_read, constraint checks
- [ ] Real-time message delivery via Realtime channel (needs Supabase Realtime subscription for DM notifications)
- [x] Unread count tracking — `getUnreadCount()` in `notifications.ts` (282 lines)
- [x] Block enforcement — `canMessage()` checks block status before sending
- [ ] Message UI component in shell (no chat panel or inbox component found in shell)

#### Canvas Invites & Multi-User
> `canvas_members` table exists (migration `20260226224425`). Widget invite system built (441 lines + 398 lines tests). Canvas member management partially in quota system.
- [ ] Invite-to-canvas flow (partial: widget invites exist via `widget-invites.ts` — needs generic canvas invite link generation)
- [ ] `/invite/:token` acceptance page (currently stub — needs real logic)
- [ ] Email invitation sending (Supabase edge function)
- [ ] Role assignment on invite accept (partial: `canvas_members` table has `role` column — needs acceptance flow logic)
- [ ] Canvas member management UI (partial: quota.ts references canvas members — needs full add/remove/change-roles UI in shell)

#### Event Bus Controls
- [ ] Per-widget event bus subscribe/unsubscribe controls (UI toggle)
- [ ] Widget channel isolation
- [ ] Event bus inspector panel (partial: `EventBusPanel.tsx` exists in `src/shell/dev/panels/` at 112 lines — dev-only, needs production-ready UI)
- [ ] Broadcast channel naming and management UI

#### Notion Sync (Partially Built)
> Handler exists (273 lines), sync module exists (580 lines). IntegrationsSection.tsx has Notion OAuth stub. Feature Spec §10.3.
- [ ] OAuth flow for Notion connection (partial: IntegrationsSection.tsx references Notion auth — needs edge function for OAuth token exchange)
- [ ] Verify bi-directional sync works end-to-end
- [ ] Notion sync status indicator in UI

#### Marketplace Polish
- [ ] Widget Library redesign (browsing, filtering, visual cards)
- [ ] Sticker marketplace (browse/install sticker packs)
- [ ] Ratings & reviews polish (submission UI, star display, moderation)
- [ ] Widget pricing (paid widgets via Stripe, license tracking)
- [ ] Publisher dashboard polish (version history, deprecation, analytics)
- [ ] Widget changelogs (every published update gets a changelog entry)
- [ ] Widget screenshots / animated GIF previews

#### Embeds
- [ ] Widget embed codes (embed single widget in external site)
- [ ] Canvas embed route polish (`/embed/:slug` — EmbedPage.tsx exists, verify completeness)
- [ ] Embed customization (theme, size, border)

#### Shell Social UI
> Several components found: PresenceCursorsLayer.tsx (156 lines), CursorGlow.tsx (81 lines), NotificationPanel.tsx (284 lines), ProfilePage.tsx (562 lines), WidgetInviteCard.tsx (208 lines).
- [x] Remote cursor overlays — `PresenceCursorsLayer.tsx` (156 lines) + `CursorGlow.tsx` (81 lines)
- [x] Notification system (follows, invites, messages, purchases) — `NotificationPanel.tsx` (284 lines) + `notifications.ts` API (282 lines)
- [ ] Presence avatars bar (needs top-bar avatar strip showing who's on canvas)
- [ ] Edit lock indicator (colored border + avatar)
- [ ] Offline status banner
- [ ] User search + profile cards (partial: ProfilePage exists at 562 lines — needs search UI + inline profile cards)
- [ ] Friend list panel
- [ ] Message inbox / chat panel

#### Database Page
> `database-management.ts` schema (563 lines) defines columns, rows, cell values, filters, sorts, views. Comprehensive typed schema exists — needs UI.
- [ ] `/database` route — list all user DataSources (partial: schema exists in `database-management.ts` — needs route + page component)
- [ ] Create/edit/delete DataSources from UI
- [ ] Table DataSource spreadsheet view
  - [ ] Render table columns and rows from schema (L6: shell)
  - [ ] Inline cell editing with type-appropriate inputs (L6: shell)
  - [ ] Column add/remove/reorder (L6: shell)
  - [ ] Sort and filter UI using schema's `FilterOperator` and `SortDirection` (L6: shell)
- [ ] Doc DataSource editor view
- [ ] Database relations (link databases: Contact has Orders, Order has Line Items)

#### Transactional Email
- [ ] Email system for purchase confirmations, password resets, order notifications

---

### 🔵 P3 — LOWER PRIORITY (spatial, polish, infrastructure)

#### Spatial / VR (Code Exists, Needs Testing & Completion)
> 56 files, ~7,900 lines. Feature Spec says "hasn't been tested since before V5."
- [ ] Full VR/AR audit against Quest 3 hardware
- [ ] Verify WebXR session management works end-to-end
- [ ] 3D entity rendering with actual canvas entities (not just stubs)
- [ ] VR entry button in canvas toolbar
- [ ] 3D canvas type in gallery
- [ ] Memory management: LOD, texture budgets, draw call limits (Quest hardware limits)
- [ ] Multiplayer in 3D (shared state, multi-user presence)

#### Production Hardening
- [ ] Performance profiling (1000+ entities, bus throughput)
- [ ] Bundle size analysis + code splitting
- [ ] E2E test suite expansion (Playwright + swiftshader)
- [ ] CI pipeline for E2E tests
- [ ] Audit and remove dead code
- [ ] Dependency-cruiser clean pass (zero boundary violations)
- [ ] ESLint clean pass (zero warnings)

#### Adversarial Testing
- [ ] XSS attempts via widget sandbox
- [ ] Stress test: 100+ concurrent users on one canvas
- [ ] Offline → online transitions, token expiry mid-edit
- [ ] Widget crash isolation verification
- [ ] Race conditions: simultaneous entity edits, rapid tool switching
- [ ] Memory leaks: long sessions, many widget mounts/unmounts

#### Analytics & Observability
- [ ] Sentry integration (error boundary, source maps)
- [ ] PostHog integration (user events, feature flags)
- [ ] Feature flag system (proper staged rollouts beyond tier gates)

#### Backup & Recovery
- [ ] Database backup procedures
- [ ] Point-in-time recovery testing
- [ ] Data export for users (canvas exports, widget backups, data downloads)

#### Developer Docs
- [ ] Public-facing developer documentation site
- [ ] Protocol library documentation
- [ ] Event bus library documentation
- [ ] Widget SDK reference

#### Accessibility
- [ ] Screen reader support
- [ ] Keyboard navigation throughout
- [ ] Color contrast audit (WCAG AA)
- [ ] ARIA attributes

---

### 🌙 MOONSHOTS (from Feature Spec — future/nice-to-have)

#### Commerce Moonshots
- [ ] Payment splits / multi-seller revenue splitting
- [ ] Fraud detection (velocity checks, Stripe Radar)
- [ ] Usage-based billing (metering for compute-heavy widgets)
- [ ] Shopify integration for physical goods
- [ ] Storefront theming / white-labeling
- [ ] A/B testing for storefronts
- [ ] Bundle pricing, gifting, affiliate/referral system

#### Canvas Moonshots
- [ ] Canvas templates (pre-built layouts: storefront, dashboard, portfolio, game board)
- [ ] Canvas diffing / collaboration history (who changed what, when)
- [ ] Canvas snapshots for OG link previews
- [ ] Print / physical output (poster, PDF, merch-ready)
- [ ] Canvas analytics (views, visitors, time-on-canvas, heatmaps)

#### Widget Moonshots
- [ ] Widget health monitoring (external API down → status indicator, fallback states)
- [ ] Widget state import/export (share complex configs)
- [ ] Widget templates / starter kits (beyond plop scaffolding)

#### Spatial Moonshots
- [ ] Haptic feedback (controller vibration on widget interaction)
- [ ] Spatial audio (walkie talkie channels — walk closer to hear better)
- [ ] Voice commands in VR (typing in VR is miserable — voice-to-action)
- [ ] Gesture library (pinch to resize, swipe to scroll, custom gestures)

#### Platform Moonshots
- [ ] Mobile app (PWA or native)
- [ ] Cross-platform save states (mobile/web/3D each with own save states)
- [ ] Webhook support (storefront sale → fire webhook, widget state change → notify)
- [ ] Public API endpoints (widget CRUD, canvas state, storefront inventory)
- [ ] Web clipper (browser extension/bookmarklet)
- [ ] Internationalization (i18n string architecture)
- [ ] Creator profiles (public portfolio, published widgets, storefront link)
- [ ] Community space (Discord, forum)
- [ ] Plugin / extension architecture (extend canvas tools, renderers, panels)
- [ ] Game controller support (Gamepad API, configurable button mapping)

---

## Minor Code TODOs

- [ ] `src/canvas/tools/direct-select/direct-select-tool.ts:142` — path segment subdivision on double-click

---

## Reference: Feature Spec Coverage

> Last audited: 2026-03-23 (pass 2). Changes from pass 1: +7 Built (social graph APIs, shell social UI), +3 Partial (invites, billing wiring, event bus).

| Category | MVP Features | Built | Partial | Missing |
|----------|-------------|-------|---------|---------|
| Marketplace | 7 | 0 | 5 | 2 |
| Storefronts & Commerce | 6 | 0 | 3 | 3 |
| Canvas System | 7 | 2 | 4 | 1 |
| Widgets | 9 | 8 | 0 | 1 |
| Widget Lab | 4 | 2 | 2 | 0 |
| Databases | 7 | 4 | 3 | 0 |
| Milanote-Level Canvas | 8 | 2 | 5 | 1 |
| Automation (Zapier/n8n) | 11 | 1 | 7 | 3 |
| Platform Core | 16 | 10 | 5 | 1 |
| Embedding & Integrations | 3 | 1 | 1 | 1 |
| Protocol & Communication | 3 | 2 | 1 | 0 |
| Cross-Platform | 3 | 0 | 1 | 2 |
| 3D / VR / AR | 5 | 1 | 3 | 1 |
| Auth & Permissions | 4 | 3 | 0 | 1 |
| Monetization & Tiers | 3 | 2 | 1 | 0 |
| Security & Compliance | 7 | 2 | 1 | 4 |
| Infrastructure & DevOps | 7 | 3 | 3 | 1 |
| User Experience | 5 | 0 | 2 | 3 |
| Social Graph & Messaging | 12 | 9 | 2 | 1 |
| Community & Ecosystem | 1 | 0 | 1 | 0 |
| Email & Communications | 1 | 0 | 0 | 1 |
| **TOTAL** | **121** | **52** | **50** | **19** |
