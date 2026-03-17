# Forge Suite — Shared Conventions

This document defines the schemas, handoff patterns, and design principles shared
across all Forge Suite skills. Every skill in the suite MUST read this file before
producing output.

---

## Design Principles

These override all other instructions when producing Forge Suite output:

1. **Honest over optimistic** — if something won't work, say so directly
2. **Evidence over opinion** — use web search to find real data; never generate
   plausible-sounding assessments from training data alone
3. **Personalized over generic** — always reference the builder's Mirror profile
   when available; "for someone with your specific constraints" not "in general"
4. **Actionable over comprehensive** — every output ends with a concrete next step
5. **Constraints are features** — limited budget, limited time, no clients — these
   shape better ideas, not worse ones
6. **One question at a time** — never overwhelm, especially in Mirror interviews
7. **Each skill stands alone** — the pipeline is ideal but not required; gracefully
   handle missing upstream data

---

## Data Location

All user-generated data lives in `forge-suite/data/` (gitignored for privacy):
- `forge-suite/data/profile.md` — Mirror profile
- `forge-suite/data/brief-{industry}.md` — Lens industry briefs
- `forge-suite/data/ideas-{session}.md` — Spark idea cards
- `forge-suite/data/verdict-{idea}.md` — Acid Test verdicts
- `forge-suite/data/blueprint-{idea}.md` — Blueprint plans

---

## Schema: Builder Profile

Produced by **Mirror**. Consumed by all other skills.

```markdown
# Builder Profile — {name}
*Last updated: {date}*

## Skills & Tools
<!-- What you can actually do and what tools you use -->
<!-- Examples: JavaScript, Python, Figma, Canva, Claude Code, Notion, etc. -->
<!-- Rate proficiency: expert / comfortable / learning / aware -->

## Constraints
- **Time available:** {hours per week}
- **Budget:** {available cash for business investment}
- **Location:** {city/region, remote-only, etc.}
- **Equipment:** {what you have — laptop, phone, camera, etc.}
- **Schedule:** {full-time available, evenings only, weekends, etc.}

## Passions
<!-- What makes time disappear? What would you do for free? -->
<!-- What topics can you talk about for hours? -->

## Fight
<!-- What problems make you angry? What are you willing to fight for? -->
<!-- What injustice or inefficiency drives you? -->

## Unique Understanding
<!-- What do you innately get that others struggle with? -->
<!-- What insights come naturally from your life experience? -->

## Anti-Skills
<!-- What are you bad at? What drains you? What do you hate doing? -->
<!-- Be honest — this prevents building a business you'll hate -->

## Past Projects & Patterns
<!-- What have you tried before? What happened? Why did things stall? -->
<!-- What patterns repeat in your attempts? -->

## Financial Reality
- **Monthly gap:** {how much additional income needed}
- **Timeline:** {when do you need this to work by}
- **"Enough" number:** {monthly income that would change your situation}
- **Current income sources:** {what's already coming in}

## Hobbies & Interests
<!-- Not just for fun — these are cross-pollination fuel for idea generation -->
<!-- Include niche interests, communities you're part of, etc. -->

## Deal-Breakers
<!-- Hard no's. Examples: no client calls, no physical products, -->
<!-- no social media management, no door-to-door, etc. -->
```

---

## Schema: Industry Brief

Produced by **Lens**. Consumed by Spark and Acid Test.

```markdown
# Industry Brief — {industry name}
*Researched: {date}*

## Landscape
- **Market size:** {estimate with source}
- **Key players:** {top 3-5 companies/products}
- **Growth trend:** {growing/stable/declining + evidence}
- **Recent shifts:** {what changed in the last 1-2 years}

## Pain Points
<!-- Scored by frequency (how often mentioned) × intensity (emotional language) -->

### 1. {Pain point name} — Score: {frequency}/{intensity}
- **Evidence:** "{actual quote from forum/review}" — {source}
- **Who feels it:** {specific persona}
- **Current workaround:** {what people do today}

### 2. {Pain point name} — Score: {frequency}/{intensity}
...

## Existing Solutions & Gaps
| Solution | Price | Strengths | Weaknesses | Gap |
|----------|-------|-----------|------------|-----|
| {name} | {price} | {what it does well} | {where it falls short} | {unmet need} |

## Spending Signals
<!-- Evidence that people pay for solutions in this space -->
- {Signal 1: e.g., "Competitor X charges $49/mo with 10K+ users"}
- {Signal 2: e.g., "Reddit thread: 'I'd pay anything for...'"}

## Analogy Candidates
<!-- Cross-industry patterns that could transfer -->
- **{Source industry} → {Target application}:** {how the pattern could transfer}
```

---

## Schema: Idea Card

Produced by **Spark**. Consumed by Acid Test.

```markdown
# Idea Card — {concept name}

## The Problem
<!-- One specific problem this solves. Not vague, not broad. -->

## The Solution
<!-- One sentence: what you'd build and how it works -->

## Revenue Model
<!-- How money comes in: subscription, one-time, commission, etc. -->
<!-- Include target price point if possible -->

## Why It Fits You
<!-- Direct references to Mirror profile dimensions -->
- **Skills match:** {which of your skills this uses}
- **Passion connection:** {how this connects to what you care about}
- **Constraint fit:** {how this works within your limits}

## Constraint Alignment
- Time required: {hours/week to build and run}
- Budget required: {upfront + ongoing costs}
- Skills required vs. skills you have: {gap analysis}
- Tools needed: {what you'd use}

## Ikigai Alignment
- Love it? {does this connect to your passions}
- Good at it? {does this use your strengths}
- World needs it? {evidence of demand}
- Paid for it? {evidence people pay}

## Analogy Source
<!-- If applicable: "This is the {X model} applied to {Y market}" -->

## First Step
<!-- ONE concrete action. Not a 10-step plan. -->
<!-- Something doable this week. -->

## Confidence Level
<!-- high / medium / low -->
<!-- Brief reasoning for the rating -->
```

---

## Schema: Verdict

Produced by **Acid Test**. Consumed by Blueprint.

```markdown
# Verdict — {idea name}
*Validated: {date}*

## Decision: {GO | CONDITIONAL | NO-GO}

## Evidence Summary
<!-- 2-3 sentence overview of what the evidence shows -->

## Search Validation
- **People discussing this problem?** {yes/no}
- **Volume:** {how many discussions found}
- **Quality:** {specific complaints vs. vague mentions}
- **Key evidence:** "{quote}" — {source}

## Payment Validation
- **Existing paid solutions?** {yes/no}
- **Price range:** {what competitors charge}
- **Revenue signals:** {evidence of willingness to pay}
- **Key evidence:** {pricing page, revenue data, forum signal}

## Competition Validation
- **Competition exists?** {yes = good signal / no = red flag}
- **Saturation level:** {open / competitive / saturated}
- **Beatable?** {yes/no + reasoning}
- **Key competitors:** {top 2-3 with brief assessment}

## Personal Fit Score
<!-- Only if Mirror profile is available -->
- **Skill alignment:** {score + reasoning}
- **Constraint alignment:** {score + reasoning}
- **Ikigai alignment:** {score + reasoning}
- **Anti-skill check:** {any red flags from anti-skills list}

## Time-to-First-Dollar
- **Estimate:** {specific: days / weeks / months}
- **Reasoning:** {what needs to happen before revenue}

## Hardest Part
<!-- The single thing most likely to kill this. Be specific. -->

## Risks
1. {Risk 1 + mitigation}
2. {Risk 2 + mitigation}
3. {Risk 3 + mitigation}

## Next Step
<!-- If GO: specific first action -->
<!-- If CONDITIONAL: the specific test to run first -->
<!-- If NO-GO: alternative direction to explore -->
```

---

## Schema: Blueprint

Produced by **Blueprint**. Terminal output — not consumed by other skills.

```markdown
# Blueprint — {idea name}
*Created: {date}*

## Revenue Model
- **Type:** {subscription / one-time / commission / etc.}
- **Target price:** {amount + reasoning}
- **Pricing test plan:** {how to validate the price}

## Platform & Distribution
- **Where it lives:** {web app, marketplace, platform, etc.}
- **How people find it:** {SEO, social, paid ads, community, etc.}
- **Tools to build it:** {matched to Mirror profile}

## Validation Sprint (Week 1-2)
<!-- Do this BEFORE building anything -->

### Test 1: {test name}
- **What:** {specific action}
- **Cost:** {$ amount}
- **Success signal:** {what "passing" looks like}
- **Timeline:** {days}

### Test 2: {test name}
...

### Decision gate
- If validation passes → proceed to build plan
- If validation fails → stop here, no sunk cost

## Build Plan (Only If Validation Passes)

### MVP Definition
<!-- The smallest possible version that proves the concept -->

### Week 1
- [ ] {Specific action 1}
- [ ] {Specific action 2}
- [ ] {Specific action 3}

### Month 1 Milestones
- {Milestone 1}
- {Milestone 2}

### Month 3 Milestones
- {Milestone 1}
- {Milestone 2}

## Cost Breakdown
| Item | Cost | Frequency |
|------|------|-----------|
| {item} | {$} | {one-time/monthly} |
| **Total month 1:** | **{$}** | |

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| {risk} | {high/med/low} | {high/med/low} | {action} |

## When to Pivot vs. Quit
- **Pivot if:** {specific signal}
- **Quit if:** {specific signal}
- **Give it at least:** {timeframe} before deciding
```

---

## Handoff Patterns

### How skills find upstream data

Each skill checks for its upstream data files in `forge-suite/data/`:

| Skill | Looks for | If not found |
|-------|-----------|--------------|
| Lens | `profile.md` | Works without it; results less personalized |
| Spark | `profile.md`, `brief-*.md` | Asks 3-4 inline questions as fallback |
| Acid Test | `profile.md`, `brief-*.md` | Asks 3-4 inline questions; skips personal fit scoring |
| Blueprint | `profile.md`, `verdict-*.md` | Asks what idea to plan; skips fit-based tool selection |

### Inline fallback questions (when no Mirror profile)

When a skill needs profile data but no profile exists, ask these 4 questions:
1. What are your main skills and tools?
2. How many hours per week can you dedicate?
3. What's your available budget for this?
4. Any hard deal-breakers? (e.g., no client calls, no physical products)

Do NOT run a full Mirror interview inline. Suggest running `/mirror` for a
complete profile, then proceed with the abbreviated answers.

---

## Methodology Sources

- **Systematic Inventive Thinking (SIT):** Closed World Principle, constraint-based templates
- **Cross-Industry Innovation (CII):** Analogical transfer (abstract → search → adapt)
- **Lean Startup:** Validation before building, MVP, smoke tests
- **Ikigai Framework:** Four-circle alignment (love, skill, need, payment)
- **Three-Layer Validation:** Search, payment, competition validation
- **Pain Point Mining:** GummySearch methodology (frequency × intensity scoring)
