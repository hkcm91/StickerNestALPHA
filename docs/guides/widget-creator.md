# Widget Creator Guide

> **Audience:** Developers building widgets for the StickerNest marketplace
> **Prerequisites:** HTML, CSS, JavaScript. No framework required — widgets are single-file HTML.

## Overview

Widgets are interactive programs that run inside sandboxed iframes on the StickerNest canvas. They communicate with the platform exclusively through the Widget SDK (`window.StickerNest`), which is injected automatically — you never load it yourself.

This guide walks you through creating a widget from scratch, covering the SDK lifecycle, event communication, state persistence, theming, DataSource integration, cross-canvas messaging, and the publish pipeline.

---

## Widget Format

Every widget is a **single HTML file** containing HTML, CSS, and JavaScript together. The SDK is available on `window.StickerNest` at runtime — do not bundle or inline it.

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: var(--sn-font-family);
      background: var(--sn-bg);
      color: var(--sn-text);
      margin: 0;
      padding: 16px;
    }
    button {
      background: var(--sn-accent);
      color: var(--sn-bg);
      border: none;
      border-radius: var(--sn-radius);
      padding: 8px 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h2>My Widget</h2>
  <p id="count">0</p>
  <button id="btn">Increment</button>

  <script>
    // SDK is already available — no import needed
    const SN = window.StickerNest;

    // Step 1: Register your manifest
    SN.register({
      name: 'Counter Widget',
      version: '1.0.0',
      events: {
        emits: ['counter.incremented'],
        subscribes: ['counter.reset']
      },
      permissions: ['storage'],
      config: {
        startValue: { type: 'number', default: 0, label: 'Start Value' }
      }
    });

    // Step 2: Set up your widget
    let count = 0;
    const el = document.getElementById('count');
    const btn = document.getElementById('btn');

    btn.addEventListener('click', () => {
      count++;
      el.textContent = count;
      SN.emit('counter.incremented', { value: count });
      SN.setState('count', count);
    });

    SN.subscribe('counter.reset', () => {
      count = 0;
      el.textContent = count;
    });

    // Step 3: Restore previous state
    SN.getState('count').then(saved => {
      if (saved != null) {
        count = saved;
        el.textContent = count;
      }
    });

    // Step 4: Signal ready (must happen within 500ms of load)
    SN.ready();
  </script>
</body>
</html>
```

---

## SDK Lifecycle

The lifecycle is strict and enforced by the host. Violating the order causes errors.

```
load → register() → ready() → run → unmount
```

### 1. `register(manifest)` — Declare Your Contract

Call this first. It tells the host what events you emit/subscribe to, what permissions you need, and what config fields users can set.

```js
SN.register({
  name: 'Weather Widget',
  version: '1.2.0',
  events: {
    emits: ['weather.updated'],
    subscribes: ['location.changed']
  },
  permissions: ['storage', 'integration', 'cross-canvas'],
  config: {
    unit: { type: 'string', default: 'celsius', label: 'Temperature Unit' },
    refreshInterval: { type: 'number', default: 300, label: 'Refresh (seconds)' }
  }
});
```

The `permissions` array controls what SDK features are available. Requesting `'cross-canvas'` enables `emitCrossCanvas()` and `subscribeCrossCanvas()`. Requesting `'integration'` enables `SN.integration()`.

### 2. `ready()` — Signal Initialization Complete

Call this after `register()` and any initial setup. The host requires `ready()` within **500ms of load** — if you miss the deadline, the widget is marked as failed and an error state is shown.

```js
SN.ready(); // Must be called after register()
```

Do not delay `ready()` with network requests. Fetch data after signaling ready, then update your UI.

### 3. Run Phase

After `ready()`, the widget is fully active. You can emit events, subscribe to events, read/write state, and respond to config and theme changes.

### 4. Unmount

When the widget is removed from the canvas, the host sends a `DESTROY` message. The iframe is torn down — no cleanup code is required from you.

---

## Event Communication

Widgets communicate with other widgets and the platform through the Event Bus, proxied via the SDK.

### Emitting Events

```js
SN.emit('todo.completed', { id: 'task-42', completedAt: Date.now() });
```

Events are typed strings (dot-namespaced by convention). The payload must be JSON-serializable. There is a rate limit of **100 events/second** per widget instance — excess events are silently dropped.

### Subscribing to Events

```js
const unsub = SN.subscribe('todo.assigned', (payload) => {
  console.log('New task:', payload.title);
});

// Later, to unsubscribe:
unsub();
```

Only events declared in your manifest's `subscribes` array will be forwarded to you by the host.

---

## State Persistence

Widgets have two tiers of persistent state.

### Instance State

Scoped to a specific widget placement on a specific canvas. Survives widget close and reopen.

```js
// Save
SN.setState('preferences', { theme: 'compact', sortBy: 'date' });

// Load (async — returns a Promise)
const prefs = await SN.getState('preferences');
```

Hard limit: **1MB per widget instance**. Writes exceeding this are rejected.

### User State

Scoped to the user across all canvases. Use for cross-canvas preferences or global settings.

```js
// Save
SN.setUserState('globalApiKey', 'sk-...');

// Load
const key = await SN.getUserState('globalApiKey');
```

Hard limit: **10MB total per user** across all widgets. Stored in the `user_widget_state` table.

State is cleared when the widget is uninstalled (with user confirmation), the canvas is deleted, or the user account is deleted.

---

## Configuration

Users configure your widget through the Properties panel in edit mode. Config fields are defined in your manifest's `config` object.

```js
// Read the current config
const config = SN.getConfig();
console.log(config.refreshInterval); // 300
```

Config values are injected on load (via the `INIT` bridge message) and updated live when the user changes them in the panel (via `CONFIG_UPDATE`). To react to live changes, re-read config when needed or listen for config-related events.

---

## Theming

Widgets receive theme tokens as CSS custom properties, injected by the host on load and whenever the theme changes.

### Available Tokens

| Token | Purpose |
|-------|---------|
| `--sn-bg` | Page background |
| `--sn-surface` | Card/panel background |
| `--sn-accent` | Primary action color |
| `--sn-text` | Primary text |
| `--sn-text-muted` | Secondary text |
| `--sn-border` | Border color |
| `--sn-radius` | Border radius |
| `--sn-font-family` | Font family |

### Using Tokens in CSS

```css
body {
  background: var(--sn-bg);
  color: var(--sn-text);
  font-family: var(--sn-font-family);
}
.card {
  background: var(--sn-surface);
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius);
}
```

### Responding to Theme Changes

```js
SN.onThemeChange((tokens) => {
  // tokens is the full ThemeTokens object
  // CSS custom properties are updated automatically —
  // use this handler only if you need to react in JS
  console.log('New accent color:', tokens['--sn-accent']);
});
```

Do not hardcode colors or fonts. Always use theme tokens so your widget adapts to light, dark, and custom themes.

---

## Resize Handling

Widgets do not control their own container size — the canvas layout determines dimensions. You receive resize notifications:

```js
SN.onResize((width, height) => {
  // Adjust layout for new dimensions
  canvas.width = width;
  canvas.height = height;
  redraw();
});
```

To *request* a resize (the host may accept or reject):

```js
SN.resizeRequest(400, 300); // width, height in pixels
```

---

## Integration Proxy

Widgets access external APIs through the host proxy — integration credentials never enter the iframe.

```js
// Read data from an external service
const weather = await SN.integration('openweather').query({
  endpoint: '/current',
  params: { city: 'Portland' }
});

// Write data to an external service
await SN.integration('notion').mutate({
  endpoint: '/pages',
  method: 'POST',
  body: { title: 'New Page' }
});
```

The host makes the actual HTTP request with the user's stored credentials and returns the result. Your manifest must include `'integration'` in `permissions`.

---

## DataSource Integration

Widgets can create, read, update, and delete DataSources — persistent data records that exist independently of any widget. Multiple widgets can share the same DataSource.

### Creating a DataSource

```js
const result = await SN.dsCreate({
  type: 'table',
  scope: 'canvas',
  schema: {
    columns: [
      { id: 'name', type: 'text', label: 'Name' },
      { id: 'status', type: 'select', label: 'Status', options: ['todo', 'done'] }
    ]
  },
  metadata: { name: 'Task List' }
});
// result.data.id — the new DataSource ID
```

### Reading and Listing

```js
// Read a specific DataSource
const ds = await SN.dsRead('datasource-uuid');

// List DataSources visible to this widget
const list = await SN.dsList({ scope: 'canvas', type: 'table' });
```

### Table Row Operations

For `table` and `custom` type DataSources, you can work with rows directly:

```js
// Get all rows
const rows = await SN.dsTableGetRows('datasource-uuid');

// Add a row
await SN.dsTableAddRow('datasource-uuid', {
  name: 'Buy groceries',
  status: 'todo'
});

// Update a row (with conflict detection)
await SN.dsTableUpdateRow('datasource-uuid', 'row-uuid', {
  status: 'done'
}, { lastSeenRevision: 3 });

// Delete a row
await SN.dsTableDeleteRow('datasource-uuid', 'row-uuid');
```

### Conflict Detection

For `table` and `custom` types, updates support revision-based conflict detection. If another user has modified the row since you last read it, the update returns a `CONFLICT` error with the current revision. Re-fetch the row, merge your changes, and retry.

For `doc` types, conflict resolution uses Yjs CRDT — no manual handling needed. For `note` types, last-write-wins applies silently.

---

## Cross-Canvas Communication

Widgets can send and receive events across different canvases. This enables features like multi-canvas dashboards, cross-room game state, and global notifications.

### Requirements

Your manifest must declare `'cross-canvas'` in the `permissions` array.

### Channel Rules

Channel names must match `^[a-zA-Z0-9._-]{1,128}$` — no colons, slashes, or spaces. Payload maximum is **64KB**. Cross-canvas events share the 100 events/sec rate limit with regular `emit()`.

### Usage

```js
// Subscribe to a channel
SN.subscribeCrossCanvas('game.lobby', (payload) => {
  console.log('Player joined:', payload.playerName);
});

// Emit to a channel (all canvases with a subscribed widget receive this)
SN.emitCrossCanvas('game.lobby', {
  playerName: 'Alice',
  action: 'join'
});

// Unsubscribe
SN.unsubscribeCrossCanvas('game.lobby');
```

When the channel is disconnected (e.g., network interruption), outbound messages are queued (max 100). On reconnect, queued messages replay in order.

---

## Security Rules

These rules are enforced by the platform — violating them causes silent failures or errors:

1. **No direct API calls.** All external HTTP requests go through `SN.integration()`. Fetch/XHR to external domains is blocked by CSP.
2. **No direct bucket URLs.** Media assets must be accessed through the SDK media API, not direct storage URLs.
3. **No credential access.** Integration tokens, API keys, and user secrets never enter the iframe context.
4. **State size limits.** Instance state: 1MB. User state: 10MB total. Exceeding these limits rejects the write.
5. **Rate limits.** 100 events/second per instance for `emit()` and `emitCrossCanvas()` combined.
6. **500ms ready deadline.** Call `ready()` within 500ms of load or the widget is marked as failed.

---

## Logging and Debugging

Use the SDK's log method to send messages to the host console (visible in the Widget Lab inspector):

```js
SN.log('info', 'Widget initialized successfully');
SN.log('warn', 'API returned unexpected format');
SN.log('error', 'Failed to load data');
```

In the Widget Lab, the Event Inspector shows all emitted and received events in real time with timestamps and payloads.

---

## Testing Your Widget

### In the Widget Lab

The Widget Lab (`/lab`) provides a full development environment:

1. **Editor** — Monaco-based HTML editor with syntax highlighting
2. **Live Preview** — Your widget runs in a real Runtime sandbox with hot reload
3. **Event Inspector** — See all events emitted and received in real time
4. **Manifest Editor** — GUI for editing your widget's manifest with validation

Preview modes available: 2D isolated (standalone frame), 2D canvas context (as if placed on a canvas), and 3D spatial context (simulated VR environment).

### Writing Tests

Widget tests should verify:

- `register()` is called before `ready()`
- `ready()` signals within 500ms
- Events are emitted with correct type and payload
- State persists across widget close/reopen
- Theme tokens are applied correctly
- Widget handles missing config gracefully

---

## Publishing

The publish pipeline runs four mandatory steps in order. No step can be skipped.

### 1. Validate

The pipeline checks your widget HTML against the Bridge Protocol spec:

- Does the widget call `StickerNest.register(manifest)`?
- Does the widget call `StickerNest.ready()`?
- Is the manifest valid against the `WidgetManifest` schema?
- Are all declared event types properly namespaced?

If validation fails, you receive specific error messages with guidance on how to fix each issue.

### 2. Test

Your widget runs in a headless Runtime sandbox:

- Must signal `READY` within 500ms
- Must produce no uncaught errors on load
- Bridge communication must be clean (no malformed messages)

### 3. Thumbnail

A screenshot of your widget in preview mode is captured automatically for the Marketplace listing. The screenshot uses Playwright with deterministic rendering — your widget should look good at its default size.

### 4. Submit

The validated widget HTML, manifest, and thumbnail are submitted to the Marketplace API. Once approved, your widget appears in the Marketplace for other users to discover and install.

### Version Management

Each publish creates a new version entry. When updating a widget:

- **Patch** (1.0.0 → 1.0.1): Bug fixes, no manifest changes
- **Minor** (1.0.0 → 1.1.0): New features, additive manifest changes (new events, new config fields)
- **Major** (1.0.0 → 2.0.0): Breaking changes — removed events, renamed config fields, changed payload shapes

The manifest editor warns you about breaking changes and indicates when a major version bump is required.

---

## Complete Example: Todo List Widget

A full-featured widget demonstrating state, events, theming, and DataSource integration:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body {
      font-family: var(--sn-font-family);
      background: var(--sn-bg);
      color: var(--sn-text);
      padding: 12px;
    }
    h3 { margin-bottom: 8px; }
    .input-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    input {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid var(--sn-border);
      border-radius: var(--sn-radius);
      background: var(--sn-surface);
      color: var(--sn-text);
      font-family: var(--sn-font-family);
    }
    button {
      background: var(--sn-accent);
      color: var(--sn-bg);
      border: none;
      border-radius: var(--sn-radius);
      padding: 6px 14px;
      cursor: pointer;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid var(--sn-border);
    }
    .item.done span { text-decoration: line-through; color: var(--sn-text-muted); }
  </style>
</head>
<body>
  <h3>Todo List</h3>
  <div class="input-row">
    <input id="input" placeholder="Add a task..." />
    <button id="add">Add</button>
  </div>
  <div id="list"></div>

  <script>
    const SN = window.StickerNest;

    SN.register({
      name: 'Todo List',
      version: '1.0.0',
      events: {
        emits: ['todo.added', 'todo.completed'],
        subscribes: ['todo.clear']
      },
      permissions: ['storage'],
      config: {
        maxItems: { type: 'number', default: 50, label: 'Max Items' }
      }
    });

    let todos = [];
    const listEl = document.getElementById('list');
    const inputEl = document.getElementById('input');

    function render() {
      listEl.innerHTML = '';
      todos.forEach((t, i) => {
        const div = document.createElement('div');
        div.className = 'item' + (t.done ? ' done' : '');
        div.innerHTML = `
          <input type="checkbox" ${t.done ? 'checked' : ''} />
          <span>${t.text}</span>
        `;
        div.querySelector('input').addEventListener('change', () => toggle(i));
        listEl.appendChild(div);
      });
    }

    function toggle(index) {
      todos[index].done = !todos[index].done;
      if (todos[index].done) {
        SN.emit('todo.completed', { text: todos[index].text });
      }
      SN.setState('todos', todos);
      render();
    }

    document.getElementById('add').addEventListener('click', () => {
      const text = inputEl.value.trim();
      if (!text) return;
      const config = SN.getConfig();
      if (todos.length >= (config.maxItems || 50)) return;
      todos.push({ text, done: false });
      inputEl.value = '';
      SN.emit('todo.added', { text });
      SN.setState('todos', todos);
      render();
    });

    SN.subscribe('todo.clear', () => {
      todos = [];
      SN.setState('todos', todos);
      render();
    });

    // Restore state, then signal ready
    SN.getState('todos').then(saved => {
      if (Array.isArray(saved)) todos = saved;
      render();
      SN.ready();
    });
  </script>
</body>
</html>
```

---

## Next Steps

- [Widget SDK Reference](../api/widget-sdk.md) — Full API documentation for all 16+ SDK methods
- [Bridge Protocol Reference](../api/bridge-protocol.md) — Understand the postMessage layer between host and widget
- [DataSource API Reference](../api/datasource.md) — Deep dive into DataSource CRUD, ACL, and table operations
- [Event Bus Reference](../api/event-bus.md) — The 130+ event types and pub/sub architecture
