---
name: orchestrator
description: >
  This skill orchestrates multi-agent StickerNest pipelines via Command Center MCP.
  Use when the user says "run the dev cycle", "orchestrate", "run the pipeline",
  "run the full flow", "automate the build process", "chain the agents",
  "run dev cycle on [task]", "content pipeline", or "run all agents".
  Also triggers on "SN pipeline", "agent pipeline", "orchestrate StickerNest",
  "run all SN agents", "dev cycle for [task]".
---

# SN Orchestrator — Master Skill

> Coordinates multi-agent StickerNest V5 workflows by spawning Claude Code sessions,
> monitoring progress, chaining outputs, and managing approval gates via Command Center MCP.

---

## Pipelines

### Dev Cycle (auto-advance by default)

```
Task Runner → QA → Scribe → PM
```

Builds a feature, verifies it, logs the session, updates the backlog. Each step
hands its output summary to the next automatically.

### Content Pipeline (manual approval by default)

```
Content Strategy → Marketing → Brand Voice → Demo
```

Discovers content-worthy moments, writes posts, reviews tone, creates demo assets.
Pauses for your approval between steps so you can review and redirect.

---

## Command Center MCP — Complete Tool Reference

### Session Lifecycle

| Tool | Purpose | Key Parameters |
|---|---|---|
| `cc_health` | Check if Command Center server is running | *(none)* |
| `cc_register` | Register THIS session with CC for messaging | `name`, `project?` → returns `session_id` |
| `cc_create_session` | **Spawn a new session** (Claude Code, terminal, orchestrator, watcher, script, github-repo) | `name`, `type`, `prompt?`, `command?`, `cwd?`, `project?`, `require_approval?` |
| `cc_list_sessions` | List all sessions with status | `status_filter`: `all`/`active`/`permission`/`blocked`/`waiting`/`ready`/`archived` |
| `cc_kill_session` | Terminate any session | `session_id` |

### Orchestrator-Specific (for terminal children)

| Tool | Purpose | Key Parameters |
|---|---|---|
| `cc_orchestrator_info` | Get orchestrator status + children list | `orchestrator_id` |
| `cc_orchestrator_spawn` | Spawn a **shell command** child terminal | `orchestrator_id`, `name`, `command`, `cwd?` |
| `cc_orchestrator_children` | List child terminals with status + recent output | `orchestrator_id` |
| `cc_orchestrator_child_output` | Read output from a child terminal | `orchestrator_id`, `child_id`, `lines?` (default 50) |
| `cc_orchestrator_kill_child` | Kill one child terminal | `orchestrator_id`, `child_id` |
| `cc_orchestrator_kill_all` | Kill ALL child terminals | `orchestrator_id` |
| `cc_orchestrator_broadcast` | Send text to ALL child terminals | `orchestrator_id`, `text` |

### Approval Workflow

| Tool | Purpose | Key Parameters |
|---|---|---|
| `cc_approve_session` | Approve a session's pending action | `session_id` |
| `cc_approve_all` | Approve ALL pending sessions at once | *(none)* |
| `cc_deny_session` | Deny/reject a session's pending action | `session_id` |

### Inter-Session Messaging

| Tool | Purpose | Key Parameters |
|---|---|---|
| `cc_send_input` | Send text/command to any session | `session_id`, `text`, `from?` |
| `cc_get_messages` | Check messages for a session | `session_id`, `mark_read?` |
| `cc_my_messages` | Check messages for YOUR session | `session_id` |

### Discovery

| Tool | Purpose | Key Parameters |
|---|---|---|
| `cc_discover_processes` | Scan for running dev processes (no registration) | `include_dev_servers?`, `include_claude?` |
| `cc_auto_populate` | Discover AND auto-register running processes | `dry_run?`, `include_dev_servers?` |

---

## CRITICAL: Two Spawn Strategies

Command Center has two distinct ways to spawn work. Using the wrong one is the
most common orchestration mistake.

### Strategy A: `cc_create_session` — For Agent Work

Use this when you need a **Claude Code session** that uses skills, writes code,
makes decisions, and produces structured output.

```
cc_create_session(
  name: "Task Runner — build entity drag",
  type: "claude-code",
  prompt: "Use the sn-task-runner:task-runner skill. Your task: ...",
  cwd: "/path/to/StickerNest5.0",
  project: "StickerNest",
  require_approval: false
)
```

**This is the correct method for all StickerNest agent pipeline steps.**

The `type` field options:
- `"claude-code"` — launches a Claude Code session with a prompt (for agents)
- `"terminal"` — runs a shell command (for builds, tests, servers)
- `"orchestrator"` — creates an orchestrator session that can spawn children
- `"watcher"` — file watcher
- `"script"` — runs a node/python script
- `"github-repo"` — monitors a GitHub repository

### Strategy B: `cc_orchestrator_spawn` — For Shell Commands

Use this when you need to run a **terminal command** as a child of an orchestrator
session (e.g., `npm test`, `npm run build`, `npm run lint`).

```
cc_orchestrator_spawn(
  orchestrator_id: "...",
  name: "Run Tests",
  command: "cd /path/to/StickerNest5.0 && npm test"
)
```

**Do NOT use this for agent work.** It runs shell commands, not Claude sessions.

### When to Use Each

| Task | Strategy | Why |
|---|---|---|
| Task Runner building a feature | A: `cc_create_session(type="claude-code")` | Needs Claude + skills |
| QA verifying code | A: `cc_create_session(type="claude-code")` | Needs Claude + skills |
| Running `npm test` in isolation | B: `cc_orchestrator_spawn` | Just a shell command |
| Running `npm run lint` | B: `cc_orchestrator_spawn` | Just a shell command |
| Scribe logging a session | A: `cc_create_session(type="claude-code")` | Needs Claude + skills |
| Starting the dev server | B: `cc_orchestrator_spawn` | Just a shell command |

---

## Running a Pipeline — Step by Step

### Phase 0: Preflight

Before any pipeline run, verify the environment:

```
1. cc_health()
   → If unhealthy: tell user "Command Center is not running. Start it first, or
     I can run the pipeline sequentially in this session as a fallback."

2. cc_discover_processes(include_dev_servers=true, include_claude=true)
   → Log what's already running so you don't duplicate (e.g., is the dev server
     already up? Is another pipeline in progress?)

3. cc_register(name="SN Orchestrator", project="StickerNest")
   → Save the returned session_id — you'll need it for cc_my_messages later.
```

### Phase 1: Confirm the Task

Ask the user what they want to build or do. This becomes the **task context**
passed to every agent in the pipeline.

For Dev Cycle, get:
- The feature/task description
- The target layer (if known)
- Any constraints or acceptance criteria

For Content Pipeline, get:
- What to scan for (or "latest session")
- Target platforms
- Any messaging priorities

### Phase 2: Spawn the First Agent

Use `cc_create_session` with `type="claude-code"`:

```
cc_create_session(
  name: "SN Task Runner",
  type: "claude-code",
  prompt: "<full prompt — see Prompt Templates below>",
  cwd: "/path/to/StickerNest5.0",
  project: "StickerNest",
  require_approval: false   ← set true for manual-approval pipelines
)
```

Save the returned `session_id` for monitoring.

### Phase 3: Monitor Progress

Poll for completion:

```
cc_list_sessions(status_filter="active")
→ Check if the agent session is still active

cc_list_sessions(status_filter="permission")
→ Check if any session is waiting for approval
```

When the session completes, its status changes from `active` to `ready` or `archived`.

To read what the agent produced:
```
cc_get_messages(session_id=<agent_session_id>, mark_read=true)
```

Or if it was an orchestrator child:
```
cc_orchestrator_child_output(orchestrator_id=..., child_id=..., lines=100)
```

### Phase 4: Advance or Gate

**Auto-advance mode (Dev Cycle default):**
Immediately spawn the next agent with the previous agent's output as context.

**Manual approval mode (Content Pipeline default):**
1. Show the user the agent's output summary.
2. Ask: Continue / Skip this step / Cancel pipeline.
3. If the user says continue → spawn the next agent.
4. If using `require_approval: true`, the session pauses automatically:
   - `cc_approve_session(session_id)` to continue
   - `cc_deny_session(session_id)` to stop

### Phase 5: Chain the Output

Each subsequent agent receives:
1. The original task context
2. The previous agent's output summary (truncated to key findings)
3. Role-specific instructions

### Phase 6: Pipeline Complete

When all steps finish:
1. Collect output summaries from all agents.
2. Present a unified pipeline report to the user.
3. If Dev Cycle: report files changed, tests passed, journal entry, backlog updates.
4. If Content Pipeline: report drafted posts, tone check results, demo assets.

---

## Prompt Templates

### Dev Cycle

**Step 1 — Task Runner:**
```
You are a StickerNest V5 development agent.

SETUP:
1. Use the /sn-core-context:stickernest-context skill to load project context.
2. Use the /sn-task-runner:task-runner skill to guide your workflow.

TASK:
[USER'S TASK DESCRIPTION]

REQUIREMENTS:
- Follow the task-runner workflow: identify layer → read layer rules → write code → write tests → validate (lint, test, deps:validate, typecheck) → commit
- Use conventional commit format with the correct layer scope
- Working directory: [CWD]

OUTPUT (required — include all of these):
- Files changed (list each with a one-line description)
- Tests written and their results
- Architectural decisions made and why
- Any issues or blockers encountered
- The commit hash and message
```

**Step 2 — QA:**
```
You are a StickerNest V5 QA agent.

SETUP:
1. Use the /sn-core-context:stickernest-context skill to load project context.
2. Use the /sn-qa:qa skill to guide your workflow.

CONTEXT FROM PREVIOUS STEP (Task Runner):
[PASTE TASK RUNNER OUTPUT SUMMARY]

TASK:
Verify the work described above. Run all validation checks.

CHECKLIST:
- npm test (all tests pass?)
- npm run lint (no lint errors?)
- npm run deps:validate (no layer boundary violations?)
- npm run typecheck (no type errors?)
- Review the changed files for correctness
- Check test coverage meets 80% threshold

OUTPUT (required):
- QA VERDICT: PASS or FAIL
- Each check result with pass/fail
- If FAIL: specific failures with file paths and line numbers
- Recommendations (even if PASS)
```

**Step 3 — Scribe:**
```
You are a StickerNest V5 documentation agent.

SETUP:
1. Use the /sn-core-context:stickernest-context skill to load project context.
2. Use the /sn-scribe:scribe skill to guide your workflow.

CONTEXT FROM PREVIOUS STEPS:
Task Runner output: [SUMMARY]
QA verdict: [PASS/FAIL + key details]

TASK:
Log this development session to the Build Journal.

REQUIREMENTS:
- Analyze recent git log and diff
- Create a Build Journal entry with: what changed, why, architectural decisions, test results
- Update TODO.md if tasks were completed
- Record any ADRs (architecture decision records) if applicable

OUTPUT (required):
- Journal entry file path and summary
- TODO.md changes (if any)
- ADR created (if any)
```

**Step 4 — PM:**
```
You are a StickerNest V5 project management agent.

SETUP:
1. Use the /sn-core-context:stickernest-context skill to load project context.
2. Use the /sn-pm:pm skill to guide your workflow.

CONTEXT FROM PREVIOUS STEPS:
Task completed: [TASK DESCRIPTION]
QA verdict: [PASS/FAIL]
Scribe summary: [JOURNAL ENTRY SUMMARY]

TASK:
Update the StickerNest backlog to reflect this completed work.

REQUIREMENTS:
- Review TODO.md and mark completed items
- Re-prioritize remaining tasks if the completed work unblocks anything
- Sync with Notion if connected
- Suggest what to build next based on the build order and current progress

OUTPUT (required):
- Tasks marked complete
- Priority changes made
- Recommended next task with rationale
- Current layer completion status
```

### Content Pipeline

**Step 1 — Content Strategy:**
```
You are a StickerNest content strategist agent.

SETUP:
1. Use the /sn-core-context:stickernest-context skill to load project context.
2. Use the /sn-content-pipeline:content-strategy skill to guide your workflow.

TASK:
Scan for content-worthy moments in recent StickerNest development.

REQUIREMENTS:
- Check the Build Journal for recent entries
- Check git log for recent commits
- Score each potential content idea on: novelty, audience appeal, visual potential, educational value
- Propose top 3 ideas with platform recommendations (Twitter/X, TikTok, YouTube, Reddit)

OUTPUT (required):
- Ranked list of content ideas (top 3 minimum)
- For each: title, angle, target platform, estimated engagement, visual needs
```

**Step 2 — Marketing:**
```
You are a StickerNest marketing content agent.

SETUP:
1. Use the /sn-core-context:stickernest-context skill to load project context.
2. Use the /sn-content-pipeline:marketing skill to guide your workflow.

APPROVED CONTENT IDEAS:
[PASTE APPROVED IDEAS FROM STEP 1]

TASK:
Write publish-ready posts for the approved content ideas.

REQUIREMENTS:
- Create platform-specific drafts (Twitter/X thread, TikTok script, YouTube description, Reddit post)
- Follow StickerNest brand voice
- Include suggested hashtags and posting times
- Note any visual assets needed

OUTPUT (required):
- Complete draft for each platform
- Hashtag suggestions
- Posting schedule recommendation
- Asset requirements list
```

**Step 3 — Brand Voice:**
```
You are a StickerNest brand voice reviewer agent.

SETUP:
1. Use the /sn-content-pipeline:brand-voice skill to load brand voice guidelines.

CONTENT DRAFTS TO REVIEW:
[PASTE MARKETING DRAFTS]

TASK:
Review all content drafts for brand voice consistency.

REQUIREMENTS:
- Check voice attributes: playful-professional, spatial metaphors, creator-empowering
- Check messaging pillars alignment
- Flag any off-brand language
- Suggest specific edits (show before → after)

OUTPUT (required):
- Tone check verdict for each draft (ON-BRAND / NEEDS-EDIT)
- Specific edit suggestions with before/after text
- Overall brand consistency score
```

**Step 4 — Demo:**
```
You are a StickerNest demo and visual assets agent.

SETUP:
1. Use the /sn-core-context:stickernest-context skill to load project context.
2. Use the /sn-demo-design:demo skill to guide your workflow.

CONTENT PLAN:
[PASTE FINAL APPROVED CONTENT WITH ASSET REQUIREMENTS]

TASK:
Create demo scripts and visual asset specifications for the content.

REQUIREMENTS:
- Write step-by-step demo recording scripts
- Specify screenshots needed (which views, what state)
- Create any code-generated visuals if applicable
- Note screen dimensions and format requirements per platform

OUTPUT (required):
- Demo recording script (step-by-step with timing)
- Screenshot specification list
- Asset format requirements per platform
- Any generated visual assets
```

---

## Parallel Execution

Some pipeline steps can run concurrently. Use `cc_create_session` multiple times
without waiting for the first to complete.

### Safe Parallel Groups

**Dev Cycle — after Task Runner completes:**
- QA can run while Scribe runs (both only read the code, neither writes)
- PM must wait for both QA and Scribe to finish

**Content Pipeline — after Content Strategy:**
- Marketing for different platforms can run in parallel
- Brand Voice must wait for all Marketing drafts

### How to Parallelize

```
# Spawn QA and Scribe simultaneously
qa_session = cc_create_session(name="QA", type="claude-code", prompt="...", project="StickerNest")
scribe_session = cc_create_session(name="Scribe", type="claude-code", prompt="...", project="StickerNest")

# Monitor both
cc_list_sessions(status_filter="active")
# → Wait until both are no longer active

# Then spawn PM with both outputs
pm_session = cc_create_session(name="PM", type="claude-code", prompt="...", project="StickerNest")
```

---

## Terminal Tasks via Orchestrator

For running build/test commands alongside agent work, first create an orchestrator session:

```
orch = cc_create_session(name="SN Build Orchestrator", type="orchestrator")

# Then spawn terminal children
cc_orchestrator_spawn(orchestrator_id=orch.id, name="Dev Server", command="cd /path/to/StickerNest5.0 && npm run dev")
cc_orchestrator_spawn(orchestrator_id=orch.id, name="Test Watch", command="cd /path/to/StickerNest5.0 && npm run test:watch")
cc_orchestrator_spawn(orchestrator_id=orch.id, name="Type Check", command="cd /path/to/StickerNest5.0 && npm run typecheck")

# Monitor all children
cc_orchestrator_children(orchestrator_id=orch.id)
cc_orchestrator_child_output(orchestrator_id=orch.id, child_id=..., lines=100)

# Stop everything when done
cc_orchestrator_kill_all(orchestrator_id=orch.id)
```

---

## Approval Workflow

For manual-approval pipelines, use the built-in approval system:

```
# Spawn with approval required
session = cc_create_session(
  name="Marketing Drafts",
  type="claude-code",
  prompt="...",
  require_approval: true
)

# The session will pause before executing, status = "permission"

# Find sessions waiting for approval
cc_list_sessions(status_filter="permission")

# Review the pending session, then:
cc_approve_session(session_id=session.id)   # → Continue
# OR
cc_deny_session(session_id=session.id)       # → Cancel

# Bulk approve all pending sessions
cc_approve_all()
```

---

## Inter-Session Communication

Agents can message each other through the orchestrator:

```
# Send context to a running session
cc_send_input(
  session_id: "<target_session>",
  text: "The QA agent found 2 test failures in src/kernel/bus/bus.test.ts. Please fix and re-run.",
  from: "SN Orchestrator"
)

# Check for messages from agents
cc_my_messages(session_id: "<orchestrator_session_id>")
cc_get_messages(session_id: "<orchestrator_session_id>", mark_read: true)
```

Use cases:
- QA fails → orchestrator messages Task Runner to fix the issue
- Brand Voice suggests edits → orchestrator messages Marketing to revise
- Any agent encounters a blocker → orchestrator receives the message and decides next action

---

## Error Handling

### Agent Session Crashes
1. Detect via `cc_list_sessions` — session status becomes `archived` unexpectedly.
2. Read last output: `cc_get_messages(session_id)`.
3. Log the failure in the pipeline report.
4. **Stop the pipeline** — do not advance to the next step on a crash.
5. Report the failure to the user with the last output and suggest:
   - Retry the failed step
   - Fix the issue manually and resume from the next step
   - Cancel the pipeline

### Session Takes Too Long (>10 minutes)
1. Warn the user: "The [Agent Name] step has been running for over 10 minutes."
2. Offer options: Wait longer / Kill and retry / Kill and skip.
3. Use `cc_kill_session(session_id)` if the user chooses to kill.

### Command Center Unavailable
1. `cc_health()` fails or times out.
2. **Fallback:** Run the pipeline sequentially in the current session using skills directly.
   - Call `/sn-task-runner:task-runner` skill → wait → call `/sn-qa:qa` skill → etc.
   - This loses parallelism but preserves functionality.
3. Tell the user: "Command Center isn't available. Running the pipeline sequentially in this session instead."

### QA Fails in Dev Cycle
1. Stop auto-advance.
2. Show the QA failure details to the user.
3. Options:
   a. Spawn a new Task Runner session to fix the issues (loop back).
   b. Skip QA and continue (user accepts the risk).
   c. Cancel the pipeline.

---

## Autonomy Configuration

| Pipeline | Default Mode | Approval Behavior |
|---|---|---|
| Dev Cycle | Auto-advance | All steps run without pausing. QA failure stops the pipeline. |
| Content Pipeline | Manual approval | Pauses after each step. User must approve to continue. |

Override by setting `require_approval` on `cc_create_session`:
- `require_approval: false` → auto-advance (session runs immediately)
- `require_approval: true` → pauses for `cc_approve_session` before executing

---

## Process Discovery

Before starting a pipeline, check what's already running:

```
cc_discover_processes(include_dev_servers=true, include_claude=true)
```

This scans for: Claude Code sessions, dev servers, build processes, test runners,
Docker containers, database clients, and file watchers. Use this to:
- Avoid spawning duplicate dev servers
- Detect if another pipeline is already in progress
- Find the dev server URL if it's already running

To auto-register everything found:
```
cc_auto_populate(dry_run=true)    # Preview what would be registered
cc_auto_populate(dry_run=false)   # Actually register them
```

---

## Dashboard

The visual dashboard is at:
```
StickerNest-Agents/orchestrator-dashboard.html
```

Open it in a browser to see pipeline status, agent cards, activity logs, and settings.

---

## Quick Reference — Pipeline Recipes

### Minimal Dev Cycle (just build + test)
```
Task Runner → QA
```
Skip Scribe and PM for quick iteration.

### Full Dev Cycle
```
Task Runner → QA → Scribe → PM
```

### Content Sprint
```
Content Strategy → Marketing → Brand Voice → Demo
```

### Parallel QA + Docs
```
Task Runner → [QA + Scribe in parallel] → PM
```

### Fix Loop (when QA fails)
```
Task Runner → QA (FAIL) → Task Runner (fix) → QA (re-verify) → Scribe → PM
```
