# Layer 1 — Social + Sync Rules
# Applies to: `src/social/**`

## Identity and Responsibility

Layer 1 is the real-time collaboration infrastructure of StickerNest V5. It is
invisible to users as a widget or UI element — it is platform plumbing. Its job
is to keep multiple users synchronized: who is present, where their cursors are,
what changed in the canvas, and how to reconcile conflicting edits.

Social layer owns:
- Supabase Realtime channel management (one channel per canvas)
- Presence tracking (join, leave, presence map)
- Cursor position broadcast and throttling
- Entity transform broadcast (optimistic during drag, reconcile on drop)
- Conflict resolution per data type
- Routing all incoming Realtime messages onto the local event bus as `social.*` events
- Edit lock management (optional per-entity)
- Graceful offline degradation

Layer 1 depends on Layer 0. It depends on nothing else.

---

## Import Rules — STRICTLY ENFORCED

- You MAY import from `src/kernel/**` (Layer 0)
- You MAY import from external npm packages (yjs, y-protocols, @supabase/supabase-js, etc.)
- You MUST NOT import from `src/runtime/**`, `src/lab/**`, `src/canvas/**`,
  `src/spatial/**`, `src/marketplace/**`, or `src/shell/**`
- You MUST NOT import widget internals — the social layer does not know what
  is inside a widget; it only sees bus events and entity transforms

If a piece of code you are writing needs to know about widget-specific rendering
or widget-specific state, that code does not belong in Layer 1.

---

## Realtime Channel Setup

- One Supabase Realtime channel per canvas
- Channel naming convention: `canvas:{canvasId}` — this exact format, no deviations
- Channel is created when a user joins a canvas and destroyed on leave
- All social coordination for a given canvas flows through its single channel
- Do not create per-user or per-widget channels — one channel per canvas is the rule

---

## Presence Tracking

- Track join and leave events for every user on the channel
- Maintain a presence map in `socialStore` (defined in Layer 0) — write to it
  by emitting bus events; do not write to the store directly from Layer 1
- Guests MUST appear in the presence map with label `"Guest"` and a randomly
  assigned color — do not omit Guests from presence
- Presence state minimum shape per user:
  ```
  { userId, displayName, color, cursorPosition?, joinedAt }
  ```
- On disconnect/leave, remove the user from the presence map promptly

---

## Cursor Broadcast

- Cursor positions are broadcast to all other users in the canvas channel
- Throttle outbound cursor broadcasts to **30fps maximum** — do not send on every
  mousemove event; use a throttle utility with a 33ms window
- Incoming cursor positions from other users update `socialStore` via bus events
- Cursor data must include `userId`, `position` (canvas-space coordinates), and
  `color`
- Cursors are visible for ALL user types including Guests
- When the user goes offline or leaves, their cursor must be removed from all
  other clients' views promptly (handle via presence leave event)

---

## Entity Transform Broadcast

- During drag: broadcast entity position updates optimistically (do not wait for
  server confirmation)
- On drop: perform reconciliation — apply the final transform, emit the canonical
  position to the channel, and let LWW resolution handle any conflicts
- Entity transforms include: position, rotation, scale, and any other spatial
  properties on a `CanvasEntity`
- The social layer emits a `social.entity.transformed` bus event after reconciliation
  so that canvas layers can react without polling

---

## Conflict Resolution — Match Data Type Exactly

Different data types use different strategies. Do NOT mix strategies across types.

### Canvas Entities (position, transform, properties)
- Strategy: **last-write-wins, silent**
- No conflict prompt, no toast, no merge UI
- The most recent write (by server timestamp) wins
- Apply silently; the user does not need to know

### Doc DataSources
- Strategy: **Yjs CRDT**
- One `Y.Doc` per DataSource instance
- Sync via Supabase Realtime as Yjs binary update messages
- Use `y-protocols` for encoding/decoding Yjs updates over the channel
- Do not implement a custom CRDT — use Yjs exclusively for Doc types
- No keystroke should be lost under any network condition

### Table and Custom DataSources
- Strategy: **revision-based conflict detection with LWW fallback**
- Every row has a `revision` counter (integer, server-incremented)
- Every write from the client must include the `lastSeenRevision` for that row
- If the server's current revision for that row has advanced beyond `lastSeenRevision`,
  reject the write with HTTP **409 Conflict**
- On 409: client must re-fetch the row, apply its edit on top of the fresh data,
  and retry — do not silently overwrite
- If clock skew or ordering ambiguity prevents revision comparison → fall back to LWW
- On rejection: show a non-intrusive toast: `"Row changed — refreshed"`
  — no modal, no blocking UI
- Do not apply this strategy to Doc types (they use Yjs) or Note types (they use LWW)

### Note DataSources
- Strategy: **last-write-wins, no indicator**
- Silent, no toast, no merge prompt
- Same as canvas entity LWW behavior

---

## Bus Event Contract

All incoming Realtime messages are translated to local bus events before any
other layer consumes them. Bus events emitted by Layer 1 use the `social.*`
namespace exclusively.

Required event types to emit:
- `social.presence.joined` — a user joined the canvas
- `social.presence.left` — a user left the canvas
- `social.cursor.moved` — a remote cursor position updated
- `social.entity.transformed` — a remote entity transform was applied
- `social.datasource.updated` — a remote DataSource change was applied
- `social.conflict.rejected` — a write was rejected (409), before re-fetch

Do not invent event type names outside this namespace. If a new social event
is needed, add it here first with a comment explaining what it represents.

---

## Edit Lock (Optional Per-Entity)

- Entities may be locked for exclusive editing by one user at a time
- Lock state: `{ entityId, lockedBy: userId, lockedAt: timestamp }`
- Lock is acquired optimistically and broadcast via the canvas channel
- Lock expires after a configurable timeout (default: 30 seconds of inactivity)
- Other users attempting to edit a locked entity see a non-blocking indicator
  (e.g., colored border with locker's avatar) — they are not hard-blocked
- Lock is released on drop, on leaving the canvas, or on timeout
- Do not hard-block writes behind a lock — the lock is advisory, not enforced at
  the data layer (enforcement happens through UX affordance, not permission rejection)

---

## Offline Degradation

- When the Realtime channel loses connection, Layer 1 must degrade gracefully:
  - Hide all remote cursors (do not show stale positions)
  - Continue accepting local edits and store them locally
  - Do not show error states for routine network interruptions under 5 seconds
  - On reconnect: re-join the channel, re-broadcast presence, reconcile any
    local edits made while offline using the same conflict resolution rules
- Yjs handles offline Doc edits natively — do not implement a separate offline
  queue for Doc DataSources
- Table/Custom offline edits should be queued and retried on reconnect with
  revision-check included

---

## Permission Enforcement

- Before allowing any write to be broadcast on the channel, check the canvas
  sharing settings (available via `canvasStore` from Layer 0)
- If the user does not have write permission on the canvas, suppress the outbound
  broadcast and emit a `social.conflict.rejected` bus event locally
- Read-only users may still receive cursor and presence updates — do not suppress inbound

---

## Testing Requirements

The following tests MUST be written and must pass before Layer 1 is marked complete:

1. **Two-session cursor visibility** — open two simulated sessions on the same
   `canvasId`; confirm each session sees the other's cursor in `socialStore`
2. **Simultaneous entity move convergence** — two sessions move the same entity
   concurrently; after both drops, both clients converge to the same position
   without an unhandled error; confirm LWW resolved it
3. **Doc co-edit via Yjs** — two sessions type concurrently into the same Doc
   DataSource; confirm no keystrokes are lost and both sessions converge to the
   same document state
4. **Table row revision conflict** — two sessions read the same row; session A
   writes first; session B's write must receive a 409; confirm a toast is shown
   on session B and the row is refreshed to session A's value before retry

---

## What You Must Not Do

- Do not import from Layer 2, 3, 4A, 4B, 5, or 6 — ever
- Do not import widget internal state or widget-specific logic
- Do not create more than one Realtime channel per canvas
- Do not broadcast cursors faster than 30fps — unbounded mousemove events will
  overwhelm the channel
- Do not use Yjs for Table, Custom, or Note DataSources — wrong strategy for those types
- Do not use revision-based conflict detection for Doc DataSources — Yjs handles those
- Do not show a blocking modal or dialog for conflict resolution — all conflict UI
  must be non-intrusive (toast only)
- Do not hard-enforce edit locks at the write level — locks are advisory UX only
- Do not omit Guests from presence tracking — they are real users and must appear
- Do not leave stale cursors visible when a user disconnects or leaves the canvas
- Do not write directly to Zustand stores — always go through the event bus
