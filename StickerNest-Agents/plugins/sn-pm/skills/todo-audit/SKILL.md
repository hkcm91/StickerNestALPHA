---
name: todo-audit
description: >
  Deep audit of StickerNest TODO.md against the actual codebase. Scans the repo
  to find completed items that aren't checked off, breaks large tasks into
  actionable sub-tasks, validates architecture alignment, and reconciles the
  feature coverage table. Use when the user says "audit the TODO", "clean up
  the backlog", "reconcile TODO.md", "is the TODO accurate", "what's actually
  done", "TODO audit", "backlog audit", "sync TODO with code", "what did we
  miss checking off", "break down the TODO", "TODO health check".
---

# SN TODO Audit — Deep Backlog Reconciliation

> Scans the actual codebase, cross-references TODO.md, marks completed items,
> breaks down large tasks, validates architecture compliance, and produces an
> updated TODO.md with an audit report.

---

## When to Run

- After a batch of development work (multiple sessions without TODO updates)
- Before sprint planning (ensure the backlog is accurate)
- Weekly maintenance (keep TODO.md as source of truth)
- After an autopilot run (verify what was actually built)
- When TODO.md feels stale or inaccurate

---

## Audit Workflow

### Phase 1: Codebase Scan

Scan the repo systematically to build a picture of what actually exists.

```bash
# 1. Directory structure and file counts per layer
for dir in kernel social runtime lab canvas spatial marketplace shell; do
  echo "$dir: $(find src/$dir -type f -name '*.ts' -o -name '*.tsx' | wc -l) source files"
done

# 2. Test coverage
find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l

# 3. Recent git history (what was built since last audit)
git log --oneline -50

# 4. All exports from key barrel files
# Check what's actually exported from kernel schemas
grep -c "export" src/kernel/schemas/index.ts

# 5. Supabase migrations (what DB tables exist)
ls supabase/migrations/ 2>/dev/null || echo "No migrations dir"

# 6. Check for key feature files
# Examples — adapt based on TODO items:
find src -name "*.ts" -path "*stripe*" -o -path "*commerce*" -o -path "*billing*" 2>/dev/null
find src -name "*.ts" -path "*onboarding*" -o -path "*wizard*" 2>/dev/null
find src -name "*.ts" -path "*gdpr*" -o -path "*moderation*" -o -path "*audit-trail*" 2>/dev/null
find src -name "*.ts" -path "*rich-text*" -o -path "*document-widget*" 2>/dev/null
```

### Phase 2: TODO.md Line-by-Line Reconciliation

Read every unchecked `- [ ]` item in TODO.md and classify it:

| Classification | Action |
|---|---|
| **Actually done** — code exists, tests pass | Change `[ ]` to `[x]`, move to COMPLETED section |
| **Partially done** — some code exists but incomplete | Keep `[ ]`, add a note: `(partial: X exists, needs Y)` |
| **Not started** — no code exists | Keep `[ ]` as-is |
| **Stale/obsolete** — no longer relevant to architecture | Remove or move to a "Dropped" section with reason |
| **Too large** — should be broken into sub-tasks | Break down (see Phase 3) |

#### How to Check Each Item

For each unchecked TODO, run targeted searches:

```bash
# Example: "Rich text / document widget"
find src -name "*.ts" -path "*rich-text*" -o -name "*.ts" -path "*document*" | head -20
grep -r "rich.text\|RichText\|document.widget\|DocumentWidget" src/ --include="*.ts" -l

# Example: "GDPR compliance"
grep -r "gdpr\|GDPR\|data.export\|right.to.deletion\|consent" src/ --include="*.ts" -l

# Example: "Stripe Connect onboarding"
grep -r "stripe.connect\|StripeConnect\|connect.onboarding" src/ --include="*.ts" -l
find supabase -name "*.sql" | xargs grep -l "stripe\|commerce" 2>/dev/null
```

Don't just check if a file exists — check if it has meaningful implementation:
- A file with only type stubs = partial
- A file with full logic + tests = complete
- An empty or placeholder file = not started

### Phase 3: Break Down Large Tasks

Any TODO item that would take more than one dev session should be broken into
concrete sub-tasks. Use this template:

**Before:**
```
- [ ] Stripe Connect onboarding (edge function, identity verification, payouts)
```

**After:**
```
- [ ] Stripe Connect onboarding
  - [ ] Create Supabase edge function for Stripe Connect OAuth flow
  - [ ] Add Connect account status to seller profile schema
  - [ ] Build identity verification UI (upload ID, business info)
  - [ ] Implement payout schedule configuration
  - [ ] Add Connect webhook handler for account.updated events
  - [ ] Wire seller dashboard to show payout history
```

Rules for breakdown:
- Each sub-task should be completable in one session (~30-60 min)
- Each sub-task should be independently testable
- Sub-tasks should respect layer boundaries (don't mix L0 + L6 work)
- Include the layer/scope for each sub-task where possible
- Preserve the original parent item as a header

### Phase 4: Architecture Validation

For every TODO item, check that it aligns with the StickerNest architecture:

1. **Layer placement** — Does the task belong in the layer it implies?
   - Commerce logic → Kernel (L0) for schemas, Shell (L6) for UI
   - Widget features → Runtime (L3) for SDK, Canvas (L4A) for placement

2. **Import boundary compliance** — Would completing this task require
   cross-layer imports that violate the rules?
   - If yes: note the architectural concern and suggest the correct approach

3. **Build order respect** — Does this task depend on incomplete lower-layer work?
   - If yes: flag it as blocked and note the dependency

4. **Schema alignment** — Does this task need new schemas in `@sn/types`?
   - If yes: note that schema work should be done first (L0)

5. **Store compliance** — Does this task need new store state?
   - If yes: verify it fits in one of the 9 existing stores
   - If it doesn't fit: flag a potential new store (which is a big decision)

### Phase 5: Update Feature Coverage Table

Recount the feature spec coverage table at the bottom of TODO.md:

```
| Category | MVP Features | Built | Partial | Missing |
```

For each category:
- Count items marked `[x]` → Built
- Count items marked `[ ]` with "(partial: ...)" notes → Partial
- Count items marked `[ ]` with no partial note → Missing
- Update the totals row

### Phase 6: Generate Audit Report

After updating TODO.md, produce a summary:

```
## TODO Audit Report — [DATE]

### Items Checked Off (newly marked complete)
- [item 1] — evidence: [file/test that proves it]
- [item 2] — evidence: [file/test]

### Items Broken Down
- [large item] → broken into N sub-tasks

### Stale Items Removed
- [item] — reason: [why it's no longer relevant]

### Architecture Concerns Found
- [concern] — recommendation: [fix]

### Blocked Items (dependency issues)
- [item] — blocked by: [what needs to happen first]

### Coverage Table Changes
- Built: X → Y (+N)
- Partial: X → Y
- Missing: X → Y (-N)

### Recommendations
- [what to prioritize next based on audit findings]
```

---

## TODO.md Format Rules

When editing TODO.md, preserve the existing format exactly:

- Section headers: `## COMPLETED ✓`, `## REMAINING WORK — by priority`
- Priority markers: `### 🔴 P0`, `### 🟡 P1`, `### 🟢 P2`, `### 🔵 P3`, `### 🌙 MOONSHOTS`
- Sub-sections use `#### Title` with a blockquote description
- Checkbox format: `- [ ]` unchecked, `- [x]` checked
- Indented sub-tasks: `  - [ ]` (2 spaces)
- Keep the reference table at the bottom updated
- Do NOT reorganize sections or change priority levels (that's a PM decision)
- Do NOT add items from external sources — only reconcile what's already listed

---

## Terminology Compliance

Use correct StickerNest terms in all notes and sub-tasks:
- "Canvas" not "board" or "scene"
- "Entity" not "element" or "node" (in canvas context)
- "Widget" not "app" or "plugin"
- "Sticker" not "icon" (in technical context)
- "Pipeline" not "flow" or "chain"
- "DataSource" not "database record" or "data object"
- "Docker" means the container widget, not Docker containers

---

## Safety Rules

- **Never delete TODO items without explanation** — move stale items to a
  "Dropped" section with a reason, or add a comment
- **Never change priority levels** — that requires user approval
- **Never add new items** that weren't already in TODO.md — this is an audit,
  not a planning session. If you discover missing features, note them in the
  audit report under "Recommendations" but don't add them to TODO.md
- **Always show evidence** for marking items complete — file paths, test names,
  or git commit hashes
- **Preserve git-friendly formatting** — no trailing whitespace, consistent
  indentation, blank lines between sections
