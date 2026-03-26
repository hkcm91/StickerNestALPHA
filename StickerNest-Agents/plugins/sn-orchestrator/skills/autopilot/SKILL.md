---
name: autopilot
description: >
  Autonomous development loop that works through the StickerNest TODO.md while
  the user is away. Picks the next priority task, runs the full Dev Cycle
  (Task Runner → QA → Scribe → PM), then loops to the next task.
  Use when the user says "run autopilot", "work while I sleep", "autonomous mode",
  "work through the TODO", "overnight build", "background dev cycle",
  "keep building", "autopilot mode", "unattended dev", "build while I'm gone".
---

# SN Autopilot — Autonomous Dev Loop

> Reads TODO.md, picks the next buildable task, runs a full Dev Cycle, logs
> the result, updates the backlog, and loops. Designed to run unattended
> while the user sleeps or is at work.

---

## How It Works

```
┌─────────────────────────────────────────────────┐
│                  AUTOPILOT LOOP                 │
│                                                 │
│  1. PM: Read TODO.md → pick next task           │
│     ↓                                           │
│  2. Task Runner: Build the feature              │
│     ↓                                           │
│  3. QA: Verify (tests, lint, types, deps)       │
│     ↓                                           │
│  4. Scribe: Log to Build Journal                │
│     ↓                                           │
│  5. PM: Mark complete, pick next task           │
│     ↓                                           │
│  6. Loop → back to step 2 (or stop if done)     │
│                                                 │
│  STOP CONDITIONS:                               │
│  • QA fails (code quality gate)                 │
│  • No more tasks at current priority level      │
│  • Max iterations reached (safety limit)        │
│  • Critical error / crash                       │
└─────────────────────────────────────────────────┘
```

---

## Task Selection Rules

The PM agent picks the next task from TODO.md using these rules:

### Priority Order
1. **P0 (Critical Gaps)** — must all be done before P1
2. **P1 (High Priority)** — must all be done before P2
3. **P2 (Medium Priority)** — nice to have for MVP
4. **P3 (Lower Priority)** — future / polish

### Within a Priority Level
Pick tasks that respect the **build order** (layer dependencies):
```
L0 Kernel → L1 Social → L3 Runtime → L2 Lab → L4A/4B Canvas → L5 Marketplace → L6 Shell
```

A task in a higher layer should not be picked if it depends on incomplete
work in a lower layer. The PM agent checks this.

### Task Suitability Filter

Not every TODO item is suitable for autopilot. Skip tasks that:
- Require external service setup (e.g., "Stripe Connect onboarding" needs API keys)
- Require design decisions the user hasn't made (e.g., "canvas types as first-class concept")
- Are pure infrastructure/DevOps (e.g., "Sentry integration" needs account setup)
- Require human testing (e.g., "Full VR/AR audit against Quest 3 hardware")
- Are documentation-only (e.g., "Public-facing developer documentation site")

Suitable tasks are ones where code can be written, tested, and committed
autonomously:
- Feature implementation with clear acceptance criteria
- Bug fixes with reproducible behavior
- Test writing for existing code
- Wiring existing schemas/APIs to UI
- Filling gaps in partially-built features

### Selection Prompt for PM Agent

```
You are the StickerNest PM agent in AUTOPILOT mode.

Read TODO.md at the repo root. Your job: pick ONE task for the Task Runner
to build next.

RULES:
1. Pick from the highest uncompleted priority level (P0 first, then P1, etc.)
2. Respect build order — don't pick L5 tasks if L3 has gaps
3. Skip tasks that need external service setup, human design decisions,
   or manual testing on hardware
4. Pick tasks where code can be written, tested, and committed autonomously
5. Prefer tasks that unblock other tasks downstream
6. If a task is too large, break it into a single concrete sub-task

OUTPUT (required — exact format):
SELECTED_TASK: [exact checkbox line from TODO.md]
LAYER: [L0/L1/L2/L3/L4A/L4B/L5/L6]
SCOPE: [commit scope: kernel/social/runtime/lab/canvas-core/etc.]
ACCEPTANCE_CRITERIA:
- [criterion 1]
- [criterion 2]
- [criterion 3]
FILES_LIKELY_AFFECTED:
- [file or directory 1]
- [file or directory 2]
RATIONALE: [1-2 sentences on why this task was chosen over others]
```

---

## Dev Cycle Per Task

Once the PM picks a task, run the standard Dev Cycle:

### Step 1 — Task Runner
```
You are a StickerNest V5 development agent in AUTOPILOT mode.

SETUP:
1. Use the /sn-core-context:stickernest-context skill to load project context.
2. Use the /sn-task-runner:task-runner skill to guide your workflow.

TASK FROM PM:
[PASTE PM OUTPUT — selected task, layer, scope, acceptance criteria, files]

AUTOPILOT RULES:
- Follow the task-runner workflow exactly
- Read the relevant layer rule file before writing any code
- Write comprehensive tests (80% coverage target)
- Run full validation: npm test, npm run lint, npm run typecheck, npm run deps:validate
- If validation fails, fix the issues before committing
- Use conventional commit: <type>(<scope>): <description>
- If you hit a blocker you can't resolve autonomously, STOP and report it

OUTPUT (required):
- RESULT: SUCCESS or BLOCKED
- Files changed (list each)
- Tests written and results
- Commit hash and message
- If BLOCKED: what the blocker is and what the user needs to do
```

### Step 2 — QA
```
You are the StickerNest QA agent in AUTOPILOT mode.

SETUP:
1. Use the /sn-core-context:stickernest-context skill.
2. Use the /sn-qa:qa skill.

CONTEXT: [Task Runner output]

AUTOPILOT RULES:
- Run ALL checks: npm test, npm run lint, npm run typecheck, npm run deps:validate
- Check test coverage meets 80% threshold
- Review changed files for correctness
- This is a QUALITY GATE — if anything fails, the loop stops

OUTPUT (required):
- QA_VERDICT: PASS or FAIL
- Each check result
- If FAIL: specific failures (this stops the autopilot loop)
```

### Step 3 — Scribe
```
You are the StickerNest Scribe agent in AUTOPILOT mode.

SETUP:
1. Use the /sn-core-context:stickernest-context skill.
2. Use the /sn-scribe:scribe skill.

CONTEXT: [Task Runner + QA output]

Create a Build Journal entry for this autopilot iteration.
Include: what was built, files changed, test results, decisions made.
Update TODO.md: mark the completed task with [x].
```

### Step 4 — PM (Loop Decision)
```
You are the StickerNest PM agent. The autopilot just completed one iteration.

COMPLETED TASK: [task description]
QA VERDICT: [PASS]
ITERATION: [N] of [MAX]

DECIDE:
1. Are there more suitable tasks at this priority level? → Pick next task
2. Is the codebase in a clean state for another iteration? → Continue
3. Has max iterations been reached? → Stop

OUTPUT:
- DECISION: CONTINUE or STOP
- If CONTINUE: [next task selection using the same format as above]
- If STOP: [reason — no more tasks / max iterations / priority level complete]
- SUMMARY: [running tally of what was built across all iterations]
```

---

## Safety Limits

| Setting | Default | Why |
|---|---|---|
| Max iterations per run | 3 | Prevents runaway builds; each iteration is a full feature |
| Max time per iteration | 15 minutes | If Task Runner takes longer, something is stuck |
| Stop on QA fail | Always | Never push broken code |
| Stop on commit fail | Always | Lint/hook failures mean something is wrong |
| Priority ceiling | P1 | Don't auto-build P2/P3 without user approval |

### Override via User Input

When launching autopilot, the user can override:
- `max_iterations`: 1–10 (default 3)
- `priority_ceiling`: P0, P1, P2, P3 (default P1)
- `target_layer`: restrict to a specific layer (default: any)
- `dry_run`: pick tasks and show plan without executing (default: false)

---

## Execution Methods

### Method A: Command Center (preferred — if running)

```
# Check CC health
cc_health()

# Register as orchestrator
cc_register(name="SN Autopilot", project="StickerNest")

# Iteration 1: PM picks task
pm = cc_create_session(
  name="Autopilot PM — Task Selection",
  type="claude-code",
  prompt="<PM selection prompt>",
  cwd="/path/to/StickerNest5.0",
  project="StickerNest"
)

# Wait for PM, read output
cc_list_sessions(status_filter="active")  # poll
pm_output = cc_get_messages(session_id=pm.id, mark_read=true)

# Task Runner builds it
tr = cc_create_session(
  name="Autopilot Task Runner — [task name]",
  type="claude-code",
  prompt="<Task Runner prompt with PM output>",
  ...
)

# QA verifies
qa = cc_create_session(...)

# Scribe logs
scribe = cc_create_session(...)

# PM decides: loop or stop
pm2 = cc_create_session(...)

# If CONTINUE → spawn next Task Runner
# If STOP → report summary
```

### Method B: Sequential in Cowork (fallback)

If Command Center isn't running, execute skills directly in sequence:
1. Call `/sn-pm:pm` skill → get task selection
2. Call `/sn-task-runner:task-runner` skill → build it
3. Call `/sn-qa:qa` skill → verify
4. Call `/sn-scribe:scribe` skill → log it
5. Call `/sn-pm:pm` skill → decide next
6. Loop or stop

### Method C: Scheduled Task (overnight / timed)

Create a scheduled task that triggers the autopilot at a set time:
```
create_scheduled_task(
  name: "sn-autopilot-overnight",
  prompt: "Run the SN autopilot. Use the sn-orchestrator:autopilot skill. Max 3 iterations, priority ceiling P1.",
  cronExpression: "0 2 * * *"   # 2am daily
)
```

Or manual trigger only (no cron) — run on demand from Cowork.

---

## Resume After Stop

When the user returns and asks "what happened overnight" or "autopilot status":

1. Read the Build Journal entries created during the autopilot run
2. Read the git log for autopilot commits
3. Summarize: tasks completed, tasks attempted, any blockers hit
4. If stopped on QA failure: show exactly what failed so the user can fix it
5. If stopped on max iterations: show remaining task queue

---

## Example Run

```
[02:00] Autopilot started — max 3 iterations, ceiling P1
[02:01] PM selected: "Rich text / document widget" (P1, L3 Runtime)
[02:02] Task Runner spawned...
[02:08] Task Runner completed — 4 files changed, 12 tests written
[02:08] QA spawned...
[02:10] QA PASS — all checks green, 84% coverage
[02:10] Scribe: journal entry created, TODO.md updated
[02:11] PM: CONTINUE — next task: "Link preview widget" (P1, L3 Runtime)
[02:12] Task Runner spawned...
[02:18] Task Runner completed — 3 files changed, 8 tests written
[02:18] QA spawned...
[02:20] QA PASS — all checks green
[02:20] Scribe: journal entry created
[02:21] PM: CONTINUE — next task: "PDF viewer widget" (P1, L3 Runtime)
[02:22] Task Runner spawned...
[02:28] Task Runner completed — 5 files changed, 10 tests written
[02:28] QA spawned...
[02:30] QA PASS
[02:30] Scribe: logged
[02:31] PM: STOP — max iterations (3) reached

SUMMARY:
✅ Rich text widget — built and tested
✅ Link preview widget — built and tested
✅ PDF viewer widget — built and tested
3 features shipped, 30 tests added, 0 failures
```
