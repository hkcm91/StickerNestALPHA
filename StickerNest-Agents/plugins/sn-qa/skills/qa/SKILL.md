---
name: qa
description: >
  This skill tests completed StickerNest features visually and programmatically.
  Use when the user says "test this feature", "verify the PR", "QA this",
  "check if it works", "run the tests", or after any Task Runner completion
  that needs verification before merge.
---

> Tests completed work visually and programmatically. Screenshots results. Compares against acceptance criteria. Passes or rejects with evidence.

---

## When to Run

- After Task Runner marks a task complete
- When a PR is submitted for review
- On demand: "Test this feature"

---

## Test Environment Setup

QA target is localhost. Start the dev server before any visual testing:

```bash
npm run dev
# Server starts on http://localhost:5173/StickerNest5.0/
```

Wait for the "ready" message before navigating. If the server is already running, skip this step.

---

## Test Plan Creation

For each feature being tested, create a structured test plan:

### Step 1: Read Acceptance Criteria

Find the acceptance criteria from:
- The task/story file (`.ralph/current-story.md`)
- The PR description
- Kimber's original request

### Step 2: Build the Checklist

For each acceptance criterion, create a verification step:

```markdown
## Test Plan: [Feature Name]

### Functional Tests
- [ ] [Criterion 1]: [How to verify]
- [ ] [Criterion 2]: [How to verify]

### Visual Tests
- [ ] UI renders correctly at default viewport
- [ ] No visual regressions in surrounding areas
- [ ] [Feature-specific visual checks]

### Edge Cases
- [ ] [Edge case 1]: [What to try]
- [ ] [Edge case 2]: [What to try]

### Accessibility (if UI changed)
- [ ] Color contrast passes
- [ ] Keyboard navigation works
- [ ] Screen reader labels present
```

---

## Programmatic Testing

Run these checks and record results:

```bash
# Unit tests
npm test
# Record: X tests passed, Y failed, Z skipped

# Coverage
npm run test:coverage
# Record: branches %, functions %, lines %, statements %
# FAIL if any metric < 80%

# Lint
npm run lint
# Record: pass/fail, number of warnings

# Layer boundary validation
npm run deps:validate
# Record: pass/fail

# Type checking
npm run typecheck
# Record: pass/fail, number of errors
```

---

## Visual Testing Workflow (Claude in Chrome)

For features with UI:

### Step 1: Navigate
Open `http://localhost:5173/StickerNest5.0/` in the browser. Navigate to the feature being tested.

### Step 2: Set Viewport
Use a consistent viewport: 1280x720 for screenshots.

### Step 3: Walk the User Flow
Perform each step of the feature's user flow:
- Interact with the UI as a user would
- Take a screenshot after each significant state change
- Note any unexpected behavior

### Step 4: Test Both Modes
If the feature behaves differently in edit vs preview mode, test both:
- Edit mode: verify full interaction works
- Preview mode: verify layout is locked, widgets are interactive

---

## Bug Report Format

When a test fails, create a bug report:

```markdown
## Bug Report: [Short Title]

**Severity:** critical / major / minor
**Layer:** [L0-L6]
**File(s):** [affected files]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected
[What should happen]

### Actual
[What actually happens]

### Screenshot
[Attach screenshot if visual bug]

### Environment
- Browser: [Chrome/Firefox/etc]
- Viewport: [dimensions]
- Mode: [edit/preview]

### Notes
[Any additional context]
```

### Example Bug Report

```markdown
## Bug Report: Widget frame doesn't resize on panel collapse

**Severity:** major
**Layer:** L3 Runtime
**File(s):** src/runtime/WidgetFrame.tsx

### Steps to Reproduce
1. Place a widget on the canvas
2. Open the properties panel (right sidebar)
3. Collapse the properties panel

### Expected
Widget iframe receives a resize event and adjusts to the new available width.

### Actual
Widget iframe retains its old dimensions. Content is clipped on the right side.

### Screenshot
[screenshot showing clipped widget]

### Environment
- Browser: Chrome 124
- Viewport: 1280x720
- Mode: edit
```

---

## Pass/Fail Criteria

### PASS requires ALL of these:
- Every acceptance criterion verified with evidence
- `npm test` passes
- `npm run test:coverage` meets 80% threshold
- `npm run lint` passes
- `npm run deps:validate` passes
- `npm run typecheck` passes
- No critical or major bugs found

### FAIL if ANY of these:
- An acceptance criterion is not met
- Coverage below 80% on any metric
- Lint or dependency validation fails
- Critical bug found
- TypeScript errors exist

### Verdict Format

```markdown
## QA Verdict: [PASS / FAIL]

**Feature:** [Feature name]
**Date:** [Date]
**Tested by:** QA Agent

### Test Results
- Unit tests: [X passed, Y failed]
- Coverage: [branches %, functions %, lines %, statements %]
- Lint: [pass/fail]
- Deps: [pass/fail]
- Typecheck: [pass/fail]

### Acceptance Criteria
- [x] [Criterion 1] — verified via [method]
- [ ] [Criterion 2] — FAILED: [reason]

### Screenshots
[Links to screenshots]

### Bugs Filed
- [Bug title] (severity)

### Notes
[Any additional observations]
```

---

## Accessibility Quick Check

For any feature that changes UI, run through:

1. **Color contrast** — text against background meets WCAG AA (4.5:1 for normal text)
2. **Keyboard navigation** — Tab through the feature, verify focus order makes sense
3. **Focus indicators** — focused elements have visible outlines
4. **Screen reader** — interactive elements have `aria-label` or visible text
5. **Touch targets** — buttons/controls are at least 44x44px
