# StickerNest V5 — Layer 1: Social + Sync — Complete Build Plan

## Document Purpose

This is the full-spec build plan for Layer 1 (Social + Sync) of StickerNest V5. It covers the real-time collaboration infrastructure — Supabase Realtime channel management, presence tracking, cursor broadcast, entity transform sync, conflict resolution per data type (LWW, Yjs CRDT, revision-based), advisory edit locks, and offline degradation.

**Prerequisite:** Layer 0 (Kernel) acceptance test passes — 394 tests green, all 4 gate tests passing, 80%+ coverage.

---

## 1. Social Architecture Overview

### What Lives in the Social Layer

```
src/social/
├── index.ts                    # Layer barrel — public API of the social layer
├── init.ts                     # initSocial() / teardownSocial()
├── init.test.ts                # Init/teardown integration tests
├── channel/
│   ├── channel.ts              # Supabase Realtime channel lifecycle
│   ├── channel.test.ts
│   └── index.ts
├── presence/
│   ├── presence.ts             # Join/leave, Guest handling, presence map
│   ├── presence.test.ts
│   └── index.ts
├── cursor/
│   ├── cursor.ts               # Cursor broadcast, 30fps throttle
│   ├── cursor.test.ts
│   └── index.ts
├── entity-sync/
│   ├── entity-sync.ts          # Entity transform broadcast + LWW reconcile
│   ├── entity-sync.test.ts
│   └── index.ts
├── conflict/
│   ├── conflict.ts             # Conflict strategy router per data type
│   ├── conflict.test.ts
│   └── index.ts
├── yjs-sync/
│   ├── yjs-sync.ts             # Y.Doc sync over Realtime channel
│   ├── yjs-sync.test.ts
│   └── index.ts
├── edit-lock/
│   ├── edit-lock.ts            # Advisory per-entity locks, 30s timeout
│   ├── edit-lock.test.ts
│   └── index.ts
└── offline/
    ├── offline.ts              # Offline degradation, queue, reconnect
    ├── offline.test.ts
    └── index.ts
```

### Dependency Rule

The social layer imports from the **kernel** (`src/kernel/`) only. It depends on nothing else. Higher layers (lab, canvas, shell) may consume social layer events via the bus.

```typescript
// ✅ Allowed
import { bus } from 'src/kernel/bus';
import { SocialEvents, type DataSourceType } from '@sn/types';
import { supabase } from 'src/kernel/supabase';
import { useSocialStore } from 'src/kernel/stores/social/social.store';

// ❌ Forbidden
import { WidgetFrame } from 'src/runtime';       // L3
import { CanvasViewport } from 'src/canvas/core'; // L4A
```

### Key Principle

Layer 1 is invisible to users. It is platform plumbing. No UI components live here — only services that keep multiple users synchronized. All state changes flow through the event bus as `social.*` events, which the kernel's `socialStore` already subscribes to.

---

## 2. Channel Management

### 2.1 Channel Lifecycle

One Supabase Realtime channel per canvas. No per-user or per-widget channels.

```typescript
interface CanvasChannel {
  /** The canvas this channel serves */
  canvasId: string;

  /** Join the channel, start receiving messages */
  join(): Promise<void>;

  /** Leave the channel, clean up subscriptions */
  leave(): Promise<void>;

  /** Whether the channel is currently connected */
  isConnected(): boolean;

  /** Send a message to all other users on this channel */
  broadcast(event: string, payload: unknown): void;

  /** Subscribe to a specific event type on this channel */
  onMessage(event: string, handler: (payload: unknown) => void): () => void;

  /** Get the underlying Supabase channel for presence operations */
  getRealtimeChannel(): RealtimeChannel;
}
```

**Channel naming convention:** `canvas:{canvasId}` — exactly this format, no deviations.

**Rules:**
- Channel is created when a user joins a canvas (`createCanvasChannel(canvasId)`)
- Channel is destroyed when the user leaves the canvas or disconnects
- All social coordination for a given canvas flows through its single channel
- A user may only be on one canvas channel at a time (joining a new canvas leaves the old one)

### 2.2 Channel Factory

```typescript
function createCanvasChannel(canvasId: string): CanvasChannel {
  const channelName = `canvas:${canvasId}`;
  const channel = supabase.channel(channelName, {
    config: { presence: { key: userId } }
  });

  // ... setup presence, message handlers, error handling
  return channelInstance;
}
```

### 2.3 Channel Events

The channel routes these Realtime events to local bus events:

| Realtime Event | Bus Event | Description |
|---|---|---|
| `presence.join` | `social.presence.joined` | User joined the canvas |
| `presence.leave` | `social.presence.left` | User left the canvas |
| `broadcast:cursor` | `social.cursor.moved` | Remote cursor position update |
| `broadcast:transform` | `social.entity.transformed` | Remote entity transform applied |
| `broadcast:datasource` | `social.datasource.updated` | Remote DataSource change applied |
| `broadcast:lock` | *(edit-lock internal)* | Advisory lock acquired/released |
| `broadcast:yjs` | *(yjs-sync internal)* | Yjs binary update for Doc types |

---

## 3. Presence Tracking

### 3.1 Presence Manager

```typescript
interface PresenceManager {
  /** Join presence on the channel, broadcast our user info */
  join(channel: CanvasChannel, userInfo: PresenceUserInfo): Promise<void>;

  /** Leave presence, notify others */
  leave(): Promise<void>;

  /** Get current presence map (synced via socialStore) */
  getPresenceMap(): Record<string, PresenceUser>;

  /** Handle sync events from Supabase Presence */
  handleSync(state: Record<string, PresenceUser[]>): void;

  /** Handle join events */
  handleJoin(key: string, newPresences: PresenceUser[]): void;

  /** Handle leave events */
  handleLeave(key: string, leftPresences: PresenceUser[]): void;
}

interface PresenceUserInfo {
  userId: string;
  displayName: string;
  color: string;  // Hex color assigned to this user
  isGuest: boolean;
}
```

### 3.2 Guest Handling

Guests MUST appear in the presence map:
- `displayName: "Guest"`
- `color`: randomly assigned from a predefined palette (8+ distinct colors)
- `userId`: ephemeral ID generated client-side (e.g., `guest_<nanoid>`)
- Guests receive all presence and cursor updates — they are not second-class users

### 3.3 Presence → Bus Event Flow

```
Supabase Presence sync event
  → PresenceManager.handleJoin(key, newPresences)
    → bus.emit(SocialEvents.PRESENCE_JOINED, presenceUser)
      → socialStore.setPresence(userId, presenceUser)  // via bus subscription
```

The social layer NEVER writes to `socialStore` directly. It emits bus events, and the store's existing bus subscriptions (defined in `setupSocialBusSubscriptions()`) handle the state update.

### 3.4 Cleanup

On disconnect/leave:
1. Remove user from Supabase Presence
2. Emit `social.presence.left` bus event
3. socialStore removes the user (via existing bus subscription)
4. Cursor is automatically removed when presence is removed

---

## 4. Cursor Broadcast

### 4.1 Cursor Broadcaster

```typescript
/** Constant: 30fps maximum = 33ms throttle window */
const CURSOR_THROTTLE_MS = 33;

interface CursorBroadcaster {
  /** Start broadcasting cursor position for the local user */
  start(channel: CanvasChannel, userId: string): void;

  /** Stop broadcasting */
  stop(): void;

  /** Update local cursor position (throttled) */
  updatePosition(position: { x: number; y: number }): void;
}
```

### 4.2 Throttle Implementation

```typescript
function createCursorBroadcaster(): CursorBroadcaster {
  let lastBroadcast = 0;
  let pendingPosition: { x: number; y: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function broadcastPosition(channel: CanvasChannel, userId: string, position: { x: number; y: number }) {
    const now = Date.now();
    const elapsed = now - lastBroadcast;

    if (elapsed >= CURSOR_THROTTLE_MS) {
      // Enough time has passed — broadcast immediately
      channel.broadcast('cursor', { userId, position, color: getUserColor() });
      lastBroadcast = now;
      pendingPosition = null;
    } else {
      // Too soon — schedule for the remaining time
      pendingPosition = position;
      if (!timer) {
        timer = setTimeout(() => {
          if (pendingPosition) {
            channel.broadcast('cursor', { userId, position: pendingPosition, color: getUserColor() });
            lastBroadcast = Date.now();
            pendingPosition = null;
          }
          timer = null;
        }, CURSOR_THROTTLE_MS - elapsed);
      }
    }
  }
  // ...
}
```

### 4.3 Incoming Cursor Processing

When a remote cursor broadcast arrives:

```
Channel receives broadcast:cursor from other user
  → CursorBroadcaster.handleRemoteCursor(payload)
    → bus.emit(SocialEvents.CURSOR_MOVED, { userId, position, color })
      → socialStore.updateCursor(userId, position)  // via bus subscription
```

### 4.4 Cursor Cleanup

When a user leaves or disconnects:
- Their cursor is removed by the `social.presence.left` handler calling `socialStore.removePresence(userId)`
- This removes both the presence entry and the cursor position in one operation
- Stale cursors are hidden immediately (no animation fade — just remove)

---

## 5. Entity Transform Broadcast

### 5.1 Entity Sync Manager

```typescript
interface EntitySyncManager {
  /** Start syncing entity transforms on this channel */
  start(channel: CanvasChannel): void;

  /** Stop syncing */
  stop(): void;

  /** Broadcast a local entity transform (called during drag) */
  broadcastTransform(entityId: string, transform: EntityTransform): void;

  /** Broadcast final position on drop (triggers LWW reconciliation) */
  broadcastDrop(entityId: string, transform: EntityTransform, timestamp: number): void;

  /** Handle incoming remote transform */
  handleRemoteTransform(payload: RemoteTransformPayload): void;
}

interface EntityTransform {
  position: { x: number; y: number };
  rotation?: number;
  scale?: { x: number; y: number };
  width?: number;
  height?: number;
}

interface RemoteTransformPayload {
  entityId: string;
  userId: string;
  transform: EntityTransform;
  timestamp: number;
  isFinal: boolean;  // true = drop, false = drag in progress
}
```

### 5.2 Optimistic vs Final Transforms

**During drag (optimistic):**
- Broadcast position updates at throttled rate (can reuse cursor throttle cadence)
- Other clients apply these immediately for visual feedback
- No conflict resolution needed — drag is transient

**On drop (final):**
- Broadcast the final transform with `isFinal: true` and a server timestamp
- Apply LWW reconciliation: the transform with the latest timestamp wins
- Emit `social.entity.transformed` bus event after reconciliation
- The canvas layer listens for this event to update entity positions

### 5.3 LWW Reconciliation for Entities

```typescript
function reconcileEntityTransform(
  local: { transform: EntityTransform; timestamp: number },
  remote: { transform: EntityTransform; timestamp: number }
): EntityTransform {
  // Last-write-wins: later timestamp takes precedence
  if (remote.timestamp >= local.timestamp) {
    return remote.transform;
  }
  return local.transform;
}
```

- **Silent**: no toast, no modal, no merge UI
- The most recent write (by server timestamp) wins
- Applied automatically — the user does not need to know

---

## 6. Conflict Resolution

### 6.1 Strategy Router

Different data types use different conflict resolution strategies. The strategy router maps `DataSourceType` to the correct strategy.

```typescript
type ConflictStrategy = 'lww-silent' | 'yjs-crdt' | 'revision-based';

function getStrategyForType(type: DataSourceType): ConflictStrategy {
  switch (type) {
    case 'doc':
      return 'yjs-crdt';
    case 'table':
    case 'custom':
      return 'revision-based';
    case 'note':
    case 'folder':
    case 'file':
      return 'lww-silent';
    default:
      return 'lww-silent';
  }
}
```

### 6.2 LWW-Silent (Canvas Entities, Notes, Folders, Files)

- Strategy: last-write-wins by server timestamp
- No toast, no modal, no merge UI
- Applied silently — the user does not need to know
- Used for: entity transforms, Note DataSources, Folder DataSources, File DataSources

### 6.3 Yjs CRDT (Doc DataSources)

- Strategy: Yjs CRDT via `y-protocols` over Realtime channel
- One `Y.Doc` per DataSource instance
- Binary Yjs updates encoded via `y-protocols/sync` and broadcast on the channel
- **No keystroke loss** under any network condition — this is a hard requirement
- Yjs handles offline Doc edits natively — no separate offline queue needed

```typescript
interface YjsSyncManager {
  /** Create or retrieve Y.Doc for a DataSource */
  getOrCreateDoc(dataSourceId: string): Y.Doc;

  /** Start syncing a Doc over the channel */
  startSync(channel: CanvasChannel, dataSourceId: string): void;

  /** Stop syncing a Doc */
  stopSync(dataSourceId: string): void;

  /** Handle incoming Yjs update from channel */
  handleRemoteUpdate(dataSourceId: string, update: Uint8Array): void;

  /** Destroy all Y.Docs (on leave) */
  destroyAll(): void;
}
```

**Yjs Update Flow:**

```
Local Y.Doc change
  → Y.Doc.on('update', (update: Uint8Array) => ...)
    → channel.broadcast('yjs', { dataSourceId, update: base64(update) })

Remote Yjs broadcast arrives
  → decode base64 → Uint8Array
    → Y.applyUpdate(doc, update)
      → Y.Doc.on('update') fires in local observers
        → bus.emit(SocialEvents.DATASOURCE_UPDATED, { dataSourceId, type: 'doc' })
```

### 6.4 Revision-Based (Table and Custom DataSources)

- Strategy: revision-based conflict detection with retry
- Every row has a `revision` counter (integer, server-incremented)
- Client includes `lastSeenRevision` with every write

```typescript
interface RevisionConflictHandler {
  /** Attempt to write with revision check */
  write(
    dataSourceId: string,
    rowId: string,
    data: unknown,
    lastSeenRevision: number
  ): Promise<WriteResult>;

  /** Re-fetch and retry after conflict */
  resolveConflict(
    dataSourceId: string,
    rowId: string,
    localChanges: unknown
  ): Promise<WriteResult>;
}

type WriteResult =
  | { success: true; newRevision: number }
  | { success: false; conflict: true; serverRevision: number; serverData: unknown };
```

**Conflict Flow:**

```
Client A writes row (revision 3) → success, revision now 4
Client B writes same row (revision 3) → 409 Conflict (server is at 4)
  → bus.emit(SocialEvents.CONFLICT_REJECTED, { dataSourceId, rowId, reason: 'revision' })
  → Show toast: "Row changed — refreshed"
  → Re-fetch row (now at revision 4, with Client A's data)
  → Merge Client B's changes on top of fresh data
  → Retry write with revision 4 → success, revision now 5
```

**Rules:**
- On 409: client MUST re-fetch, NOT silently overwrite
- Toast is non-intrusive: `"Row changed — refreshed"` — no modal, no blocking UI
- If clock skew prevents revision comparison → fall back to LWW
- Do NOT apply this strategy to Doc types (Yjs handles those)
- Do NOT apply this strategy to Note types (they use LWW)

---

## 7. Edit Locks

### 7.1 Advisory Lock Manager

Locks are advisory — they are not enforced at the data layer. Enforcement happens through UX affordance only.

```typescript
interface EditLockManager {
  /** Acquire a lock on an entity */
  acquireLock(channel: CanvasChannel, entityId: string, userId: string): Promise<boolean>;

  /** Release a lock */
  releaseLock(channel: CanvasChannel, entityId: string): void;

  /** Check if an entity is locked by another user */
  isLockedByOther(entityId: string, currentUserId: string): LockInfo | null;

  /** Get all active locks */
  getActiveLocks(): Map<string, LockInfo>;

  /** Handle incoming lock broadcast */
  handleRemoteLock(payload: LockBroadcast): void;

  /** Start timeout checking (run every second) */
  startTimeoutChecker(): void;

  /** Stop timeout checking */
  stopTimeoutChecker(): void;
}

interface LockInfo {
  entityId: string;
  lockedBy: string;       // userId
  lockedAt: number;       // timestamp
  displayName: string;    // For UI indicator
  color: string;          // For colored border
}

/** Default lock timeout: 30 seconds of inactivity */
const LOCK_TIMEOUT_MS = 30_000;
```

### 7.2 Lock Lifecycle

1. **Acquire**: User starts dragging entity → broadcast lock via channel
2. **Renew**: While dragging, lock is implicitly renewed (activity resets the 30s timer)
3. **Release**: User drops entity → broadcast release via channel
4. **Timeout**: 30s of inactivity → lock expires, broadcast release
5. **Leave**: User leaves canvas → all their locks are released

### 7.3 Lock Visual Indicator

When another user has locked an entity, the canvas layer shows:
- Colored border matching the locking user's presence color
- Small avatar or initials of the locking user
- Non-blocking — the current user CAN still interact (advisory only)

---

## 8. Offline Degradation

### 8.1 Offline Manager

```typescript
interface OfflineManager {
  /** Start monitoring connection state */
  start(channel: CanvasChannel): void;

  /** Stop monitoring */
  stop(): void;

  /** Whether we are currently offline */
  isOffline(): boolean;

  /** Queue a local edit for replay on reconnect */
  queueEdit(edit: QueuedEdit): void;

  /** Get queued edits count */
  getQueueSize(): number;
}

interface QueuedEdit {
  type: 'entity-transform' | 'datasource-write';
  dataSourceId?: string;
  entityId?: string;
  data: unknown;
  timestamp: number;
  revision?: number;  // For revision-based conflict detection on replay
}
```

### 8.2 Offline Behavior

When the Realtime channel loses connection:

| Behavior | Action |
|---|---|
| Remote cursors | Hide all — do not show stale positions |
| Local edits | Continue accepting, queue for replay |
| Error states | Suppress for interruptions < 5 seconds |
| Connection indicator | Show subtle offline badge after 5s |
| Yjs Doc edits | Continue working — Yjs handles offline natively |
| Table/Custom edits | Queue with revision number for replay on reconnect |
| Entity transforms | Apply locally, queue for broadcast on reconnect |

### 8.3 Reconnect Flow

1. Supabase Realtime reconnects automatically
2. OfflineManager detects reconnection
3. Re-join presence on the channel
4. Re-broadcast local user's cursor position
5. Replay queued edits:
   - Entity transforms: broadcast as final transforms with original timestamps → LWW resolves
   - Table/Custom DataSource writes: retry with revision check → handle 409 if needed
   - Doc DataSource: Yjs syncs automatically via its own protocol
6. Remove offline indicator
7. Show remote cursors again

---

## 9. Permission Enforcement

### 9.1 Outbound Broadcast Filtering

Before any write is broadcast on the channel, check the user's canvas role:

```typescript
function canBroadcast(action: 'cursor' | 'transform' | 'datasource-write' | 'lock'): boolean {
  const role = canvasStore.getState().userRole;

  switch (action) {
    case 'cursor':
      // All users can broadcast cursor (even viewers)
      return true;
    case 'transform':
    case 'datasource-write':
    case 'lock':
      // Only owner and editor can broadcast writes
      return role === 'owner' || role === 'editor';
    default:
      return false;
  }
}
```

### 9.2 Read-Only User Behavior

- **Inbound**: Read-only users receive all presence, cursor, and entity updates — nothing suppressed
- **Outbound cursor**: Allowed — viewers can show their cursor to others
- **Outbound writes**: Suppressed — emit `social.conflict.rejected` locally

```typescript
// When a read-only user attempts to broadcast a write
bus.emit(SocialEvents.CONFLICT_REJECTED, {
  reason: 'permission',
  message: 'You do not have edit permission on this canvas',
});
```

---

## 10. Init / Teardown

### 10.1 initSocial

```typescript
async function initSocial(canvasId: string, userInfo: PresenceUserInfo): Promise<SocialSession> {
  // 1. Create the canvas channel
  const channel = createCanvasChannel(canvasId);

  // 2. Join the channel
  await channel.join();

  // 3. Start presence tracking
  const presence = createPresenceManager();
  await presence.join(channel, userInfo);

  // 4. Start cursor broadcasting
  const cursor = createCursorBroadcaster();
  cursor.start(channel, userInfo.userId);

  // 5. Start entity sync
  const entitySync = createEntitySyncManager();
  entitySync.start(channel);

  // 6. Start edit lock manager
  const editLock = createEditLockManager();
  editLock.startTimeoutChecker();

  // 7. Start offline monitoring
  const offline = createOfflineManager();
  offline.start(channel);

  return { channel, presence, cursor, entitySync, editLock, offline };
}
```

### 10.2 teardownSocial

```typescript
async function teardownSocial(session: SocialSession): Promise<void> {
  // Reverse order of init
  session.offline.stop();
  session.editLock.stopTimeoutChecker();
  session.entitySync.stop();
  session.cursor.stop();
  await session.presence.leave();
  await session.channel.leave();

  // Clear all Yjs docs
  yjsSyncManager.destroyAll();

  // Clear social store
  bus.emit(SocialEvents.PRESENCE_LEFT, { userId: 'self' });
}
```

---

## 11. Bus Event Contract

All incoming Realtime messages are translated to local bus events before any other layer consumes them. Bus events emitted by Layer 1 use the `social.*` namespace exclusively.

### Required Events

| Event Constant | Event Type String | Payload Shape |
|---|---|---|
| `SocialEvents.PRESENCE_JOINED` | `social.presence.joined` | `PresenceUser` |
| `SocialEvents.PRESENCE_LEFT` | `social.presence.left` | `{ userId: string }` |
| `SocialEvents.CURSOR_MOVED` | `social.cursor.moved` | `{ userId, position: { x, y }, color }` |
| `SocialEvents.ENTITY_TRANSFORMED` | `social.entity.transformed` | `{ entityId, transform, userId, timestamp }` |
| `SocialEvents.DATASOURCE_UPDATED` | `social.datasource.updated` | `{ dataSourceId, type, userId }` |
| `SocialEvents.CONFLICT_REJECTED` | `social.conflict.rejected` | `{ reason, dataSourceId?, rowId?, message? }` |

All six event constants already exist in `src/kernel/schemas/bus-event.ts`. Do not invent additional event types.

---

## 12. Kernel Infrastructure Used by Social

Layer 1 builds on top of these existing L0 components:

| Component | Location | How Social Uses It |
|---|---|---|
| Event Bus | `src/kernel/bus/bus.ts` | All social state changes emitted as bus events |
| socialStore | `src/kernel/stores/social/social.store.ts` | Presence map, cursor positions (written via bus events) |
| SocialEvents | `src/kernel/schemas/bus-event.ts` | 6 event type constants |
| Supabase client | `src/kernel/supabase/client.ts` | Single Supabase instance for Realtime channels |
| canvasStore | `src/kernel/stores/canvas/` | `userRole` and `sharingSettings` for permission checks |
| DataSource types | `src/kernel/schemas/data-source.ts` | `DataSourceType` for conflict strategy routing |
| PresenceUser | `src/kernel/stores/social/social.store.ts` | Type definition for presence map entries |

---

## 13. Testing Strategy

### 13.1 Testing Stack

| Tool | Purpose |
|---|---|
| **Vitest** | Unit and integration tests |
| **Mock Supabase** | Mock `supabase.channel()` and Realtime events |
| **Fake Timers** | Test throttle, lock timeout, offline grace period |
| **Vitest Coverage** | 80% threshold |

### 13.2 Test Categories

#### Channel Tests

```typescript
describe('CanvasChannel', () => {
  it('creates channel with name canvas:{canvasId}')
  it('joins the channel successfully')
  it('leaves the channel and cleans up')
  it('broadcasts messages to the channel')
  it('receives messages from the channel')
  it('handles connection errors gracefully')
  it('only allows one channel per canvas at a time')
  it('reports isConnected correctly')
})
```

#### Presence Tests

```typescript
describe('PresenceManager', () => {
  it('joins presence and broadcasts user info')
  it('emits social.presence.joined bus event on remote join')
  it('emits social.presence.left bus event on remote leave')
  it('handles Guest users with label "Guest" and random color')
  it('removes user from presence map on disconnect')
  it('syncs full presence state on initial join')
  it('handles multiple simultaneous joins')
  it('handles rapid join/leave cycles')
})
```

#### Cursor Tests

```typescript
describe('CursorBroadcaster', () => {
  it('broadcasts cursor at 30fps maximum (33ms throttle)')
  it('does not broadcast faster than 33ms')
  it('broadcasts pending position after throttle window')
  it('emits social.cursor.moved for remote cursor updates')
  it('includes userId, position, and color in broadcast')
  it('stops broadcasting when stop() is called')
  it('removes cursor on user leave/disconnect')
})
```

#### Entity Sync Tests

```typescript
describe('EntitySyncManager', () => {
  it('broadcasts optimistic transform during drag')
  it('broadcasts final transform on drop with timestamp')
  it('applies LWW reconciliation: latest timestamp wins')
  it('emits social.entity.transformed after reconciliation')
  it('handles simultaneous moves of the same entity')
  it('silent resolution: no toast, no modal')
})
```

#### Conflict Resolution Tests

```typescript
describe('ConflictStrategy', () => {
  it('routes doc type to yjs-crdt strategy')
  it('routes table type to revision-based strategy')
  it('routes custom type to revision-based strategy')
  it('routes note type to lww-silent strategy')
  it('routes folder type to lww-silent strategy')
  it('routes file type to lww-silent strategy')
})

describe('RevisionConflict', () => {
  it('succeeds when revision matches')
  it('returns 409 when server revision has advanced')
  it('re-fetches row on conflict')
  it('retries write with fresh data')
  it('shows toast "Row changed — refreshed" on conflict')
  it('falls back to LWW on clock skew')
})

describe('YjsSync', () => {
  it('creates Y.Doc per DataSource')
  it('broadcasts Yjs updates via channel')
  it('applies remote Yjs updates to local doc')
  it('handles offline edits natively')
  it('converges after concurrent edits')
  it('emits social.datasource.updated after sync')
  it('destroys all docs on teardown')
})
```

#### Edit Lock Tests

```typescript
describe('EditLockManager', () => {
  it('acquires lock and broadcasts via channel')
  it('releases lock on drop')
  it('releases lock on canvas leave')
  it('expires lock after 30s timeout')
  it('reports locked-by-other correctly')
  it('broadcasts lock release on timeout')
  it('handles concurrent lock attempts')
  it('lock is advisory — does not block writes')
})
```

#### Offline Tests

```typescript
describe('OfflineManager', () => {
  it('detects channel disconnection')
  it('hides all remote cursors on disconnect')
  it('queues local edits while offline')
  it('suppresses error for interruptions < 5s')
  it('replays queued entity transforms on reconnect')
  it('replays queued DataSource writes with revision check on reconnect')
  it('re-joins presence on reconnect')
  it('re-broadcasts cursor position on reconnect')
})
```

#### Permission Tests

```typescript
describe('PermissionEnforcement', () => {
  it('allows cursor broadcast for all roles including viewer')
  it('suppresses transform broadcast for viewer role')
  it('suppresses datasource write broadcast for viewer role')
  it('emits social.conflict.rejected for suppressed writes')
  it('allows all inbound events for viewer role')
})
```

### 13.3 Gate Tests (Required for L1 Completion)

These 4 mandatory integration tests must pass before Layer 1 is considered complete:

```typescript
describe('L1 Gate Tests', () => {
  it('Gate 1: Two-session cursor visibility', async () => {
    // Open two simulated sessions on the same canvasId
    // Confirm each session sees the other's cursor in socialStore
  })

  it('Gate 2: Simultaneous entity move convergence', async () => {
    // Two sessions move the same entity concurrently
    // After both drops, both clients converge to the same position
    // Confirm LWW resolved it without unhandled error
  })

  it('Gate 3: Doc co-edit via Yjs', async () => {
    // Two sessions type concurrently into the same Doc DataSource
    // Confirm no keystrokes are lost
    // Both sessions converge to the same document state
  })

  it('Gate 4: Table row revision conflict', async () => {
    // Two sessions read the same row
    // Session A writes first
    // Session B's write must receive a 409
    // Confirm toast is shown on session B
    // Row is refreshed to session A's value before retry
  })
})
```

### 13.4 Coverage Requirements

| Module | Minimum Coverage |
|---|---|
| `channel/channel.ts` | 85% |
| `presence/presence.ts` | 90% |
| `cursor/cursor.ts` | 90% |
| `entity-sync/entity-sync.ts` | 85% |
| `conflict/conflict.ts` | 90% |
| `yjs-sync/yjs-sync.ts` | 85% |
| `edit-lock/edit-lock.ts` | 85% |
| `offline/offline.ts` | 80% |
| `init.ts` | 80% |
| **Social overall** | **80%** |

---

## 14. Build Order & Task Dependencies

### Phase 1: Channel Foundation

```
L0 Complete ──→ S-CHANNEL ──→ S-PRESENCE
                            ──→ S-CURSOR
```

**Tasks:**
- `S-CHANNEL`: Supabase Realtime channel lifecycle (create, join, leave, broadcast, receive)
- `S-PRESENCE`: Join/leave, Guest handling, presence → bus events → socialStore
- `S-CURSOR`: 30fps throttled cursor broadcast, incoming cursor → bus events

### Phase 2: Entity Sync + LWW

```
S-CHANNEL ──→ S-ENTITY-SYNC ──→ S-LWW
```

**Tasks:**
- `S-ENTITY-SYNC`: Entity transform broadcast (optimistic drag + final drop)
- `S-LWW`: LWW reconciliation for entities and Note DataSources

### Phase 3: Advanced Conflict Resolution

```
S-CHANNEL ──→ S-YJS-SYNC
S-CHANNEL ──→ S-REVISION
S-LWW ──→ S-CONFLICT-ROUTER
```

**Tasks:**
- `S-YJS-SYNC`: Y.Doc creation, Yjs binary updates over Realtime, convergence
- `S-REVISION`: Revision-based write, 409 handling, re-fetch + retry, toast
- `S-CONFLICT-ROUTER`: Strategy router mapping DataSourceType → ConflictStrategy

### Phase 4: Edit Locks + Offline

```
S-CHANNEL ──→ S-EDIT-LOCK
S-CHANNEL ──→ S-OFFLINE
```

**Tasks:**
- `S-EDIT-LOCK`: Advisory locks, 30s timeout, broadcast, release on leave
- `S-OFFLINE`: Connection monitoring, cursor hiding, edit queue, reconnect replay

### Phase 5: Permissions + Init + Gate Tests

```
S-PRESENCE + S-CURSOR + S-ENTITY-SYNC + S-YJS-SYNC + S-REVISION + S-EDIT-LOCK + S-OFFLINE
  ──→ S-PERMISSIONS
  ──→ S-INIT
  ──→ S-GATE-TESTS
```

**Tasks:**
- `S-PERMISSIONS`: Outbound broadcast filtering by canvas role
- `S-INIT`: `initSocial()` / `teardownSocial()` orchestration
- `S-GATE-TESTS`: All 4 mandatory gate tests + full verification

---

## 15. Mock Factories

```typescript
// test/social-factories.ts
export function createMockChannel(canvasId?: string): MockCanvasChannel;
export function createMockPresenceUser(overrides?: Partial<PresenceUser>): PresenceUser;
export function createMockGuestUser(): PresenceUser;
export function createMockEntityTransform(overrides?: Partial<EntityTransform>): EntityTransform;
export function createMockYDoc(content?: string): Y.Doc;
export function createMockLockInfo(overrides?: Partial<LockInfo>): LockInfo;
export function createMockRealtimeChannel(): MockRealtimeChannel;
```

---

## Appendix A: Supabase Realtime API Reference

```typescript
// Channel creation
const channel = supabase.channel('canvas:abc123', {
  config: { presence: { key: userId } }
});

// Presence
channel.on('presence', { event: 'sync' }, () => { /* full state sync */ });
channel.on('presence', { event: 'join' }, ({ key, newPresences }) => { /* ... */ });
channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => { /* ... */ });
await channel.track({ userId, displayName, color });

// Broadcast
channel.on('broadcast', { event: 'cursor' }, ({ payload }) => { /* ... */ });
channel.send({ type: 'broadcast', event: 'cursor', payload: { ... } });

// Subscribe to activate
await channel.subscribe();
```

## Appendix B: Key Decisions

| Decision | Rationale |
|---|---|
| One channel per canvas | Simplifies management, reduces connections, Supabase pricing |
| 30fps cursor throttle | Balance between responsiveness and bandwidth |
| LWW for entities | Entities are spatial — merge is meaningless, latest position wins |
| Yjs for Docs only | Rich text needs CRDT; Yjs is battle-tested and handles offline |
| Revision-based for Tables | Row-level conflict detection is more granular than LWW |
| Advisory locks only | Hard locks create deadlocks; advisory is sufficient for collaboration |
| Bus events only (never direct store writes) | Maintains store isolation principle from L0 |
| 30s lock timeout | Long enough for normal editing, short enough to recover from disconnects |
| No blocking modals for conflicts | Non-intrusive collaboration — toast only |
