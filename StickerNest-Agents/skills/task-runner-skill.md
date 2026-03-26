# Task Runner Skill — Code Writing Agent

> Primary code-writing agent for StickerNest V5. Layer-aware, test-driven, and architecturally strict.

---

## Pre-Task Checklist

Before writing ANY code, complete these steps:

1. **Identify the target layer** — Which `src/` directory does this task live in?
2. **Read the layer rule file** — Open `.claude/rules/L*.md` for that layer. Read it fully.
3. **Check import rules** — Know exactly which layers you may import from.
4. **Read acceptance criteria** — From the task, story file, or Kimber's request.
5. **Check for existing scaffolding** — Is there already a file structure in place?

---

## Layer Quick Reference

| Layer | Path | Allowed Imports | Commit Scope |
|-------|------|----------------|-------------|
| L0 Kernel | `src/kernel/**` | nothing (external packages only) | `kernel` |
| L1 Social | `src/social/**` | L0 | `social` |
| L3 Runtime | `src/runtime/**` | L0 | `runtime` |
| L2 Lab | `src/lab/**` | L0, L1, L3 | `lab` |
| L4A-1 Core | `src/canvas/core/**` | L0, L3 | `canvas-core` |
| L4A-2 Tools | `src/canvas/tools/**` | L0, L3, L4A-1 | `canvas-tools` |
| L4A-3 Wiring | `src/canvas/wiring/**` | L0, L3, L4A-1 | `canvas-wiring` |
| L4A-4 Panels | `src/canvas/panels/**` | L0, L3, L4A-1 | `canvas-panels` |
| L4B Spatial | `src/spatial/**` | L0, L3 | `spatial` |
| L5 Marketplace | `src/marketplace/**` | L0, L1, L3, L4A-1 | `marketplace` |
| L6 Shell | `src/shell/**` | L0, L1, L3, L4A-1, L4B, L5 | `shell` |

---

## Coding Workflow

### Step 1: Branch

```bash
git checkout -b feat/<scope>/<short-description>
# Example: git checkout -b feat/runtime/cross-canvas-events
```

Branch naming: `<type>/<scope>/<description>` where type is `feat`, `fix`, `refactor`, `test`, or `chore`.

### Step 2: Write Code

Follow these rules without exception:

- **Use `@sn/types`** for all shared types — never define types locally that exist in `src/kernel/schemas/`
- **Use Zod v4+** for all validation
- **Use the event bus** for cross-store communication — stores never read each other
- **Never import across layer boundaries** — if you need data from another layer, use the bus
- **Widget HTML is single-file** — HTML + JS + CSS in one `.html` file
- **Widget SDK is injected** — never bundle it into widget files
- **`srcdoc` only** — never set iframe `src` to a remote URL
- **Origin validation** — mandatory on every `message` handler

### Step 3: Write Tests

Every module gets a co-located `*.test.ts` file.

```
src/runtime/bridge/protocol.ts
src/runtime/bridge/protocol.test.ts   ← co-located
```

Target: 80% coverage (branches, functions, lines, statements).

Test environment by layer:
- `node` (default): kernel, lab, marketplace
- `happy-dom`: runtime, shell, spatial, social

Use Vitest. Available APIs: `describe`, `it`, `expect`, `vi.fn()`, `vi.mock()`, `bench()`.

### Step 4: Validate

Run these in order. Fix any failures before committing.

```bash
npm run lint          # ESLint with boundary enforcement
npm test              # Vitest (all unit tests)
npm run deps:validate # dependency-cruiser layer checks
npm run typecheck     # tsc --noEmit
```

### Step 5: Commit

```bash
git add <specific-files>
git commit -m "<type>(<scope>): <description>"
```

Commit format: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`
- Scope must match the layer (see table above)
- Example: `feat(runtime): add cross-canvas event emission`

---

## Ralph Loop Integration

When a story file exists at `.ralph/current-story.md`:

1. Read the story file — it contains acceptance criteria and context
2. Follow acceptance criteria exactly — they are the definition of done
3. Log progress notes in the story file as you work
4. When all acceptance criteria are met, mark the story as complete

---

## Scaffolding Generators

Use these to create new boilerplate:

```bash
npm run scaffold:widget   # New widget with manifest, HTML, test
npm run scaffold:module   # New module with index, types, test
npm run scaffold:schema   # New Zod schema in kernel/schemas
npm run scaffold:event    # New bus event type definition
npm run scaffold:store    # New Zustand store with bus subscriptions
```

Always prefer scaffolding over manual file creation — it ensures consistent structure.

---

## Error Recovery

### Lint Fails
Fix the code, not the lint config. If `eslint-plugin-boundaries` flags an import, you imported across a layer boundary. Move the code or use the event bus.

### Tests Fail
Fix the code, not the test (unless the test itself has a bug). If a test expectation is wrong because requirements changed, update the test AND document the change.

### Dependency-Cruiser Violation
You imported across a layer boundary. Options:
- Move the imported code to a shared location (kernel schemas)
- Use the event bus instead of direct import
- Restructure the module to avoid the cross-layer dependency

### TypeScript Errors
Run `npm run typecheck` frequently. Common fixes:
- Missing type export from `@sn/types` → add to `src/kernel/schemas/index.ts`
- Zod schema mismatch → update schema, re-export, check all consumers

---

## Code Quality Standards

- All shared types in `src/kernel/schemas/`, exported from `index.ts`
- All Zod schemas export JSON schema via `z.toJSONSchema()`
- Bus event types use dot-namespaced strings: `widget.mounted`, `social.cursor.moved`
- Each store exports `setup*BusSubscriptions()` called from `initAllStores()`
- Theme tokens: `--sn-bg`, `--sn-surface`, `--sn-accent`, `--sn-text`, `--sn-text-muted`, `--sn-border`, `--sn-radius`, `--sn-font-family`
- Widget state limits: 1MB per instance, 10MB per user across canvases
- Bus latency target: < 1ms emit-to-handler
- READY signal: widgets must call `StickerNest.ready()` within 500ms of load
