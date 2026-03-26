# StickerNest Plugin Architecture Map

> Maps skills to plugins and plugins to agents. Defines shared vs role-specific skills and dependencies.
>
> Last updated: 2026-03-23

---

## Plugin Overview

Plugins bundle skills, connectors, and configuration into installable packages for Cowork sessions. Each plugin serves one or more agents and can be installed independently.

---

## Plugin 1: StickerNest Core Context

**Serves:** All agents (shared dependency)

**Skills:**
- `stickernest-context.md` — Master project briefing (what, why, how, current state)
- `terminology-reference.md` — Quick-reference terminology card (Canvas, Entity, Widget, etc.)

**Connectors:** None (read-only context)

**Notes:** This plugin is a prerequisite for every other plugin. It provides the shared understanding that keeps all agents aligned on terminology, architecture, and project state. Should be installed first.

---

## Plugin 2: StickerNest Scribe

**Serves:** Scribe agent

**Skills:**
- `scribe-skill.md` — Session diff analysis, Build Journal entry formatting, change categorization
- `stickernest-context.md` (from Core Context)

**Connectors needed:**
- GitHub (commits, diffs, PRs)
- Notion (Build Journal database — write access)

**Existing assets to incorporate:**
- `.claude/commands/create-adr.md` — ADR generation (already exists in repo)
- `.ralph/` story archive — for session history context

**Dependencies:** Core Context plugin

---

## Plugin 3: StickerNest PM

**Serves:** Project Manager agent

**Skills:**
- `pm-skill.md` — Task prioritization logic, dependency analysis, sprint planning templates, status report format
- `stickernest-context.md` (from Core Context)

**Connectors needed:**
- Notion (Master Build Plan, task databases — read/write)
- GitHub (issues, PR status, CI results)

**Existing assets to incorporate:**
- `TODO.md` format and conventions
- `PLAN.md` structure
- Build phase organization (Phase 1–7 from TODO.md)

**Dependencies:** Core Context plugin

---

## Plugin 4: StickerNest Task Runner

**Serves:** Task Runner agent

**Skills:**
- `task-runner-skill.md` — Layer-aware coding standards, pre-task checklist (read rule file → code → test → lint → commit)
- `stickernest-context.md` (from Core Context)

**Connectors needed:**
- GitHub (branches, commits, push)
- Local filesystem (full source access)

**Existing assets to incorporate (already in repo):**
- `.claude/rules/L*.md` — All 11 layer rule files
- `.claude/skills/scaffold-widget/SKILL.md`
- `.claude/skills/code-review/SKILL.md`
- `.claude/commands/generate-tests.md`
- `.claude/commands/generate-bus-test.md`
- `.claude/commands/kill-mutants.md`
- `.claude/commands/add-tsdoc.md`
- `.ralph/` — Ralph Loop workflow

**Dependencies:** Core Context plugin

**Notes:** This is the heaviest plugin. It wraps the existing Claude Code skills that are already in the repo, plus adds the Cowork-level task runner skill that orchestrates them. The layer rule files are NOT duplicated into the plugin — they remain in `.claude/rules/` and the skill references their paths.

---

## Plugin 5: StickerNest QA

**Serves:** QA Verifier agent

**Skills:**
- `qa-skill.md` — Test plan templates, acceptance criteria verification workflow, screenshot annotation, bug report format
- `stickernest-context.md` (from Core Context)

**Connectors needed:**
- Claude in Chrome (browser use — navigate app, take screenshots, interact with UI)
- GitHub (read PRs, post review comments)

**Existing assets to incorporate:**
- `playwright.config.ts` — E2E test patterns
- `forge-suite/evals/` — Eval patterns for reference

**Dependencies:** Core Context plugin

---

## Plugin 6: StickerNest Content Pipeline

**Serves:** Content Strategist + Marketing agents

**Skills:**
- `content-strategy-skill.md` — Content angle identification, platform formatting, content calendar management
- `marketing-skill.md` — Platform-specific writing (Twitter/X, TikTok, YouTube, Reddit), outreach templates, pitch material
- `brand-voice-skill.md` — StickerNest tone, messaging pillars, audience targeting (start simple, iterate with feedback)
- `stickernest-context.md` (from Core Context)

**Connectors needed:**
- Notion (Build Journal — read; content calendar — read/write)
- Gmail (draft outreach emails)
- Web search (trends, competitor activity)

**Existing Cowork skills to leverage:**
- `marketing:content-creation`
- `marketing:draft-content`
- `marketing:campaign-plan`
- `marketing:brand-review`
- `brand-voice:brand-voice-enforcement`

**Dependencies:** Core Context plugin, Scribe plugin (reads Build Journal)

---

## Plugin 7: StickerNest Demo & Design

**Serves:** Demo Agent + Design Team agents

**Skills:**
- `demo-skill.md` — User flow scripting, demo recording best practices, screenshot annotation
- `design-skill.md` — StickerNest visual identity, component patterns, asset generation guidelines
- `stickernest-context.md` (from Core Context)

**Connectors needed:**
- Claude in Chrome (browser navigation for demos)
- Figma (Framelink MCP — read designs)
- Creatie (design generation)
- Jam (video recording, screenshots)

**Existing Cowork skills to leverage:**
- `canvas-design`
- `theme-factory`

**Dependencies:** Core Context plugin

---

## Skill Categorization

### Shared Skills (in Core Context plugin, used by all)

| Skill | Purpose |
|-------|---------|
| `stickernest-context.md` | Master project briefing |
| `terminology-reference.md` | Quick-reference terminology card |

### Role-Specific Skills (in dedicated plugins)

| Skill | Plugin | Agent(s) |
|-------|--------|----------|
| `scribe-skill.md` | Scribe | Scribe |
| `pm-skill.md` | PM | Project Manager |
| `task-runner-skill.md` | Task Runner | Task Runner |
| `qa-skill.md` | QA | QA Verifier |
| `content-strategy-skill.md` | Content Pipeline | Content Strategist |
| `marketing-skill.md` | Content Pipeline | Marketing |
| `brand-voice-skill.md` | Content Pipeline | Content Strategist, Marketing |
| `demo-skill.md` | Demo & Design | Demo Agent |
| `design-skill.md` | Demo & Design | Design Team |

### Existing Repo Skills (referenced, not duplicated)

| Skill | Path | Used By |
|-------|------|---------|
| scaffold-widget | `.claude/skills/scaffold-widget/SKILL.md` | Task Runner |
| code-review | `.claude/skills/code-review/SKILL.md` | Task Runner, QA |
| generate-tests | `.claude/commands/generate-tests.md` | Task Runner |
| generate-bus-test | `.claude/commands/generate-bus-test.md` | Task Runner |
| kill-mutants | `.claude/commands/kill-mutants.md` | Task Runner |
| add-tsdoc | `.claude/commands/add-tsdoc.md` | Task Runner |
| create-adr | `.claude/commands/create-adr.md` | Scribe, Task Runner |
| ralph | `.claude/commands/ralph.md` | Task Runner |

---

## Dependency Graph

```
                    ┌─────────────────────┐
                    │  Core Context       │
                    │  (all agents)       │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
     ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
     │   Scribe    │   │  PM         │   │ Task Runner │
     └──────┬──────┘   └─────────────┘   └──────┬──────┘
            │                                    │
     ┌──────▼──────┐                      ┌──────▼──────┐
     │  Content    │                      │    QA       │
     │  Pipeline   │                      └─────────────┘
     └──────┬──────┘
            │
     ┌──────▼──────┐
     │ Demo &      │
     │ Design      │
     └─────────────┘
```

**Install order:** Core Context → Scribe → PM → Task Runner → QA → Content Pipeline → Demo & Design

---

## Connector Summary (Across All Plugins)

| Connector | Plugins Using It | Tools |
|-----------|-----------------|-------|
| GitHub | Scribe, PM, Task Runner, QA | `github_list_commits`, `github_get_file`, `github_create_issue`, etc. |
| Notion | Scribe, PM, Content Pipeline | `notion_search`, `notion_add_todo`, `notion-create-pages`, etc. |
| Gmail | Content Pipeline | `gmail_create_draft` |
| Claude in Chrome | QA, Demo & Design | `computer`, `navigate`, `get_page_text`, `upload_image` |
| Figma | Demo & Design | `get_figma_data`, `download_figma_images`, `get_design_context` |
| Creatie | Demo & Design | `create_design`, `get_artifact` |
| Jam | Demo & Design | `getScreenshots`, `analyzeVideo` |
| Local filesystem | All | Bash, Read, Write, Edit tools |

---

## What Gets Built in Phase 2

In Phase 2 (Write Individual Skill Files), each of these new skills needs to be written:

1. `stickernest-context.md` ✅ — master context briefing
2. `terminology-reference.md` ✅ — quick-reference card from terminology PDF
3. `scribe-skill.md` ✅ — session analysis + journal entry format
4. `pm-skill.md` ✅ — prioritization + sprint planning + dual-source sync
5. `task-runner-skill.md` ✅ — layer-aware coding workflow + scaffolding
6. `qa-skill.md` ✅ — test plan + visual/programmatic verification + bug reports
7. `content-strategy-skill.md` ✅ — content discovery + calendar + platform formatting
8. `marketing-skill.md` ✅ — platform-specific templates + brand voice
9. `brand-voice-skill.md` ✅ — tone, pillars, do/don't, audience adaptation (v1)
10. `demo-skill.md` ✅ — audience-specific scripts + screenshot workflow
11. `design-skill.md` ✅ — visual identity + asset standards + theme tokens

**All Phase 2 skills are complete.** Phase 3 is complete. Phase 4 is complete.

---

## Phase 3 Status: Plugin Packaging ✅

All 7 plugins packaged as `.plugin` files in `StickerNest-Agents/plugins/`:

| Plugin | File | Skills | Size |
|---|---|---|---|
| sn-core-context | `sn-core-context.plugin` | stickernest-context, terminology-reference | 13KB |
| sn-scribe | `sn-scribe.plugin` | scribe | 4KB |
| sn-pm | `sn-pm.plugin` | pm | 4KB |
| sn-task-runner | `sn-task-runner.plugin` | task-runner | 4KB |
| sn-qa | `sn-qa.plugin` | qa | 4KB |
| sn-content-pipeline | `sn-content-pipeline.plugin` | content-strategy, marketing, brand-voice | 10KB |
| sn-demo-design | `sn-demo-design.plugin` | demo, design | 7KB |

All plugins installed and verified — skills appear in Cowork's active skill list.

---

## Phase 4 Status: Orchestration & Scheduling ✅

**Orchestration guide:** `StickerNest-Agents/ORCHESTRATION.md`
- Agent invocation quick reference
- Connector map (which MCPs each agent uses)
- 4 workflow sequences (dev cycle, content pipeline, sprint planning, release)
- Key files each agent reads/writes
- Tips for effective chaining

**Scheduled tasks (manual trigger — Scheduled sidebar):**
- `sn-session-log` — Scribe: log dev session to Build Journal
- `sn-backlog-review` — PM: review/prioritize backlog across TODO.md + Notion
- `sn-content-scan` — Content Strategist: scan for content-worthy moments
