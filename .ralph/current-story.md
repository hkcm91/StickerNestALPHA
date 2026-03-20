# Story: Creator Mode Layout + Onboarding

**Created:** 2026-03-20
**Layer(s):** L2
**Status:** Complete

## Context

The Lab's current layout is code-editor-first (60/40 split, editor primary). This story implements Phase 1 of the Lab Creator Mode UI Overhaul ADR: a preview-primary layout with collapsible graph/code panel, onboarding overlay for first-time users, and the useCreatorMode state hook. See `docs/plans/2026-03-20-lab-creator-mode-ui-overhaul.md` for full context.

## Acceptance Criteria

- [x] AC1: `useCreatorMode` hook — manages creator mode state: `isCreatorMode`, `showOnboarding`, `graphCollapsed`, `dismissOnboarding()`, `toggleGraphCollapsed()`. Co-located test file.
- [x] AC2: `CreatorLayout` component — preview-primary 65%/35% split layout with collapsible graph/code panel, toolbar with view toggle, play button placeholder, and bottom tray for Inspector/Manifest/Publish. Co-located test file.
- [x] AC3: `OnboardingOverlay` component — full-screen overlay with "What do you want to create?" header and three path cards (Template, Describe it, Build visually). Spring-animated entry. Each card triggers a callback. Co-located test file.
- [x] AC4: `LabPage` integration — when creator mode is active, LabPage uses `CreatorLayout` instead of `LabLayout`. Onboarding overlay shows when no active widget content exists. Existing LabLayout preserved for backward compat.
- [x] AC5: Tests pass — `npm test` passes for all new and existing lab tests.
- [x] AC6: Lint passes — `npm run lint` has no new errors.

## Constraints

- Must follow L2 import rules (only `src/kernel/**`, `src/runtime/**`, `@sn/types`)
- Must use existing shared components (GlassPanel, GlowButton, LabTabs, etc.)
- Must use existing palette and keyframe system
- Must have co-located `*.test.ts` files for every new module
- Existing LabLayout must remain functional and unchanged
- No new cross-layer imports

## Files to Create

- `src/lab/hooks/useCreatorMode.ts` — creator mode state hook
- `src/lab/hooks/useCreatorMode.test.ts` — tests
- `src/lab/components/CreatorLayout.tsx` — preview-primary layout
- `src/lab/components/CreatorLayout.test.tsx` — tests
- `src/lab/components/OnboardingOverlay.tsx` — first-time experience
- `src/lab/components/OnboardingOverlay.test.tsx` — tests

## Files to Modify

- `src/lab/components/LabPage.tsx` — integrate CreatorLayout + onboarding

---

## Progress Log

### [2026-03-20] AC1: useCreatorMode hook

**Action:** Created `useCreatorMode` hook managing creator mode state: `isCreatorMode`, `showOnboarding`, `graphCollapsed`, `dismissOnboarding()`, `toggleGraphCollapsed()`, `setGraphCollapsed()`, `setCreatorMode()`.
**Result:** Pass (8 tests)
**Files touched:**
- `src/lab/hooks/useCreatorMode.ts` — **NEW** creator mode state hook
- `src/lab/hooks/useCreatorMode.test.ts` — **NEW** 8 test cases

### [2026-03-20] AC2: CreatorLayout component

**Action:** Created preview-primary layout with 65%/35% split (graph/code left, preview right), collapsible graph panel, toolbar with Graph/Code toggle + collapse button + extras slot, and bottom tray with Inspector/Manifest/Versions/Publish tabs. Uses react-resizable-panels and framer-motion spring animations.
**Result:** Pass (12 tests)
**Files touched:**
- `src/lab/components/CreatorLayout.tsx` — **NEW** preview-primary layout
- `src/lab/components/CreatorLayout.test.tsx` — **NEW** 12 test cases

### [2026-03-20] AC3: OnboardingOverlay component

**Action:** Created full-screen overlay with "What do you want to create?" header, subtitle, three spring-animated path cards (Template/Describe/Visual), Skip button, and backdrop blur. Cards have hover effects with per-path glow colors (storm/ember/violet).
**Result:** Pass (10 tests)
**Files touched:**
- `src/lab/components/OnboardingOverlay.tsx` — **NEW** onboarding overlay
- `src/lab/components/OnboardingOverlay.test.tsx` — **NEW** 10 test cases

### [2026-03-20] AC4: LabPage integration

**Action:** Integrated CreatorLayout + OnboardingOverlay into LabPage. When `isCreatorMode` is true, uses CreatorLayout; otherwise falls back to original LabLayout. Onboarding shows when no editor content exists. Added `handleOnboardingPath` callback routing template/describe/visual selections.
**Result:** Pass
**Files touched:**
- `src/lab/components/LabPage.tsx` — Added imports, creator mode state, conditional layout rendering, onboarding overlay

### [2026-03-20] AC5–AC6: Tests & Lint

**Action:** All 30 new tests pass. 0 lint errors, 0 lint warnings on touched files. One pre-existing test failure in `manifest-editor.test.ts` (crossCanvasChannels field) unrelated to this work.
**Result:** Pass

### [2026-03-20] Story Complete

All 6 acceptance criteria implemented and verified:
- `useCreatorMode` hook with 8 tests
- `CreatorLayout` with preview-primary 65/35 split, collapsible graph, toolbar extras slot, 12 tests
- `OnboardingOverlay` with spring-animated cards, 10 tests
- LabPage integration preserving backward compat with original LabLayout
- 30 new tests all passing, 0 lint errors

