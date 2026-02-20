# StickerNest V5 — Layer 2: Widget Lab — Complete Build Plan

## Document Purpose

This is the full-spec build plan for Layer 2 (Widget Lab) of StickerNest V5. The Lab is the in-app IDE for creating, testing, and publishing widgets. It contains a Monaco editor, live preview pane, event inspector, node graph editor, AI generation panel, manifest editor, version history, and a publish pipeline. Lab is a Creator+ tier feature, desktop-browser-first.

**Prerequisite:** Layer 0 (Kernel) complete, Layer 1 (Social) complete, Layer 3 (Runtime) complete. Lab imports from all three lower layers.

---

## 1. Lab Architecture Overview

### What Lives in the Lab

```
src/lab/
├── index.ts                    # Layer barrel — public API
├── init.ts                     # initLab() / teardownLab()
├── init.test.ts
├── editor/
│   ├── editor.tsx              # Monaco editor wrapper
│   ├── editor-config.ts        # Language config, completions, error markers
│   ├── autosave.ts             # Explicit autosave with indicator
│   ├── editor.test.ts
│   └── index.ts
├── preview/
│   ├── preview.tsx             # Live preview pane (uses Runtime WidgetFrame)
│   ├── preview-modes.ts        # 2D isolated, 2D canvas context, 3D spatial
│   ├── preview.test.ts
│   └── index.ts
├── inspector/
│   ├── inspector.tsx           # Event inspector panel
│   ├── inspector-store.ts      # Ephemeral event log (never persisted)
│   ├── inspector.test.ts
│   └── index.ts
├── graph/
│   ├── graph.tsx               # Node graph visual editor
│   ├── nodes.ts                # Node type definitions (emit, subscribe, setState, etc.)
│   ├── compiler.ts             # Graph → single-file HTML compiler
│   ├── sync.ts                 # Graph ↔ text editor synchronization
│   ├── graph.test.ts
│   └── index.ts
├── ai/
│   ├── ai-panel.tsx            # AI generation panel UI
│   ├── generator.ts            # Prompt → widget HTML via platform proxy
│   ├── validator.ts            # Validate generated HTML structure
│   ├── ai.test.ts
│   └── index.ts
├── manifest/
│   ├── manifest-editor.tsx     # Manifest editor GUI
│   ├── breaking-change.ts      # Detect breaking changes in event contract
│   ├── manifest.test.ts
│   └── index.ts
├── versions/
│   ├── version-history.tsx     # Snapshot list UI
│   ├── snapshot.ts             # Save/restore logic
│   ├── versions.test.ts
│   └── index.ts
├── publish/
│   ├── pipeline.ts             # Validate → Test → Thumbnail → Submit
│   ├── validator.ts            # Bridge protocol compliance checker
│   ├── test-runner.ts          # Headless Runtime sandbox test
│   ├── thumbnail.ts            # Screenshot capture
│   ├── publish.test.ts
│   └── index.ts
├── import/
│   ├── import.tsx              # Widget fork UI
│   ├── license-check.ts       # License validation before fork
│   ├── import.test.ts
│   └── index.ts
└── script/
    ├── script-editor.tsx       # Lightweight textarea for canvas scripts
    ├── script.test.ts
    └── index.ts
```

### Dependency Rule

Lab imports from lower layers only:

```typescript
// ✅ Allowed
import { bus } from 'src/kernel/bus';
import { type WidgetManifest } from '@sn/types';
import { WidgetFrame } from 'src/runtime';       // L3 — for preview
import { PresenceManager } from 'src/social';     // L1 — for collaborative editing

// ❌ Forbidden
import { CanvasViewport } from 'src/canvas/core'; // L4A
import { SpatialScene } from 'src/spatial';       // L4B
import { MarketplaceAPI } from 'src/marketplace'; // L5
import { ShellRouter } from 'src/shell';          // L6
```

Lab may stub L4A-3 pipeline wiring UI (the publish pipeline's submit step can be stubbed until L5 is built).

---

## 2. Monaco Editor

### 2.1 Editor Component

```typescript
interface EditorProps {
  /** Current widget source (single-file HTML) */
  source: string;
  /** Called on every edit */
  onChange: (source: string) => void;
  /** Whether source has unsaved changes */
  isDirty: boolean;
  /** Error markers from validation */
  markers?: EditorMarker[];
}

interface EditorMarker {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}
```

### 2.2 Editor Rules

- Use Monaco editor exclusively for the main IDE. Do NOT substitute CodeMirror or textarea (except Script mode — see below).
- Works on one file at a time: the single-file HTML widget.
- Provide HTML/JS/CSS syntax highlighting, autocompletion, and error markers.
- Autocompletions include `StickerNest.*` SDK API methods with parameter hints.
- Error markers are set from validation results (bridge protocol compliance, blocked patterns).

### 2.3 Autosave

- Autosave is explicit and visible — show "Saving..." indicator during save, "Saved" after.
- Autosave triggers after a configurable debounce (default 2s after last keystroke).
- Unsaved state indicator ("Unsaved changes") must be visible in the tab/title bar.
- Manual save via Ctrl/Cmd+S is always available.
- Do NOT persist unsaved changes silently — the creator must know when saves happen.

---

## 3. Live Preview

### 3.1 Preview Component

```typescript
interface PreviewProps {
  /** Widget source to preview */
  source: string;
  /** Preview mode */
  mode: PreviewMode;
  /** Theme tokens to inject */
  theme: ThemeTokens;
  /** Event handler for inspector */
  onEvent: (event: InspectorEvent) => void;
}

type PreviewMode =
  | '2d-isolated'     // Widget in standalone frame, no canvas context
  | '2d-canvas'       // Widget rendered as if placed on a real canvas
  | '3d-spatial';     // Widget in simulated spatial environment
```

### 3.2 Preview Rules

- Live preview ALWAYS runs inside a full Runtime sandbox (`<WidgetFrame>`). Import from `src/runtime/`.
- **NEVER eval or execute lab code directly in the host page context.** This is a hard security rule.
- Preview updates in real time as editor content changes (debounced rebuild — default 500ms after last keystroke).
- Preview receives the same theme tokens as production widgets would.
- Preview session event traffic feeds into the inspector panel in real time.

### 3.3 Preview Modes

| Mode | Description | Canvas Context |
|---|---|---|
| `2d-isolated` | Widget in standalone frame, no spatial data | None |
| `2d-canvas` | Widget rendered as if on a real canvas with mock entities | Mock canvas data |
| `3d-spatial` | Widget in simulated spatial environment | Mock spatial context |

---

## 4. Event Inspector

### 4.1 Inspector Component

```typescript
interface InspectorProps {
  /** Event log (ephemeral) */
  events: InspectorEvent[];
  /** Clear all events */
  onClear: () => void;
}

interface InspectorEvent {
  /** Event type string */
  type: string;
  /** Event payload (pretty-printed) */
  payload: unknown;
  /** Direction: emitted by widget or received by widget */
  direction: 'emitted' | 'received';
  /** Timestamp */
  timestamp: number;
  /** Source widget (for multi-widget previews) */
  source?: string;
}
```

### 4.2 Inspector Rules

- Display all events emitted and received by the preview widget during the session.
- Show: event type, payload (pretty-printed JSON), direction, timestamp.
- Provide clear/reset button scoped to the current preview session.
- Inspector state is **ephemeral** — never persist logs to any store or DB.
- Do NOT show inspector in any non-Lab context. It is a developer tool only.
- Support filtering by event type and direction.

---

## 5. Node Graph Editor

### 5.1 Graph Component

```typescript
interface GraphProps {
  /** Current graph state */
  graph: WidgetGraph;
  /** Update handler */
  onChange: (graph: WidgetGraph) => void;
  /** Whether graph↔text sync is active */
  syncEnabled: boolean;
}

interface WidgetGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

type NodeType =
  | 'emit'          // StickerNest.emit()
  | 'subscribe'     // StickerNest.subscribe()
  | 'setState'      // StickerNest.setState()
  | 'getState'      // StickerNest.getState()
  | 'transform'     // Map/filter/transform data
  | 'condition'     // If/else branching
  | 'timer'         // setInterval/setTimeout
  | 'integration';  // StickerNest.integration().query/mutate

interface GraphEdge {
  id: string;
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  targetPort: string;
}
```

### 5.2 Graph → Text Compilation

The graph compiler produces valid single-file HTML:

```typescript
interface GraphCompiler {
  /** Compile graph to single-file HTML widget source */
  compile(graph: WidgetGraph): string;
  /** Parse single-file HTML back to graph (best-effort) */
  decompile(source: string): WidgetGraph | null;
}
```

### 5.3 Graph ↔ Text Synchronization

- Editing the graph updates the text editor and vice versa.
- When sync is not possible (user edited compiled output manually in ways the decompiler can't parse), show "text-only mode" indicator and disable graph sync.
- User can explicitly reset to re-enable graph sync (warning: this regenerates the text from the graph, discarding manual edits).

---

## 6. AI Generation

### 6.1 AI Panel Component

```typescript
interface AIPanelProps {
  /** Submit a generation prompt */
  onGenerate: (prompt: string) => Promise<GenerationResult>;
  /** Whether a generation is in progress */
  isGenerating: boolean;
  /** Last generation result */
  lastResult: GenerationResult | null;
}

interface GenerationResult {
  success: boolean;
  source?: string;          // Generated widget HTML
  error?: string;           // Error message if failed
  validationErrors?: string[]; // Structure validation issues
}
```

### 6.2 AI Generation Rules

- AI generation sends prompts through the **platform's API proxy**. Lab NEVER holds, reads, or logs API keys.
- There are NO API keys anywhere in `src/lab/**`. If someone suggests adding one, refuse and route through the proxy.
- Generated output must be valid single-file HTML. Validate structure before loading in preview.
- If validation fails: show error to creator with raw output and specific issues — do NOT silently discard.
- Generated widgets load into the preview pane automatically on successful generation.
- Do NOT auto-publish AI-generated widgets. Creator must go through the full publish pipeline.

### 6.3 Generation Prompt Template

The generator prepends context to the user's prompt:

```
You are generating a StickerNest widget. The widget is a single-file HTML document.
The StickerNest SDK is available as window.StickerNest — do NOT include the SDK source.

Required lifecycle:
1. StickerNest.register({ ... }) — declare your event contract
2. StickerNest.ready() — signal initialization complete

Available SDK methods: emit(), subscribe(), setState(), getState(), getConfig(),
onThemeChange(), onResize()

Theme tokens are CSS variables: --sn-bg, --sn-surface, --sn-accent, --sn-text, etc.

User request: {userPrompt}
```

---

## 7. Manifest Editor

### 7.1 Manifest Editor Component

```typescript
interface ManifestEditorProps {
  /** Current manifest */
  manifest: WidgetManifest;
  /** Update handler */
  onChange: (manifest: WidgetManifest) => void;
  /** Breaking change warnings */
  warnings: BreakingChangeWarning[];
}

interface BreakingChangeWarning {
  field: string;
  description: string;
  severity: 'breaking' | 'deprecation';
  requiresMajorBump: boolean;
}
```

### 7.2 Breaking Change Detection

When the creator modifies the manifest in a way that breaks the existing event contract:
- Removing a previously declared emit event type → **breaking change**
- Removing a previously declared subscribe event type → **breaking change**
- Renaming an event type → **breaking change** (detected as remove + add)
- Adding new events → **non-breaking** (minor version bump)
- Changing config schema → **potentially breaking** (warning)

On breaking change: show warning indicating a semver major bump is required before publish.

### 7.3 Config Schema → JSON Schema

The manifest editor produces valid JSON schemas via `z.toJSONSchema()` for config schema fields. Do NOT hand-roll JSON schema output — use the canonical Zod-based generation from `@sn/types`.

---

## 8. Version History

### 8.1 Snapshot Interface

```typescript
interface Snapshot {
  id: string;
  label: string;
  timestamp: string;
  source: string;             // Full widget HTML at snapshot time
  manifest: WidgetManifest;   // Manifest at snapshot time
  createdBy: string;          // userId
}

interface VersionManager {
  /** Save a named snapshot */
  save(label: string): Promise<Snapshot>;
  /** List all snapshots for this widget */
  list(widgetId: string): Promise<Snapshot[]>;
  /** Restore a snapshot (with confirmation) */
  restore(snapshotId: string): Promise<{ source: string; manifest: WidgetManifest }>;
  /** Delete a snapshot */
  delete(snapshotId: string): Promise<void>;
}
```

### 8.2 Version History Rules

- Save snapshot on explicit creator action (not on every keystroke).
- Allow restore to any previous snapshot. **Confirm before overwriting** current state.
- Snapshots store: full HTML source, manifest at time of snapshot, and a label.
- Do NOT store snapshots in the event bus or canvas state — save to backend via kernel API calls.
- Version history is scoped to the widget, not the Lab session.
- Snapshots can be named or auto-labeled with timestamp.

---

## 9. Publish Pipeline

### 9.1 Pipeline Steps

The publish pipeline runs these steps **in order**. No step can be skipped.

```typescript
interface PublishPipeline {
  /** Run the full pipeline */
  execute(source: string, manifest: WidgetManifest): Promise<PublishResult>;
}

interface PublishResult {
  success: boolean;
  step: 'validate' | 'test' | 'thumbnail' | 'submit';
  error?: string;
  thumbnailUrl?: string;
}
```

#### Step 1: Validate

Check widget HTML against the bridge protocol spec:
- `StickerNest.register(manifest)` is called
- `StickerNest.ready()` is called
- Manifest is valid per `WidgetManifestSchema`
- No blocked code patterns (eval, document.cookie, window.parent, fetch, etc.)
- Widget HTML is well-formed

Reject if validation fails — show specific failure reason with actionable guidance.

#### Step 2: Test

Run the widget in a headless Runtime sandbox:
- Confirm READY signal within 500ms
- Confirm no uncaught errors on load
- Confirm manifest registration completes

#### Step 3: Thumbnail

Take a screenshot of the widget in preview for the Marketplace listing:
- Use Playwright with `--use-gl=swiftshader` for deterministic, GPU-free rendering
- Standard thumbnail size: 400x300px
- Fallback: use a default placeholder if screenshot fails

#### Step 4: Submit

Send validated widget + manifest + thumbnail to the Marketplace API:
- Widget HTML source
- Validated manifest
- Thumbnail image
- Version information

**Stub:** While `src/marketplace/**` (L5) is not yet built, stub the submit step to log the payload and confirm success in UI. The stub allows the full pipeline to be tested end-to-end before L5 lands.

---

## 10. Widget Import (Fork)

### 10.1 Import Flow

```typescript
interface WidgetImporter {
  /** Load a widget from Marketplace into Lab */
  import(widgetId: string): Promise<ImportResult>;
}

interface ImportResult {
  success: boolean;
  source?: string;
  manifest?: WidgetManifest;
  error?: string;
  licenseDenied?: boolean;
}
```

### 10.2 Import Rules

- On import: load widget HTML source into editor, manifest into manifest editor.
- Creator starts with a full copy — Lab does NOT link back to the original.
- Mark imported widgets clearly as **forks** in the UI. Do not imply the creator authored the original.
- **Respect widget license metadata.** If the license is `no-fork` or `proprietary`, show error and do NOT load the source.
- Check license BEFORE fetching source code — don't download then discard.

---

## 11. Script Mode

### 11.1 Script Editor

A lightweight alternative to the full IDE, available to lower-tier users:

```typescript
interface ScriptEditorProps {
  /** Script source */
  source: string;
  /** Update handler */
  onChange: (source: string) => void;
  /** Attached inspector */
  inspector: InspectorEvent[];
}
```

### 11.2 Script Rules

- Uses a textarea (NOT Monaco) — simpler, lower resource usage
- Accompanied by the event inspector for testing
- Scripts are headless JS automation on the event bus (no UI rendering)
- Scripts are NOT publishable to the Marketplace as standalone items
- Scripts CAN be bundled with a widget or canvas template
- Available to lower-tier users (not Creator+ gated)

---

## 12. Access Control

### 12.1 Route Guard

```typescript
// Lab route guard (at route level, not inside components)
function LabRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, tier } = useAuthStore();

  if (!user) return <Redirect to="/login" />;
  if (tier < 'creator') return <UpgradePrompt feature="Widget Lab" />;
  return children;
}
```

### 12.2 Access Rules

- Widget Lab is a **Creator+ tier** feature. Gate at the route level.
- Non-Creator+ users hitting `/lab/**` see an upgrade prompt, NOT an empty IDE or error.
- Do NOT implement access control inside individual Lab components — do it once at the route guard.
- Script mode (lightweight textarea + inspector) is available to lower-tier users.

### 12.3 Mobile Handling

- Lab is **desktop-browser-first**. Do NOT build a mobile layout for the IDE.
- Viewports narrower than 1024px render a redirect prompt: "Widget Lab requires a desktop browser."
- Provide a link to continue on desktop (copy URL or email link).
- Do NOT attempt to make Monaco or the node graph work on mobile — redirect prompt is correct.

---

## 13. Kernel + Lower Layer Infrastructure Used by Lab

| Component | Location | How Lab Uses It |
|---|---|---|
| Event Bus | `src/kernel/bus/bus.ts` | Inspector captures bus events during preview sessions |
| widgetStore | `src/kernel/stores/widget/widget.store.ts` | Widget registry for import, manifest validation |
| WidgetManifest | `src/kernel/schemas/widget-manifest.ts` | Manifest editor, validation, publish pipeline |
| authStore | `src/kernel/stores/auth/` | Creator+ tier check for route guard |
| WidgetFrame | `src/runtime/WidgetFrame.tsx` | Preview pane always uses Runtime sandbox |
| Bridge Protocol | `src/runtime/bridge/` | Preview session uses same bridge as production |
| Supabase client | `src/kernel/supabase/` | Version history persistence, publish submission |

---

## 14. Testing Strategy

### 14.1 Testing Stack

| Tool | Purpose |
|---|---|
| **Vitest** | Unit and integration tests |
| **jsdom** | DOM environment for React component tests |
| **@testing-library/react** | React component testing |
| **Playwright** | E2E tests (publish pipeline thumbnail, full round-trip) |
| **Vitest Coverage** | 80% threshold |

### 14.2 Test Categories

#### Editor Tests

```typescript
describe('Editor', () => {
  it('renders Monaco editor with widget source')
  it('calls onChange on edit')
  it('shows unsaved indicator when dirty')
  it('provides StickerNest SDK autocompletions')
  it('displays error markers from validation')
  it('autosaves after 2s debounce')
  it('manual save via Ctrl+S')
})
```

#### Preview Tests

```typescript
describe('Preview', () => {
  it('runs widget inside Runtime WidgetFrame sandbox')
  it('never evals code in host page context')
  it('updates preview on source change (debounced)')
  it('injects theme tokens into preview')
  it('feeds events to inspector in real time')
  it('supports 2D isolated mode')
  it('supports 2D canvas context mode')
  it('supports 3D spatial context mode')
})
```

#### Inspector Tests

```typescript
describe('Inspector', () => {
  it('displays emitted events with type, payload, timestamp')
  it('displays received events with direction indicator')
  it('clear button resets event log')
  it('filters events by type')
  it('state is ephemeral — not persisted')
  it('not rendered outside Lab context')
})
```

#### AI Generation Tests

```typescript
describe('AIGeneration', () => {
  it('sends prompt through platform proxy (no API key in Lab)')
  it('validates generated HTML structure before loading')
  it('shows error with raw output on invalid generation')
  it('loads valid generation into preview automatically')
  it('does not auto-publish generated widgets')
})
```

#### Manifest Editor Tests

```typescript
describe('ManifestEditor', () => {
  it('displays all manifest fields')
  it('validates manifest against WidgetManifestSchema')
  it('detects breaking change: removed emit event')
  it('detects breaking change: removed subscribe event')
  it('shows major bump warning on breaking change')
  it('generates JSON schema via z.toJSONSchema()')
})
```

#### Publish Pipeline Tests

```typescript
describe('PublishPipeline', () => {
  it('Step 1: validates bridge protocol compliance')
  it('Step 1: rejects widget without register() call')
  it('Step 1: rejects widget without ready() call')
  it('Step 1: rejects widget with blocked code patterns')
  it('Step 2: confirms READY signal within 500ms')
  it('Step 2: catches uncaught errors on load')
  it('Step 3: generates thumbnail screenshot')
  it('Step 4: submits to Marketplace API (or stub)')
  it('pipeline stops at first failure — no skipping')
  it('shows specific failure reason with guidance')
})
```

#### Import Tests

```typescript
describe('WidgetImport', () => {
  it('loads widget source into editor')
  it('loads manifest into manifest editor')
  it('marks widget as fork in UI')
  it('rejects no-fork licensed widgets with error')
  it('rejects proprietary licensed widgets with error')
  it('checks license before fetching source')
})
```

#### Access Control Tests

```typescript
describe('AccessControl', () => {
  it('non-Creator+ user sees upgrade prompt at /lab')
  it('Creator+ user sees full IDE at /lab')
  it('unauthenticated user redirected to /login')
  it('mobile viewport shows desktop redirect prompt')
  it('script mode available to lower-tier users')
})
```

### 14.3 Gate Tests (Required for L2 Completion)

```typescript
describe('L2 Gate Tests', () => {
  it('Gate 1: Create widget in Lab → loads correctly on canvas (full round-trip)')

  it('Gate 2: AI generation → valid HTML → previews in Runtime sandbox')

  it('Gate 3: Manifest breaking change → warning shown before save/publish')

  it('Gate 4: Publish pipeline → validation → thumbnail → Marketplace (or stub)')

  it('Gate 5: Lab route without Creator+ tier → upgrade prompt, IDE not loaded')

  it('Gate 6: Lab on mobile viewport → redirect prompt, IDE not loaded')

  it('Gate 7: Import no-fork widget → error shown, source not loaded')

  it('Gate 8: Preview receives correct theme tokens on load and theme change')
})
```

### 14.4 Coverage Requirements

| Module | Minimum Coverage |
|---|---|
| `editor/editor.tsx` | 80% |
| `editor/autosave.ts` | 85% |
| `preview/preview.tsx` | 85% |
| `inspector/inspector.tsx` | 80% |
| `graph/compiler.ts` | 85% |
| `graph/sync.ts` | 80% |
| `ai/generator.ts` | 80% |
| `ai/validator.ts` | 90% |
| `manifest/manifest-editor.tsx` | 80% |
| `manifest/breaking-change.ts` | 90% |
| `publish/pipeline.ts` | 90% |
| `publish/validator.ts` | 95% |
| `import/license-check.ts` | 90% |
| `versions/snapshot.ts` | 85% |
| **Lab overall** | **80%** |

---

## 15. Build Order & Task Dependencies

### Phase 1: Editor Foundation

```
L3 Complete ──→ LAB-EDITOR ──→ LAB-AUTOSAVE
              ──→ LAB-PREVIEW ──→ LAB-INSPECTOR
```

**Tasks:**
- `LAB-EDITOR`: Monaco editor wrapper with syntax highlighting, autocompletions, error markers
- `LAB-AUTOSAVE`: Debounced autosave with visible indicator
- `LAB-PREVIEW`: Live preview pane using Runtime WidgetFrame (3 modes)
- `LAB-INSPECTOR`: Event inspector panel (ephemeral event log, filter, clear)

### Phase 2: Manifest + Versions

```
LAB-EDITOR ──→ LAB-MANIFEST ──→ LAB-BREAKING-CHANGE
LAB-EDITOR ──→ LAB-VERSIONS
```

**Tasks:**
- `LAB-MANIFEST`: Manifest editor GUI with validation
- `LAB-BREAKING-CHANGE`: Breaking change detection for event contract modifications
- `LAB-VERSIONS`: Snapshot save/restore with named labels

### Phase 3: AI Generation + Graph

```
LAB-PREVIEW ──→ LAB-AI-GENERATOR ──→ LAB-AI-VALIDATOR
LAB-EDITOR ──→ LAB-GRAPH ──→ LAB-GRAPH-COMPILER ──→ LAB-GRAPH-SYNC
```

**Tasks:**
- `LAB-AI-GENERATOR`: AI generation panel routing through platform proxy
- `LAB-AI-VALIDATOR`: HTML structure validation for generated widgets
- `LAB-GRAPH`: Node graph visual editor (emit, subscribe, setState, transform, etc.)
- `LAB-GRAPH-COMPILER`: Graph → single-file HTML compilation
- `LAB-GRAPH-SYNC`: Bidirectional graph ↔ text synchronization

### Phase 4: Publish + Import

```
LAB-MANIFEST + LAB-PREVIEW ──→ LAB-PUBLISH-VALIDATE
LAB-PUBLISH-VALIDATE ──→ LAB-PUBLISH-TEST
LAB-PUBLISH-TEST ──→ LAB-PUBLISH-THUMBNAIL
LAB-PUBLISH-THUMBNAIL ──→ LAB-PUBLISH-SUBMIT (stub until L5)
LAB-MANIFEST ──→ LAB-IMPORT ──→ LAB-LICENSE-CHECK
```

**Tasks:**
- `LAB-PUBLISH-VALIDATE`: Bridge protocol compliance checker
- `LAB-PUBLISH-TEST`: Headless sandbox test (READY within 500ms, no uncaught errors)
- `LAB-PUBLISH-THUMBNAIL`: Playwright screenshot capture
- `LAB-PUBLISH-SUBMIT`: Marketplace submission (stubbed until L5)
- `LAB-IMPORT`: Widget fork loader
- `LAB-LICENSE-CHECK`: License validation (reject no-fork/proprietary)

### Phase 5: Access Control + Script Mode + Gate Tests

```
All above ──→ LAB-ROUTE-GUARD
           ──→ LAB-MOBILE-REDIRECT
           ──→ LAB-SCRIPT-MODE
           ──→ LAB-INIT
           ──→ LAB-GATE-TESTS
```

**Tasks:**
- `LAB-ROUTE-GUARD`: Creator+ tier gate at route level
- `LAB-MOBILE-REDIRECT`: Mobile viewport redirect prompt
- `LAB-SCRIPT-MODE`: Lightweight script editor (textarea + inspector)
- `LAB-INIT`: `initLab()` / `teardownLab()` orchestration
- `LAB-GATE-TESTS`: All 8 mandatory gate tests

---

## 16. Security Non-Negotiables

1. **Preview always runs in Runtime sandbox** — never eval lab code in host context
2. **AI generation routes through platform proxy** — no API keys in Lab code, ever
3. **Publish pipeline validation is mandatory** — no skipping steps for any reason
4. **Import respects widget license** — do not load source if license prohibits forking
5. **No direct store access from widgets** — even in preview, widgets use the SDK only

---

## Appendix A: Widget Single-File HTML Format

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Widget CSS here — use theme tokens */
    .widget { color: var(--sn-text); background: var(--sn-surface); }
  </style>
</head>
<body>
  <div class="widget">
    <!-- Widget HTML here -->
  </div>

  <script>
    // Register event contract
    StickerNest.register({
      id: 'my-widget',
      name: 'My Widget',
      version: '1.0.0',
      events: {
        emits: [{ name: 'my:event', description: 'Emitted when...' }],
        subscribes: [{ name: 'other:event', description: 'Handles...' }],
      },
    });

    // Initialize widget
    StickerNest.subscribe('other:event', (payload) => {
      // Handle incoming events
    });

    // Signal ready
    StickerNest.ready();
  </script>
</body>
</html>
```

## Appendix B: Key Decisions

| Decision | Rationale |
|---|---|
| Monaco for main IDE, textarea for Script mode | Full IDE power for creators, lightweight for scripters |
| Preview always uses Runtime sandbox | Security parity between dev and production |
| AI via platform proxy only | Zero API key exposure risk |
| 4-step publish pipeline, no skipping | Quality gate for marketplace widgets |
| License check before source fetch | Don't download source that can't be used |
| Graph ↔ text sync with fallback | Best of both worlds, graceful degradation |
| Creator+ tier gate at route level | Single enforcement point, not scattered |
| Desktop-first with mobile redirect | Monaco/graph don't work on mobile, redirect is honest |
| Snapshots on explicit action only | Avoid storage bloat from automatic snapshots |
