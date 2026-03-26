# Bridge Protocol API Reference

> **Layer:** L3-runtime
> **Path:** `src/runtime/bridge/`
> **Role:** Typed postMessage protocol between the host application and widget iframes

## Overview

The Bridge Protocol defines all communication between the StickerNest host and widget iframes. Every message in both directions is typed and validated with Zod schemas before processing. Origin validation is mandatory on every incoming `message` event — unvalidated messages are silently dropped.

Widgets never communicate with the platform directly. All SDK method calls translate into bridge messages that the host processes and responds to.

---

## Security Rules

1. **Origin validation** is mandatory on every `message` handler — no exceptions.
2. **Widget HTML is loaded via `srcdoc` blob** — never via a remote `src` URL.
3. **Integration credentials never enter the iframe** — the host proxies all external calls.
4. **Media assets never use direct bucket URLs** — always proxied via the SDK.
5. **Strict CSP on every iframe** — never relaxed.

---

## ThemeTokens

Theme tokens injected into widgets on load and on theme change.

```ts
interface ThemeTokens {
  '--sn-bg': string;
  '--sn-surface': string;
  '--sn-accent': string;
  '--sn-text': string;
  '--sn-text-muted': string;
  '--sn-border': string;
  '--sn-radius': string;
  '--sn-font-family': string;
}
```

---

## Host → Widget Messages

Messages sent FROM the host application TO the widget iframe.

### `INIT`

Sent on iframe load to initialize the widget.

```ts
{ type: 'INIT'; widgetId: string; instanceId: string; config: Record<string, unknown>; theme: ThemeTokens }
```

| Field | Type | Description |
|-------|------|-------------|
| `widgetId` | `string` | The widget's registry ID |
| `instanceId` | `string` | Unique instance ID for this placement |
| `config` | `Record<string, unknown>` | User-configured values for this instance |
| `theme` | `ThemeTokens` | Current theme token map |

### `EVENT`

Forwards a bus event to the widget (for events the widget subscribed to).

```ts
{ type: 'EVENT'; event: { type: string; payload: unknown } }
```

### `CONFIG_UPDATE`

Sent when the user changes widget config via the properties panel.

```ts
{ type: 'CONFIG_UPDATE'; config: Record<string, unknown> }
```

### `THEME_UPDATE`

Sent when the app theme changes (dark/light/custom).

```ts
{ type: 'THEME_UPDATE'; theme: ThemeTokens }
```

### `RESIZE`

Sent when the widget container dimensions change.

```ts
{ type: 'RESIZE'; width: number; height: number }
```

### `STATE_RESPONSE`

Response to a widget's `GET_STATE` or `GET_USER_STATE` request.

```ts
{ type: 'STATE_RESPONSE'; key: string; value: unknown }
```

### `STATE_REJECTED`

Sent when a state write fails (e.g., exceeds size limit).

```ts
{ type: 'STATE_REJECTED'; key: string; reason: string }
```

### `INTEGRATION_RESPONSE`

Response to a widget's `INTEGRATION_QUERY` or `INTEGRATION_MUTATE` request.

```ts
{ type: 'INTEGRATION_RESPONSE'; requestId: string; result: unknown; error?: string }
```

### `CROSS_CANVAS_EVENT`

Forwards a cross-canvas event from another canvas to the widget.

```ts
{ type: 'CROSS_CANVAS_EVENT'; channel: string; payload: unknown }
```

### `DS_RESPONSE`

Response to any DataSource operation (`DS_CREATE`, `DS_READ`, etc.).

```ts
{ type: 'DS_RESPONSE'; requestId: string; result: unknown; error?: string }
```

### `DESTROY`

Sent before the widget iframe is unmounted.

```ts
{ type: 'DESTROY' }
```

---

## Widget → Host Messages

Messages sent FROM the widget iframe TO the host application.

### `READY`

Signals that the widget has finished initialization. Must be called within 500ms of load.

```ts
{ type: 'READY' }
```

**Constraint:** `register()` must be called before `ready()`. Calling `ready()` first is an error.

### `REGISTER`

Declares the widget's event contract and manifest.

```ts
{ type: 'REGISTER'; manifest: unknown }
```

### `EMIT`

Emits an event onto the host event bus.

```ts
{ type: 'EMIT'; eventType: string; payload: unknown }
```

**Rate limit:** 100 events/second per widget instance. Excess messages are silently dropped.

### `SUBSCRIBE`

Subscribes to a bus event type. The host will forward matching events via `EVENT` messages.

```ts
{ type: 'SUBSCRIBE'; eventType: string }
```

### `UNSUBSCRIBE`

Unsubscribes from a previously subscribed event type.

```ts
{ type: 'UNSUBSCRIBE'; eventType: string }
```

### `SET_STATE`

Persists instance-scoped state. Hard limit: 1MB per widget instance.

```ts
{ type: 'SET_STATE'; key: string; value: unknown }
```

### `GET_STATE`

Requests instance-scoped state. Host responds with `STATE_RESPONSE`.

```ts
{ type: 'GET_STATE'; key: string }
```

### `SET_USER_STATE`

Persists user-scoped state (cross-canvas). Hard limit: 10MB total per user.

```ts
{ type: 'SET_USER_STATE'; key: string; value: unknown }
```

### `GET_USER_STATE`

Requests user-scoped state. Host responds with `STATE_RESPONSE`.

```ts
{ type: 'GET_USER_STATE'; key: string }
```

### `RESIZE_REQUEST`

Requests a container resize (widget cannot resize itself directly).

```ts
{ type: 'RESIZE_REQUEST'; width: number; height: number }
```

### `LOG`

Sends a log message to the host console (for debugging).

```ts
{ type: 'LOG'; level: 'info' | 'warn' | 'error'; message: string }
```

### `INTEGRATION_QUERY`

Proxied read from an external service. Host makes the HTTP request and responds with `INTEGRATION_RESPONSE`.

```ts
{ type: 'INTEGRATION_QUERY'; requestId: string; name: string; params: unknown }
```

### `INTEGRATION_MUTATE`

Proxied write to an external service.

```ts
{ type: 'INTEGRATION_MUTATE'; requestId: string; name: string; params: unknown }
```

### `CROSS_CANVAS_EMIT`

Emits an event to other canvases via the cross-canvas channel.

```ts
{ type: 'CROSS_CANVAS_EMIT'; channel: string; payload: unknown }
```

**Requirements:** Widget manifest must declare `'cross-canvas'` in `permissions`. Channel names must match `^[a-zA-Z0-9._-]{1,128}$`. Payload max: 64KB. Shares the 100 events/sec rate limit with `EMIT`.

### `CROSS_CANVAS_SUBSCRIBE`

Subscribes to a cross-canvas channel.

```ts
{ type: 'CROSS_CANVAS_SUBSCRIBE'; channel: string }
```

### `CROSS_CANVAS_UNSUBSCRIBE`

Unsubscribes from a cross-canvas channel.

```ts
{ type: 'CROSS_CANVAS_UNSUBSCRIBE'; channel: string }
```

### `DS_CREATE`

Creates a new DataSource.

```ts
{ type: 'DS_CREATE'; requestId: string; dsType: string; scope: string; schema?: Record<string, unknown>; metadata?: Record<string, unknown> }
```

### `DS_READ`

Reads a DataSource by ID.

```ts
{ type: 'DS_READ'; requestId: string; dataSourceId: string }
```

### `DS_UPDATE`

Updates a DataSource. Supports revision-based conflict detection for table/custom types.

```ts
{ type: 'DS_UPDATE'; requestId: string; dataSourceId: string; updates: Record<string, unknown>; lastSeenRevision?: number }
```

### `DS_DELETE`

Deletes a DataSource.

```ts
{ type: 'DS_DELETE'; requestId: string; dataSourceId: string }
```

### `DS_LIST`

Lists DataSources matching filters.

```ts
{ type: 'DS_LIST'; requestId: string; scope?: string; dsType?: string }
```

### `DS_TABLE_GET_ROWS`

Gets rows from a table-type DataSource.

```ts
{ type: 'DS_TABLE_GET_ROWS'; requestId: string; dataSourceId: string; options?: Record<string, unknown> }
```

### `DS_TABLE_ADD_ROW`

Adds a row to a table-type DataSource.

```ts
{ type: 'DS_TABLE_ADD_ROW'; requestId: string; dataSourceId: string; row: Record<string, unknown> }
```

### `DS_TABLE_UPDATE_ROW`

Updates a row in a table-type DataSource. Supports revision-based conflict detection.

```ts
{ type: 'DS_TABLE_UPDATE_ROW'; requestId: string; dataSourceId: string; rowId: string; updates: Record<string, unknown>; lastSeenRevision?: number }
```

### `DS_TABLE_DELETE_ROW`

Deletes a row from a table-type DataSource.

```ts
{ type: 'DS_TABLE_DELETE_ROW'; requestId: string; dataSourceId: string; rowId: string }
```

---

## Message Flow Diagrams

### Widget Initialization

```
Host                          Widget
  |                             |
  |------- INIT --------------->|
  |                             |  (widget sets up)
  |<------ REGISTER ------------|
  |<------ READY ---------------|
  |                             |
  |------- EVENT (subscribed) ->|
  |<------ EMIT ----------------|
```

### State Round-Trip

```
Widget                        Host
  |                             |
  |------- SET_STATE ---------->|  (persists to widget_instances table)
  |                             |
  |------- GET_STATE ---------->|
  |<------ STATE_RESPONSE ------|
```

### Integration Proxy

```
Widget                        Host                     External API
  |                             |                          |
  |-- INTEGRATION_QUERY ------->|                          |
  |                             |------ HTTP GET --------->|
  |                             |<----- response ----------|
  |<-- INTEGRATION_RESPONSE ----|                          |
```

---

## Lifecycle

The widget lifecycle enforced by the bridge:

1. **load** — iframe `srcdoc` loads, SDK is injected
2. **init** — host sends `INIT` with widgetId, instanceId, config, theme
3. **register** — widget sends `REGISTER` with its manifest
4. **READY** — widget sends `READY` (must happen within 500ms of load)
5. **run** — widget is active, can emit/subscribe/setState
6. **unmount** — host sends `DESTROY`, iframe is removed

A widget that does not signal `READY` within 500ms is considered failed. The host shows an error state for that instance.
