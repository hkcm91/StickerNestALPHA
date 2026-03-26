# Event Bus API Reference

> **Layer:** L0-kernel
> **Path:** `src/kernel/bus/`
> **Singleton:** `import { bus } from 'src/kernel/bus/bus'`
> **Role:** The only channel for cross-store and cross-layer communication in StickerNest V5

## Overview

The Event Bus is a typed pub/sub IPC system that routes all inter-layer communication in StickerNest V5. Stores never read each other's state directly — every cross-store coordination flows through the bus. Events use dot-namespaced type strings (e.g., `widget.mounted`, `social.cursor.moved`) and carry an optional `SpatialContext` for VR/3D interactions.

The bus maintains a ring buffer history (default 1,000 events) for replay and debugging, and exposes a `bench()` API to verify the **< 1ms emit-to-handler latency** performance contract.

---

## Core Types

### `BusEvent<T>`

The base event shape for all bus traffic.

```ts
{
  type: string;        // Dot-namespaced event type
  payload: T;          // Event-specific data (JSON-serializable)
  spatial?: SpatialContext;  // Only for VR/3D events — never default to zero
  timestamp?: number;  // Epoch ms, populated by the bus
}
```

**Schema:** Defined as `BusEventSchema` in `src/kernel/schemas/bus-event.ts` using Zod.

---

### `BusHandler<T>`

```ts
type BusHandler<T = unknown> = (event: BusEvent<T>) => void;
```

Handler function invoked when a matching event is emitted.

---

### `Unsubscribe`

```ts
type Unsubscribe = () => void;
```

Return value from `subscribe()` and `subscribeAll()`. Call it to remove the subscription.

---

### `SubscribeOptions`

```ts
interface SubscribeOptions {
  once?: boolean;     // Remove handler after first invocation (default: false)
  priority?: number;  // Higher = dispatched earlier (default: 0)
}
```

---

### `BenchResult`

```ts
interface BenchResult {
  avgLatencyUs: number;     // Average emit-to-handler latency in microseconds
  medianLatencyUs: number;  // Median latency in microseconds
  p99LatencyUs: number;     // 99th percentile latency in microseconds
  eventsPerSecond: number;  // Throughput
  sampleSize: number;       // Number of events in the benchmark run
}
```

---

## Bus Methods

### `bus.emit(type, payload, spatial?)`

Emits a typed event to all matching subscribers. Events are dispatched synchronously in priority order.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `string` | Yes | Dot-namespaced event type |
| `payload` | `T` | Yes | Event payload (any JSON-serializable value) |
| `spatial` | `SpatialContext` | No | Spatial context for VR/3D events. Leave `undefined` for non-spatial events. |

**Returns:** `void`

**Dispatch order:**
1. Exact-match subscribers (e.g., `social.cursor.moved`)
2. Wildcard subscribers (e.g., `social.*` matches all `social.` prefixed events)
3. Catch-all subscribers (registered via `subscribeAll()`)

Within each group, handlers are sorted by `priority` (higher first). Handler errors are caught and logged — they never propagate to the emitter or other handlers.

**Example:**

```ts
import { bus } from 'src/kernel/bus/bus';

bus.emit('canvas.entity.moved', { entityId: 'abc', x: 100, y: 200 });

// With spatial context (VR interaction)
bus.emit('spatial.controller.select', { entityId: 'abc' }, {
  position: { x: 1, y: 1.5, z: -2 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  normal: { x: 0, y: 1, z: 0 },
});
```

---

### `bus.subscribe(type, handler, options?)`

Subscribes to events matching an exact type or wildcard pattern.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `string` | Yes | Exact event type or wildcard pattern (e.g., `'social.*'`) |
| `handler` | `BusHandler<T>` | Yes | Callback invoked with the matching `BusEvent` |
| `options` | `SubscribeOptions` | No | Subscription options (once, priority) |

**Returns:** `Unsubscribe` — Call to remove this subscription.

**Wildcard matching:** A type ending in `.*` subscribes to all events whose type starts with the prefix. For example, `social.*` matches `social.cursor.moved`, `social.presence.joined`, etc.

**Example:**

```ts
// Exact match
const unsub = bus.subscribe('widget.mounted', (event) => {
  console.log('Widget mounted:', event.payload);
});

// Wildcard — all social events
bus.subscribe('social.*', (event) => {
  console.log('Social event:', event.type, event.payload);
});

// One-shot with priority
bus.subscribe('kernel.auth.stateChanged', handleAuth, {
  once: true,
  priority: 10,
});

// Unsubscribe when done
unsub();
```

---

### `bus.subscribeAll(handler, options?)`

Subscribes to every event regardless of type. Useful for debugging, logging, and the event inspector.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `handler` | `BusHandler` | Yes | Callback invoked for every emitted event |
| `options` | `SubscribeOptions` | No | Subscription options |

**Returns:** `Unsubscribe`

**Example:**

```ts
// Log all bus traffic (dev/debug only)
const unsub = bus.subscribeAll((event) => {
  console.log(`[bus] ${event.type}`, event.payload);
});
```

---

### `bus.unsubscribeAll()`

Removes all subscriptions — exact, wildcard, and catch-all. Primarily used in test teardown.

**Parameters:** None

**Returns:** `void`

---

### `bus.getHistory(count?)`

Returns recent events from the ring buffer.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `count` | `number` | No | Number of most recent events to return. Omit for all history. |

**Returns:** `ReadonlyArray<BusEvent>`

---

### `bus.getHistoryByType(type, count?)`

Returns recent events filtered by exact type match.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `string` | Yes | Exact event type to filter by |
| `count` | `number` | No | Number of most recent matching events. Omit for all matches. |

**Returns:** `ReadonlyArray<BusEvent>`

---

### `bus.bench(iterations?)`

Runs a throughput benchmark to verify the < 1ms latency contract.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `iterations` | `number` | No | Number of emit/handle cycles (default: 10,000) |

**Returns:** `BenchResult`

**Constraints:**
- Benchmark events (`__bench__` type) are automatically cleaned from the ring buffer history after the run.
- This is a diagnostic tool — do not call in production code paths.

**Example:**

```ts
const result = bus.bench(10000);
console.log(`Avg: ${result.avgLatencyUs.toFixed(2)}µs`);
console.log(`p99: ${result.p99LatencyUs.toFixed(2)}µs`);
console.log(`Throughput: ${result.eventsPerSecond} events/sec`);
// Contract: avgLatencyUs < 1000 (i.e., < 1ms)
```

---

### `bus.subscriptionCount` (readonly)

Returns the total number of active subscriptions across all types (exact + wildcard + catch-all).

**Type:** `number`

---

## Event Catalog

All event type constants are defined in `src/kernel/schemas/bus-event.ts` and exported as frozen objects. Each layer owns its own namespace.

### `KernelEvents` — Layer 0

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `AUTH_STATE_CHANGED` | `kernel.auth.stateChanged` | User auth state changed (login, logout, token refresh) |
| `AUTH_SESSION_EXPIRED` | `kernel.auth.sessionExpired` | Session expired and needs re-authentication |
| `DATASOURCE_CREATED` | `kernel.datasource.created` | A new DataSource was created |
| `DATASOURCE_UPDATED` | `kernel.datasource.updated` | A DataSource was modified |
| `DATASOURCE_DELETED` | `kernel.datasource.deleted` | A DataSource was deleted |
| `STORE_SYNC_REQUEST` | `kernel.store.syncRequest` | Internal store sync coordination |

### `SocialEvents` — Layer 1

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `PRESENCE_JOINED` | `social.presence.joined` | A user joined the canvas |
| `PRESENCE_LEFT` | `social.presence.left` | A user left the canvas |
| `CURSOR_MOVED` | `social.cursor.moved` | A remote cursor position updated |
| `ENTITY_TRANSFORMED` | `social.entity.transformed` | A remote entity transform was applied |
| `DATASOURCE_UPDATED` | `social.datasource.updated` | A remote DataSource change was applied |
| `CONFLICT_REJECTED` | `social.conflict.rejected` | A write was rejected (409 conflict) |

### `CanvasEvents` — Layer 4A

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `ENTITY_CREATED` | `canvas.entity.created` | Entity added to canvas |
| `ENTITY_UPDATED` | `canvas.entity.updated` | Entity properties changed |
| `ENTITY_DELETED` | `canvas.entity.deleted` | Entity removed from canvas |
| `ENTITY_MOVED` | `canvas.entity.moved` | Entity position changed (on drop) |
| `ENTITY_RESIZED` | `canvas.entity.resized` | Entity dimensions changed |
| `ENTITY_CONFIG_UPDATED` | `canvas.entity.config.updated` | Widget config changed via properties panel |
| `MODE_CHANGED` | `canvas.mode.changed` | Edit/preview mode toggled |
| `TOOL_CHANGED` | `canvas.tool.changed` | Active tool switched |
| `ENTITY_SELECTED` | `canvas.entity.selected` | Entity selected |
| `ENTITY_DESELECTED` | `canvas.entity.deselected` | Entity deselected |
| `SELECTION_CLEARED` | `canvas.selection.cleared` | All entities deselected |
| `PIPELINE_INVALID` | `canvas.pipeline.invalid` | Pipeline graph validation failed |
| `PIPELINE_EDGE_CREATED` | `canvas.pipeline.edge.created` | Pipeline edge connected |
| `PIPELINE_EDGE_DELETED` | `canvas.pipeline.edge.deleted` | Pipeline edge removed |
| `PIPELINE_NODE_ADDED` | `canvas.pipeline.node.added` | Pipeline node added |
| `PIPELINE_NODE_REMOVED` | `canvas.pipeline.node.removed` | Pipeline node removed |
| `ENTITY_GROUPED` | `canvas.entity.grouped` | Entities grouped together |
| `ENTITY_UNGROUPED` | `canvas.entity.ungrouped` | Group dissolved |
| `GROUP_CHILDREN_CHANGED` | `canvas.group.children.changed` | Group membership changed |
| `PATH_POINT_ADDED` | `canvas.path.point.added` | Pen path point added |
| `PATH_CLOSED` | `canvas.path.closed` | Pen path closed |
| `PATH_POINT_CONVERTED` | `canvas.path.point.converted` | Path point type converted |
| `ENTITY_PLATFORM_TRANSFORM_UPDATED` | `canvas.entity.platformTransform.updated` | Platform-specific transform updated |
| `TOOL_INPUT_DOWN` | `canvas.tool.input.down` | Pointer down forwarded to tools |
| `TOOL_INPUT_MOVE` | `canvas.tool.input.move` | Pointer move forwarded to tools |
| `TOOL_INPUT_UP` | `canvas.tool.input.up` | Pointer up forwarded to tools |
| `TOOL_INPUT_KEY` | `canvas.tool.input.key` | Key event forwarded to tools |
| `TOOL_COMMAND` | `canvas.tool.command` | Tool command issued |
| `PEN_PATH_PREVIEW` | `canvas.tool.penpath.preview` | Pen path preview state for overlay |
| `GHOST_ACTIVATED` | `canvas.ghost.activated` | Ghost widget placement started |
| `GHOST_DEACTIVATED` | `canvas.ghost.deactivated` | Ghost widget placement cancelled |
| `GHOST_POSITION_UPDATE` | `canvas.ghost.positionUpdate` | Ghost widget position updated |
| `GHOST_PLACED` | `canvas.ghost.placed` | Ghost widget placed on canvas |
| `PIPELINE_CROSS_CANVAS_EDGE_REQUESTED` | `canvas.pipeline.crossCanvasEdge.requested` | Cross-canvas pipeline edge requested |

### `WidgetEvents` — Layer 3

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `MOUNTED` | `widget.mounted` | Widget iframe loaded and initialized |
| `UNMOUNTED` | `widget.unmounted` | Widget iframe removed |
| `READY` | `widget.ready` | Widget signaled READY via SDK |
| `ERROR` | `widget.error` | Widget threw an unhandled error |
| `STATE_CHANGED` | `widget.state.changed` | Widget persisted state updated |

### `CrossCanvasEvents` — Layer 3

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `EVENT_EMITTED` | `crossCanvas.event.emitted` | Widget emitted a cross-canvas event |
| `EVENT_RECEIVED` | `crossCanvas.event.received` | Widget received a cross-canvas event |
| `CHANNEL_SUBSCRIBED` | `crossCanvas.channel.subscribed` | Widget subscribed to a cross-canvas channel |
| `CHANNEL_UNSUBSCRIBED` | `crossCanvas.channel.unsubscribed` | Widget unsubscribed from a channel |
| `ERROR` | `crossCanvas.error` | Cross-canvas operation error |

### `ShellEvents` — Layer 6

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `THEME_CHANGED` | `shell.theme.changed` | App theme switched (dark/light/custom) |
| `ROUTE_CHANGED` | `shell.route.changed` | Route navigation occurred |

### `SpatialEvents` — Layer 4B

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `SESSION_STARTED` | `spatial.session.started` | VR/XR session started |
| `SESSION_ENDED` | `spatial.session.ended` | VR/XR session ended |
| `SESSION_MODE_CHANGED` | `spatial.session.mode.changed` | Spatial session mode changed |
| `SESSION_VISIBILITY_CHANGED` | `spatial.session.visibility.changed` | Spatial session visibility changed |
| `CONTROLLER_SELECT` | `spatial.controller.select` | Controller trigger pressed on entity |
| `CONTROLLER_GRAB` | `spatial.controller.grab` | Controller grip pressed on entity |
| `CONTROLLER_RELEASE` | `spatial.controller.release` | Controller grip released |
| `HAND_TRACKING_STARTED` | `spatial.hand.tracking.started` | Hand tracking activated |
| `HAND_TRACKING_ENDED` | `spatial.hand.tracking.ended` | Hand tracking deactivated |
| `HAND_PINCH` | `spatial.hand.pinch` | Hand pinch gesture detected |
| `HAND_GRAB` | `spatial.hand.grab` | Hand grab gesture detected |
| `HAND_RELEASE` | `spatial.hand.release` | Hand release gesture detected |
| `PLANE_DETECTED` | `spatial.plane.detected` | MR plane detected |
| `PLANE_UPDATED` | `spatial.plane.updated` | MR plane updated |
| `PLANE_REMOVED` | `spatial.plane.removed` | MR plane removed |
| `MESH_DETECTED` | `spatial.mesh.detected` | MR mesh detected |
| `MESH_UPDATED` | `spatial.mesh.updated` | MR mesh updated |
| `MESH_REMOVED` | `spatial.mesh.removed` | MR mesh removed |
| `ANCHOR_CREATED` | `spatial.anchor.created` | Spatial anchor created |
| `ANCHOR_DELETED` | `spatial.anchor.deleted` | Spatial anchor deleted |
| `HIT_TEST_RESULT` | `spatial.hitTest.result` | Spatial hit test result |
| `ENTITY_PLACED` | `spatial.entity.placed` | Entity placed in 3D space |
| `ENTITY_TRANSFORMED` | `spatial.entity.transformed` | Spatial entity transform applied |
| `ENTITY_REMOVED` | `spatial.entity.removed` | Entity removed from 3D space |
| `TELEPORT_REQUESTED` | `spatial.teleport.requested` | Teleport locomotion requested |

### `MarketplaceEvents` — Layer 5

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `WIDGET_INSTALLED` | `marketplace.widget.installed` | Widget installed from marketplace |
| `WIDGET_UNINSTALLED` | `marketplace.widget.uninstalled` | Widget uninstalled |
| `WIDGET_UPDATED` | `marketplace.widget.updated` | Installed widget updated |
| `WIDGET_PUBLISHED` | `marketplace.widget.published` | Widget published to marketplace |
| `WIDGET_DEPRECATED` | `marketplace.widget.deprecated` | Widget deprecated |
| `PUBLISH_REQUEST` | `marketplace.publish.request` | Publish pipeline request |
| `PUBLISH_RESPONSE` | `marketplace.publish.response` | Publish pipeline response |

### `GridEvents` — Layer 4A-1

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `CELL_PAINTED` | `canvas.grid.cell.painted` | Single grid cell painted |
| `CELL_CLEARED` | `canvas.grid.cell.cleared` | Single grid cell cleared |
| `CELLS_BATCH_PAINTED` | `canvas.grid.cells.batchPainted` | Batch of cells painted (stroke) |
| `CONFIG_CHANGED` | `canvas.grid.config.changed` | Grid configuration changed |
| `TOGGLED` | `canvas.grid.toggled` | Grid toggled on/off |
| `CLEARED` | `canvas.grid.cleared` | All grid cells cleared |

### `CanvasDocumentEvents` — Layer 4A-1

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `LOADED` | `canvas.document.loaded` | Canvas document loaded |
| `SAVED` | `canvas.document.saved` | Canvas document saved |
| `META_UPDATED` | `canvas.document.meta.updated` | Canvas metadata updated |
| `VIEWPORT_CHANGED` | `canvas.document.viewport.changed` | Viewport configuration changed |
| `BACKGROUND_CHANGED` | `canvas.document.background.changed` | Canvas background changed |
| `LAYOUT_MODE_CHANGED` | `canvas.document.layoutMode.changed` | Layout mode changed |
| `MIGRATED` | `canvas.document.migrated` | Document version migrated |
| `BORDER_RADIUS_CHANGED` | `canvas.document.borderRadius.changed` | Canvas border radius changed |
| `CANVAS_POSITION_CHANGED` | `canvas.document.position.changed` | Canvas position changed |
| `PLATFORM_CHANGED` | `canvas.document.platform.changed` | Canvas platform changed |
| `SAVE_REQUESTED` | `canvas.document.save.requested` | Immediate save requested |

### `GalleryEvents` — Layer 0

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `ASSET_UPLOADED` | `kernel.gallery.asset.uploaded` | Asset uploaded to gallery |
| `ASSET_DELETED` | `kernel.gallery.asset.deleted` | Asset deleted from gallery |
| `GALLERY_LOADED` | `kernel.gallery.loaded` | Gallery loaded/refreshed |

### `InteractionModeEvents`

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `MODE_CHANGED` | `canvas.interaction.mode.changed` | Edit/play interaction mode changed |
| `CHROME_MODE_CHANGED` | `canvas.interaction.chrome.changed` | Chrome mode changed (editor/clean) |

### `InputEvents`

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `POINTER_DOWN` | `canvas.input.pointer.down` | Normalized pointer down |
| `POINTER_MOVE` | `canvas.input.pointer.move` | Normalized pointer move |
| `POINTER_UP` | `canvas.input.pointer.up` | Normalized pointer up |
| `POINTER_CANCEL` | `canvas.input.pointer.cancel` | Pointer cancelled |
| `GESTURE_PINCH` | `canvas.input.gesture.pinch` | Pinch gesture (touch) |
| `GESTURE_PAN` | `canvas.input.gesture.pan` | Pan gesture (touch) |
| `GESTURE_DOUBLE_TAP` | `canvas.input.gesture.doubleTap` | Double-tap gesture |
| `GESTURE_LONG_PRESS` | `canvas.input.gesture.longPress` | Long-press gesture |

### `LayoutModeEvents`

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `MOVE_CONSTRAINED` | `canvas.layout.move.constrained` | Layout constraints applied during move |
| `RESIZE_CONSTRAINED` | `canvas.layout.resize.constrained` | Layout constraints applied during resize |
| `SNAP_POINTS_UPDATED` | `canvas.layout.snapPoints.updated` | Snap points recalculated |

### `BackgroundEvents`

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `RENDERED` | `canvas.background.rendered` | Background rendered |
| `INVALIDATED` | `canvas.background.invalidated` | Background invalidated |

### `DataManagerEvents` — Layer 0

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `COLUMN_ADDED` | `kernel.datamanager.column.added` | Table column added |
| `COLUMN_UPDATED` | `kernel.datamanager.column.updated` | Table column updated |
| `COLUMN_REMOVED` | `kernel.datamanager.column.removed` | Table column removed |
| `COLUMN_REORDERED` | `kernel.datamanager.column.reordered` | Table columns reordered |
| `ROW_ADDED` | `kernel.datamanager.row.added` | Table row added |
| `ROW_UPDATED` | `kernel.datamanager.row.updated` | Table row updated |
| `ROW_DELETED` | `kernel.datamanager.row.deleted` | Table row deleted |
| `ROWS_BATCH_ADDED` | `kernel.datamanager.rows.batchAdded` | Batch of rows added |
| `VIEW_CREATED` | `kernel.datamanager.view.created` | Table view created |
| `VIEW_UPDATED` | `kernel.datamanager.view.updated` | Table view updated |
| `VIEW_DELETED` | `kernel.datamanager.view.deleted` | Table view deleted |
| `AI_OPERATION_STARTED` | `kernel.datamanager.ai.started` | AI operation started |
| `AI_OPERATION_COMPLETED` | `kernel.datamanager.ai.completed` | AI operation completed |
| `AI_OPERATION_FAILED` | `kernel.datamanager.ai.failed` | AI operation failed |
| `NOTION_SYNC_STARTED` | `kernel.datamanager.notion.syncStarted` | Notion sync started |
| `NOTION_SYNC_COMPLETED` | `kernel.datamanager.notion.syncCompleted` | Notion sync completed |
| `NOTION_SYNC_FAILED` | `kernel.datamanager.notion.syncFailed` | Notion sync failed |
| `TEMPLATE_APPLIED` | `kernel.datamanager.template.applied` | Data template applied |

### `SocialGraphEvents` — Layer 0

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `PROFILE_CREATED` | `kernel.socialgraph.profile.created` | User profile created |
| `PROFILE_UPDATED` | `kernel.socialgraph.profile.updated` | User profile updated |
| `FOLLOW_CREATED` | `kernel.socialgraph.follow.created` | Follow relationship created |
| `FOLLOW_DELETED` | `kernel.socialgraph.follow.deleted` | Follow relationship deleted |
| `FOLLOW_ACCEPTED` | `kernel.socialgraph.follow.accepted` | Follow request accepted |
| `FOLLOW_REJECTED` | `kernel.socialgraph.follow.rejected` | Follow request rejected |
| `MUTUAL_FOLLOW_CREATED` | `kernel.socialgraph.mutualFollow.created` | Mutual follow established |
| `POST_CREATED` | `kernel.socialgraph.post.created` | Post created |
| `POST_UPDATED` | `kernel.socialgraph.post.updated` | Post updated |
| `POST_DELETED` | `kernel.socialgraph.post.deleted` | Post deleted |
| `REACTION_ADDED` | `kernel.socialgraph.reaction.added` | Reaction added |
| `REACTION_REMOVED` | `kernel.socialgraph.reaction.removed` | Reaction removed |
| `COMMENT_CREATED` | `kernel.socialgraph.comment.created` | Comment created |
| `COMMENT_UPDATED` | `kernel.socialgraph.comment.updated` | Comment updated |
| `COMMENT_DELETED` | `kernel.socialgraph.comment.deleted` | Comment deleted |
| `NOTIFICATION_CREATED` | `kernel.socialgraph.notification.created` | Notification created |
| `NOTIFICATION_READ` | `kernel.socialgraph.notification.read` | Notification marked read |
| `NOTIFICATIONS_ALL_READ` | `kernel.socialgraph.notifications.allRead` | All notifications marked read |
| `USER_BLOCKED` | `kernel.socialgraph.user.blocked` | User blocked |
| `USER_UNBLOCKED` | `kernel.socialgraph.user.unblocked` | User unblocked |
| `MESSAGE_SENT` | `kernel.socialgraph.message.sent` | Direct message sent |
| `MESSAGES_READ` | `kernel.socialgraph.messages.read` | Messages marked as read |
| `WIDGET_INVITE_SENT` | `kernel.socialgraph.widgetInvite.sent` | Widget invite sent |
| `WIDGET_INVITE_ACCEPTED` | `kernel.socialgraph.widgetInvite.accepted` | Widget invite accepted |
| `WIDGET_INVITE_DECLINED` | `kernel.socialgraph.widgetInvite.declined` | Widget invite declined |
| `WIDGET_BROADCAST_SENT` | `kernel.socialgraph.widgetBroadcast.sent` | Widget broadcast sent |
| `CANVAS_MEMBER_ADDED` | `kernel.socialgraph.canvasMember.added` | Canvas member added |
| `CANVAS_MEMBER_REMOVED` | `kernel.socialgraph.canvasMember.removed` | Canvas member removed |
| `CANVAS_MEMBER_ROLE_CHANGED` | `kernel.socialgraph.canvasMember.roleChanged` | Canvas member role changed |

### `DockerEvents` — Layer 6

| Constant | Event Type | Description |
|----------|-----------|-------------|
| `CREATED` | `docker.created` | Docker panel created |
| `DELETED` | `docker.deleted` | Docker panel deleted |
| `UPDATED` | `docker.updated` | Docker panel updated |
| `DOCK_MODE_CHANGED` | `docker.dock_mode.changed` | Dock mode changed (floating/docked) |
| `VISIBILITY_CHANGED` | `docker.visibility.changed` | Docker visibility toggled |
| `TAB_ADDED` | `docker.tab.added` | Tab added to docker |
| `TAB_REMOVED` | `docker.tab.removed` | Tab removed from docker |
| `TAB_ACTIVATED` | `docker.tab.activated` | Active tab changed |
| `WIDGET_ADDED` | `docker.widget.added` | Widget added to docker tab |
| `WIDGET_REMOVED` | `docker.widget.removed` | Widget removed from docker tab |
| `WIDGET_RESIZED` | `docker.widget.resized` | Widget resized within docker |
| `CONFIG_LOADED` | `docker.config.loaded` | Docker config loaded from backend |
| `CONFIG_SAVED` | `docker.config.saved` | Docker config saved to backend |

---

## Namespace Ownership

Each layer exclusively owns its event namespace. Do not emit events into another layer's namespace.

| Namespace Prefix | Owner Layer |
|-----------------|-------------|
| `kernel.*` | L0 — Kernel |
| `social.*` | L1 — Social |
| `widget.*` | L3 — Runtime |
| `crossCanvas.*` | L3 — Runtime |
| `canvas.*` | L4A — Canvas |
| `spatial.*` | L4B — Spatial/VR |
| `marketplace.*` | L5 — Marketplace |
| `shell.*` | L6 — Shell |
| `docker.*` | L6 — Shell (Docker subsystem) |

---

## Architecture Rules

1. **Bus is the only cross-store channel.** Stores never import from or subscribe to each other's state directly. All coordination flows through bus events.

2. **Spatial is always optional.** The `spatial` field on `BusEvent` must never be required or defaulted to a zero vector. Only populate it for events originating from VR/3D interactions.

3. **Handler errors are isolated.** If a handler throws, the error is caught, logged, and does not propagate. Other handlers and the emitter are unaffected.

4. **Performance contract: < 1ms latency.** The `bench()` API verifies this. Emit-to-handler latency must stay below 1ms for the bus to function as synchronous IPC.

5. **Each store exports `setup*BusSubscriptions()`.** All subscription setup functions are called from `initAllStores()` in `src/kernel/stores/index.ts` during app bootstrap.
