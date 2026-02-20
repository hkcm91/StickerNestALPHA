# Story: Layer 1 Social + Sync — Real-time Collaboration Infrastructure

**Created:** 2026-02-20
**Layer(s):** L1
**Status:** Not Started

## Context

Layer 0 (Kernel) is complete with 394 tests passing and all 4 gate tests green. Layer 1 is the real-time collaboration infrastructure — invisible platform plumbing that keeps multiple users synchronized. It owns Supabase Realtime channel management, presence tracking, cursor broadcast, entity transform sync, conflict resolution per data type (LWW, Yjs CRDT, revision-based), advisory edit locks, and offline degradation. All communication flows through `social.*` bus events. L1 depends only on L0.

The kernel provides: event bus (typed pub/sub), socialStore (PresenceUser type, presence map), SocialEvents constants (6 event types), DataSource CRUD with ACL, Supabase client singleton, and canvasStore (sharing settings for permission checks).

## Acceptance Criteria

- [ ] AC1: Channel Management — one Supabase Realtime channel per canvas (`canvas:{canvasId}`), created on join, destroyed on leave, no per-user or per-widget channels
- [ ] AC2: Presence Tracking — join/leave events update socialStore via bus events, Guests appear with label "Guest" and random color, removal on disconnect
- [ ] AC3: Cursor Broadcast — 30fps throttled outbound (33ms window), incoming positions update socialStore via `social.cursor.moved`, cursor removal on leave/disconnect
- [ ] AC4: Entity Transform Broadcast — optimistic during drag, LWW reconcile on drop, `social.entity.transformed` bus event after reconciliation
- [ ] AC5: Conflict Resolution (LWW) — canvas entities and Note DataSources use silent last-write-wins, no toast, no merge UI
- [ ] AC6: Conflict Resolution (Yjs) — Doc DataSources use Yjs CRDT via y-protocols over Realtime channel, one Y.Doc per DataSource, no keystroke loss
- [ ] AC7: Conflict Resolution (Revision-based) — Table/Custom DataSources use revision-based with 409 conflict, client re-fetches and retries, non-intrusive toast "Row changed - refreshed"
- [ ] AC8: Edit Locks — advisory per-entity locks with 30s timeout, broadcast via channel, colored border indicator for other users, released on drop/leave/timeout
- [ ] AC9: Offline Degradation — hide stale cursors, queue local edits, no error for <5s interruptions, reconcile on reconnect, Yjs handles Doc offline natively
- [ ] AC10: Permission Enforcement — suppress outbound broadcast for read-only users, emit `social.conflict.rejected` locally, allow inbound cursor/presence for all
- [ ] AC11: Gate Tests — all 4 mandatory L1 tests pass:
  1. Two-session cursor visibility (both sessions see each other's cursor)
  2. Simultaneous entity move convergence (LWW resolves, no error)
  3. Doc co-edit via Yjs (no keystrokes lost, both converge)
  4. Table row revision conflict (409 → toast → refresh → retry)
- [ ] AC12: Full Verification — npm test, npm run lint, npm run typecheck all pass with 80% coverage

## Constraints

- Must follow L1 import rules (see `.claude/rules/L1-social.md`)
- Must have co-located test files (`*.test.ts`)
- Must pass 80% coverage threshold
- Must use schemas from `@sn/types` (no local schema definitions)
- Must use existing `SocialEvents` constants from `@sn/types`
- Must write to `socialStore` via bus events only, never directly
- One Supabase Realtime channel per canvas — no per-user or per-widget channels
- Channel naming: `canvas:{canvasId}` exactly
- Cursor throttle: 30fps maximum (33ms window)
- Yjs for Doc types only; revision-based for Table/Custom only; LWW for entities and Notes
- Advisory edit locks only (not enforced at data layer)
- No blocking modals for conflict resolution — toast only
- Must not import from L2, L3, L4A, L4B, L5, or L6

## Technical Notes

- `socialStore` already exists at `src/kernel/stores/social/social.store.ts`:
  - `PresenceUser: { userId, displayName, color, cursorPosition, joinedAt }`
  - Actions: `setPresence`, `removePresence`, `updateCursor`, `clearPresence`
  - Bus subscriptions: `social.presence.joined`, `social.presence.left`, `social.cursor.moved`
- `SocialEvents` constants in `src/kernel/schemas/bus-event.ts`:
  - `PRESENCE_JOINED`, `PRESENCE_LEFT`, `CURSOR_MOVED`, `ENTITY_TRANSFORMED`, `DATASOURCE_UPDATED`, `CONFLICT_REJECTED`
- Supabase client: `import { supabase } from 'src/kernel/supabase'`
- Event bus: `import { bus } from 'src/kernel/bus'`
- canvasStore has `sharingSettings` and `userRole` for permission checks
- DataSource revision column exists via migration `00002_add_datasource_revision.sql`
- `yjs` and `y-protocols` are installed as production dependencies

## Files to Touch

### Channel Management
- `src/social/channel/channel.ts` — Realtime channel lifecycle
- `src/social/channel/channel.test.ts` — Channel tests
- `src/social/channel/index.ts` — Barrel

### Presence
- `src/social/presence/presence.ts` — Join/leave, Guest handling
- `src/social/presence/presence.test.ts` — Presence tests
- `src/social/presence/index.ts` — Barrel

### Cursor Broadcast
- `src/social/cursor/cursor.ts` — Throttled cursor broadcast
- `src/social/cursor/cursor.test.ts` — Cursor tests
- `src/social/cursor/index.ts` — Barrel

### Entity Sync
- `src/social/entity-sync/entity-sync.ts` — Transform broadcast + LWW
- `src/social/entity-sync/entity-sync.test.ts` — Entity sync tests
- `src/social/entity-sync/index.ts` — Barrel

### Conflict Resolution
- `src/social/conflict/conflict.ts` — Strategy router per data type
- `src/social/conflict/conflict.test.ts` — Conflict tests
- `src/social/conflict/index.ts` — Barrel

### Yjs Sync
- `src/social/yjs-sync/yjs-sync.ts` — Y.Doc over Realtime
- `src/social/yjs-sync/yjs-sync.test.ts` — Yjs sync tests
- `src/social/yjs-sync/index.ts` — Barrel

### Edit Locks
- `src/social/edit-lock/edit-lock.ts` — Advisory lock manager
- `src/social/edit-lock/edit-lock.test.ts` — Lock tests
- `src/social/edit-lock/index.ts` — Barrel

### Offline
- `src/social/offline/offline.ts` — Degradation + reconnect
- `src/social/offline/offline.test.ts` — Offline tests
- `src/social/offline/index.ts` — Barrel

### Layer Init + Barrel
- `src/social/init.ts` — initSocial() / teardownSocial()
- `src/social/init.test.ts` — Init tests
- `src/social/index.ts` — Layer barrel export

---

## Progress Log

<!-- Ralph Loop appends entries here as work proceeds -->
<!-- Format: ### [Timestamp] - [Action] -->
<!-- Include: what was done, outcome, decisions made, blockers -->
