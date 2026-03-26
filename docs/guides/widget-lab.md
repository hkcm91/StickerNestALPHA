# Widget Lab Guide

> **Audience:** Creators building widgets in the StickerNest in-app IDE
> **Tier Required:** Creator or higher (free-tier users have Script mode only)
> **Also see:** [Widget Creator Guide](widget-creator.md) for SDK details, [Widget SDK Reference](../api/widget-sdk.md) for all SDK methods

## What Is the Widget Lab?

The Widget Lab is a full-screen development environment for creating, testing, and publishing widgets. It is a desktop-browser-first tool — it does not run on mobile viewports. If you access `/lab` on a narrow screen, you will see a prompt to switch to a desktop browser.

The Lab contains several panels that work together: a code editor, live preview, event inspector, manifest editor, version history, AI generation panel, and a publish pipeline.

---

## Access and Tier Gating

Widget Lab is available to users on the Creator tier or higher. If you are on the free tier and navigate to `/lab`, you will see an upgrade prompt rather than the IDE.

Free-tier users can still write **Scripts** — lightweight headless JS automations that run on the event bus without a UI. Scripts use a simplified textarea editor and the event inspector, but do not have access to the full Lab IDE. Scripts are not publishable to the Marketplace as standalone items, though they can be bundled with a widget or canvas template.

---

## Widget Format

Widgets are **single-file HTML** documents. All HTML, CSS, and JavaScript live in one `.html` file. The Widget SDK is injected automatically by the Runtime at preview and run time — you do not need to include it yourself. Your widget code assumes `StickerNest` is available on `window`.

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--sn-font-family); color: var(--sn-text); }
    .counter { font-size: 2rem; text-align: center; padding: 1rem; }
    button { background: var(--sn-accent); color: white; border: none; padding: 0.5rem 1rem; border-radius: var(--sn-radius); cursor: pointer; }
  </style>
</head>
<body>
  <div class="counter">
    <span id="count">0</span>
    <br>
    <button id="inc">+1</button>
  </div>
  <script>
    StickerNest.register({
      name: 'Counter',
      version: '1.0.0',
      events: { emits: [], subscribes: [] }
    });

    let count = 0;
    const el = document.getElementById('count');
    document.getElementById('inc').addEventListener('click', () => {
      count++;
      el.textContent = count;
      StickerNest.setState('count', count);
    });

    StickerNest.getState('count').then(saved => {
      if (saved != null) { count = saved; el.textContent = count; }
    });

    StickerNest.ready();
  </script>
</body>
</html>
```

Key rules for widget HTML: call `StickerNest.register(manifest)` before `StickerNest.ready()`, and call `ready()` within 500ms of load. If `ready()` is not called, the widget will not be considered active by the platform.

---

## Editor

The editor is powered by Monaco (the same engine behind VS Code). It provides HTML, CSS, and JavaScript syntax highlighting, auto-complete, and inline error markers. You edit one file at a time — your single-file HTML widget.

Unsaved changes are tracked visually in the tab or title bar. Autosave is explicit — the editor does not silently save your work. You must save manually or trigger an autosave action.

---

## Live Preview

The preview pane runs your widget inside a full Runtime sandbox (`<WidgetFrame>`). Your code never executes directly in the host page — this is a hard security boundary. The preview updates in real time as you edit, with a short debounce to avoid constant rebuilds.

The preview supports three modes:

**2D Isolated** runs the widget in a standalone frame with no canvas context. This is the simplest mode for testing widget logic and layout.

**2D Canvas Context** renders the widget as if it were placed on a real canvas. This is useful for testing how your widget looks alongside other entities and how it responds to canvas events.

**3D Spatial Context** renders the widget in a simulated spatial environment. Use this to test how your widget behaves in VR or 3D mode.

The preview pane receives the same theme tokens (`--sn-bg`, `--sn-surface`, `--sn-accent`, etc.) as production widgets. Theme injection is part of what you are testing — if your widget looks wrong in preview, it will look wrong on canvas.

---

## Event Inspector

The inspector panel shows all events emitted and received by your widget during the current preview session. Each entry displays the event type, the payload (pretty-printed JSON), the direction (emitted or received), and a timestamp.

The inspector has a clear/reset button that wipes the log for the current session. Inspector state is ephemeral — nothing is persisted to any store or database. The inspector only appears in the Lab context, never in canvas or other views.

Use the inspector to verify that your widget is emitting the right events with the right payload shapes, and that it is receiving events it subscribes to.

---

## AI Generation

The AI generation panel lets you describe a widget in natural language and have it generated as valid single-file HTML. The prompt is sent through the platform's API proxy — the Lab never holds, reads, or logs API keys. There are no API keys anywhere in Lab code.

When generation succeeds, the output is validated as valid single-file HTML. If validation passes, the generated widget loads into the preview pane automatically. If validation fails, you see the error alongside the raw output so you can fix it manually.

AI-generated widgets are never auto-published. You must go through the full publish pipeline explicitly.

---

## Manifest Editor

The manifest declares your widget's identity, version, permissions, event contract, and configuration schema. The manifest editor provides a GUI for editing these fields rather than writing JSON by hand.

The manifest uses Zod schemas from the kernel for validation. When you modify the manifest in a way that breaks the existing event contract — for example, removing or renaming a declared event type — the editor shows a breaking-change warning and indicates that a semver major version bump is required before publishing.

Configuration schema fields produce valid JSON schemas via `z.toJSONSchema()`. These JSON schemas are what the Properties panel on the canvas uses to render config fields for your widget.

---

## Node Graph (Visual Composition)

The node graph is a no-code path for composing widget event logic visually. Nodes map to SDK calls: emit, subscribe, setState, getState, and integration query/mutate. The graph output compiles to valid single-file HTML JavaScript — the same format the text editor uses.

The graph and text editor are synchronized when possible. Editing one updates the other. When synchronization is not possible (for example, if you manually edited the compiled output in the text editor), a "text-only mode" indicator appears and graph sync is disabled until you explicitly reset.

---

## Version History

You can save named or timestamped snapshots at any time. Snapshots are created on explicit action, not on every keystroke. Each snapshot stores the full HTML source, the manifest at the time of the snapshot, and a label.

To restore a previous version, select it from the history list. You will be asked to confirm before the current state is overwritten. Version history is scoped to the widget, not to the Lab session — your snapshots persist across sessions.

---

## Publish Pipeline

Before a widget reaches the Marketplace, it must pass through a four-step pipeline. No steps can be skipped.

**Step 1: Validate** — The widget HTML is checked against the bridge protocol spec. The validator confirms that `StickerNest.register(manifest)` and `StickerNest.ready()` are both called. Widgets that do not call `ready()` are rejected.

**Step 2: Test** — The widget runs in a headless Runtime sandbox. The test confirms that the READY signal is received within 500ms and that no uncaught errors occur on load.

**Step 3: Thumbnail** — A screenshot of the widget in preview mode is captured for the Marketplace listing. The screenshot uses Playwright with `--use-gl=swiftshader` for deterministic, GPU-free rendering.

**Step 4: Submit** — The validated widget, manifest, and thumbnail are submitted to the Marketplace API. After submission, the widget appears in the Marketplace for other users to discover and install.

If any step fails, you see the specific failure reason with actionable guidance. Invalid widgets never reach the Marketplace.

---

## Importing (Forking) Widgets

You can load any Marketplace widget into the Lab for forking. On import, the widget's HTML source loads into the editor and its manifest loads into the manifest editor. You start with a full copy — the Lab does not link back to the original.

Imported widgets are clearly marked as forks in the UI. The Lab checks the widget's license metadata before loading. If the license prohibits forking (e.g., `no-fork` or `proprietary`), an error is shown and the source is not loaded.

---

## Script Mode (Free Tier)

Script mode is a lightweight alternative to the full Lab IDE, available to all users including free-tier accounts. Scripts are headless JavaScript automations that run on the event bus — they have no UI or iframe.

Script mode provides a simple textarea editor and the event inspector. Scripts can subscribe to bus events, emit events, and automate canvas behavior. They are not publishable to the Marketplace as standalone items, but they can be bundled with a widget or canvas template.

---

## Security Summary

The Lab enforces several security boundaries. Preview always runs inside a Runtime sandbox — widget code never executes in the host page context. AI generation routes through the platform API proxy, with no API keys in Lab code. The publish pipeline validation is mandatory and cannot be skipped. Widget import respects license metadata — the Lab refuses to load source from widgets that prohibit forking.

---

## Next Steps

- [Widget Creator Guide](widget-creator.md) — SDK lifecycle, events, state, theming, and publishing details
- [Widget SDK Reference](../api/widget-sdk.md) — All 16+ SDK methods
- [Bridge Protocol Reference](../api/bridge-protocol.md) — postMessage types between host and iframe
- [Marketplace Guide](marketplace.md) — Discovery, installation, and publishing
