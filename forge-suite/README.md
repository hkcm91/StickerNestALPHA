# Forge Suite — Solo Builder Business Intelligence

A connected system of Claude Code skills that help solo builders find, validate,
and launch the right business for their specific situation.

**Pipeline:** Mirror → Lens → Spark → Acid Test → Blueprint

Each skill works independently. The pipeline is ideal but not required.

---

## Quick Start

| Your situation | Start here | Command |
|---|---|---|
| No idea where to begin | **Mirror** — map your skills, constraints, passions | `/mirror` |
| Interested in an industry | **Lens** — deep dive into pain points and opportunities | `/lens` |
| Need business ideas | **Spark** — constraint-based idea generation | `/spark` |
| Have an idea, need validation | **Acid Test** — evidence-based reality check | `/acid-test` |
| Idea validated, need a plan | **Blueprint** — week-by-week action plan | `/blueprint` |

---

## The Skills

### Mirror — Personal Context Mapper
Captures who you are so every other skill is personalized. Think of it as your
business DNA — skills, constraints, passions, anti-skills, financial reality.
Updated once, referenced everywhere.

### Lens — Industry Deep Diver
Goes deep into a specific industry or market. Mines pain points from Reddit and
forums, scores them by frequency and intensity, maps gaps and spending signals.
Replaces GummySearch/PainOnSocial ($50-79/mo).

### Spark — Idea Generator
Generates personalized business ideas using real methodology: Systematic Inventive
Thinking (constraint-based creativity), Cross-Industry Innovation (analogy transfer),
and Ikigai alignment. Four modes: broad, focused, remix, and problem-first.

### Acid Test — Reality Checker
Puts any idea through evidence-based validation. Three layers: search validation
(are people discussing this problem?), payment validation (are people paying for
solutions?), and competition validation (crowded or beatable?). Delivers honest
GO/NO-GO/CONDITIONAL verdicts. Replaces ValidatorAI.

### Blueprint — Business Model Architect
Turns a validated idea into a concrete plan. Starts with a 1-2 week validation
sprint (landing page test, pre-sale test) before any building. Then a week-by-week
build plan calibrated to your actual constraints.

---

## What This Replaces

| Paid tool | Cost | Replaced by |
|---|---|---|
| ValidatorAI | varies | Acid Test |
| GummySearch / PainOnSocial | $50-79/mo | Lens |
| Generic Ikigai worksheets | free but useless | Mirror |
| Scattered brainstorming | time | Spark |
| "How do I actually do this" paralysis | soul | Blueprint |

---

## Design Principles

1. **Honest over optimistic** — if something won't work, say so
2. **Evidence over opinion** — use web search, find real data
3. **Personalized over generic** — always reference your profile when available
4. **Actionable over comprehensive** — end with concrete next steps
5. **Constraints are features** — limited resources shape better ideas
6. **One question at a time** — never overwhelm
7. **Each skill stands alone** — pipeline is ideal but not required

---

## Data

Personal profiles and verdicts are stored in `forge-suite/data/` (gitignored).
Shared schemas and conventions are in `.claude/skills/forge-conventions/CONVENTIONS.md`.
