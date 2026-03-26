# StickerNest Agent Orchestration Guide

> Master reference for invoking, sequencing, and coordinating all StickerNest V5 agents.
> Phase 4 deliverable — last updated: 2026-03-23

---

## Quick Reference: How to Invoke Each Agent

| Agent | Plugin | Skill Name(s) | Example Trigger Phrases |
|---|---|---|---|
| **Context** | `sn-core-context` | `stickernest-context`, `terminology-reference` | "what is StickerNest", "is it Canvas or board?" |
| **Scribe** | `sn-scribe` | `scribe` | "log this session", "what changed today", "journal entry" |
| **PM** | `sn-pm` | `pm` | "what should I work on next", "update the backlog", "sprint plan" |
| **Task Runner** | `sn-task-runner` | `task-runner` | "build this feature", "fix this bug", "implement the widget" |
| **QA** | `sn-qa` | `qa` | "test this feature", "verify the PR", "QA this", "run the tests" |
| **Content Strategist** | `sn-content-pipeline` | `content-strategy` | "what content should I post", "content ideas", "content calendar" |
| **Marketing** | `sn-content-pipeline` | `marketing` | "write a post about", "draft a tweet", "TikTok script" |
| **Brand Voice** | `sn-content-pipeline` | `brand-voice` | "tone check", "does this sound right", "on-brand" |
| **Demo** | `sn-demo-design` | `demo` | "demo this feature", "record a walkthrough", "take screenshots" |
| **Design** | `sn-demo-design` | `design` | "design an icon", "create a mockup", "marketing visual" |

---

## Connector Map: What Each Agent Needs

| Agent | GitHub | Notion | Chrome | Filesystem | Gmail | Figma | Jam | Creatie |
|---|---|---|---|---|---|---|---|---|
| Scribe | read | write | - | read | - | - | - | - |
| PM | read | read/write | - | read/write | - | - | - | - |
| Task Runner | read/write | - | - | read/write | - | - | - | - |
| QA | read | - | navigate | read | - | - | - | - |
| Content Strategist | - | read | - | read | - | - | - | - |
| Marketing | - | read/write | - | read/write | draft | - | - | - |
| Demo | - | - | navigate | write | - | - | record | - |
| Design | - | - | - | write | - | read | - | create |

All connectors are already available via your installed MCPs:
- **GitHub**: `github_list_commits`, `github_get_file`, `github_create_issue`, etc.
- **Notion**: `notion-create-pages`, `notion-search`, `notion-update-page`, etc.
- **Chrome**: `Claude_in_Chrome` tools (navigate, read_page, get_page_text, etc.)
- **Gmail**: `gmail_create_draft`, `gmail_search`, etc.
- **Figma**: `Framelink_MCP_for_Figma` tools
- **Jam**: `analyzeVideo`, `getScreenshots`, etc.
- **Creatie**: `create_design`, `get_artifact`, etc.

---

## Workflow Sequences

### Sequence 1: Development Cycle (most common)

```
You assign a task
    │
    ▼
PM (prioritize) ──→ Task Runner (build) ──→ QA (verify) ──→ Scribe (log)
                                               │
                                               ▼
                                          PM (update backlog)
```

**How to run it:**
1. "What should I work on next?" → triggers PM
2. "Build [the task PM suggested]" → triggers Task Runner
3. "Test this feature" or "QA this" → triggers QA
4. "Log this session" → triggers Scribe
5. PM auto-updates when Scribe finishes (or say "update the backlog")

### Sequence 2: Content Pipeline (after features ship)

```
Scribe logs a session
    │
    ▼
Content Strategist (find angles) ──→ Marketing (write posts) ──→ Brand Voice (tone check)
                                         │
                                         ▼
                                    Demo + Design (visuals)
```

**How to run it:**
1. "What content should I post this week?" → Content Strategist scans Build Journal
2. "Write a Twitter thread about [feature]" → Marketing drafts it
3. "Does this sound right?" → Brand Voice reviews tone
4. "Demo the [feature]" → Demo creates walkthrough
5. "Create a social media graphic for [feature]" → Design produces assets

### Sequence 3: Sprint Planning

```
PM reviews backlog ──→ PM proposes sprint ──→ You approve/adjust
```

**How to run it:**
1. "Sprint plan" or "what's the status?" → PM analyzes TODO.md + Notion
2. Review the proposed sprint, adjust priorities
3. "Update the backlog with these changes" → PM syncs both sources

### Sequence 4: Release / Milestone

```
QA passes final feature ──→ Scribe logs milestone ──→ Content Strategist plans launch
    │                                                        │
    ▼                                                        ▼
Demo (record showcase) ──→ Design (launch graphics) ──→ Marketing (launch posts)
```

**How to run it:**
1. Complete QA on the milestone feature
2. "Log this session — milestone: [name]" → Scribe creates milestone entry
3. "Plan content for the [name] launch" → Content Strategist
4. "Demo the full [name] flow" → Demo
5. "Design launch graphics" → Design
6. "Write launch posts for all platforms" → Marketing

---

## Key Files Each Agent Reads/Writes

| File | Read by | Written by |
|---|---|---|
| `TODO.md` | PM, Scribe, Task Runner | PM, Scribe |
| `CHANGELOG.md` | Scribe, Content Strategist | Scribe |
| `.claude/rules/L*.md` | Task Runner, QA | — (never modified by agents) |
| `docs/UI_COMPONENTS_NEEDED.md` | Design, Task Runner | PM |
| Notion Build Journal | Content Strategist, PM | Scribe |
| Notion Master Build Plan | PM | PM |
| `src/**` | Task Runner, QA | Task Runner |

---

## Shared Context: Every Agent Gets This

All 10 skills depend on the `sn-core-context` plugin. It provides:
- **stickernest-context**: Full project briefing — architecture, layers, decisions
- **terminology-reference**: Canonical terms, entity types, store names, SDK methods

When starting any StickerNest work, saying "what is StickerNest" or "how does the architecture work" loads this context automatically.

---

## Tips for Effective Use

**Chain agents naturally in conversation:**
> "Build the event bus ring buffer" → (Task Runner runs) → "Test this" → (QA runs) → "Log this session" → (Scribe runs) → "What content could come from today's work?" → (Content Strategist runs)

**Use specific trigger phrases for precision:**
- Vague: "help with the project" (might not trigger any agent)
- Specific: "what should I work on next?" (triggers PM precisely)

**Let agents handle handoffs:**
- Scribe automatically suggests TODO.md updates
- PM reads Scribe's journal entries to update priorities
- Content Strategist reads the Build Journal for content angles

**All agents respect the layer architecture:**
- Task Runner reads the relevant `L*.md` rule file before every task
- QA validates layer boundaries as part of its test plan
- Scribe categorizes changes by layer in journal entries
