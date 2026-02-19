# L2: Widget Lab — Agent Rules
# Path: src/lab/**
# Read this file in full before writing any code in this layer.

---

## Identity & Responsibility

Layer 2 is the in-app IDE for creating, testing, and publishing widgets. It is a
full-screen developer environment containing: Monaco editor, live preview pane,
event inspector, node graph, AI generation panel, manifest editor, version history,
and publish pipeline.

Lab is a power-user surface. It is desktop-browser-first. It imports from lower layers
but is itself imported by nothing — it sits above Runtime and Social but below Canvas.

---

## Allowed Imports

You MAY import from:
- `src/kernel/**` (Layer 0)
- `src/social/**` (Layer 1)
- `src/runtime/**` (Layer 3)
- `@sn/types` (kernel schema package alias)

You MAY stub Layer 4A-3 pipeline wiring UI — Lab can be developed and tested before
`src/canvas/wiring/**` is complete. Use a stub/placeholder for publish pipeline wiring
until L4A-3 ships.

NEVER import from:
- `src/canvas/**` (L4A — any sublayer)
- `src/spatial/**` (L4B)
- `src/marketplace/**` (L5)
- `src/shell/**` (L6)

Cross-layer communication goes through the event bus or `@sn/types` — never direct
imports across the boundary. Violations are caught by `dependency-cruiser`.
Do not suppress lint errors — fix the architecture.

---

## What You May Build Here

- `src/lab/editor/` — Monaco editor, single-file HTML widget format
- `src/lab/preview/` — live preview pane (widget runs in Runtime sandbox)
- `src/lab/inspector/` — event inspector panel for preview session
- `src/lab/graph/` — node graph for visual no-code widget composition
- `src/lab/ai/` — AI generation panel (prompt → widget HTML)
- `src/lab/manifest/` — manifest editor GUI
- `src/lab/versions/` — snapshot save and restore (version history)
- `src/lab/publish/` — publish pipeline: validate → test → thumbnail → submit
- `src/lab/import/` — load any Marketplace widget into Lab for forking
- Co-located `*.test.ts` files for every module (required, not optional)

---

## Widget Format

- Widgets are single-file HTML: HTML + JS + CSS in one `.html` file.
- The Widget SDK is injected by the Runtime at preview/run time.
  Do NOT bundle or inline the SDK into the widget file. Do not instruct AI generation
  to include SDK source. The generated HTML assumes the SDK is available as
  `StickerNest` on `window`.
- This format is the canonical source of truth. Do not invent alternative formats.

---

## Editor Rules (`src/lab/editor/`)

- Use Monaco editor. Do not swap in CodeMirror or a textarea except in Script mode
  (see Script Mode section below).
- The editor works on one file at a time: the single-file HTML widget.
- Provide HTML/JS/CSS syntax highlighting, auto-complete, and error markers.
- Do not persist unsaved changes silently. Autosave must be explicit and visible in UI.
- Unsaved state indicator must be present in the tab/title bar.

---

## Preview Rules (`src/lab/preview/`)

- Live preview ALWAYS runs the widget inside a full Runtime sandbox (`<WidgetFrame>`).
  Import `WidgetFrame` from `src/runtime/`. Never eval or execute lab code directly
  in the host page context. This is a hard security rule.
- Preview modes to support:
  - `2D isolated` — widget in standalone frame, no canvas context.
  - `2D canvas context` — widget rendered as if placed on a real canvas.
  - `3D spatial context` — widget in simulated spatial environment.
- Preview must update in real time as the editor content changes (debounced rebuild).
- The preview pane receives the same theme tokens as production widgets would.
  Do not skip theme injection in preview — it is part of what the creator is testing.
- Preview session event traffic feeds into the inspector panel in real time.

---

## Inspector Rules (`src/lab/inspector/`)

- Display all events emitted and received by the preview widget during the session.
- Show: event type, payload (pretty-printed), direction (emitted / received), timestamp.
- Provide a clear/reset button scoped to the current preview session.
- Inspector state is ephemeral — never persist inspector logs to any store or DB.
- Do not show inspector in any non-Lab context. It is a developer tool only.

---

## AI Generation Rules (`src/lab/ai/`)

- AI generation sends the user prompt through the platform's Anthropic API proxy.
  Lab NEVER holds, reads, or logs API keys. There are no API keys in `src/lab/**`.
- If someone suggests adding an API key directly to Lab code — refuse and route through
  the proxy endpoint defined in the platform API layer.
- Generated output must be valid single-file HTML. Validate structure before loading
  in preview. If validation fails, show the error to the creator with the raw output;
  do not silently discard.
- Generated widgets load into the preview pane automatically on successful generation.
- Do not auto-publish AI-generated widgets. The creator must explicitly go through the
  publish pipeline.

---

## Manifest Editor Rules (`src/lab/manifest/`)

- The manifest declares the widget's event contract and config schema.
- Use Zod schemas from `src/kernel/schemas/` for manifest shape validation.
  Do not define a local manifest schema — use the canonical one.
- When the creator modifies the manifest in a way that breaks the existing event
  contract (removes or renames an event type that was previously declared), show a
  breaking-change warning. Indicate a semver major bump is required before publish.
- The manifest editor must produce valid JSON schemas via `z.toJSONSchema()` for
  config schema fields. Do not hand-roll JSON schema output.

---

## Version History Rules (`src/lab/versions/`)

- Save a named or timestamped snapshot on explicit creator action (not on every keystroke).
- Allow restore to any previous snapshot. Confirm before overwriting current state.
- Snapshots store: the full HTML source, the manifest at time of snapshot, and a label.
- Do not store snapshots in the event bus or in canvas state. They go to the backend
  persistence layer via kernel API calls.
- Version history is scoped to the widget, not the Lab session.

---

## Publish Pipeline Rules (`src/lab/publish/`)

Before any widget reaches the Marketplace, the publish pipeline must complete in order:

1. **Validate** — run the widget HTML against the bridge protocol spec. Check that
   `StickerNest.register(manifest)` and `StickerNest.ready()` are called.
   Reject widgets that do not call `ready()`.
2. **Test** — run the widget in a headless Runtime sandbox. Confirm READY signal
   within 500ms. Confirm no uncaught errors on load.
3. **Thumbnail** — take a screenshot of the widget in preview for the Marketplace listing.
   Use Playwright with `--use-gl=swiftshader` for deterministic, GPU-free rendering.
4. **Submit** — send validated widget + manifest + thumbnail to the Marketplace API.

Do not allow skipping any pipeline step. If validation fails, surface the specific
failure reason to the creator with actionable guidance. Do not silently pass invalid widgets.

You may stub the final `submit` step while `src/marketplace/**` (L5) is not yet built.
The stub should log the payload and confirm success in the UI so the pipeline can be
tested end-to-end before L5 lands.

---

## Import (Fork) Rules (`src/lab/import/`)

- Any widget from the Marketplace may be loaded into Lab for forking.
- On import, load the widget HTML source into the editor and the manifest into the
  manifest editor. The creator starts with a full copy — Lab does not link back to
  the original.
- Mark imported widgets clearly as forks in the UI. Do not imply the creator
  authored the original.
- Respect the widget's license metadata from the Marketplace listing. If the license
  prohibits forking, show a clear error and do not load the source.

---

## Node Graph Rules (`src/lab/graph/`)

- The node graph is a no-code path for composing widget event logic visually.
- Nodes map to SDK calls: emit, subscribe, setState, getState, integration query/mutate.
- Graph output compiles to valid single-file HTML JS — same format as the text editor.
- Graph and text editor views are synchronized: editing one updates the other where possible.
  When sync is not possible (user has edited compiled output manually), show a
  "text-only mode" indicator and disable graph sync until the user explicitly resets.

---

## Access Control

- Widget Lab is a Creator+ tier feature. Gate access at the route level.
  A user without Creator+ tier hitting `/lab/**` must see an upgrade prompt,
  not an empty IDE or an error.
- Do not implement access control inside individual Lab components. Do it once at
  the route guard level.
- Script mode (lightweight textarea + inspector, no full IDE) is available to
  lower-tier users for writing canvas scripts. Scripts are not publishable to the
  Marketplace as standalone items. They can be bundled with a widget or canvas template.

---

## Mobile Handling

- Lab is desktop-browser-first. Do NOT build a mobile layout for the IDE.
- On viewports narrower than the minimum desktop breakpoint, render a redirect prompt:
  inform the user that Widget Lab requires a desktop browser and provide a link to
  continue on desktop (e.g., send a link via email or show the Lab URL to copy).
- Do not attempt to make the Monaco editor or node graph work on mobile — it is
  not a supported surface. Redirect prompt is the correct response.

---

## Security Rules

1. Preview always runs in a Runtime sandbox — never eval lab code in host context.
2. AI generation routes through the platform proxy — no API keys in Lab code, ever.
3. Publish pipeline validation is mandatory — no skipping steps for any reason.
4. Import respects widget license — do not load source if license prohibits forking.

---

## Testing Requirements

Every module in `src/lab/**` requires a co-located `*.test.ts` file.
Coverage thresholds: 80% branches, functions, lines, statements (Vitest).
E2E tests use Playwright with `--use-gl=swiftshader`.

Required test cases — do not ship without these passing:

- Create a widget in Lab → loads correctly in canvas (full round-trip integration test).
- AI generation → valid single-file HTML produced → previews in Runtime sandbox correctly.
- Manifest breaking change (remove declared event type) → breaking-change warning shown
  to creator before any save or publish action.
- Publish pipeline → validation passes → thumbnail generated → Marketplace listing created
  (or stub confirmed with correct payload).
- Lab route accessed without Creator+ tier → upgrade prompt rendered, IDE not loaded.
- Lab route on mobile viewport → redirect prompt rendered, IDE not loaded.
- Widget import with no-fork license → error shown, source not loaded into editor.
- Preview pane receives correct theme tokens from host on load and on theme change.

---

## Commit Scope

All commits touching `src/lab/**` use scope `lab`:
`feat(lab): ...` / `fix(lab): ...` / `test(lab): ...`
