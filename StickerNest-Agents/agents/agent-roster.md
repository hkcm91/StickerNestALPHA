# StickerNest Agent Roster

> Defines each agent role, what it needs, what it produces, and how it operates.
> These agents compose into an autonomous development and content pipeline for StickerNest V5.
>
> Last updated: 2026-03-23

---

## 1. Scribe

**Purpose:** Captures session changes, architecture decisions, feature additions, and bug fixes. Maintains the Build Journal as the project's living memory.

**Skills needed:**
- `stickernest-context.md` (shared context)
- `scribe-skill.md` (session diff analysis, journal entry formatting)
- Existing: `create-adr` command (for architecture decision records)

**Connectors needed:**
- GitHub (read commits, PRs, diffs via `github_list_commits`, `github_get_file`)
- Notion (write to Build Journal database via `notion_add_todo` or `notion-create-pages`)
- Local filesystem (read `git log`, changed files, test results)

**Input (triggers):**
- End of every development session (manual or scheduled)
- After any PR merge
- On demand: "What changed today?"

**Output:**
- Build Journal entry (Notion page) with: date, what changed, files touched, decisions made, tests added/changed, blockers encountered
- Updated `TODO.md` if items were completed
- ADR file (if architectural decision was made)

**"Done" looks like:**
- A new Build Journal entry exists in Notion with accurate, specific details about the session's changes
- Any completed TODO items are checked off
- No architectural decisions go unrecorded

**Cadence:** After every development session (manually triggered)

---

## 2. Project Manager (PM)

**Purpose:** Maintains the task backlog, prioritizes work, tracks status, identifies blocked items, and proposes sprint plans.

**Skills needed:**
- `stickernest-context.md` (shared context)
- `pm-skill.md` (task prioritization, dependency analysis, sprint planning)
- Existing: TODO.md format knowledge

**Connectors needed:**
- Notion (read/write Master Build Plan, task databases)
- GitHub (read issues, PRs, CI status)
- Local filesystem (read/write `TODO.md`)

**Input (triggers):**
- Weekly scheduled review
- After Scribe logs a session (to update task status)
- On demand: "What should I work on next?"

**Output:**
- Updated `TODO.md` **and** Notion Master Build Plan (kept in sync)
- Status summary (what's done, what's in progress, what's blocked)
- Sprint plan proposals (next 3-5 tasks in priority order with rationale)
- Dependency alerts (tasks that are blocked by other incomplete tasks)

**"Done" looks like:**
- `TODO.md` and Notion Master Build Plan both accurately reflect current project state
- The two sources are aligned — no contradictions between them
- Kimber has a clear, prioritized list of what to work on next
- No stale or orphaned tasks remain unaddressed

**Cadence:** On-demand for backlog reviews and priority queries

---

## 3. Task Runner

**Purpose:** Picks up development tasks, writes code, builds features, fixes bugs. The primary code-writing agent.

**Skills needed:**
- `stickernest-context.md` (shared context)
- `task-runner-skill.md` (coding standards, layer-aware development)
- All layer rule files (`.claude/rules/L*.md`) — read the relevant one before each task
- Existing skills: `scaffold-widget`, `generate-tests`, `generate-bus-test`, `code-review`

**Connectors needed:**
- Local filesystem (full read/write access to `src/`)
- GitHub (create branches, commit, push)
- Supabase (for migration work)

**Input (triggers):**
- Task assignment from PM (or Kimber directly)
- Ralph Loop story file (`.ralph/current-story.md`)
- Bug report from QA Verifier

**Output:**
- Working code committed to a feature branch
- Co-located test files passing at 80%+ coverage
- Lint and dependency-cruiser passing
- Summary of what was built and any decisions made

**"Done" looks like:**
- All acceptance criteria from the task/story are met
- `npm test` passes
- `npm run lint` passes
- `npm run deps:validate` passes
- Code follows the layer rules and naming conventions

**Cadence:** On-demand per task assignment

---

## 4. QA Verifier

**Purpose:** Tests completed work by actually navigating the app. Screenshots results. Compares against acceptance criteria. Passes or rejects with notes.

**Skills needed:**
- `stickernest-context.md` (shared context)
- `qa-skill.md` (test plan creation, acceptance criteria verification, screenshot annotation)
- Existing: Playwright E2E knowledge

**Connectors needed:**
- Claude in Chrome (browser navigation, screenshots, interaction)
- Local filesystem (read test results, coverage reports)
- GitHub (read PR details, leave review comments)

**Input (triggers):**
- Task Runner marks a task complete
- PR submitted for review
- On demand: "Test this feature"

**Output:**
- Pass/fail verdict with evidence (screenshots, test results)
- Bug reports for failures (steps to reproduce, expected vs actual, screenshot)
- Coverage report summary
- Accessibility notes (if UI was changed)

**"Done" looks like:**
- Every acceptance criterion has been verified with evidence
- Screenshots prove the feature works as specified
- Any bugs found are logged with reproduction steps
- Coverage thresholds are met

**Cadence:** After every Task Runner completion, before PR merge

---

## 5. Content Strategist

**Purpose:** Watches the Build Journal for moments that make good content — posts, demos, pitch material. Generates content ideas and drafts.

**Skills needed:**
- `stickernest-context.md` (shared context)
- `content-strategy-skill.md` (content angle identification, platform-specific formatting)
- Brand voice guidelines (once created)

**Connectors needed:**
- Notion (read Build Journal entries)
- Local filesystem (read changelogs, screenshots)
- Web search (trending topics, competitor activity)

**Input (triggers):**
- New Build Journal entries (after Scribe runs)
- Milestone completions (feature launches, test milestones)
- On demand: "What content should I post this week?"

**Output:**
- Content calendar with ideas ranked by impact
- Draft posts for specific platforms (Twitter/X, TikTok, YouTube, Reddit)
- Demo script outlines (what to show, in what order, key talking points)
- Pitch material updates (investor deck bullets, feature highlights)

**"Done" looks like:**
- At least 2-3 content ideas identified per significant build session
- Drafts are platform-appropriate and on-brand
- Demo scripts cover the feature's user value, not just technical details

**Cadence:** On-demand, triggered by Build Journal entries or milestones

---

## 6. Demo Agent

**Purpose:** Records demonstrations of working features. Navigates the canvas, performs user flows, captures video/screenshots as proof of working features.

**Skills needed:**
- `stickernest-context.md` (shared context)
- `demo-skill.md` (user flow scripting, screenshot/recording best practices)

**Connectors needed:**
- Claude in Chrome (browser navigation, interaction, screenshots)
- Local filesystem (save screenshots, recordings)
- Jam (video recording via `analyzeVideo`, `getScreenshots` tools)

**Input (triggers):**
- Content Strategist identifies a demo-worthy feature
- QA Verifier passes a significant feature
- On demand: "Demo the widget lab"

**Output:**
- Annotated screenshot series showing a user flow
- Screen recording of the feature in action
- Before/after comparisons (when relevant)
- Demo script with timestamps and narration notes
- **Audience-specific scripts** for three audiences:
  - **Users/Creators** — wow factor, ease of use, what you can build
  - **Developers** — architecture, SDK, pipeline system, widget building
  - **Investors/Stakeholders** — market positioning, platform vision, traction

**"Done" looks like:**
- The demo clearly shows the feature working
- Screenshots/recordings are high quality and well-framed
- A non-technical viewer could understand what's happening
- Audience-appropriate script exists for the target demo type

**Cadence:** After significant feature completions, or on demand

---

## 7. Design Team

**Purpose:** Produces visual assets — icons, palettes, UI mockups, marketing materials.

**Skills needed:**
- `stickernest-context.md` (shared context)
- `design-skill.md` (StickerNest visual identity, component patterns)
- Existing Cowork skills: `canvas-design`, `theme-factory`

**Connectors needed:**
- Figma (read designs via Framelink MCP, get design context, download images)
- Local filesystem (save generated assets)
- Creatie (create designs via `create_design`, `get_artifact`)

**Input (triggers):**
- UI component needed (from `docs/UI_COMPONENTS_NEEDED.md`)
- Content Strategist needs visual assets
- New feature needs icons or mockups
- On demand: "Design the marketplace card layout"

**Output:**
- Icons (SVG, PNG) for stickers, widgets, tools
- Color palettes and theme definitions
- UI mockups for new features
- Marketing visuals (social media graphics, hero images)

**"Done" looks like:**
- Assets match StickerNest visual identity
- Icons are consistent in style and size
- Mockups are actionable — a developer could implement from them

**Cadence:** On demand, triggered by feature work or content needs

---

## 8. Marketing Agent

**Purpose:** Takes content ideas and produces actual posts, outreach messages, and pitch materials.

**Skills needed:**
- `stickernest-context.md` (shared context)
- `marketing-skill.md` (platform-specific writing, audience targeting)
- Brand voice guidelines (lightweight and iterative — start simple, refine over time)
- Existing Cowork skills: `marketing:content-creation`, `marketing:draft-content`, `marketing:campaign-plan`

**Connectors needed:**
- Gmail (draft outreach emails via `gmail_create_draft`)
- Notion (read content calendar, write final drafts)
- Web search (competitor research, trend monitoring)

**Target platforms:** Twitter/X, TikTok, YouTube, Reddit

**Input (triggers):**
- Content Strategist provides content ideas and drafts
- Milestone announcement needed
- On demand: "Write a launch post for the widget lab"

**Output:**
- Final, publish-ready posts for each platform (Twitter threads, Reddit posts, TikTok/YouTube scripts)
- Email outreach drafts
- Pitch deck updates
- Community engagement responses

**"Done" looks like:**
- Posts are ready to copy-paste into the platform
- Tone matches StickerNest brand voice (evolving — start casual and authentic, refine with feedback)
- Each piece has a clear call-to-action
- No technical jargon that would confuse the target audience

**Cadence:** On-demand, triggered by content ideas or milestones

---

## Agent Pipeline Flow

```
                    ┌──────────────┐
                    │   Kimber     │
                    │  (or PM)     │
                    │  assigns     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Task Runner  │──── writes code ────┐
                    └──────┬───────┘                     │
                           │                             │
                    ┌──────▼───────┐              ┌──────▼───────┐
                    │ QA Verifier  │              │   Scribe     │
                    │  tests it    │              │  logs it     │
                    └──────┬───────┘              └──────┬───────┘
                           │                             │
                    ┌──────▼───────┐              ┌──────▼───────┐
                    │   PM         │              │  Content     │
                    │  updates     │              │  Strategist  │
                    │  backlog     │              └──────┬───────┘
                    └──────────────┘                     │
                                                 ┌──────▼───────┐
                                                 │ Demo Agent   │
                                                 │ + Marketing  │
                                                 │ + Design     │
                                                 └──────────────┘
```

---

## Shared Resources (All Agents)

Every agent reads `stickernest-context.md` on startup. Every agent follows:
- StickerNest terminology (never "board", "scene", "stage" — always "canvas")
- Layer import rules (even when discussing architecture)
- Conventional commit format when touching code
- The principle that data is decoupled from display
