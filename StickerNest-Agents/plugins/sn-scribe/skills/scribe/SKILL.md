---
name: scribe
description: >
  This skill captures StickerNest development session changes and maintains the
  Build Journal. Use when the user says "log this session", "what changed today",
  "update the build journal", "record this decision", or after any development
  session that needs documentation. Also triggers on "scribe", "session summary",
  "journal entry", or "ADR".
---

> Captures session changes, architecture decisions, and feature additions. Maintains the Build Journal as the project's living memory.

---

## When to Run

- After every development session (manually triggered)
- After a PR merge
- On demand: "What changed today?"

---

## Session Analysis Workflow

### Step 1: Gather Changes

Run these commands to understand what happened:

```bash
# Recent commits (adjust N based on session length)
git log --oneline -20

# Files changed summary
git diff --stat HEAD~N    # where N = number of commits in session

# Detailed diff for understanding what changed
git diff HEAD~N --name-status
```

### Step 2: Categorize Changes

Group every changed file by layer:

| Layer | Path Pattern | Look For |
|-------|-------------|----------|
| Kernel | `src/kernel/**` | Schema changes, bus updates, store changes |
| Social | `src/social/**` | Realtime, presence, conflict resolution |
| Runtime | `src/runtime/**` | Widget SDK, bridge, WidgetFrame |
| Lab | `src/lab/**` | Editor, preview, AI gen, publish pipeline |
| Canvas | `src/canvas/**` | Viewport, tools, wiring, panels |
| Spatial | `src/spatial/**` | Three.js, WebXR, VR controllers |
| Marketplace | `src/marketplace/**` | Listings, install flow, publisher |
| Shell | `src/shell/**` | Routing, layout, themes, shortcuts |
| Config | Root files | vite.config, tsconfig, package.json |
| Tests | `*.test.ts` | New or updated test files |

### Step 3: Identify Key Events

For each session, identify:

- **Features added** — New functionality that didn't exist before
- **Bugs fixed** — What was broken, how it was fixed
- **Tests written** — New test files, what they cover
- **Refactors** — Structural changes without new behavior
- **Decisions made** — Architecture choices, technology picks, design patterns chosen
- **Blockers encountered** — What slowed progress, what remains unresolved

### Step 4: Check for ADR Triggers

Create an Architecture Decision Record (use the `create-adr` command) if any of these occurred:

- New technology or library added
- Layer boundary was restructured
- Schema shape changed in `src/kernel/schemas/`
- Conflict resolution strategy was modified
- New event bus namespace was introduced
- Store was added or restructured

---

## Build Journal Entry Format

Create a Notion page in the Build Journal database with this structure:

```
Date: YYYY-MM-DD
Session Summary: [2-3 sentences describing what was accomplished]

## Files Changed
- **Kernel (L0):** file1.ts, file2.ts
- **Runtime (L3):** WidgetFrame.tsx
- **Tests:** bus.test.ts (new), WidgetFrame.test.ts (updated)

## What Was Built
- [Feature/fix 1]: Brief description of what and why
- [Feature/fix 2]: Brief description

## Decisions Made
- [Decision]: [Rationale]. ADR created: yes/no

## Tests Added
- [test file]: covers [what it tests]

## Blockers
- [Blocker description] — status: resolved/open

## Status
[on-track / behind / blocked]
```

### Example Entry

```
Date: 2026-03-23
Session Summary: Implemented cross-canvas event emission in the Widget SDK. Added permission enforcement and rate limiting. All tests passing at 87% coverage.

## Files Changed
- **Runtime (L3):** sdk/crossCanvas.ts (new), bridge/messages.ts (updated), WidgetFrame.tsx (updated)
- **Kernel (L0):** schemas/bridgeMessages.ts (added CROSS_CANVAS_* types)
- **Tests:** crossCanvas.test.ts (new), bridge.test.ts (updated)

## What Was Built
- Cross-canvas emit/subscribe/unsubscribe in Widget SDK
- Permission enforcement: widget manifest must declare 'cross-canvas' permission
- Rate limiting: shares 100 events/sec limit with regular EMIT
- Payload size cap at 64KB (matches Supabase Realtime limits)

## Decisions Made
- Used shared rate limiter instead of separate cross-canvas limit — simpler, prevents abuse. ADR: no (minor)
- Channel name validation regex: ^[a-zA-Z0-9._-]{1,128}$. ADR: no

## Tests Added
- crossCanvas.test.ts: permission enforcement, rate limiting, payload size, channel validation

## Blockers
- None

## Status
on-track
```

---

## TODO.md Update Rules

After documenting the session:

1. Read the current `TODO.md`
2. Check off any items completed during the session (change `[ ]` to `[x]`)
3. Add any new tasks discovered during the session
4. Maintain the existing format and section organization
5. Do NOT reorganize or re-prioritize — that's the PM agent's job

---

## Notion Sync

Use `notion-create-pages` (or `notion_add_todo` for simpler entries) to create the Build Journal entry. Required fields:

- **Date**: ISO format
- **Session Summary**: 2-3 sentences
- **Files Changed**: Grouped by layer
- **Decisions Made**: With ADR status
- **Tests Added**: File names and coverage
- **Blockers**: Description and status
- **Status**: on-track / behind / blocked

---

## Terminology Compliance

Always use correct StickerNest terms in journal entries. Refer to `terminology-reference.md` if unsure. Key rules:

- "Canvas" not "board" or "scene"
- "Entity" not "element" or "node"
- "Widget" not "app" or "plugin"
- "Sticker" not "icon" (in technical context)
- "Pipeline" not "flow" or "chain"
- "Docker" means the container widget, not Docker containers
