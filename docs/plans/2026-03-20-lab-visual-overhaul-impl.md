# Lab Visual Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strip the Lab canvas of visual clutter (old toolbar, floating preview, generic empty state) and replace with ghost pipeline wireframe, theme-aware atmosphere, and preview-in-Inspector.

**Architecture:** Remove GraphToolbar from LabGraph rendering, remove FloatingPreview from CanvasView, rewrite LabGraph empty state as a ghost pipeline wireframe (2 nodes + 1 dashed edge via SVG), move live preview into InspectorPanel in LabContextSidebar, and make atmosphere components respect light/dark via `prefers-color-scheme`.

**Tech Stack:** React, inline styles, CSS custom properties, SVG for ghost wireframe

---

### Task 1: Remove GraphToolbar from LabGraph

**Files:**
- Modify: `src/lab/components/LabGraph/LabGraph.tsx:57,587-605`

**Step 1: Remove GraphToolbar import and rendering**

In `src/lab/components/LabGraph/LabGraph.tsx`:
- Remove line 57: `import { GraphToolbar } from './GraphToolbar';`
- Remove lines 587-605 (the toolbar + breadcrumb container div):

```tsx
// DELETE this entire block (lines 587-605):
      {/* Toolbar + Breadcrumb row */}
      <div style={{
        position: 'absolute', top: 52, left: 12, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <GraphToolbar
          onAddNode={handleAddNode}
          onAddWidgetFromLibrary={handleAddWidgetFromLibrary}
          onDescribeWidget={onDescribeWidget}
          onCompile={handleCompile}
          syncMode={syncMode}
          onSyncToggle={handleSyncToggle}
          level={level}
        />
        <GraphBreadcrumb
          breadcrumbs={breadcrumbs}
          onNavigate={handleBreadcrumbNavigate}
        />
      </div>
```

Keep the `GraphBreadcrumb` import — we'll relocate breadcrumb rendering later. For now just remove the toolbar block.

**Note:** Do NOT delete `GraphToolbar.tsx` itself — it may be useful later for widget-level editing. Just stop rendering it.

**Step 2: Verify no compile errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors in LabGraph.tsx (unused import warnings are OK)

**Step 3: Commit**

```
fix(lab): remove GraphToolbar from canvas — sidebar owns entity/pipeline actions
```

---

### Task 2: Replace empty state with ghost pipeline wireframe

**Files:**
- Modify: `src/lab/components/LabGraph/LabGraph.tsx:662-727`

**Step 1: Replace the empty state block**

Replace the entire `{nodes.length === 0 && (...)}` block (lines 662-727) with a ghost pipeline SVG wireframe:

```tsx
      {/* Ghost pipeline wireframe — fades on first entity */}
      {nodes.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          opacity: 0.15,
          animation: `sn-drift-up 600ms ${SPRING}`,
          transition: 'opacity 600ms ease',
        }}>
          {/* Ghost: two nodes connected by a dashed edge */}
          <svg width="320" height="120" viewBox="0 0 320 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Node A */}
            <rect x="10" y="30" width="100" height="60" rx="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="35" cy="60" r="4" stroke="currentColor" strokeWidth="1" />
            <line x1="50" y1="52" x2="85" y2="52" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <line x1="50" y1="60" x2="75" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            {/* Edge */}
            <path d="M110 60 L210 60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
            <circle cx="210" cy="60" r="3" fill="currentColor" opacity="0.4" />
            {/* Node B */}
            <rect x="210" y="30" width="100" height="60" rx="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="235" cy="60" r="4" stroke="currentColor" strokeWidth="1" />
            <line x1="250" y1="52" x2="285" y2="52" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <line x1="250" y1="60" x2="275" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          </svg>

          <div style={{
            marginTop: 16,
            fontSize: 13,
            color: labPalette.textMuted,
            fontFamily: 'var(--sn-font-family)',
            fontWeight: 400,
            letterSpacing: '0.01em',
          }}>
            Add entities to start building your pipeline
          </div>
        </div>
      )}
```

**Step 2: Verify rendering**

Run dev server, navigate to `/lab`, confirm ghost wireframe is centered on empty canvas.

**Step 3: Commit**

```
feat(lab): replace generic empty state with ghost pipeline wireframe
```

---

### Task 3: Remove FloatingPreview from CanvasView

**Files:**
- Modify: `src/lab/components/views/CanvasView.tsx` — remove FloatingPreview component and all references
- Modify: `src/lab/components/LabPage.tsx:372-374` — stop passing `previewSlot` prop

**Step 1: Strip CanvasView**

In `src/lab/components/views/CanvasView.tsx`:
- Delete the entire `FloatingPreview` component (lines 88-199)
- Remove `previewSlot`, `widgetName`, `isRunning` from `CanvasViewProps` interface
- Remove `previewVisible` state
- Remove the `<FloatingPreview>` JSX from the return
- Keep: `ViewToggle`, `FloatingPromptBar`, and the main canvas container

The simplified `CanvasViewProps` should be:
```tsx
export interface CanvasViewProps {
  debugMode: boolean;
  onToggleDebug: () => void;
  graphSlot?: React.ReactNode;
  promptBar?: React.ReactNode;
}
```

The simplified return:
```tsx
return (
  <div style={{
    height: '100%', width: '100%',
    position: 'relative', overflow: 'hidden',
  }}>
    <div data-debug-mode={debugMode} style={{ position: 'absolute', inset: 0 }}>
      {graphSlot}
    </div>
    <ViewToggle debugMode={debugMode} onToggle={onToggleDebug} />
    <FloatingPromptBar promptBar={promptBar} />
  </div>
);
```

**Step 2: Update LabPage**

In `src/lab/components/LabPage.tsx`, remove the `previewSlot`, `widgetName`, and `isRunning` props from the `<CanvasView>` call (lines 357-385). The simplified call:

```tsx
<CanvasView
  debugMode={lab.debugMode}
  onToggleDebug={lab.toggleDebugMode}
  graphSlot={
    <LabGraph
      graphSync={instances.graphSync}
      onCompile={(html) => {
        instances.editor.setContent(html);
      }}
      onGraphStateChange={handleGraphStateChange}
      onDescribeWidget={handleDescribeWidget}
    />
  }
  promptBar={
    <PromptBar
      generator={instances.aiGenerator}
      onApplyCode={handleApplyCode}
      currentEditorContent={editorContent}
      graphContext={graphContext}
      onExpandThread={handleToggleAiPanel}
      threadOpen={aiPanelOpen}
    />
  }
/>
```

Also remove the `LabPreviewComponent` import (line 31) and `previewReloadKey` state (line 307) if they become unused.

**Step 3: Verify compile**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 4: Commit**

```
refactor(lab): remove floating preview from canvas — moves to Inspector panel
```

---

### Task 4: Add live preview to InspectorPanel

**Files:**
- Modify: `src/lab/components/LabContextSidebar.tsx:273-291`
- Modify: `src/lab/components/LabContextSidebar.tsx:361-365` (props)
- Modify: `src/lab/components/LabPage.tsx` (pass preview slot to context sidebar)

**Step 1: Add previewSlot prop to LabContextSidebar**

Update `LabContextSidebarProps`:
```tsx
export interface LabContextSidebarProps {
  activePanel: SidebarPanel;
  projectName?: string;
  projectVersion?: string;
  previewSlot?: React.ReactNode;
  isRunning?: boolean;
}
```

**Step 2: Rewrite InspectorPanel to accept preview**

The InspectorPanel needs to receive the preview slot. Since panel components are defined inside the file, the cleanest approach is to make InspectorPanel accept the preview via a module-level variable or by changing PANEL_SECTIONS to a function. Use the function approach:

Replace the `InspectorPanel` component:

```tsx
const InspectorPanel: React.FC<{ previewSlot?: React.ReactNode; isRunning?: boolean }> = ({
  previewSlot,
  isRunning = false,
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: 0,
  }}>
    {/* Live preview */}
    <div style={{
      flex: 1,
      minHeight: 120,
      margin: '0 12px 8px',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--sn-bg, #0A0A0E)',
      border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: isRunning ? HEX.moss : labPalette.textFaint,
          boxShadow: isRunning ? `0 0 4px ${HEX.moss}40` : 'none',
          transition: `all 300ms ${SPRING}`,
        }} />
        <span style={{
          fontSize: 10,
          color: labPalette.textMuted,
          fontFamily: 'var(--sn-font-family)',
        }}>
          Preview
        </span>
      </div>
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {previewSlot ?? (
          <span style={{ color: labPalette.textFaint, fontSize: 11, fontStyle: 'italic' }}>
            No preview
          </span>
        )}
      </div>
    </div>

    {/* Node inspector placeholder */}
    <div style={{
      padding: '12px',
      borderTop: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        fontSize: 12,
        fontStyle: 'italic',
        color: labPalette.textFaint,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        Select a node to inspect
      </div>
    </div>
  </div>
);
```

**Step 3: Update panel rendering**

Since InspectorPanel now takes props, change the panel content area from using a static `PANEL_SECTIONS` record to rendering inline:

```tsx
{/* Panel content */}
<div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
  {activePanel === 'inspector' ? (
    <InspectorPanel previewSlot={previewSlot} isRunning={isRunning} />
  ) : (
    (() => { const Panel = PANEL_SECTIONS[activePanel]; return <Panel />; })()
  )}
</div>
```

And remove `inspector` from `PANEL_SECTIONS`.

**Step 4: Pass preview slot from LabPage**

In `LabPage.tsx`, pass the preview to LabContextSidebar:

```tsx
<LabContextSidebar
  activePanel={lab.activeSidebarPanel}
  projectName={instances.manifest.getManifest()?.name ?? 'Untitled Widget'}
  projectVersion="v0.1.0"
  previewSlot={<LabPreviewComponent key={previewReloadKey} preview={instances.preview} />}
  isRunning={hasActiveWidget}
/>
```

Keep the `LabPreviewComponent` import and `previewReloadKey` in LabPage — they're still needed.

**Step 5: Verify compile and rendering**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 6: Commit**

```
feat(lab): move live preview into Inspector sidebar panel
```

---

### Task 5: Make atmosphere theme-aware

**Files:**
- Modify: `src/lab/components/LabPage.tsx:50-112` (AuroraBackground, GrainOverlay, CursorLight)

**Step 1: Add theme detection hook**

At the top of `LabPage.tsx` (after imports), add a small hook:

```tsx
/** Detect dark/light mode from prefers-color-scheme */
function useColorScheme(): 'dark' | 'light' {
  const [scheme, setScheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return scheme;
}
```

**Step 2: Add theme prop to atmosphere components**

Update `AuroraBackground` to accept `mode: 'dark' | 'light'`:
- Dark: keep current opacities (0.06, 0.04, 0.04, 0.025)
- Light: reduce all opacities to ~40% of dark values (0.024, 0.016, 0.016, 0.01) and use warmer tints

Update `GrainOverlay` to accept `mode`:
- Dark: current opacities (0.045, 0.02)
- Light: halve them (0.022, 0.01)

Update `CursorLight` to accept `mode`:
- Dark: current ember tint `rgba(232,128,108,0.03)`
- Light: warm neutral tint `rgba(200,160,130,0.025)`

**Step 3: Wire theme into LabContent**

In `LabContent`:
```tsx
const colorScheme = useColorScheme();
```

Pass `mode={colorScheme}` to `<AuroraBackground>`, `<GrainOverlay>`, and `<CursorLight>`.

**Step 4: Commit**

```
feat(lab): make atmosphere effects theme-aware (light mode gets subtle pastels)
```

---

### Task 6: Make LabGraph canvas background theme-aware

**Files:**
- Modify: `src/lab/components/LabGraph/LabGraph.tsx:582-586`

**Step 1: Fix hardcoded background**

The LabGraph container currently uses `background: labPalette.bg` which resolves to `var(--sn-bg, #0A0A0E)`. This is correct for dark mode but the fallback is dark.

Change the container background to just use the CSS variable without an opinionated fallback:

```tsx
background: 'var(--sn-bg)',
```

Also update the ReactFlow `Background` component dot color to be theme-adaptive:

```tsx
<Background
  color="var(--sn-text-faint, rgba(255,255,255,0.015))"
  gap={24}
  size={1}
/>
```

**Step 2: Commit**

```
fix(lab): use theme CSS variables for canvas background instead of hardcoded dark
```

---

### Task 7: Visual verification

**Step 1: Take screenshot in dark mode**

Navigate to `/lab`, resize to 1400x900 with `colorScheme: 'dark'`. Take screenshot.

Verify:
- [ ] Icon rail visible on far left with 5 panel icons
- [ ] Context sidebar visible (220px) with Entities panel
- [ ] Canvas fills remaining space
- [ ] NO GraphToolbar ("SCENE / + Add Entity / Build Pipeline" gone)
- [ ] Ghost pipeline wireframe visible (2 dashed nodes + dashed edge)
- [ ] "Add entities to start building your pipeline" label
- [ ] NO floating preview window on canvas
- [ ] Prompt bar at bottom center
- [ ] Status bar at bottom
- [ ] Aurora/grain atmosphere visible

**Step 2: Switch to Inspector panel and verify preview**

Click the Inspector icon in the rail. Verify preview pane renders inside the sidebar.

**Step 3: Take screenshot in light mode**

Switch to `colorScheme: 'light'`. Verify atmosphere is subtler but present.

**Step 4: Commit if any visual tweaks needed**

```
fix(lab): visual polish from verification pass
```
