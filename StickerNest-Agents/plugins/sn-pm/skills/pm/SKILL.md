---
name: pm
description: >
  This skill manages the StickerNest task backlog across TODO.md and Notion. Use
  when the user asks "what should I build next", "StickerNest backlog", "SN priorities",
  "sprint plan for StickerNest", "what's blocked on StickerNest", "SN status update",
  "prioritize StickerNest tasks", "check TODO.md", "review the build plan", or needs
  task management for StickerNest V5 development. Also triggers on "SN backlog",
  "what's next for StickerNest", "build priorities", or "layer status".
---

> Maintains the task backlog across TODO.md and Notion, prioritizes work, identifies blockers, and proposes sprint plans.

---

## When to Run

- On-demand for backlog reviews
- After Scribe logs a session (to update task status)
- When Kimber asks "What should I work on next?"

---

## Dual-Source Sync Workflow

Both `TODO.md` (local) and the Notion Master Build Plan are sources of truth. Keep them aligned.

### Step 1: Read Both Sources

```bash
# Read local TODO
cat TODO.md
```

Use `notion_search` or `notion_get_todos` to read the Notion Master Build Plan.

### Step 2: Identify Discrepancies

Compare the two sources. Common discrepancies:

- Task marked complete in one but not the other
- New task exists in one but not the other
- Status differs (in-progress vs blocked)
- Priority ordering differs

### Step 3: Resolve

- If a task was completed (verified by code/commits), mark it complete in BOTH sources
- If a new task exists in only one source, add it to the other
- If status conflicts, check git history and Build Journal for ground truth
- Always preserve the format conventions of each source (TODO.md uses markdown checkboxes; Notion uses its database schema)

### Step 4: Update Both

- Edit `TODO.md` locally
- Update Notion via `notion_update_todo` or `notion-update-page`
- Verify alignment

---

## Prioritization Framework

Rank tasks using these criteria, in order of weight:

### 1. Build Order Compliance (Highest Weight)

The architecture mandates this build sequence:
```
L0 Kernel → L1 Social → L3 Runtime → L2 Lab → L4A/4B Canvas → L5 Marketplace → L6 Shell
```

A task in L5 cannot start if L3 has unfinished blocking work. Check layer prerequisites before promoting any task.

### 2. Blockers and Dependencies

- Tasks that unblock other tasks get priority
- Tasks that ARE blocked drop priority (note what blocks them)
- Chain dependencies: if A blocks B blocks C, A is highest priority

### 3. Bug Fixes > Feature Work

When bugs exist in completed layers, fixing them takes precedence over building new layers. A broken foundation undermines everything above it.

### 4. Test Coverage Gaps

If a layer's coverage is below 80%, writing tests for that layer is high priority. Run `npm run test:coverage` to check.

### 5. Effort-to-Impact Ratio

For tasks at the same priority tier: prefer smaller tasks that unblock more work (S > M > L when impact is equal).

---

## Sprint Plan Format

When proposing the next batch of work, use this template:

```markdown
## Sprint Plan — [Date]

### Context
[1-2 sentences on current project state]

### Recommended Tasks (in priority order)

1. **[Task Name]**
   - Layer: [L0-L6]
   - Effort: [S/M/L]
   - Rationale: [Why this task, why now]
   - Dependencies: [What must be done first, or "none"]
   - Acceptance Criteria: [Bullet list]

2. **[Task Name]**
   ...

### Blocked Tasks (cannot start yet)
- [Task]: blocked by [what]

### Risks
- [Any risks to flag]
```

### Example Sprint Plan

```markdown
## Sprint Plan — 2026-03-24

### Context
L0 and L1 are complete. Billing is mostly done. Canvas interactions are in progress. Focus should shift to completing L3 Runtime gaps before Lab work begins.

### Recommended Tasks

1. **Complete cross-canvas event router**
   - Layer: L3 Runtime
   - Effort: M
   - Rationale: Required for pipeline execution across canvases. Blocks L4A-3 wiring.
   - Dependencies: Cross-canvas SDK methods (done)
   - Acceptance Criteria:
     - Router connects to Supabase Realtime channel per canvas
     - Messages routed to subscribed widgets
     - Offline queue works (max 100 messages)
     - Tests pass at 80%+

2. **Write missing bus throughput benchmark**
   - Layer: L0 Kernel
   - Effort: S
   - Rationale: Required by L0 rule file. Currently untested performance contract.
   - Dependencies: None
   - Acceptance Criteria:
     - bench() API exists and is callable
     - Emit-to-handler latency < 1ms confirmed by test
```

---

## Status Summary Format

For status reports, use this template:

```markdown
## Status Summary — [Date]

### Completed This Period
- [Item]: [Brief description]

### In Progress
- [Item]: [Current state, % complete estimate]

### Blocked
- [Item]: Blocked by [what]. Suggested resolution: [action]

### Metrics
- Test coverage: [X]%
- Lint status: [passing/failing]
- Dependency validation: [passing/failing]
- Layers complete: [list]

### Next Up
[Pointer to sprint plan or top 3 priorities]
```

---

## Dependency Analysis

Before promoting any task, verify:

1. **Layer prerequisites** — Is the layer below this one complete enough?
2. **Schema availability** — Does `src/kernel/schemas/` have the types this task needs?
3. **Store readiness** — Does the relevant Zustand store exist with the required state shape?
4. **Test infrastructure** — Is the test environment configured for this layer? (check `vitest.config.ts` `environmentMatchGlobs`)
5. **Bus events** — Are the bus event types this task needs already defined?

---

## GitHub Integration

Check GitHub for additional task context:

- `github_list_issues` — Open issues may represent tasks or bugs
- `github_list_commits` — Recent commits show what's actively being worked on
- PR status — Open PRs indicate in-progress work; merged PRs indicate completions

Cross-reference GitHub activity with TODO.md and Notion to catch tasks that exist in one system but not others.
