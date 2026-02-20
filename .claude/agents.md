# V5 Pre-Build Agent Toolkit — Status Tracker

Build these agents **before** writing V5 feature code. They form the guardrails,
scaffolding, and CI pipeline that every AI agent (Ralph Loop) depends on.

**Rule**: P0 must be green before any Layer 0 code is written. P1 unlocks the Ralph
Loop. P2 completes during active development.

---

## P0 — Blocking (~20 hrs)

Nothing starts without these. They encode architecture rules so Claude Code
can't violate them.

| # | Agent | Hrs | Status | Notes |
|---|-------|-----|--------|-------|
| 1 | CLAUDE.md + Layer Rules | 3–4 | ✅ Done | `.claude/rules/L0-L6.md` created |
| 2 | Zod Schema Registry | 3–4 | ✅ Done | `src/kernel/schemas/` |
| 3 | ESLint Layer Boundary Enforcer | 2–3 | ✅ Done | `.eslintrc.cjs` with `eslint-plugin-boundaries` |
| 4 | dependency-cruiser Validator | 2–3 | ✅ Done | `.dependency-cruiser.cjs` with layer rules |
| 5 | Vitest Test Harness | 2–3 | ✅ Done | `vitest.config.ts`, 90 tests passing |
| 6 | Git Hooks Pipeline | 0.5 | ✅ Done | `husky` + `lint-staged` configured |
| 7 | Core CI/CD Pipeline | 3–4 | ✅ Done | `.github/workflows/ci.yml` + `pr-checks.yml` |
| 8 | Widget Scaffolding Skill | 3–4 | ✅ Done | `plop/` templates + `npm run scaffold:widget` |

---

## P1 — First Sprint (~30 hrs)

Build alongside early Layer 0 development. Agent #9 (Ralph Loop) is the priority.

| # | Agent | Hrs | Status | Notes |
|---|-------|-----|--------|-------|
| 9 | Ralph Loop Harness | 3–4 | ✅ Done | `.ralph/` + `/ralph` skill |
| 10 | Plop.js Full Generator Suite | 2–3 | ✅ Done | 5 generators: widget, module, store, event, schema |
| 11 | Architecture MCP Query Server | 8–12 | ⬜ | Extend StickerNest Dev MCP |
| 12 | Playwright Canvas E2E Agent | 3–4 | ✅ Done | `playwright.config.ts` + `e2e/` fixtures |
| 13 | Event Bus Integration Test Generator | 2–3 | ✅ Done | Skill: `.claude/commands/generate-bus-test.md` |
| 14 | Storybook Widget Stories | 2–3 | ✅ Done | `.storybook/` + WidgetFrame stories |
| 15 | Supabase Migration Runner | 1–2 | ✅ Done | `supabase/migrations/` + CI job |
| 16 | Vercel Preview Deployer | 1–2 | ✅ Done | `vercel.json` + preview/prod workflows |
| 17 | commitlint Enforcer | 0.5 | ✅ Done | `commitlint.config.cjs` + layer scopes |

---

## P2 — First Month (~35 hrs)

Build while actively developing V5 layers.

| # | Agent | Hrs | Status | Notes |
|---|-------|-----|--------|-------|
| 18 | Visual Regression Testing | 3–4 | ⬜ | Playwright snapshots |
| 19 | Coverage Gap Detector (Mutation) | 2–3 | ⬜ | Skill: `.claude/commands/kill-mutants.md` ✅ |
| 20 | TypeDoc API Documentation | 2 | ⬜ | Skill: `.claude/commands/add-tsdoc.md` ✅ |
| 21 | Mermaid Architecture Diagrammer | 3–4 | ⬜ | `docs/diagrams/` |
| 22 | Notion Doc Sync Pipeline | 3–4 | ⬜ | `@notionhq/client` |
| 23 | ADR Generator | 2–3 | ⬜ | Skill: `.claude/commands/create-adr.md` ✅ |
| 24 | Release Automation | 1–2 | ⬜ | `release-please-action@v4` |
| 25 | ts-morph Deep Codebase Analyzer | 4–6 | ⬜ | Extend Architecture MCP |

---

## Created Claude Code Skills

| Skill | Path | Agent # |
|-------|------|---------|
| generate-tests | `.claude/commands/generate-tests.md` | #5 |
| scaffold-widget | `.claude/skills/scaffold-widget/SKILL.md` | #8 |
| generate-bus-test | `.claude/commands/generate-bus-test.md` | #13 |
| kill-mutants | `.claude/commands/kill-mutants.md` | #19 |
| add-tsdoc | `.claude/commands/add-tsdoc.md` | #20 |
| create-adr | `.claude/commands/create-adr.md` | #23 |
| code-review | `.claude/skills/code-review/SKILL.md` | — |

---

## Dependencies Graph

```
Agent #1 (CLAUDE.md)
    ├── Agent #2 (Zod Schemas)
    │   └── Agent #5 (Vitest)
    │       └── Agent #9 (Ralph Loop)
    ├── Agent #3 (ESLint)
    │   ├── Agent #4 (dependency-cruiser)
    │   │   └── Agent #11 (Architecture MCP)
    │   └── Agent #6 (Git Hooks)
    └── Agent #8 (Widget Scaffold)
        └── Agent #10 (Plop.js)

Agent #7 (CI/CD)
    ├── Agent #15 (Supabase Migrations)
    │   └── Agent #16 (Vercel Preview)
    └── Agent #17 (commitlint)
        └── Agent #24 (Release Automation)
```

---

## Next Steps

### ✅ P0 Complete — All 8 agents done!
### ✅ P1 Nearly Complete — 8 of 9 agents done!

Only Agent #11 (Architecture MCP Query Server) remains — this is a larger effort (8-12 hrs)
that extends the StickerNest Dev MCP server.

**Ralph Loop is unlocked.** Use `/ralph` to start autonomous development.

### P2 — First Month

Ready to build during active V5 development:

1. **Visual Regression Testing** (#18) — Playwright snapshots
2. **Mutation Testing** (#19) — Stryker + `/kill-mutants` skill
3. **TypeDoc Documentation** (#20) — `/add-tsdoc` skill ready
4. **Architecture Diagrams** (#21) — Mermaid in `docs/diagrams/`
5. **ADR Generator** (#23) — `/create-adr` skill ready
6. **Release Automation** (#24) — `release-please-action`

### Available Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run storybook        # Widget component explorer

# Testing
npm run test             # Run Vitest
npm run e2e              # Run Playwright E2E
npm run test:coverage    # Coverage report

# Code Quality
npm run lint             # ESLint
npm run deps:validate    # dependency-cruiser

# Scaffolding
npm run scaffold:widget  # New widget
npm run scaffold:module  # New layer module
npm run scaffold:store   # New Zustand store
npm run scaffold:event   # New bus event
npm run scaffold:schema  # New Zod schema

# Database
npm run db:start         # Start local Supabase
npm run db:reset         # Reset with migrations

# Deployment
npm run deploy:preview   # Vercel preview
npm run deploy:prod      # Vercel production
```

---

## Status Legend

- ⬜ Not started
- 🔄 In progress
- ✅ Done
- ⏸️ Blocked
