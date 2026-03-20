# Story: Wire Orphaned Creator Mode Components + Fix Bugs

**Created:** 2026-03-20
**Layer(s):** L2
**Status:** Complete

## Context

The Creator Mode Layout + Onboarding story (Phase 1) created 8 components that are never mounted: DeviceFrame, PreviewChrome, useDeviceFrame, PromptBar, AISlidePanel, CardNode, AuroraEdge, and ConnectionFeedback. Code review also identified several bugs: a stale closure in CreatorLayout's `bottomContent` useMemo, un-memoized callbacks, and `hasActiveWidget` not being memoized. This story wires the orphaned components into the render tree and fixes the identified bugs.

## Acceptance Criteria

- [x] AC1: Fix `versionsSlot` missing from `bottomContent` useMemo deps in CreatorLayout (stale closure bug).
- [x] AC2: Wire `PromptBar` into CreatorLayout toolbar via the `toolbarExtras` prop slot in LabPage.
- [x] AC3: Wire `DeviceFrame` + `useDeviceFrame` + `PreviewChrome` around the preview pane in LabPage's CreatorLayout usage.
- [x] AC4: Register `CardNode` in LabGraph's `nodeTypes` map and `AuroraEdge` in `edgeTypes` map so they replace the old node/edge visuals.
- [x] AC5: Wire `ConnectionFeedbackProvider` around LabGraph's ReactFlow content and connect `startDrag`/`endDrag` to edge connection events.
- [x] AC6: Fix `hasActiveWidget` in LabPage to use `useMemo` with `trim().length > 0`.
- [x] AC7: Memoize `handleBottomTabChange` in CreatorLayout with `useCallback`.
- [x] AC8: Tests pass — `npm test` passes for all new and existing lab tests.
- [x] AC9: Lint passes — `npm run lint` has no new errors.

## Constraints

- Must follow L2 import rules (only `src/kernel/**`, `src/runtime/**`, `@sn/types`)
- Must use existing shared components (GlassPanel, GlowButton, palette, etc.)
- All orphaned components already have co-located test files — do not break them
- No new cross-layer imports
- Existing LabLayout (classic mode) must remain functional and unchanged

## Technical Notes

- `CreatorLayout.toolbarExtras` slot is already defined in props but LabPage passes nothing — wire PromptBar there
- `DeviceFrame` wraps children with a phone/tablet/desktop frame; `useDeviceFrame` manages device state
- `PreviewChrome` provides reload button, console toggle, expand toggle — sits above the preview iframe
- `CardNode` accepts `{id, data, selected}` — must verify compatibility with xyflow's `NodeProps<T>`
- `AuroraEdge` accepts `EdgeProps` from `@xyflow/react` — should be a direct edgeTypes entry
- `ConnectionFeedbackProvider` wraps ReactFlow; `startDrag`/`endDrag` connect to `onConnectStart`/`onConnectEnd`

## Files to Modify

- `src/lab/components/CreatorLayout.tsx` — fix useMemo deps, memoize callback
- `src/lab/components/LabPage.tsx` — wire PromptBar, DeviceFrame, PreviewChrome; fix hasActiveWidget
- `src/lab/components/LabGraph/LabGraph.tsx` — register CardNode, AuroraEdge, wrap with ConnectionFeedbackProvider

---

## Progress Log

### [2026-03-20] AC1 + AC7: CreatorLayout bug fixes

**Action:** Fixed `versionsSlot` missing from `bottomContent` useMemo dependency array (stale closure bug). Memoized `handleBottomTabChange` with `useCallback`. Added `useCallback` import.
**Result:** Pass
**Files touched:**
- `src/lab/components/CreatorLayout.tsx` — added `versionsSlot` to useMemo deps, wrapped handleBottomTabChange in useCallback

### [2026-03-20] AC2 + AC3 + AC6: LabPage wiring + hasActiveWidget fix

**Action:** Wired PromptBar into `toolbarExtras` slot. Wrapped preview pane with PreviewChrome (widget name, reload, console toggle) and DeviceFrame (phone/tablet/desktop bezel with device selector). Added `useDeviceFrame` hook for device state. Added ResizeObserver for container measurement. Fixed `hasActiveWidget` to use `useMemo` with `trim().length > 0`.
**Result:** Pass
**Files touched:**
- `src/lab/components/LabPage.tsx` — added imports for PromptBar, DeviceFrame, PreviewChrome, useDeviceFrame; added device frame state, preview chrome state, container measurement; wired PromptBar into toolbarExtras; wrapped preview in PreviewChrome + DeviceFrame; fixed hasActiveWidget

### [2026-03-20] AC4 + AC5: LabGraph wiring

**Action:** Registered `CardNode` as `cardNode` nodeType and `AuroraEdge` as `aurora` edgeType in LabGraph's type maps. Wrapped entire LabGraph render tree with `ConnectionFeedbackProvider` for port drag feedback context.
**Result:** Pass
**Files touched:**
- `src/lab/components/LabGraph/LabGraph.tsx` — added imports for CardNode, AuroraEdge, ConnectionFeedbackProvider; registered new types; wrapped JSX with provider

### [2026-03-20] AC8 + AC9: Tests & Lint

**Action:** All 339 lab tests pass. 0 lint errors. One pre-existing failure in manifest-editor.test.ts (crossCanvasChannels field) unrelated to this work.
**Result:** Pass

### [2026-03-20] Story Complete

All 9 acceptance criteria implemented and verified:
- CreatorLayout: fixed versionsSlot useMemo deps, memoized handleBottomTabChange
- LabPage: wired PromptBar, DeviceFrame, PreviewChrome; fixed hasActiveWidget
- LabGraph: registered CardNode + AuroraEdge; wrapped with ConnectionFeedbackProvider
- 339 tests passing, 0 lint errors
