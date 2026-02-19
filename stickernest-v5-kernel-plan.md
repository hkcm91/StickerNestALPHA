# StickerNest V5 — Layer 0: Kernel — Complete Build Plan

## Document Purpose

This is the full-spec build plan for Layer 0 (Kernel) of StickerNest V5. It covers the kernel's internal architecture, the development infrastructure around it (MCPs, skills, agents, parallel sessions, Ralph loops), and the testing strategy that gates promotion to Layer 1.

**Iron Rule #1 applies here:** The event bus is layer zero. It exists before the UI. It must be testable without rendering anything.

---

## 1. Kernel Architecture Overview

### What Lives in the Kernel

```
src/core/
├── types/              # Base type definitions (entity IDs, events, contracts)
├── events/             # Event bus engine + middleware pipeline
│   ├── bus.ts          # Core EventBus class (singleton, no React dependency)
│   ├── types.ts        # Event type discriminated unions
│   ├── middleware.ts   # Logging, validation, rate limiting, transform pipeline
│   ├── history.ts      # Ring buffer for last N events per channel
│   └── index.ts        # Barrel export
├── connections/        # Connection system (wiring, transforms, schemas)
│   ├── registry.ts     # Connection graph (who talks to whom)
│   ├── transform.ts    # AI-generated transform pipeline between incompatible widgets
│   ├── schema.ts       # Event payload schema validation (JSON Schema or Zod)
│   └── index.ts
├── store/              # Zustand stores (consolidated from V4's 11+)
│   ├── auth.ts         # useAuthStore — session, permissions, loading
│   ├── workspace.ts    # useWorkspaceStore — current workspace, stickers, CRUD
│   ├── canvas.ts       # useCanvasStore — viewport, selection, active tool, mode
│   ├── spatial.ts      # useSpatialStore — render mode, XR session, environment
│   ├── ui.ts           # useUIStore — panels, modals, toasts, sidebar
│   └── index.ts
├── supabase/           # Supabase client, helpers, RLS utilities
│   ├── client.ts       # Singleton Supabase client
│   ├── auth.ts         # Auth helpers (sign in, sign out, session refresh)
│   ├── realtime.ts     # Realtime channel management (feeds into event bus in Layer 5)
│   └── index.ts
├── config/             # App configuration, feature flags, constants
└── index.ts            # Layer barrel — the public API of the kernel
```

### Dependency Rule

The kernel imports from **nothing above it**. Every other layer imports from the kernel. This is enforced by an ESLint rule:

```javascript
// eslint-plugin-stickernest
"no-upward-imports": ["error", {
  layers: ["core", "runtime", "entities", "canvas-2d", "canvas-spatial", "comms", "lab", "marketplace", "ui"],
  // core (index 0) cannot import from any layer at index > 0
}]
```

---

## 2. Connections

The connection system is the kernel's most architecturally significant subsystem. It governs how widgets discover each other, how data flows between them, and how incompatible schemas get bridged.

### 2.1 Connection Registry

Every widget registers a **contract** when it mounts:

```typescript
interface WidgetContract {
  widgetId: string;
  emits: EventDeclaration[];      // Events this widget produces
  subscribes: EventDeclaration[];  // Events this widget consumes
}

interface EventDeclaration {
  type: string;                    // e.g., "weather:updated"
  description: string;             // Human-readable purpose
  schema?: ZodType;                // Optional payload schema for validation
}
```

The registry maintains a live graph of all connections. This graph is queryable:
- "Which widgets emit `audio:level`?"
- "Which widgets are orphaned (emitting to nobody)?"
- "Which widgets have dead subscriptions (listening for events nobody emits)?"

### 2.2 Connection Transform Pipeline

This is the "intelligence layer" between widgets — the feature that makes StickerNest's ecosystem work even when widget creators never heard of each other.

When Widget A's output schema doesn't match Widget B's input schema, the transform pipeline sits in the middle:

```
Widget A → [emit] → Transform Node → [translated emit] → Widget B
```

Transform nodes are:
- **Persisted as part of canvas state** (so creative mappings survive page reload)
- **Visible as mini-nodes on the connection graph** (click to see/edit the mapping)
- **AI-generatable** — user drags a connection line between incompatible widgets, the system detects the mismatch, and offers to generate a transform

The transform is event bus middleware. It intercepts events on a specific channel and rewrites the payload before delivery:

```typescript
interface ConnectionTransform {
  id: string;
  sourceWidgetId: string;
  targetWidgetId: string;
  sourceEventType: string;
  targetEventType: string;
  transformFn: string;            // Serialized JS function (sandboxed execution)
  createdBy: 'user' | 'ai';
  aiPrompt?: string;              // The prompt that generated this transform
}
```

### 2.3 Data Provider/Consumer Protocol

Widgets can register as data providers — effectively becoming databases:

```typescript
// A Notes Widget registers as a data provider
bus.emit('data:register', {
  widgetId: 'notes-123',
  provides: ['notes', 'docs'],
  capabilities: ['query', 'create', 'update', 'delete']
});

// A Kanban Widget queries for notes
bus.emit('data:query', {
  type: 'notes',
  filter: { tag: 'project-x' },
  replyTo: 'kanban-456'
});

// Notes Widget responds
bus.emit('data:response', {
  to: 'kanban-456',
  results: [...]
});
```

This lives in the kernel because it's a protocol definition — the actual data flow happens through the event bus. Implementation of specific data widgets happens in Layer 2 (Entities) and above.

### 2.4 Build Tasks — Connections

| ID | Task | Acceptance Criteria |
|----|------|-------------------|
| K-CONN-1 | Connection Registry | Widgets can register/unregister contracts. Registry answers graph queries. |
| K-CONN-2 | Schema Validation Middleware | Events with declared schemas are validated. Invalid payloads are rejected with clear errors. |
| K-CONN-3 | Transform Pipeline | Transforms intercept and rewrite events between specific widget pairs. |
| K-CONN-4 | Data Provider Protocol | `data:register`, `data:query`, `data:response` event types work end-to-end. |
| K-CONN-5 | Orphan/Dead Detection | Registry can report orphaned emitters and dead subscribers. |

---

## 3. MCPs (Model Context Protocol Servers)

Three MCP servers support the StickerNest ecosystem. Only the Dev MCP is needed during the kernel build phase.

### 3.1 StickerNest Dev MCP (Build Phase 1 — Critical)

**Purpose:** Eliminates cold-start for every AI session during development. Every Claude Code or Claude.ai conversation starts warm.

**Transport:** stdio (local, runs as subprocess)
**Stack:** TypeScript + MCP SDK + Node.js
**Prefix:** `sn_` (avoids collision with Notion, Supabase, Vercel MCPs)

#### Phase 1 Tools (Build First — Highest Value)

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `sn_get_layer` | Query architecture spec for any layer | `{ layer: 0..8 }` | Layer spec, folder, tasks, acceptance criteria |
| `sn_get_decision` | Recall past architectural decisions | `{ topic: string }` | Decision record with rationale and date |
| `sn_get_glossary` | Consistent terminology | `{ term?: string }` | Definition(s) from StickerNest glossary |
| `sn_project_status` | Where are we right now? | `{}` | Current layer, completed tasks, blockers |

#### Phase 2 Tools (Add When Kernel Code Exists)

| Tool | Purpose |
|------|---------|
| `sn_scaffold_component` | Generate React components following conventions |
| `sn_scaffold_store` | Generate Zustand stores with selectors and actions |
| `sn_scaffold_event_handler` | Generate typed event bus handlers |
| `sn_scaffold_widget` | Generate widget bundles (critical for Layer 1+) |
| `sn_scaffold_hook` | Generate custom React hooks |

#### Phase 3 Tools (Add When Introspection Is Needed)

| Tool | Purpose |
|------|---------|
| `sn_list_files` | Navigate project structure |
| `sn_read_file` | Read code with context |
| `sn_get_types` | Discover TypeScript types |
| `sn_get_imports` | Analyze dependency graph |

#### Phase 4 Tools (Add When Patterns Need Protecting)

| Tool | Purpose |
|------|---------|
| `sn_validate_widget` | Check widget protocol compliance |
| `sn_check_conventions` | Enforce naming/folder/pattern rules |

#### Phase 5 Tools (Add for Task Coordination)

| Tool | Purpose |
|------|---------|
| `sn_get_tasks` | Query Beads task status |
| `sn_update_task` | Mark tasks complete (integrates with Beads) |

#### Data Layer

All MCP data is JSON files in the server's `data/` directory — simple, version-controlled, no database needed:

```
stickernest-dev-mcp-server/
├── src/
│   ├── index.ts
│   ├── tools/
│   │   ├── architecture.ts
│   │   ├── scaffold.ts
│   │   ├── codebase.ts
│   │   ├── conventions.ts
│   │   └── tasks.ts
│   ├── templates/
│   │   ├── component.tsx.tmpl
│   │   ├── store.ts.tmpl
│   │   ├── widget.ts.tmpl
│   │   └── test.ts.tmpl
│   └── data/
│       ├── architecture.json
│       ├── conventions.json
│       ├── glossary.json
│       └── task-status.json
└── dist/
```

#### Claude Code Integration

```json
// ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "stickernest-dev": {
      "command": "node",
      "args": ["/path/to/stickernest-dev-mcp-server/dist/index.js"],
      "env": {
        "STICKERNEST_PROJECT_ROOT": "/path/to/stickernest-v5"
      }
    }
  }
}
```

### 3.2 StickerNest Platform MCP (Build Later — Layer 2+)

Exposes the running platform to AI tools: canvas state, widget registry, sticker CRUD. Not needed for the kernel.

### 3.3 StickerNest Widget MCP (Build Later — Layer 6)

Lets AI tools create, test, and publish widgets. Not needed until Widget Lab.

### 3.4 Build Tasks — MCPs

| ID | Task | Phase |
|----|------|-------|
| K-MCP-1 | Initialize MCP server project (TS + MCP SDK) | Kernel |
| K-MCP-2 | Implement Phase 1 tools (architecture, decision, glossary, status) | Kernel |
| K-MCP-3 | Populate `architecture.json` with all 9 layer specs | Kernel |
| K-MCP-4 | Populate `conventions.json` with naming/folder/pattern rules | Kernel |
| K-MCP-5 | Populate `glossary.json` with StickerNest terminology | Kernel |
| K-MCP-6 | Test MCP in Claude Code session | Kernel |

---

## 4. Skills (Claude Code)

Skills are `.claude/skills/<name>/SKILL.md` files that Claude Code loads automatically based on task context. They're "always-on" expertise that activates when relevant.

### 4.1 Project-Level Skills (`.claude/skills/`)

These live in the StickerNest V5 repo and are version-controlled.

#### `event-bus` Skill

```yaml
---
name: event-bus
description: >
  StickerNest event bus patterns. Use when creating event handlers,
  subscribing to events, emitting events, working with the bus middleware,
  or building widget communication. Triggers on: event, emit, subscribe,
  bus, middleware, channel.
---
```

Content includes: event naming conventions (`domain:action` format), middleware ordering rules, how to register widget contracts, the transform pipeline API, and anti-patterns to avoid (like subscribing in render loops).

#### `zustand-store` Skill

```yaml
---
name: zustand-store
description: >
  StickerNest Zustand store conventions. Use when creating or modifying
  stores, defining selectors, persisting state, or managing store
  subscriptions. Triggers on: store, zustand, state, selector, persist.
---
```

Content includes: the 5-store architecture (auth, workspace, canvas, spatial, ui), selector patterns for preventing re-renders, action naming conventions (`verbNoun` format), persistence rules (what goes to Supabase vs localStorage), and the import ban on cross-store dependencies.

#### `layer-rules` Skill

```yaml
---
name: layer-rules
description: >
  StickerNest architectural layer rules. Use when importing modules,
  creating new files, or working across layer boundaries. Triggers on:
  import, layer, architecture, dependency, boundary.
---
```

Content includes: the 9-layer hierarchy with import rules, the barrel export pattern, how to check if an import violates layering, and the three iron rules.

#### `testing` Skill

```yaml
---
name: testing
description: >
  StickerNest testing patterns and conventions. Use when writing tests,
  creating mocks, setting up test fixtures, or following TDD.
  Triggers on: test, vitest, mock, fixture, assert, expect, TDD.
---
```

Content includes: Vitest configuration, the Arrange-Act-Assert pattern, how to test event bus handlers without React, mock factories for Supabase/auth, and the coverage thresholds.

#### `widget-contract` Skill

```yaml
---
name: widget-contract
description: >
  StickerNest widget contract protocol. Use when defining widget interfaces,
  registering emits/subscribes, validating widget communication, or
  building the connection graph. Triggers on: widget, contract, emits,
  subscribes, connection, protocol.
---
```

Content includes: the WidgetContract interface, EventDeclaration format, how transforms bridge incompatible schemas, and the data provider/consumer protocol.

### 4.2 User-Level Skills (`~/.claude/skills/`)

These are personal workflow skills that span all projects.

#### `ralph-workflow` Skill

Activates when Claude detects it's running inside a Ralph loop. Instructs Claude to: check Beads for the next ready task, implement it, run tests, commit with a conventional message, mark the bead complete, and exit cleanly.

#### `notion-sync` Skill

Activates when Claude needs to log progress. Instructs Claude to push status updates to your Notion Dev Hub database via the Unified MCP.

### 4.3 Build Tasks — Skills

| ID | Task |
|----|------|
| K-SKILL-1 | Create `event-bus` skill with full API reference and patterns |
| K-SKILL-2 | Create `zustand-store` skill with 5-store architecture |
| K-SKILL-3 | Create `layer-rules` skill with import enforcement |
| K-SKILL-4 | Create `testing` skill with Vitest patterns |
| K-SKILL-5 | Create `widget-contract` skill with connection protocol |
| K-SKILL-6 | Create `ralph-workflow` user skill |

---

## 5. Agents (Claude Code Subagents)

Subagents are specialized Claude Code instances with focused system prompts and restricted tool access. They run in isolated context windows and return results to the main session.

### 5.1 Project-Level Agents (`.claude/agents/`)

#### `architect` Agent

```yaml
---
name: architect
description: >
  Reviews code for architectural compliance. Use when checking layer
  boundaries, import rules, or pattern adherence. Read-only — never
  modifies code.
tools: Read, Glob, Grep
model: sonnet
---
```

Checks: layer import violations, store cross-dependencies, event bus usage patterns, barrel export completeness. Returns a compliance report.

#### `event-bus-debugger` Agent

```yaml
---
name: event-bus-debugger
description: >
  Diagnoses event bus issues. Use when events aren't flowing, widgets
  aren't communicating, or transforms are producing unexpected output.
tools: Read, Glob, Grep, Bash
model: sonnet
---
```

Traces event flow through the bus, checks middleware ordering, validates transform functions, identifies orphaned/dead subscriptions.

#### `test-writer` Agent

```yaml
---
name: test-writer
description: >
  Writes tests for StickerNest modules. Follows project testing conventions.
  Given a source file, generates comprehensive test coverage.
tools: Read, Write, Glob, Grep, Bash
model: sonnet
---
```

Generates Vitest tests following the project's testing skill. Runs the tests to verify they pass. Focuses on edge cases and error paths.

#### `code-reviewer` Agent

```yaml
---
name: code-reviewer
description: >
  Reviews code for quality, security, and adherence to StickerNest
  conventions. Provides specific, actionable feedback.
tools: Read, Glob, Grep
model: sonnet
memory: project
---
```

Reviews PRs and code changes. Has project-scoped memory so it learns recurring patterns and issues across sessions.

### 5.2 Agent Workflow During Kernel Build

The typical flow for implementing a kernel task:

1. **Main session** reads the task from Beads, plans the approach
2. **Main session** implements the code
3. **`test-writer` subagent** generates tests (parallel — isolated context)
4. **`architect` subagent** checks compliance (parallel — read-only)
5. **Main session** reviews subagent outputs, fixes issues, commits

### 5.3 Build Tasks — Agents

| ID | Task |
|----|------|
| K-AGENT-1 | Create `architect` agent with layer rule checking |
| K-AGENT-2 | Create `event-bus-debugger` agent |
| K-AGENT-3 | Create `test-writer` agent with testing skill integration |
| K-AGENT-4 | Create `code-reviewer` agent with project memory |

---

## 6. Parallel Sessions (Agent Teams)

Agent Teams are multiple full Claude Code sessions that coordinate via a shared task list and direct messaging. They're the heavy-duty parallelization tool — more expensive than subagents (~3-5x tokens) but capable of independent, sustained work.

### 6.1 When to Use Agent Teams for the Kernel

Agent teams are justified for the kernel in two scenarios:

**Scenario A: Initial Scaffold Sprint**

Spawn a 3-member team to parallelize the initial setup:

```
Team Lead:    Coordinates, reviews, merges
Teammate 1:   Project scaffold (Vite, TS, ESLint, folder structure, CI)
Teammate 2:   Type system (all core interfaces, discriminated unions, Zod schemas)
Teammate 3:   Supabase client + auth helpers (client setup, auth flows, RLS utilities)
```

These three workstreams have zero file overlap and can proceed simultaneously.

**Scenario B: Store + Bus Parallel Build**

Once the type system exists, the event bus and Zustand stores can be built in parallel:

```
Team Lead:    Coordinates, ensures stores wire into bus correctly
Teammate 1:   Event bus (core engine, middleware, history, wildcard subs)
Teammate 2:   Zustand stores (auth, workspace, canvas, spatial, ui — all 5)
Teammate 3:   Connection system (registry, transforms, schema validation)
```

### 6.2 When NOT to Use Agent Teams

Don't use teams for:
- Single-file tasks (subagent or single session is cheaper)
- Tasks with tight sequential dependencies (agents will block each other)
- Debugging (use the `event-bus-debugger` subagent instead)

### 6.3 Team Configuration

```bash
# Enable agent teams (still experimental)
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Start a session
claude

# Prompt to spawn the scaffold team:
"Create an agent team for the StickerNest V5 kernel scaffold.
Spawn 3 teammates:
1. Scaffold Engineer — Set up Vite, TS strict, path aliases, ESLint with
   layer rules, Vitest, Husky, GitHub Actions CI stub. Work in project root.
2. Type Architect — Define all core types in src/core/types/. Include
   BusEvent, WidgetContract, EventDeclaration, all entity ID types,
   StickerPosition2D/3D, Workspace, Sticker, CanvasMode, RenderMode.
3. Supabase Engineer — Set up Supabase client singleton in src/core/supabase/.
   Include auth helpers, session refresh, and realtime channel stubs.
Require plan approval before any teammate makes changes."
```

### 6.4 Cost Management

- Cap team sessions at 3-4 teammates maximum
- Use Sonnet for teammates, Opus for the lead only if needed
- Set clear exit criteria so teammates don't spiral
- Review outputs before merging — teams can produce conflicting code

### 6.5 Build Tasks — Parallel Sessions

| ID | Task |
|----|------|
| K-TEAM-1 | Enable agent teams, test basic 2-teammate coordination |
| K-TEAM-2 | Execute Scaffold Sprint (Scenario A) |
| K-TEAM-3 | Execute Store + Bus Parallel Build (Scenario B) |

---

## 7. Ralph Loops

The Ralph loop is the autonomous development engine. It runs Claude Code in a bash loop where each iteration gets fresh context, picks the next task from Beads, implements it, and exits. The next iteration starts clean.

### 7.1 Ralph + Beads Architecture

```
┌─────────────────────────────────────────────┐
│                 RALPH.md                     │
│  (Instructions for each fresh agent session) │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │    ralph.sh        │
         │  (bash loop)       │
         │  max_iterations=10 │
         └─────────┬─────────┘
                   │
    ┌──────────────▼──────────────┐
    │    Claude Code Session       │
    │  1. Read RALPH.md            │
    │  2. bd ready → next task     │
    │  3. sn_get_layer(0)          │
    │  4. Implement task           │
    │  5. Run tests                │
    │  6. git commit               │
    │  7. bd complete <task-id>    │
    │  8. Exit                     │
    └──────────────┬──────────────┘
                   │
                   ▼ (loop restarts with fresh context)
```

### 7.2 RALPH.md for the Kernel

```markdown
# StickerNest V5 — Ralph Loop Instructions

## Identity
You are one iteration of a relay team building StickerNest V5.
You have fresh context. Previous iterations' work is in git.

## Workflow
1. Run `bd ready` to see available tasks
2. Pick the highest-priority task that has all dependencies met
3. Call `sn_get_layer(0)` to load the kernel architecture spec
4. Call `sn_get_decision()` for any relevant past decisions
5. Implement the task following project conventions
6. Write or update tests — target 90%+ coverage for the module
7. Run `npm test` — all tests must pass
8. Run `npm run lint` — zero errors
9. `git add . && git commit -m "feat(core): <description>"`
10. `bd complete <task-id>`
11. Exit cleanly

## Rules
- Never modify files outside `src/core/`
- Never import from layers above the kernel
- Follow the event-bus skill for all bus-related code
- Follow the zustand-store skill for all store code
- If a task seems too large, split it into sub-tasks with `bd add`
- If you're stuck, create a `BLOCKED.md` file explaining why and exit

## Exit Conditions
- Task completed and tests pass → exit 0
- Blocked by missing dependency → write BLOCKED.md → exit 0
- Tests failing after 3 attempts → write FAILED.md → exit 0
- Never loop infinitely within a single iteration
```

### 7.3 ralph.sh

```bash
#!/bin/bash
# StickerNest V5 Ralph Loop
set -e

MAX_ITERATIONS=${1:-10}
ITERATION=0

echo "🔄 Starting Ralph loop (max ${MAX_ITERATIONS} iterations)"

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "═══════════════════════════════════════"
  echo "  Iteration ${ITERATION}/${MAX_ITERATIONS}"
  echo "═══════════════════════════════════════"

  # Check if there are ready tasks
  READY=$(bd ready --count 2>/dev/null || echo "0")
  if [ "$READY" = "0" ]; then
    echo "✅ No more ready tasks. All done!"
    break
  fi

  # Check for BLOCKED.md from previous iteration
  if [ -f BLOCKED.md ]; then
    echo "🚫 Previous iteration was blocked:"
    cat BLOCKED.md
    echo ""
    echo "Stopping loop. Resolve the blocker and restart."
    break
  fi

  # Check for FAILED.md from previous iteration
  if [ -f FAILED.md ]; then
    echo "❌ Previous iteration failed:"
    cat FAILED.md
    rm FAILED.md
    echo ""
    echo "Continuing to next task..."
  fi

  # Run Claude Code with the RALPH.md prompt
  claude --prompt "Read RALPH.md and execute the next task." \
         --model sonnet \
         --max-turns 50 \
         --no-interactive

  echo "Iteration ${ITERATION} complete."
  sleep 2  # Brief pause between iterations
done

echo ""
echo "Ralph loop finished after ${ITERATION} iterations."
echo "Run 'bd list' to see task status."
```

### 7.4 Beads Task Definition for the Kernel

```bash
# Initialize Beads in the repo
bd init

# Layer 0 tasks with dependencies
bd add "K-SCAFFOLD: Initialize Vite + React + TS project" --tag layer0
bd add "K-FOLDERS: Create 9-layer folder structure with barrel exports" --dep K-SCAFFOLD --tag layer0
bd add "K-LINT: ESLint with layer import rules" --dep K-FOLDERS --tag layer0
bd add "K-VITEST: Vitest configuration" --dep K-SCAFFOLD --tag layer0
bd add "K-TYPES: Core type definitions" --dep K-FOLDERS --tag layer0
bd add "K-BUS-CORE: Event bus engine (emit, subscribe, unsubscribe)" --dep K-TYPES --tag layer0
bd add "K-BUS-WILD: Wildcard subscriptions" --dep K-BUS-CORE --tag layer0
bd add "K-BUS-MID: Middleware pipeline (log, validate, rate-limit)" --dep K-BUS-CORE --tag layer0
bd add "K-BUS-HIST: Event history ring buffer" --dep K-BUS-CORE --tag layer0
bd add "K-CONN-REG: Connection registry" --dep K-BUS-CORE K-TYPES --tag layer0
bd add "K-CONN-SCHEMA: Schema validation middleware" --dep K-CONN-REG --tag layer0
bd add "K-CONN-TRANSFORM: Transform pipeline" --dep K-CONN-REG K-BUS-MID --tag layer0
bd add "K-CONN-DATA: Data provider/consumer protocol" --dep K-CONN-REG --tag layer0
bd add "K-CONN-ORPHAN: Orphan/dead subscription detection" --dep K-CONN-REG --tag layer0
bd add "K-STORE-AUTH: useAuthStore" --dep K-TYPES --tag layer0
bd add "K-STORE-WORK: useWorkspaceStore" --dep K-TYPES --tag layer0
bd add "K-STORE-CANVAS: useCanvasStore" --dep K-TYPES --tag layer0
bd add "K-STORE-SPATIAL: useSpatialStore" --dep K-TYPES --tag layer0
bd add "K-STORE-UI: useUIStore" --dep K-TYPES --tag layer0
bd add "K-SUPA-CLIENT: Supabase client singleton" --dep K-SCAFFOLD --tag layer0
bd add "K-SUPA-AUTH: Supabase auth helpers" --dep K-SUPA-CLIENT K-STORE-AUTH --tag layer0
bd add "K-SUPA-RT: Supabase realtime channel stubs" --dep K-SUPA-CLIENT K-BUS-CORE --tag layer0
bd add "K-CI: GitHub Actions CI (lint + test)" --dep K-LINT K-VITEST --tag layer0
bd add "K-INTEGRATION: Integration tests (bus + stores + connections)" --dep K-BUS-CORE K-CONN-REG K-STORE-WORK --tag layer0
```

### 7.5 Ralph Loop Modes for the Kernel

**HITL Mode (Start Here)**

Run Ralph with you watching. Review each iteration's output. Refine RALPH.md and skills based on what the agent gets wrong.

```bash
# Watch mode — review after each iteration
./ralph.sh 5
```

**AFK Mode (Once Confident)**

Let Ralph run unattended for mechanical tasks (scaffold, stores, types). Reserve HITL for the event bus and connection system where architectural judgment matters.

```bash
# AFK mode — 15 iterations, check results when done
nohup ./ralph.sh 15 > ralph.log 2>&1 &
```

### 7.6 Build Tasks — Ralph Loops

| ID | Task |
|----|------|
| K-RALPH-1 | Create RALPH.md with kernel-specific instructions |
| K-RALPH-2 | Create ralph.sh with iteration control and exit handling |
| K-RALPH-3 | Define all kernel Beads tasks with dependencies |
| K-RALPH-4 | Run 3 HITL iterations, refine RALPH.md based on results |
| K-RALPH-5 | Validate AFK mode on store tasks |

---

## 8. Testing Strategy

Testing is the kernel's gate. Nothing moves to Layer 1 until the kernel passes all tests with zero UI rendered.

### 8.1 Testing Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and integration tests (fast, TS-native, Vite-compatible) |
| **Playwright** | E2E tests (added in Layer 3 when UI exists — not needed for kernel) |
| **Vitest Coverage** | Istanbul or V8 provider — 90% coverage threshold for kernel |

### 8.2 Test Categories

#### Unit Tests (per module)

Every file in `src/core/` gets a corresponding test file in `src/core/__tests__/` or co-located as `<file>.test.ts`.

**Event Bus Unit Tests:**

```typescript
describe('EventBus', () => {
  // Core mechanics
  it('delivers events to matching subscribers')
  it('does not deliver to unsubscribed handlers')
  it('supports wildcard subscriptions (widget:*)')
  it('assigns unique IDs to every event')
  it('timestamps every event')
  it('handles multiple subscribers for same event type')
  it('unsubscribe removes only the specified handler')
  it('unsubscribeAll removes all handlers for a type')

  // Middleware
  it('runs middleware in registration order')
  it('middleware can modify event payload')
  it('middleware can block event propagation')
  it('logging middleware records events to history')
  it('validation middleware rejects events with invalid schemas')
  it('rate-limiting middleware throttles high-frequency events')

  // History
  it('stores last N events per channel')
  it('ring buffer overwrites oldest when full')
  it('getHistory returns events in chronological order')

  // Edge cases
  it('handles emit with no subscribers gracefully')
  it('handles subscriber that throws without crashing bus')
  it('handles rapid fire events without dropping any')
  it('is a true singleton — same instance across imports')
  it('works without React — pure TypeScript')
})
```

**Connection Registry Unit Tests:**

```typescript
describe('ConnectionRegistry', () => {
  it('registers widget contracts')
  it('unregisters widget contracts')
  it('finds widgets that emit a specific event type')
  it('finds widgets that subscribe to a specific event type')
  it('detects orphaned emitters')
  it('detects dead subscribers')
  it('builds an adjacency graph of widget connections')
  it('handles duplicate registration gracefully')
})
```

**Transform Pipeline Unit Tests:**

```typescript
describe('TransformPipeline', () => {
  it('passes through events with no transform registered')
  it('applies transform to matching source→target pair')
  it('serialized transform function executes in sandbox')
  it('rejects transform functions that throw')
  it('persists transforms as part of connection state')
  it('AI-generated transforms produce valid output')
})
```

**Zustand Store Unit Tests (per store):**

```typescript
describe('useAuthStore', () => {
  it('initializes with null user and loading=true')
  it('setUser updates user and sets loading=false')
  it('clearUser resets to initial state')
  it('selectors return granular slices')
  it('does not trigger re-render for unrelated state changes')
})
// ... similar for each of the 5 stores
```

**Supabase Client Unit Tests:**

```typescript
describe('SupabaseClient', () => {
  it('is a singleton')
  it('initializes with environment variables')
  it('auth.signIn calls Supabase auth')
  it('auth.signOut clears session and updates auth store')
  it('auth.onAuthStateChange fires on session changes')
  it('realtime.subscribe creates a channel')
  it('realtime.unsubscribe removes a channel')
})
```

#### Integration Tests

These test subsystems working together:

```typescript
describe('Kernel Integration', () => {
  // Bus + Connections
  it('widget registers contract → appears in connection graph')
  it('widget emits event → all subscribers with matching type receive it')
  it('transform intercepts event and rewrites payload')
  it('schema validation rejects malformed event payload')

  // Bus + Stores
  it('store action emits event on bus')
  it('bus event triggers store update')
  it('workspace store changes propagate through bus to connection registry')

  // Full flow
  it('Widget A emits → transform → Widget B receives transformed payload')
  it('data:register → data:query → data:response full cycle')
  it('orphan detection works after widget unregisters')
})
```

#### Stress Tests

```typescript
describe('Kernel Stress', () => {
  it('handles 10,000 events per second without dropping')
  it('handles 100 simultaneous widget registrations')
  it('connection graph with 50 widgets resolves in <10ms')
  it('middleware pipeline with 5 middleware runs in <1ms per event')
})
```

### 8.3 Test Infrastructure

**Mock Factories:**

```typescript
// test/factories.ts
export function createMockWidget(overrides?: Partial<WidgetContract>): WidgetContract
export function createMockEvent(overrides?: Partial<BusEvent>): BusEvent
export function createMockSupabaseClient(): MockSupabaseClient
export function createMockAuthSession(): Session
```

**Test Helpers:**

```typescript
// test/helpers.ts
export function waitForEvent(bus: EventBus, type: string): Promise<BusEvent>
export function collectEvents(bus: EventBus, type: string, count: number): Promise<BusEvent[]>
export function createTestBus(): EventBus  // Fresh instance, bypassing singleton for testing
```

### 8.4 Coverage Requirements

| Module | Minimum Coverage |
|--------|-----------------|
| `events/bus.ts` | 95% |
| `events/middleware.ts` | 90% |
| `events/history.ts` | 90% |
| `connections/registry.ts` | 90% |
| `connections/transform.ts` | 85% |
| `connections/schema.ts` | 90% |
| `store/*.ts` | 85% |
| `supabase/*.ts` | 80% |
| **Kernel overall** | **90%** |

### 8.5 CI Pipeline

```yaml
# .github/workflows/kernel-ci.yml
name: Kernel CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run test:kernel -- --coverage
      - run: npm run test:kernel:integration
      - name: Check coverage thresholds
        run: npx vitest --coverage --coverage.thresholds.lines=90
```

### 8.6 Kernel Acceptance Test (Gate to Layer 1)

The kernel is complete when ALL of the following pass:

```bash
# The single command that gates Layer 1 access
npm test -- --filter=core

# Which must include:
✅ Event bus — all unit tests pass
✅ Connection registry — all unit tests pass
✅ Transform pipeline — all unit tests pass
✅ All 5 Zustand stores — all unit tests pass
✅ Supabase client — all unit tests pass
✅ Integration tests — full flow works
✅ Stress tests — performance thresholds met
✅ Coverage — 90%+ overall
✅ Lint — zero errors
✅ Zero UI rendered — no React components imported
```

### 8.7 Build Tasks — Testing

| ID | Task |
|----|------|
| K-TEST-1 | Configure Vitest with path aliases and coverage |
| K-TEST-2 | Create mock factories (widget, event, supabase, session) |
| K-TEST-3 | Create test helpers (waitForEvent, collectEvents, createTestBus) |
| K-TEST-4 | Event bus unit tests (full suite) |
| K-TEST-5 | Connection registry unit tests |
| K-TEST-6 | Transform pipeline unit tests |
| K-TEST-7 | Zustand store unit tests (all 5 stores) |
| K-TEST-8 | Supabase client unit tests |
| K-TEST-9 | Integration test suite |
| K-TEST-10 | Stress test suite |
| K-TEST-11 | CI pipeline (GitHub Actions) |

---

## 9. Build Order & Task Dependencies

### Phase 1: Foundation (Can Parallelize)

```
K-SCAFFOLD ──→ K-FOLDERS ──→ K-LINT
                            ──→ K-VITEST ──→ K-TEST-1
                            ──→ K-TYPES ──→ K-TEST-2, K-TEST-3
```

**Ralph mode:** HITL, 3-5 iterations
**Alternative:** Agent Team (Scenario A) — 3 teammates

### Phase 2: Core Engine (Partially Parallel)

```
K-TYPES ──→ K-BUS-CORE ──→ K-BUS-WILD
                         ──→ K-BUS-MID
                         ──→ K-BUS-HIST
                         ──→ K-TEST-4

K-TYPES ──→ K-STORE-AUTH ──→ K-TEST-7
         ──→ K-STORE-WORK
         ──→ K-STORE-CANVAS
         ──→ K-STORE-SPATIAL
         ──→ K-STORE-UI

K-SCAFFOLD ──→ K-SUPA-CLIENT ──→ K-SUPA-AUTH ──→ K-TEST-8
                              ──→ K-SUPA-RT
```

**Ralph mode:** AFK for stores, HITL for event bus
**Alternative:** Agent Team (Scenario B) — bus, stores, and supabase in parallel

### Phase 3: Connection System (Sequential)

```
K-BUS-CORE + K-TYPES ──→ K-CONN-REG ──→ K-CONN-SCHEMA
                                     ──→ K-CONN-TRANSFORM
                                     ──→ K-CONN-DATA
                                     ──→ K-CONN-ORPHAN
                                     ──→ K-TEST-5, K-TEST-6
```

**Ralph mode:** HITL — connection system is architecturally critical

### Phase 4: Integration & Gating

```
K-BUS-CORE + K-CONN-REG + K-STORE-WORK ──→ K-INTEGRATION ──→ K-TEST-9
                                                           ──→ K-TEST-10
K-LINT + K-VITEST ──→ K-CI ──→ K-TEST-11
```

**Ralph mode:** HITL — integration tests validate the whole kernel

### Estimated Timeline

| Phase | Duration | Method |
|-------|----------|--------|
| Phase 1: Foundation | 1-2 days | Agent Team or Ralph HITL |
| Phase 2: Core Engine | 3-5 days | Ralph AFK (stores) + HITL (bus) |
| Phase 3: Connections | 2-3 days | Ralph HITL |
| Phase 4: Integration | 1-2 days | Ralph HITL |
| **Total** | **~7-12 days** | |

---

## 10. Dev MCP Workflow Integration

### Before (V4 — Cold Start Every Session)

1. Open new AI chat
2. Paste 2000+ tokens of architecture context
3. Explain which layer you're on
4. Hope the AI doesn't contradict a previous decision
5. Manually track what's done in Notion

### After (V5 — Warm Start Every Session)

1. Open Claude Code (MCP auto-connected)
2. AI calls `sn_project_status()` → knows where you are
3. AI calls `sn_get_layer(0)` → knows the kernel spec
4. AI calls `sn_get_decision("event bus singleton")` → respects past decisions
5. AI calls `sn_scaffold_store(...)` → generates correct code
6. Beads tracks progress → next Ralph iteration picks up seamlessly
7. Skills activate automatically → conventions enforced
8. Subagents run parallel checks → architecture stays clean
9. Everything is version-controlled and queryable

---

## Appendix A: CLAUDE.md for StickerNest V5

```markdown
# StickerNest V5

## Quick Facts
- **Stack**: React 18, TypeScript (strict), Zustand, Supabase, Vite
- **Test**: npm run test (Vitest)
- **Lint**: npm run lint (ESLint)
- **Architecture**: 9 layers, build bottom-up. See RALPH.md or call sn_get_layer().

## Three Iron Rules
1. Event bus is layer zero. Testable without rendering.
2. Widgets are untrusted guests. Every widget runs in an iframe sandbox.
3. The platform is the SDK. Third-party devs must be able to build widgets.

## Current Layer: 0 (Kernel)
Working in src/core/ only. Do not create files outside this directory.

## Conventions
- Event types: domain:action (e.g., widget:registered, canvas:zoom)
- Store actions: verbNoun (e.g., addSticker, setViewport)
- Imports: lower layers cannot import from higher layers
- Tests: co-located as *.test.ts, AAA pattern, mock factories in test/
- Commits: conventional commits (feat, fix, test, docs, chore)
```

## Appendix B: Complete Bead Dependency Graph

```
K-SCAFFOLD
├── K-FOLDERS
│   ├── K-LINT ──→ K-CI
│   ├── K-TYPES
│   │   ├── K-BUS-CORE
│   │   │   ├── K-BUS-WILD
│   │   │   ├── K-BUS-MID
│   │   │   ├── K-BUS-HIST
│   │   │   ├── K-CONN-REG
│   │   │   │   ├── K-CONN-SCHEMA
│   │   │   │   ├── K-CONN-TRANSFORM
│   │   │   │   ├── K-CONN-DATA
│   │   │   │   └── K-CONN-ORPHAN
│   │   │   └── K-SUPA-RT
│   │   ├── K-STORE-AUTH ──→ K-SUPA-AUTH
│   │   ├── K-STORE-WORK ──→ K-INTEGRATION
│   │   ├── K-STORE-CANVAS
│   │   ├── K-STORE-SPATIAL
│   │   └── K-STORE-UI
│   └── K-VITEST ──→ K-CI
└── K-SUPA-CLIENT
    ├── K-SUPA-AUTH
    └── K-SUPA-RT
```
