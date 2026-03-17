# L3: Widget Runtime — Agent Rules
# Path: src/runtime/**
# Read this file in full before writing any code in this layer.

---

## Identity & Responsibility

Layer 3 is the sandboxed iframe execution environment for all widgets — built-in and
third-party alike. It owns `<WidgetFrame>`, the Widget Bridge Protocol, and the Widget SDK.
Every widget interacts with the platform through this layer and only this layer.

This is a security boundary. Every decision in this layer must be evaluated through
that lens first.

---

## Allowed Imports

ONLY import from:
- `src/kernel/**` (Layer 0)
- `@sn/types` (the kernel schema package alias)

NEVER import from:
- `src/social/**` (L1)
- `src/lab/**` (L2)
- `src/canvas/**` (L4A)
- `src/spatial/**` (L4B)
- `src/marketplace/**` (L5)
- `src/shell/**` (L6)

Cross-layer communication must go through the event bus, not direct imports.
Violating import rules will be caught by `dependency-cruiser` and `eslint-plugin-boundaries`.
Do not suppress those lint errors — fix the architecture instead.

---

## What You May Build Here

- `src/runtime/WidgetFrame.tsx` — the sandboxed `<iframe>` host component
- `src/runtime/bridge/` — the typed postMessage protocol (host ↔ widget)
- `src/runtime/sdk/` — the Widget SDK injected into every iframe
- `src/runtime/widgets/` — built-in trusted inline widgets (Sticky Note, Clock, Counter, etc.)
- Co-located `*.test.ts` files for every module (required, not optional)

---

## WidgetFrame Rules

- Widget HTML MUST be loaded via `srcdoc` blob — never via a remote `src` URL.
  Setting `src` to a remote widget URL is forbidden regardless of CSP.
- Enforce a strict Content Security Policy on every iframe. Do not relax CSP to
  make something work — find a different approach.
- Inject the Widget SDK via a `<script>` tag into the `srcdoc` blob before load.
  Do not assume the widget author will load it themselves.
- Lifecycle is: `load → init → READY → run → unmount`. Enforce this order.
  A widget that has not signaled READY must not be considered active.
- Widget crash (unhandled error inside iframe) MUST be caught by the error boundary.
  The host must show an error state for that widget instance only.
  The event bus must continue operating normally — a crashed widget never takes the bus down.
- Widget containers must forward resize events to the iframe via the bridge.
- Widgets receive resize events; they do not control their own container dimensions.

---

## Bridge Protocol Rules (`src/runtime/bridge/`)

- ALL postMessage messages — in both directions — must be typed and validated with Zod
  schemas defined in `src/kernel/schemas/`. Do not define ad-hoc message shapes locally.
- Origin validation is MANDATORY on every incoming `message` event handler.
  No exceptions. An unvalidated message must be silently dropped, never processed.
- When adding a new message type, add it to the Zod schema first, then implement.
  Never handle a message shape that lacks a schema entry.
- Host → widget messages: `emit event`, `resize notification`, `config update`, `theme update`.
- Widget → host messages: `emit event`, `setState`, `getState`, `register manifest`,
  `signal READY`.
- Do not add new message directions (e.g., widget polling host) without a spec change.

---

## Widget SDK Rules (`src/runtime/sdk/`)

The SDK is injected into iframe context. It runs inside the sandboxed page, not in the host.
Code here must be written as if the host is untrusted (defense-in-depth).

- `StickerNest.emit(type, payload)` — posts to host bus via bridge. Validate payload shape.
- `StickerNest.subscribe(type, handler)` — registers handler for bus events from host.
- `StickerNest.setState(key, value)` — sends to host for persistence. 1MB per instance limit.
- `StickerNest.getState(key)` — async retrieval from host.
- `StickerNest.setUserState(key, value)` — cross-canvas user state. 10MB total per user.
- `StickerNest.getUserState(key)` — retrieval of cross-canvas state.
- `StickerNest.getConfig()` — retrieves user-configured values for this instance.
- `StickerNest.register(manifest)` — declares event contract. Call before `ready()`.
- `StickerNest.ready()` — signals initialization complete. Must be called within 500ms of load.
- `StickerNest.onThemeChange(handler)` — receives theme token map on load and on theme change.
- `StickerNest.onResize(handler)` — receives viewport dimensions on resize.
- `StickerNest.integration(name).query(params)` — proxied external data read via host.
- `StickerNest.integration(name).mutate(params)` — proxied external data write via host.
- `StickerNest.emitCrossCanvas(channel, payload)` — cross-canvas event emission via host.
- `StickerNest.subscribeCrossCanvas(channel, handler)` — cross-canvas event subscription.
- `StickerNest.unsubscribeCrossCanvas(channel)` — cross-canvas event unsubscription.

### Cross-Canvas Security & Limits

- **Permission enforcement**: Widget manifest must declare `'cross-canvas'` in `permissions`
  array. All `CROSS_CANVAS_EMIT`, `CROSS_CANVAS_SUBSCRIBE`, and `CROSS_CANVAS_UNSUBSCRIBE`
  messages are silently dropped if the widget lacks this permission.
- **Channel name validation**: Channel names must match `^[a-zA-Z0-9._-]{1,128}$` —
  no colons, slashes, spaces, or names exceeding 128 characters. Invalid names are rejected
  at both the WidgetFrame and router levels.
- **Rate limiting**: `CROSS_CANVAS_EMIT` shares the same 100 events/second per-instance
  rate limit as regular `EMIT` messages. Excess messages are silently dropped.
- **Payload size limit**: Cross-canvas payloads are capped at 64KB (matching Supabase
  Realtime limits). Oversized payloads are dropped with a warning.
- **Offline queuing**: When a channel is not connected, outbound `emit()` calls are queued
  (max 100 messages). On reconnect, queued messages are replayed in order. If the queue
  overflows, the oldest messages are dropped.
- **Observability**: Cross-canvas operations emit bus events in the `crossCanvas.*` namespace:
  `crossCanvas.event.emitted`, `crossCanvas.event.received`, `crossCanvas.channel.subscribed`,
  `crossCanvas.channel.unsubscribed`, `crossCanvas.error`.

Integration credentials are NEVER passed into the iframe. The host proxies all external
calls. If a widget needs data from an external service, it calls the integration API;
the host makes the real HTTP request and returns the result.

Media assets are NEVER delivered as direct bucket URLs into the iframe. Always proxy via
the SDK media API.

---

## Theming Rules

- Theme tokens are injected by the host via `postMessage` on iframe load and on theme change.
- Standard token set: `--sn-bg`, `--sn-surface`, `--sn-accent`, `--sn-text`,
  `--sn-text-muted`, `--sn-border`, `--sn-radius`, `--sn-font-family`.
- Do not hardcode color or font values in the SDK or WidgetFrame. Always use tokens.
- Built-in widgets in `src/runtime/widgets/` must also consume these tokens.

---

## State Persistence Rules

- Instance state key: `{widgetId}:{instanceId}`. Stored in `widget_instances` table.
  Hard limit: 1MB per instance. Reject writes that would exceed this.
- User state: per-user across all canvases. Stored in `user_widget_state` table.
  Hard limit: 10MB total per user. Reject writes that would exceed this.
- State is cleared on: widget uninstall (with user confirmation dialog), canvas delete,
  user account delete. Do not clear state silently without the appropriate trigger.

---

## Built-in Widgets (`src/runtime/widgets/`)

- Built-in widgets are trusted and do not need to run in a sandboxed iframe.
- They MUST use the same SDK interface as sandboxed widgets — no privileged internal APIs.
- This ensures built-ins remain portable and testable in the same way third-party widgets are.
- Current set: Sticky Note, Clock/Timer, Counter, Image viewer, Markdown note.
- Do not add a built-in widget that requires direct store access or internal imports
  beyond L0. If it needs that, it is not a widget — reconsider the design.

---

## Security Non-Negotiables

1. `srcdoc` blob only — no remote `src` URLs in iframes, ever.
2. Origin validation on every `message` handler — no exceptions, no fallback processing.
3. No integration credentials in iframe context — host proxies all external calls.
4. No direct bucket/CDN URLs in iframe context — proxy all media.
5. Strict CSP — never relax it. If something breaks, fix the code, not the policy.
6. Widget crash must not crash the host. Error boundary is mandatory on WidgetFrame.

---

## Testing Requirements

Every module in `src/runtime/**` requires a co-located `*.test.ts` file.
Coverage thresholds: 80% branches, functions, lines, statements (Vitest).

Required test cases — do not ship without these passing:

- Widget signals READY within 500ms of iframe load (performance budget).
- Widget crash → host shows per-instance error state, event bus continues unaffected.
- Origin spoofing attempt on bridge → message silently rejected, no processing occurs.
- Theme token injection → widget `onThemeChange` handler receives correct token map.
- `setState` / `getState` round-trip persists correctly across widget close and reopen.
- `register(manifest)` before `ready()` — manifest registered; reverse order — error thrown.
- State write at exactly 1MB — accepted. State write exceeding 1MB — rejected with error.

---

## Commit Scope

All commits touching `src/runtime/**` use scope `runtime`:
`feat(runtime): ...` / `fix(runtime): ...` / `test(runtime): ...`
