---
name: parallel
description: >
  Run multiple StickerNest agents simultaneously via Command Center.
  Use when the user says "run agents in parallel", "run QA and Scribe together",
  "parallel agents", "run these at the same time", "concurrent agents",
  "multi-agent run", "spawn multiple agents", "parallel SN tasks".
---

# SN Parallel — Concurrent Agent Execution

> Spawns multiple Claude Code sessions simultaneously for independent tasks that
> don't need to wait for each other.

---

## When to Use

- Two or more agent tasks are independent (neither needs the other's output)
- User explicitly asks for parallel execution
- Pipeline optimization: running QA + Scribe in parallel after Task Runner

---

## Safe Parallel Combinations

### Always Safe (no write conflicts)

| Agents | Why Safe |
|---|---|
| QA + Scribe | Both read-only on the codebase. QA runs tests, Scribe reads git log. |
| Content Strategy + PM | Content scans journal, PM reviews backlog. No overlap. |
| Multiple Marketing drafts (different platforms) | Each writes independent content. |
| Brand Voice + Demo | Voice reviews text, Demo creates visual specs. |

### NEVER Parallelize (write conflicts)

| Agents | Why Unsafe |
|---|---|
| Two Task Runners on same layer | Both would write to the same files. |
| Task Runner + QA | QA needs the finished code to test. |
| PM + Task Runner | PM might reprioritize while TR is mid-build. |

### Conditional (safe with constraints)

| Agents | Condition |
|---|---|
| Two Task Runners on DIFFERENT layers | Safe only if the layers don't share files. Verify import boundaries first. |
| Marketing + Content Strategy | Safe if Marketing is working on previously-approved ideas, not current scan. |

---

## How to Run Parallel Agents

### Step 1: Spawn All Sessions

Call `cc_create_session` for each agent without waiting:

```
qa = cc_create_session(
  name: "SN QA",
  type: "claude-code",
  prompt: "<QA prompt with Task Runner output>",
  cwd: "/path/to/StickerNest5.0",
  project: "StickerNest"
)

scribe = cc_create_session(
  name: "SN Scribe",
  type: "claude-code",
  prompt: "<Scribe prompt with Task Runner output>",
  cwd: "/path/to/StickerNest5.0",
  project: "StickerNest"
)
```

### Step 2: Monitor All

Poll until both complete:

```
cc_list_sessions(status_filter="active")
→ Repeat until neither QA nor Scribe appears in active list
```

### Step 3: Collect Results

```
qa_output = cc_get_messages(session_id=qa.id, mark_read=true)
scribe_output = cc_get_messages(session_id=scribe.id, mark_read=true)
```

### Step 4: Continue Pipeline

Pass both outputs to the next step:

```
pm = cc_create_session(
  name: "SN PM",
  type: "claude-code",
  prompt: "QA verdict: [qa_output]. Scribe summary: [scribe_output]. Update backlog...",
  cwd: "/path/to/StickerNest5.0",
  project: "StickerNest"
)
```

---

## Parallel Terminal Commands

For running multiple shell commands simultaneously (e.g., lint + typecheck + test):

```
# First create an orchestrator
orch = cc_create_session(name="SN Validation", type="orchestrator")

# Spawn all checks in parallel
cc_orchestrator_spawn(orchestrator_id=orch.id, name="Lint", command="cd /path && npm run lint")
cc_orchestrator_spawn(orchestrator_id=orch.id, name="Types", command="cd /path && npm run typecheck")
cc_orchestrator_spawn(orchestrator_id=orch.id, name="Tests", command="cd /path && npm test")
cc_orchestrator_spawn(orchestrator_id=orch.id, name="Deps", command="cd /path && npm run deps:validate")

# Monitor all at once
cc_orchestrator_children(orchestrator_id=orch.id)

# Read individual results
cc_orchestrator_child_output(orchestrator_id=orch.id, child_id=<lint_id>, lines=50)
cc_orchestrator_child_output(orchestrator_id=orch.id, child_id=<test_id>, lines=100)

# Clean up
cc_orchestrator_kill_all(orchestrator_id=orch.id)
```

---

## Optimized Dev Cycle (with parallelism)

```
Step 1: Task Runner (sequential — must finish first)
    ↓
Step 2: QA + Scribe (parallel — both read-only)
    ↓
Step 3: PM (sequential — needs both QA and Scribe output)
```

This cuts total pipeline time by running QA and Scribe concurrently instead of
sequentially. Typical savings: 3-5 minutes on a full dev cycle.

---

## Error Handling in Parallel Runs

If one parallel agent fails:
1. Let the other(s) finish — don't kill siblings automatically.
2. Report which agent failed and which succeeded.
3. The downstream agent (e.g., PM) only proceeds if ALL required upstream agents succeeded.
4. If QA fails: stop the pipeline regardless of Scribe's result (code quality gate).
