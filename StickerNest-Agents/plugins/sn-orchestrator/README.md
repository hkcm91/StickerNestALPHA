# StickerNest Orchestrator

Multi-agent pipeline coordinator for StickerNest V5 development.

## Skills

- **orchestrator** — Spawns, monitors, and chains agent sessions via Command Center MCP. Runs full Dev Cycle and Content Pipeline workflows.
- **monitor** — Checks pipeline status, lists active sessions, handles approvals, reads agent output.
- **parallel** — Runs multiple agents concurrently for independent tasks (e.g., QA + Scribe after Task Runner).

## Pipelines

- **Dev Cycle**: Task Runner → QA → Scribe → PM (auto-advance, with optional QA+Scribe parallelism)
- **Content Pipeline**: Content Strategy → Marketing → Brand Voice → Demo (manual approval between steps)

## Command Center MCP Integration

Uses 20 Command Center tools across 5 categories:

- **Session lifecycle**: `cc_health`, `cc_register`, `cc_create_session`, `cc_list_sessions`, `cc_kill_session`
- **Orchestrator children**: `cc_orchestrator_info`, `cc_orchestrator_spawn`, `cc_orchestrator_children`, `cc_orchestrator_child_output`, `cc_orchestrator_kill_child`, `cc_orchestrator_kill_all`, `cc_orchestrator_broadcast`
- **Approval workflow**: `cc_approve_session`, `cc_approve_all`, `cc_deny_session`
- **Messaging**: `cc_send_input`, `cc_get_messages`, `cc_my_messages`
- **Discovery**: `cc_discover_processes`, `cc_auto_populate`

## Key Design Decisions

- Agent tasks use `cc_create_session(type="claude-code")` — spawns real Claude sessions with skills
- Terminal commands use `cc_orchestrator_spawn` — runs shell commands like `npm test`
- Manual approval uses `require_approval: true` on `cc_create_session` + `cc_approve_session`/`cc_deny_session`
- Fallback: if Command Center is unavailable, runs skills sequentially in the current session

## Dependencies

- `sn-core-context` plugin (shared context)
- All other StickerNest agent plugins (spawned as child sessions)
- Command Center MCP (session management)

## Dashboard

Open `orchestrator-dashboard.html` in a browser for the visual pipeline UI.
