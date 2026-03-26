# StickerNest Agent Infrastructure — Gaps Report

> Identifies missing documentation, skills to write, connectors to set up, and decisions Kimber needs to make before agents can work autonomously.
>
> Generated: 2026-03-23

---

## 1. Missing Skills (Must Write in Phase 2)

These skill files don't exist yet. They are required before the agent plugins can be assembled.

| Skill | Priority | Blocks | Estimated Size |
|-------|----------|--------|----------------|
| `scribe-skill.md` | **High** | Scribe agent — the whole pipeline starts here | ~200 lines |
| `pm-skill.md` | **High** | PM agent — task prioritization and backlog management | ~250 lines |
| `task-runner-skill.md` | **High** | Task Runner agent — layer-aware coding workflow | ~300 lines |
| `qa-skill.md` | **High** | QA Verifier agent — test plan and verification workflow | ~250 lines |
| `content-strategy-skill.md` | Medium | Content Strategist — content angle identification | ~200 lines |
| `marketing-skill.md` | Medium | Marketing agent — platform-specific writing | ~200 lines |
| `brand-voice-skill.md` | Medium | Content + Marketing — tone and messaging | ~150 lines |
| `demo-skill.md` | Medium | Demo Agent — user flow scripting | ~150 lines |
| `design-skill.md` | Medium | Design Team — visual identity guidelines | ~200 lines |
| `terminology-reference.md` | Low | Quick card (context is already in the full briefing) | ~50 lines |

**Total new skills to write: 10**

---

## 2. Missing Documentation

### In the Codebase

| Gap | Location | Impact |
|-----|----------|--------|
| No Supabase schema documentation | Should be in `docs/` | Agents writing migrations or queries have no quick reference for table structure |
| No Widget SDK API reference doc | `src/runtime/sdk/` has code but no standalone doc | Lab and marketplace agents need a clean API reference |
| No edge function documentation | `supabase/functions/` | Billing, commerce, and auth work needs function contracts documented |
| MCP Dev Server tool inventory | `mcp-dev/` | The agents.md says "currently 17 tools" but there's no list of what they are |
| `docs/architecture.md` may be stale | `docs/architecture.md` | Needs verification against current CLAUDE.md (CLAUDE.md is authoritative) |

### In Notion

| Gap | Impact |
|-----|--------|
| Build Journal entries may not cover recent sessions (Mar 2026) | Scribe agent needs a current journal to append to |
| TypeScript Interface Contracts — sync status unknown | May be outdated relative to current Zod schemas |
| No content calendar exists yet | Content Strategist needs one to manage output |

---

## 3. Connector Setup Needed

These connectors must be verified as working before agents can operate:

| Connector | Status | Required For | Action Needed |
|-----------|--------|-------------|---------------|
| GitHub (via Pipedream MCP) | **Working** | Scribe, PM, Task Runner, QA | Verify write access (create issues, push commits) |
| Notion (via Pipedream MCP) | **Working** | Scribe, PM, Content Pipeline | Verify Build Journal database ID; create content calendar database |
| Gmail | **Available** | Marketing | Test draft creation |
| Claude in Chrome | **Available** | QA, Demo Agent | Test on deployed StickerNest instance |
| Figma (Framelink) | **Available** | Design Team | Verify team has Figma files with StickerNest designs |
| Creatie | **Available** | Design Team | Test design generation |
| Jam | **Available** | Demo Agent | Test recording workflow |
| Supabase (MCP) | **Available** | Task Runner (migrations) | Connect to StickerNest Supabase project |

---

## 4. Decisions — RESOLVED (2026-03-23)

All blocking decisions have been made. Recorded here for reference.

### High Priority — Resolved

1. **GitHub repo for V5** — **`hkcm91/StickerNest5.0`** (already exists)
   - Agents push branches, open PRs, and create issues on this repo.

2. **Deployed instance URL for QA** — **Localhost only for now**
   - QA agent must spin up a local dev server (`npm run dev`) before testing.
   - QA skill will include the local server startup sequence.
   - Placeholder for future Vercel preview URL when deployment is set up.

3. **Brand voice direction** — **Start simple, learn and adapt**
   - Begin by deriving voice from existing content (README, docs, terminology PDF).
   - Keep initial brand-voice-skill.md lightweight and iterative.
   - Refine voice guidelines as content is produced and feedback comes in.

4. **Notion Build Journal schema** — **Pending confirmation of columns**
   - Needed columns: Date, Session Summary, Files Changed, Decisions Made, Tests Added, Blockers, Status
   - Scribe agent will create entries with these fields; Kimber can adjust the Notion database to match.

### Medium Priority — Resolved

5. **Agent scheduling preferences** — **Task-dependent, flexible**
   - No fixed schedule for any agent. Each agent runs when its trigger conditions are met.
   - Scribe: after dev sessions. PM: as needed for backlog reviews. Others: on-demand.
   - Scheduling can be added later per-agent as workflows stabilize.

6. **Content platforms** — **Twitter/X, TikTok, YouTube, Reddit**
   - Marketing skill needs formatting rules for these four platforms.
   - No LinkedIn or dev.to at launch.

7. **Task management** — **Both TODO.md and Notion, kept in sync**
   - PM agent maintains both `TODO.md` (local) and Notion Master Build Plan.
   - Neither is subordinate — both are kept aligned.

### Lower Priority — Resolved

8. **Design system baseline** — **TBD** (no Figma links provided yet)
   - Design agent skill will be written with a placeholder for design system reference.
   - Kimber can share Figma links later to activate this.

9. **Demo target audience** — **All three, with different scripts**
   - Demo Agent produces audience-specific scripts: users/creators, developers, investors.
   - Each demo script emphasizes different aspects of the platform.

---

## 5. Contradictions & Ambiguities Found

| Issue | Where | Resolution Needed |
|-------|-------|-------------------|
| ~~CLAUDE.md says "Seven stores" but codebase has 9~~ | ~~CLAUDE.md vs `src/kernel/stores/`~~ | **RESOLVED** — CLAUDE.md already says 9; L0-kernel.md rule file updated to match |
| agents.md says MCP dev server has "17 tools" but no tool inventory exists | `.claude/agents.md` | Document the actual tool list |
| TODO.md last updated "2026-03-19" but some completed items predate that and aren't checked off | `TODO.md` | PM agent should reconcile on first run |
| `v5 agents.pdf` (pre-build toolkit) overlaps with but differs from the new agent roster | PDF vs this project | The PDF covers *development infrastructure* agents (linters, test generators). The new roster covers *workflow* agents (scribe, PM, QA, content). They're complementary, not competing. Clarify in documentation. |

---

## 6. Phase 2 Readiness Checklist

All items resolved. Phase 2 is clear to start.

- [x] Kimber has reviewed this gaps report and made the high-priority decisions (items 1–4)
- [x] GitHub repo strategy is decided → `hkcm91/StickerNest5.0`
- [x] Notion Build Journal schema — Scribe will use standard columns; Kimber adjusts Notion to match
- [x] Brand voice approach is chosen → start simple, iterate
- [x] CLAUDE.md store count is corrected (7 → 9)
- [x] Content platform list is provided → Twitter/X, TikTok, YouTube, Reddit
- [x] Task management approach decided → both TODO.md + Notion, kept in sync
- [x] Demo audience decided → all three, different scripts per audience
- [x] Scheduling decided → flexible, task-dependent triggers

**Phase 2 is ready to begin.**

---

## Summary

The project is in remarkably good shape for agent infrastructure bootstrapping. The architecture is thoroughly documented, the codebase is substantial and well-organized, and the existing Claude Code skills provide a strong foundation. Remaining work:

- **10 new skill files** to write (Phase 2) — all decisions needed to write them are now resolved
- **A few documentation holes** (Supabase schema, SDK reference, edge functions) — can be filled incrementally
- **Connector verification** (most are available but need testing) — can happen in parallel with Phase 2
