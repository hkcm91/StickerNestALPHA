# Lab Pipeline Builder — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Widget Lab from a 4-tab IDE into a single-canvas pipeline builder with an icon-rail sidebar, Preview/Debug toggle, and AI woven throughout.

**Architecture:** Remove the top nav tabs and view-switching system entirely. The canvas fills the Lab. A left icon rail (~48px) swaps sidebar panels one at a time (Entities, Widgets, Inspector, Testing, Deploy). Floating controls on the canvas handle Preview/Debug toggle and the AI prompt bar. The graph engine (ReactFlow) is repurposed for pipeline visualization with debug-mode glow effects.

**Tech Stack:** React, Zustand, ReactFlow (@xyflow/react), existing StickerNest design system (GlassPanel, GlowButton, labPalette, SPRING)

---

### Task 1: Simplify useLabState — remove view switching, add debug toggle

**Files:**
- Modify: `src/lab/hooks/useLabState.ts`

**Step 1: Write the failing test**

Create `src/lab/hooks/useLabState.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLabState } from './useLabState';

// Mock all Lab module factories
vi.mock('../ai/ai-generator', () => ({ createAIGenerator: () => ({ cancel: vi.fn() }) }));
vi.mock('../editor/editor', () => ({ createLabEditor: () => ({ onChange: () => vi.fn(), dispose: vi.fn(), setContent: vi.fn() }) }));
vi.mock('../graph/graph-sync', () => ({ createGraphSync: () => ({ destroy: vi.fn() }) }));
vi.mock('../init', () => ({ initLab: vi.fn(), teardownLab: vi.fn() }));
vi.mock('../inspector/inspector', () => ({ createEventInspector: () => ({ clear: vi.fn() }) }));
vi.mock('../manifest/manifest-editor', () => ({ createManifestEditor: () => ({ getManifest: () => null }) }));
vi.mock('../preview/preview-manager', () => ({ createPreviewManager: () => ({ destroy: vi.fn(), setMode: vi.fn(), update: vi.fn() }) }));
vi.mock('../publish/pipeline', () => ({ createPublishPipeline: () => ({}) }));
vi.mock('../versions/version-manager', () => ({ createVersionManager: () => ({}) }));

describe('useLabState', () => {
  it('has debugMode state that defaults to false', () => {
    const { result } = renderHook(() => useLabState());
    expect(result.current.debugMode).toBe(false);
  });

  it('toggles debugMode', () => {
    const { result } = renderHook(() => useLabState());
    act(() => result.current.toggleDebugMode());
    expect(result.current.debugMode).toBe(true);
    act(() => result.current.toggleDebugMode());
    expect(result.current.debugMode).toBe(false);
  });

  it('has activeSidebarPanel state defaulting to entities', () => {
    const { result } = renderHook(() => useLabState());
    expect(result.current.activeSidebarPanel).toBe('entities');
  });

  it('switches sidebar panels', () => {
    const { result } = renderHook(() => useLabState());
    act(() => result.current.setActiveSidebarPanel('widgets'));
    expect(result.current.activeSidebarPanel).toBe('widgets');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lab/hooks/useLabState.test.ts`
Expected: FAIL — `debugMode`, `toggleDebugMode`, `activeSidebarPanel`, `setActiveSidebarPanel` don't exist yet

**Step 3: Update useLabState**

In `src/lab/hooks/useLabState.ts`:

- Add type: `export type SidebarPanel = 'entities' | 'widgets' | 'inspector' | 'testing' | 'deploy';`
- Remove: `LabView`, `CanvasSubView`, `LabBottomTab` types
- Remove state: `activeView`, `canvasSubView`, `activeBottomTab`, `revealedBottomTabs` and their setters
- Add state: `debugMode: boolean` (default `false`), `activeSidebarPanel: SidebarPanel` (default `'entities'`)
- Add setters: `toggleDebugMode`, `setActiveSidebarPanel`
- Keep everything else (instances, ready, aiExpanded, previewMode)

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lab/hooks/useLabState.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lab/hooks/useLabState.ts src/lab/hooks/useLabState.test.ts
git commit -m "refactor(lab): simplify useLabState — remove view tabs, add debugMode and sidebar panels"
```

---

### Task 2: Rewrite LabSidebar as icon rail

**Files:**
- Rewrite: `src/lab/components/LabSidebar.tsx`

**Step 1: Rewrite LabSidebar**

Replace the horizontal top nav with a vertical icon rail (~48px wide, full height). Five icons, vertically stacked:

1. Entities (grid/cube icon)
2. Widgets (hexagon icon)
3. Inspector (sliders icon)
4. Testing (play-circle icon)
5. Deploy (rocket icon)

Each icon is a button. Active panel gets a storm-colored left border indicator and subtle background highlight. Tooltip on hover shows panel name.

Props change from `{ activeView, onViewChange }` to `{ activePanel: SidebarPanel, onPanelChange: (panel: SidebarPanel) => void }`.

Keep the flask lab icon at the top of the rail.

Use inline SVGs for icons (matching existing pattern in the codebase). Use `labPalette`, `SPRING`, `HEX`, `hexToRgb` from shared palette.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: errors in LabPage.tsx (expected — LabPage still references old props). That's fine, we fix LabPage in Task 5.

**Step 3: Commit**

```bash
git add src/lab/components/LabSidebar.tsx
git commit -m "refactor(lab): rewrite LabSidebar as vertical icon rail with 5 panels"
```

---

### Task 3: Rewrite LabContextSidebar as panel-switching sidebar

**Files:**
- Rewrite: `src/lab/components/LabContextSidebar.tsx`

**Step 1: Rewrite LabContextSidebar**

Replace the view-switching sidebar with panel-swapping content. One panel visible at a time based on `activePanel: SidebarPanel`.

**Entities panel**: All 15 entity types from `CanvasEntityTypeSchema`. Each is a draggable `SidebarItem` with an icon. Grouped into sections:
- **Content**: Widget, Sticker, Text, Audio, Lottie
- **Visual**: Shape, Drawing, Path, SVG
- **Spatial**: 3D Object, Artboard
- **Structure**: Docker, Group, Folder

**Widgets panel**: Four source sections:
- **AI Generate**: compact prompt input + "Generate" button
- **My Widgets**: list of saved widgets (placeholder data for now)
- **Marketplace**: search input + "Browse Marketplace" button (placeholder)
- **Upload**: "Upload from device" button with file input for `.html`

**Inspector panel**: Shows "Select a node to inspect" when nothing is selected. (Will be wired to selection state later.)

**Testing panel**: Device selector, latency slider, simulated users count, "Run Pipeline" button, mini event console.

**Deploy panel**: Version history placeholder, "Publish Pipeline" button, manifest summary.

Keep the project name header at top and the action button at bottom (changes label per panel context).

Props: `{ activePanel: SidebarPanel, projectName?: string, projectVersion?: string }`

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: may have errors in LabPage.tsx (expected — fixed in Task 5)

**Step 3: Commit**

```bash
git add src/lab/components/LabContextSidebar.tsx
git commit -m "refactor(lab): rewrite LabContextSidebar with 5 swappable panels"
```

---

### Task 4: Rewrite CanvasView — unified pipeline canvas with Preview/Debug toggle

**Files:**
- Rewrite: `src/lab/components/views/CanvasView.tsx`
- Update: `src/lab/components/views/index.ts`

**Step 1: Rewrite CanvasView**

Replace the Graph/Code toggle with a **Preview/Debug** floating toggle pill (same position, top-left).

- **Preview mode**: shows the graph slot as-is (entities look normal, pipeline runs)
- **Debug mode**: shows the graph slot with a CSS class/prop that signals debug mode (the graph component will handle glow effects later)

Keep the floating prompt bar and floating preview window.

Remove: `activeSubView`, `onSubViewChange`, `editorSlot` props.
Add: `debugMode: boolean`, `onToggleDebug: () => void`.
Keep: `graphSlot`, `previewSlot`, `promptBar`, `widgetName`, `isRunning`.

The toggle labels change from "Graph | Code" to "Preview | Debug".

**Step 2: Update views/index.ts**

Remove exports for `WidgetLibraryView`, `PipelineView`, `ToyBoxView` and their types. Keep only `CanvasView` and `CanvasViewProps`.

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: errors in LabPage.tsx (expected — fixed in Task 5)

**Step 4: Commit**

```bash
git add src/lab/components/views/CanvasView.tsx src/lab/components/views/index.ts
git commit -m "refactor(lab): rewrite CanvasView with Preview/Debug toggle, remove unused views"
```

---

### Task 5: Rewrite LabPage — single canvas layout

**Files:**
- Rewrite: `src/lab/components/LabPage.tsx`

**Step 1: Rewrite LabContent**

The new layout structure:

```
[Icon Rail (LabSidebar) | Sidebar Panel (LabContextSidebar) | Full-bleed Canvas (CanvasView)]
[Status Bar (LabStatusBar)]
```

- No top nav bar. The icon rail is on the far left.
- Remove all view switching (`lab.activeView === 'canvas'`, etc.)
- Always render CanvasView as the main content.
- Pass `debugMode` and `toggleDebugMode` from `useLabState` to CanvasView.
- Pass `activeSidebarPanel` and `setActiveSidebarPanel` to LabSidebar and LabContextSidebar.
- Keep: atmosphere layers (AuroraBackground, CursorLight, GrainOverlay), guard screens, AI surfaces, import dialog, LabStatusBar.
- Remove imports: `WidgetLibraryView`, `PipelineView`, `ToyBoxView`.

**Step 2: Verify full compilation**

Run: `npx tsc --noEmit`
Expected: PASS — all components now use the new prop interfaces

**Step 3: Verify in browser**

Run dev server, open `/lab` at 1400x900. Should see:
- Icon rail on far left
- Sidebar panel next to it
- Full-bleed canvas filling the rest
- Status bar at bottom
- Preview/Debug toggle floating on canvas
- Prompt bar at bottom center

**Step 4: Commit**

```bash
git add src/lab/components/LabPage.tsx
git commit -m "refactor(lab): rewrite LabPage as single-canvas pipeline builder"
```

---

### Task 6: Delete orphaned files

**Files:**
- Delete: `src/lab/components/views/WidgetLibraryView.tsx`
- Delete: `src/lab/components/views/PipelineView.tsx`
- Delete: `src/lab/components/views/ToyBoxView.tsx`
- Delete: `src/lab/components/CreatorLayout.tsx`
- Delete: `src/lab/components/LabLayout.tsx`

**Step 1: Delete the files**

```bash
rm src/lab/components/views/WidgetLibraryView.tsx
rm src/lab/components/views/PipelineView.tsx
rm src/lab/components/views/ToyBoxView.tsx
rm src/lab/components/CreatorLayout.tsx
rm src/lab/components/LabLayout.tsx
```

**Step 2: Verify no remaining imports**

Run: `npx tsc --noEmit`
Expected: PASS — no file references these deleted modules

Run: `grep -r "WidgetLibraryView\|PipelineView\|ToyBoxView\|CreatorLayout\|LabLayout" src/lab/ --include="*.ts" --include="*.tsx"`
Expected: no matches (or only in deleted files)

**Step 3: Commit**

```bash
git add -u
git commit -m "chore(lab): delete orphaned view and layout files"
```

---

### Task 7: Visual verification and screenshot

**Step 1: Run dev server and verify**

Open `/lab` route at 1400x900 viewport. Verify:
- Icon rail on far left with 5 icons (entities, widgets, inspector, testing, deploy)
- Clicking each icon swaps the sidebar panel content
- Entities panel shows all 15 entity types grouped into sections
- Widgets panel shows AI Generate, My Widgets, Marketplace, Upload sections
- Preview/Debug toggle on the canvas works
- Prompt bar floats at bottom center
- Mini preview window floats at bottom right
- Status bar shows at bottom
- No console errors

**Step 2: Test each sidebar panel**

Click through all 5 panels and verify content renders without errors.

**Step 3: Commit any fixes**

If any visual issues found, fix and commit:
```bash
git commit -m "fix(lab): visual polish for pipeline builder layout"
```

---

### Task 8: Move GraphToolbar position for new layout

**Files:**
- Modify: `src/lab/components/LabGraph/LabGraph.tsx`

**Step 1: Adjust GraphToolbar position**

The GraphToolbar currently sits at `top: 52, left: 12`. With the Preview/Debug toggle replacing the Graph/Code toggle (same position), the toolbar can move back to `top: 52, left: 12` (already correct from prior fix). Verify it doesn't overlap with the new toggle.

**Step 2: Verify visually**

Take screenshot, confirm no overlap between Preview/Debug toggle and GraphToolbar.

**Step 3: Commit if changed**

```bash
git add src/lab/components/LabGraph/LabGraph.tsx
git commit -m "fix(lab): adjust GraphToolbar position for pipeline builder layout"
```

---

## Future Tasks (not in this plan)

These are noted but not implemented now:

- **Debug mode glow effects**: Nodes glow green when active, ember when dead-end. Requires changes to LabGraph node rendering.
- **Connection visualization**: Animated pulses along edges in debug mode.
- **Drag-to-canvas from sidebar**: Wire drag events from entity/widget sidebar items to the graph.
- **Code editor panel**: Add as a sidebar panel or modal for developer use.
- **Real widget sources**: Wire Widgets panel to actual widget store, marketplace API, and file upload handler.
- **Testing panel wiring**: Connect device/latency controls to preview manager.
- **Deploy panel wiring**: Connect to publish pipeline.
