---
name: monitor
description: >
  Check the status of running StickerNest agent sessions and pipelines.
  Use when the user says "pipeline status", "what's running", "check the agents",
  "SN agent status", "how's the pipeline doing", "any agents running",
  "check Command Center", "CC status", "session status", "what agents are active".
---

# SN Monitor — Pipeline & Session Status

> Checks Command Center for running sessions, pipeline progress, and agent health.

---

## When to Use

- User asks about the status of a running or recent pipeline
- User wants to know what agents/sessions are active
- User wants to check if Command Center is healthy
- User wants to see output from a completed agent session
- User wants to approve or deny pending sessions

---

## Workflow

### 1. Health Check

```
cc_health()
```

If Command Center is not running, tell the user and stop. No further monitoring
is possible without it.

### 2. List All Sessions

```
cc_list_sessions(status_filter="all")
```

Report to the user:
- **Active** sessions: currently running (name, type, how long running)
- **Permission** sessions: waiting for approval (name, what they need)
- **Blocked** sessions: stuck on something
- **Ready/Archived** sessions: completed recently

### 3. Check for Pending Approvals

```
cc_list_sessions(status_filter="permission")
```

If any sessions are waiting for approval, present them to the user with options:
- Approve individually: `cc_approve_session(session_id)`
- Approve all: `cc_approve_all()`
- Deny: `cc_deny_session(session_id)`

### 4. Read Agent Output

For any completed or active session the user wants details on:

```
cc_get_messages(session_id=<session_id>, mark_read=false)
```

Present the output summary to the user.

### 5. Process Discovery

If the user wants a broader view of what's running on the system:

```
cc_discover_processes(include_dev_servers=true, include_claude=true)
```

Report: running Claude sessions, dev servers, build processes, test runners, etc.

---

## Status Report Format

Present status like this:

```
🟢 Command Center: Healthy

Active Sessions (3):
  • SN Task Runner — running 4m 32s — building entity drag system
  • Dev Server — running 1h 12m — localhost:5173
  • Test Watch — running 1h 12m — vitest watch mode

Pending Approval (1):
  • Marketing Drafts — waiting for your approval to execute

Recently Completed (2):
  • QA Agent — completed 8m ago — VERDICT: PASS
  • Content Strategy — completed 22m ago — 3 ideas proposed
```

---

## Quick Actions

| User Says | Action |
|---|---|
| "approve it" / "go ahead" | `cc_approve_session` or `cc_approve_all` |
| "kill it" / "stop that" | `cc_kill_session(session_id)` |
| "what did it say" / "show the output" | `cc_get_messages(session_id)` |
| "kill everything" | `cc_orchestrator_kill_all` or kill each session |
| "is CC running" | `cc_health()` |
