# TODO Audit Report — 2026-03-23 (Pass 2)

## Codebase Summary

| Layer | Source Files | Notes |
|-------|-------------|-------|
| kernel | 126 | 3,928 lines in social-graph alone |
| social | 27 | Complete (123 tests) |
| runtime | 72 | Cross-canvas router, DataSource bridge, checkout integration |
| lab | 133 | Creator mode, prompt refinement, graph visual overhaul |
| canvas | 167 | 4 sub-layers, 14 entity types |
| spatial | 56 | Scaffolded, untested on hardware |
| marketplace | 27 | API + listing + install flow |
| shell | 178 | Profile page, presence cursors, notifications |
| **Total** | **786** | 212 test files, 48 DB migrations |

---

## Items Checked Off (newly marked complete)

- **User search API** — `searchProfiles()` + `isUsernameAvailable()` in `profiles.ts` (235 lines)
- **User profile page** — `ProfilePage.tsx` (562 lines) in `src/shell/profile/`
- **Follow / unfollow system** — `followUser()`, `unfollowUser()`, `getFollowers()`, `getFollowing()` in `follows.ts` (468 lines)
- **Friend request / accept / decline** — `acceptFollowRequest()`, `rejectFollowRequest()`, `getPendingFollowRequests()` in `follows.ts`
- **Block / unblock users** — `blockUser()`, `unblockUser()`, `isBlocked()`, `isBlockedEitherWay()` in `blocks.ts` (135 + 203 test lines)
- **Direct messages (1:1)** — `sendMessage()`, `getConversation()` in `messages.ts` (158 lines)
- **Message persistence** — `direct_messages` table (migration `20260227135100`) with RLS
- **Unread count tracking** — `getUnreadCount()` in `notifications.ts` (282 lines)
- **Block enforcement on messages** — `canMessage()` checks block status
- **Remote cursor overlays** — `PresenceCursorsLayer.tsx` (156 lines) + `CursorGlow.tsx` (81 lines)
- **Notification system** — `NotificationPanel.tsx` (284 lines) + full API in `notifications.ts`

**Total newly checked off: 11 items**

---

## Items Updated with Partial Notes

- **Billing wiring** — `useQuotaCheck` exists in 3 files but not wired into canvas creation, widget placement, or collaborator adds
- **Event bus inspector** — `EventBusPanel.tsx` (112 lines) exists in dev tools, needs production UI
- **Canvas invites** — widget invites built (441 lines), `canvas_members` table exists, but generic invite link flow missing
- **Notion OAuth** — IntegrationsSection.tsx references Notion auth, needs edge function
- **User search + profile cards** — ProfilePage exists but no inline search UI or profile card popover
- **Database page** — `database-management.ts` schema (563 lines) defines everything, needs UI

---

## Items Broken Down

- **Stripe Connect onboarding** → 6 sub-tasks (edge function, schema, verification UI, payouts, webhooks, dashboard)
- **Product catalog** → 3 sub-tasks (schema, CRUD API, management UI)
- **Automation triggers** → 4 sub-tasks (schema, cron, webhook, manual button)
- **Automation actions** → 5 sub-tasks (schema, HTTP, DataSource, entity creation, email)
- **Execution logs** → 3 sub-tasks (schema, persistence, viewer panel)
- **Table DataSource spreadsheet view** → 4 sub-tasks (render, editing, columns, sort/filter)

---

## Stale Items Removed

None. All items remain architecturally relevant.

---

## Architecture Concerns Found

1. **Commerce widgets reference in `built-in-html.ts`**: 16 TODO/stub markers. These stubs live in Runtime (L3) but the actual commerce logic needs to flow through Kernel (L0) for schemas and billing. The stubs should call the checkout integration proxy, not implement commerce logic directly.

2. **Social graph lives in Kernel (L0)**: The 3,928-line social-graph module is correctly placed in L0 per the architecture (Kernel owns all APIs), but it's growing large. Consider whether it should become a kernel submodule with its own barrel (`src/kernel/social-graph/index.ts` already exists — good).

3. **No cross-layer violations found**: All social graph code imports only from kernel internals and external packages. Shell UI components correctly import from kernel. No boundary violations detected.

4. **Database management schema at L0, UI at L6**: Correct layer separation. Schema defines column types, cell values, filters — Shell will build the UI. No architecture issue.

---

## Blocked Items (dependency issues)

- **Commerce hardening** — blocked by Stripe Connect onboarding + product catalog CRUD (no commerce to harden yet)
- **Canvas subscriptions** — blocked by Stripe Connect + storefront canvas type
- **Widget pricing in marketplace** — blocked by Stripe Connect
- **Storefront theming** — blocked by storefront canvas type
- **Real-time message delivery** — requires Supabase Realtime channel for DMs (L1 pattern exists for canvas channels, can be extended)

---

## Coverage Table Changes

- Built: 43 → 52 (+9) — social graph APIs, messaging, shell social UI
- Partial: 41 → 50 (+9) — billing wiring, invites, event bus, database schema, Notion OAuth
- Missing: 17 → 19 (+2) — recount with social graph as its own category
- New category added: "Social Graph & Messaging" (12 features, 9 built, 2 partial, 1 missing)

---

## Recommendations

1. **Immediate wins**: Wire `useQuotaCheck` into canvas creation and widget placement — small change, high impact for billing readiness.

2. **Next sprint priority**: Stripe Connect onboarding is the P0 bottleneck blocking all commerce. Start with the edge function + schema work (L0), then UI (L6).

3. **Quick shell work**: Add presence avatars bar and message inbox panel — the APIs are fully built, just needs React components.

4. **Content widgets**: Rich text widget is the highest-value content widget. Consider using Tiptap or ProseMirror inside a Widget SDK-compatible iframe.

5. **Automation system**: This is the largest unbuilt feature area (11 items, all not started). Recommend starting with the `TriggerNode` + `ActionNode` schemas in L0, then building 2-3 core nodes (HTTP request, DataSource mutation) before the full library.
