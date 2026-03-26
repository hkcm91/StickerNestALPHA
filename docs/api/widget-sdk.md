# Widget SDK API Reference

> **Layer:** L3-runtime
> **Path:** `src/runtime/sdk/`
> **Available as:** `window.StickerNest` inside every widget iframe
> **Injected by:** WidgetFrame via srcdoc blob — widget authors never load it manually

## Overview

The Widget SDK is the only API surface available to widgets running inside StickerNest's sandboxed iframes. It provides event communication, state persistence, theming, integrations, cross-canvas messaging, and DataSource access — all proxied through the host via the Bridge Protocol. Integration credentials and direct bucket URLs are never exposed to the iframe.

## Lifecycle

### `StickerNest.register(manifest)`

Declares the widget's event contract and configuration schema. Must be called **before** `ready()`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `manifest` | `object` | Yes | Widget manifest object matching the `WidgetManifest` schema. Declares event types, permissions, config schema, and metadata. |

**Returns:** `void`

**Constraints:**
- Must be called before `ready()`. Calling after `ready()` throws an error: `"StickerNest.register() must be called before StickerNest.ready()"`
- Sends a `REGISTER` message to the host via the bridge

**Example:**

```ts
StickerNest.register({
  name: 'My Widget',
  version: '1.0.0',
  events: {
    emits: ['counter.incremented'],
    subscribes: ['counter.reset']
  },
  permissions: ['storage', 'cross-canvas'],
  config: {
    startValue: { type: 'number', default: 0 }
  }
});
```

---

### `StickerNest.ready()`

Signals that widget initialization is complete. The host does not consider a widget active until it receives this signal.

**Parameters:** None

**Returns:** `void`

**Constraints:**
- Must be called within **500ms** of iframe load. Widgets that miss this deadline may be marked as failed.
- Idempotent — calling multiple times has no additional effect.
- Must be called **after** `register()`.

**Example:**

```ts
StickerNest.register(manifest);
// ... setup event handlers, initialize state ...
StickerNest.ready();
```

---

## Identity

### `StickerNest.getInstanceId()`

Returns the stable instance ID for this specific widget placement on a canvas.

**Parameters:** None

**Returns:** `string` — The unique instance ID (format: `{widgetId}:{instanceId}`)

---

### `StickerNest.getWidgetId()`

Returns the widget type ID.

**Parameters:** None

**Returns:** `string` — The widget ID from the registry

---

## Events

### `StickerNest.emit(type, payload)`

Emits a typed event to the host event bus via the bridge protocol.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `string` | Yes | Dot-namespaced event type (e.g., `'counter.incremented'`) |
| `payload` | `unknown` | Yes | Event payload. Must be JSON-serializable. |

**Returns:** `void`

**Constraints:**
- Rate-limited to **100 events/second** per widget instance. Excess events are silently dropped.
- Payload is validated by the host bridge before forwarding to the bus.

**Example:**

```ts
StickerNest.emit('counter.incremented', { value: 42 });
```

---

### `StickerNest.subscribe(type, handler)`

Subscribes to events from the host bus matching the given type.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `string` | Yes | Event type to listen for |
| `handler` | `(payload: unknown) => void` | Yes | Callback invoked with the event payload |

**Returns:** `void`

**Constraints:**
- On the first subscription to a given event type, the SDK notifies the host via a `SUBSCRIBE` message so the host knows to forward matching events.

**Example:**

```ts
StickerNest.subscribe('counter.reset', (payload) => {
  console.log('Counter reset to', payload.value);
});
```

---

### `StickerNest.unsubscribe(type, handler)`

Removes a previously registered event handler.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `string` | Yes | Event type to unsubscribe from |
| `handler` | `(payload: unknown) => void` | Yes | The exact handler function reference passed to `subscribe()` |

**Returns:** `void`

**Constraints:**
- When the last handler for a given event type is removed, the SDK sends an `UNSUBSCRIBE` message to the host.

---

## State Persistence

### `StickerNest.setState(key, value)`

Saves per-instance state that persists across widget close and reopen.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | Yes | State key |
| `value` | `unknown` | Yes | Value to store. Must be JSON-serializable. |

**Returns:** `void`

**Constraints:**
- Hard limit: **1MB per instance**. Writes exceeding this limit are rejected with a `STATE_REJECTED` message.
- Storage key format: `{widgetId}:{instanceId}` in the `widget_instances` table.
- State is cleared on: widget uninstall (with user confirmation), canvas delete, or user account delete.

**Example:**

```ts
StickerNest.setState('counter', { value: 42, lastUpdated: Date.now() });
```

---

### `StickerNest.getState(key)`

Retrieves per-instance state from the host.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | Yes | State key to retrieve |

**Returns:** `Promise<unknown>` — Resolves with the stored value, or `undefined` if not set.

**Constraints:**
- Async operation — the SDK sends a `GET_STATE` message and waits for a `STATE_RESPONSE`.
- Request timeout: **10 seconds**.

**Example:**

```ts
const counter = await StickerNest.getState('counter');
if (counter) {
  render(counter.value);
}
```

---

### `StickerNest.setUserState(key, value)`

Saves cross-canvas user state that persists across all canvases for the current user.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | Yes | State key |
| `value` | `unknown` | Yes | Value to store. Must be JSON-serializable. |

**Returns:** `void`

**Constraints:**
- Hard limit: **10MB total per user** across all widgets.
- Stored in the `user_widget_state` table.

---

### `StickerNest.getUserState(key)`

Retrieves cross-canvas user state.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | Yes | State key to retrieve |

**Returns:** `Promise<unknown>` — Resolves with the stored value, or `undefined` if not set.

---

## Configuration

### `StickerNest.getConfig()`

Returns the user-configured values for this widget instance, as defined by the widget's config schema in its manifest.

**Parameters:** None

**Returns:** `Record<string, unknown>` — A shallow copy of the current configuration object.

**Constraints:**
- Config is injected by the host on `INIT` and updated via `CONFIG_UPDATE` messages.
- Returns an empty object `{}` if no config has been set.

**Example:**

```ts
const config = StickerNest.getConfig();
const startValue = config.startValue ?? 0;
```

---

## Theming

### `StickerNest.onThemeChange(handler)`

Registers a handler that receives theme token updates on load and whenever the user switches themes.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `handler` | `(tokens: Record<string, string>) => void` | Yes | Callback invoked with the theme token map |

**Returns:** `void`

**Standard theme tokens:**

| Token | Description |
|-------|-------------|
| `--sn-bg` | Background color |
| `--sn-surface` | Surface/card color |
| `--sn-accent` | Accent/primary color |
| `--sn-text` | Primary text color |
| `--sn-text-muted` | Secondary/muted text color |
| `--sn-border` | Border color |
| `--sn-radius` | Border radius |
| `--sn-font-family` | Font family |

**Example:**

```ts
StickerNest.onThemeChange((tokens) => {
  document.body.style.backgroundColor = tokens['--sn-bg'];
  document.body.style.color = tokens['--sn-text'];
});
```

---

## Resize

### `StickerNest.onResize(handler)`

Registers a handler that receives viewport dimension updates when the widget container is resized.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `handler` | `(width: number, height: number) => void` | Yes | Callback invoked with new dimensions in pixels |

**Returns:** `void`

**Constraints:**
- Widgets receive resize events; they do not control their own container dimensions.

**Example:**

```ts
StickerNest.onResize((width, height) => {
  canvas.width = width;
  canvas.height = height;
  redraw();
});
```

---

## Integrations

### `StickerNest.integration(name).query(params)`

Performs a proxied read operation against an external service. The host makes the actual HTTP request — credentials never enter the iframe.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Integration name (e.g., `'notion'`, `'github'`) |
| `params` | `unknown` | Yes | Query parameters specific to the integration |

**Returns:** `Promise<unknown>` — Resolves with the query result from the host.

**Constraints:**
- Request timeout: **10 seconds**.
- Widget must have the `integrations` permission declared in its manifest.

---

### `StickerNest.integration(name).mutate(params)`

Performs a proxied write operation against an external service.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Integration name |
| `params` | `unknown` | Yes | Mutation parameters specific to the integration |

**Returns:** `Promise<unknown>` — Resolves with the mutation result.

---

## Cross-Canvas Communication

### `StickerNest.emitCrossCanvas(channel, payload)`

Emits an event to other widget instances subscribed to the same channel, potentially across different canvases.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `channel` | `string` | Yes | Channel name. Must match `^[a-zA-Z0-9._-]{1,128}$`. |
| `payload` | `unknown` | Yes | Event payload. Must be JSON-serializable. |

**Returns:** `void`

**Constraints:**
- Widget manifest must declare `'cross-canvas'` in the `permissions` array. Messages from widgets without this permission are silently dropped.
- Channel names must match `^[a-zA-Z0-9._-]{1,128}$` — no colons, slashes, or spaces.
- Payload size limit: **64KB** (matching Supabase Realtime limits). Oversized payloads are dropped.
- Rate limit: Shares the **100 events/second** per-instance limit with regular `emit()`.
- Offline queuing: Up to 100 messages queued when disconnected; oldest dropped on overflow.

**Example:**

```ts
StickerNest.emitCrossCanvas('game.lobby', {
  action: 'player-joined',
  playerId: 'user-123'
});
```

---

### `StickerNest.subscribeCrossCanvas(channel, handler)`

Subscribes to cross-canvas events on a named channel.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `channel` | `string` | Yes | Channel name |
| `handler` | `(payload: unknown) => void` | Yes | Callback invoked with the event payload |

**Returns:** `void`

**Example:**

```ts
StickerNest.subscribeCrossCanvas('game.lobby', (payload) => {
  if (payload.action === 'player-joined') {
    addPlayer(payload.playerId);
  }
});
```

---

### `StickerNest.unsubscribeCrossCanvas(channel)`

Unsubscribes from all handlers on a cross-canvas channel.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `channel` | `string` | Yes | Channel to unsubscribe from |

**Returns:** `void`

---

## DataSource API

The DataSource API provides widgets with persistent data access through the host proxy. All operations are async and go through the bridge protocol.

### `StickerNest.datasource.create(dsType, scope, options?)`

Creates a new DataSource.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dsType` | `string` | Yes | DataSource type: `'doc'`, `'table'`, `'note'`, `'folder'`, `'file'`, or `'custom'` |
| `scope` | `string` | Yes | Visibility scope: `'canvas'`, `'user'`, `'shared'`, or `'public'` |
| `options.schema` | `Record<string, unknown>` | No | JSON schema for the DataSource |
| `options.metadata` | `Record<string, unknown>` | No | Arbitrary metadata |

**Returns:** `Promise<unknown>` — The created DataSource record.

---

### `StickerNest.datasource.read(dataSourceId)`

Reads a DataSource by ID.

**Returns:** `Promise<unknown>` — The DataSource record.

---

### `StickerNest.datasource.update(dataSourceId, updates, lastSeenRevision?)`

Updates a DataSource. Includes optional optimistic concurrency via `lastSeenRevision`.

**Returns:** `Promise<unknown>` — The updated DataSource record.

---

### `StickerNest.datasource.delete(dataSourceId)`

Deletes a DataSource.

**Returns:** `Promise<void>`

---

### `StickerNest.datasource.list(options?)`

Lists DataSources, optionally filtered by scope and type.

**Returns:** `Promise<unknown[]>` — Array of matching DataSource records.

---

### `StickerNest.datasource.table.getRows(dataSourceId, options?)`

Retrieves rows from a table-type DataSource.

**Returns:** `Promise<unknown[]>` — Array of row objects.

---

### `StickerNest.datasource.table.addRow(dataSourceId, row)`

Adds a row to a table-type DataSource.

**Returns:** `Promise<unknown>` — The created row.

---

### `StickerNest.datasource.table.updateRow(dataSourceId, rowId, updates, lastSeenRevision?)`

Updates a specific row. Supports revision-based conflict detection.

**Returns:** `Promise<unknown>` — The updated row.

---

### `StickerNest.datasource.table.deleteRow(dataSourceId, rowId)`

Deletes a specific row.

**Returns:** `Promise<void>`

---

## Security Model

- **srcdoc only** — Widget HTML is loaded via `srcdoc` blob, never via a remote `src` URL.
- **Strict CSP** — Content Security Policy is enforced on every iframe and is never relaxed.
- **No credentials in iframe** — Integration credentials are held by the host. All external calls are proxied.
- **No direct media URLs** — Media assets are proxied through the SDK media API.
- **Origin validation** — Every `postMessage` handler on the host validates the message origin. Unvalidated messages are silently dropped.
- **Error isolation** — A widget crash is caught by the error boundary and affects only that widget instance. The event bus continues operating normally.

---

## Quick Start Example

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--sn-font-family, sans-serif); background: var(--sn-bg); color: var(--sn-text); }
    button { background: var(--sn-accent); color: white; border: none; padding: 8px 16px; border-radius: var(--sn-radius); cursor: pointer; }
  </style>
</head>
<body>
  <h2>Counter</h2>
  <p id="count">0</p>
  <button onclick="increment()">+1</button>

  <script>
    let count = 0;

    // 1. Register the widget manifest
    StickerNest.register({
      name: 'Counter',
      version: '1.0.0',
      events: {
        emits: ['counter.changed'],
        subscribes: ['counter.reset']
      }
    });

    // 2. Set up event handlers
    StickerNest.subscribe('counter.reset', function(payload) {
      count = payload.value || 0;
      render();
    });

    // 3. Apply theme
    StickerNest.onThemeChange(function(tokens) {
      Object.entries(tokens).forEach(function(entry) {
        document.documentElement.style.setProperty(entry[0], entry[1]);
      });
    });

    // 4. Restore persisted state
    StickerNest.getState('count').then(function(saved) {
      if (saved !== undefined) {
        count = saved;
        render();
      }
    });

    // 5. Signal ready
    StickerNest.ready();

    function increment() {
      count++;
      render();
      StickerNest.setState('count', count);
      StickerNest.emit('counter.changed', { value: count });
    }

    function render() {
      document.getElementById('count').textContent = count;
    }
  </script>
</body>
</html>
```
