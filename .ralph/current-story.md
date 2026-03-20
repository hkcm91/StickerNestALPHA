# Story: Wire AISlidePanel as Creator Mode AI Surface

**Created:** 2026-03-20
**Layer(s):** L2
**Status:** Complete

## Context

In Creator Mode, the AI experience should be a right-edge slide panel (AISlidePanel) triggered by PromptBar's expand button, not the floating bottom-right orb (AICompanion). AISlidePanel is fully implemented and tested (19 tests) but never mounted. PromptBar has `onExpandThread` and `threadOpen` props that are defined but not wired. This story connects PromptBar → AISlidePanel in Creator Mode while keeping AICompanion for classic IDE mode.

## Acceptance Criteria

- [x] AC1: In Creator Mode, mount `AISlidePanel` instead of `AICompanion` in LabPage. Pass all required AI props (generator, onApplyCode, editorContent, graphContext, pendingPrompt, onPendingPromptConsumed).
- [x] AC2: Wire PromptBar's `onExpandThread` callback to toggle AISlidePanel open/closed state. Wire `threadOpen` prop to reflect panel state.
- [x] AC3: In classic IDE mode (non-Creator), keep existing `AICompanion` behavior unchanged.
- [x] AC4: Forward `pendingPrompt` to AISlidePanel and auto-open the panel when a pending prompt arrives.
- [x] AC5: Tests pass — `npm test` passes for all lab tests.
- [x] AC6: Lint passes — `npm run lint` has no new errors.

## Constraints

- Must follow L2 import rules
- No new cross-layer imports
- AICompanion must remain functional for classic IDE mode
- All existing test files must continue to pass
- No new component files needed — only wiring in LabPage

## Files to Modify

- `src/lab/components/LabPage.tsx` — add AISlidePanel state, conditional rendering, wire PromptBar expand

---

## Progress Log

### [2026-03-20] AC1–AC4: Wire AISlidePanel into LabPage

**Action:** Added `aiPanelOpen` state and `handleToggleAiPanel` callback. Wired PromptBar's `onExpandThread` to toggle panel and `threadOpen` to reflect state. Added auto-open effect when `pendingAIPrompt` arrives in Creator Mode. Replaced single AICompanion mount with conditional: AISlidePanel in Creator Mode, AICompanion in classic mode. All AI props forwarded correctly.
**Result:** Pass
**Files touched:**
- `src/lab/components/LabPage.tsx` — import AISlidePanel; add aiPanelOpen state + toggle handler; add auto-open effect; wire PromptBar expand props; conditional AI surface rendering

### [2026-03-20] AC5–AC6: Tests & Lint

**Action:** 339 lab tests pass. 0 lint errors. One pre-existing failure in manifest-editor.test.ts unrelated to this work.
**Result:** Pass

### [2026-03-20] Story Complete

All 6 acceptance criteria implemented and verified:
- AISlidePanel mounted in Creator Mode with full AI props
- PromptBar expand button toggles AISlidePanel open/closed
- AICompanion preserved for classic IDE mode
- Auto-open on pending prompt in Creator Mode
- 339 tests passing, 0 lint errors
