# Canvas Interaction Features Design

**Date:** 2026-02-24
**Scope:** Keyboard shortcuts, resize handles, alignment, grouping, crop tool
**Layer:** L6 Shell (`src/shell/canvas/`) with schema additions in L0

---

## Overview

Five canvas interaction features that complete the entity manipulation story.
Build order follows dependency chain: Shortcuts -> Resize -> Align -> Group -> Crop.

All features share one new component — `SelectionOverlay` — rendered inside
`CanvasViewportLayer` so it transforms with the viewport automatically.

---

## 1. Keyboard Shortcuts

### Goal
Wire production keyboard shortcuts into `CanvasWorkspace`.

### Approach
- Port `src/shell/dev/hooks/use-canvas-shortcuts.ts` to
  `src/shell/canvas/hooks/useCanvasShortcuts.ts`
- Attach via `onKeyDown` on the workspace container (`tabIndex={0}`)
- Remove conflicting Ctrl+[/] sidebar-toggle shortcuts from the central
  `ShortcutRegistry` — z-order control is higher priority

### Shortcut Map

| Key | Action | Requires Selection |
|-----|--------|--------------------|
| Delete / Backspace | Delete selected | Yes |
| Escape | Deselect all | No |
| Ctrl+A | Select all | No |
| Arrow keys | Nudge 10px | Yes |
| Shift+Arrow | Nudge 50px | Yes |
| Ctrl+] | Bring forward | Yes |
| Ctrl+[ | Send backward | Yes |
| Ctrl+Shift+] | Bring to front | Yes |
| Ctrl+Shift+[ | Send to back | Yes |
| V | Select tool | No |
| H | Hand (pan) tool | No |
| T | Text tool | No |
| R | Rect tool | No |
| P | Pen tool | No |
| E | Ellipse tool | No |
| Ctrl+G | Group | Yes (2+) |
| Ctrl+Shift+G | Ungroup | Yes (group) |
| Ctrl+D | Duplicate | Yes |
| C | Enter/exit crop mode | Yes (croppable) |

### Files
- Create: `src/shell/canvas/hooks/useCanvasShortcuts.ts`
- Modify: `src/shell/canvas/CanvasWorkspace.tsx` (wire hook)
- Modify: `src/shell/shortcuts/shortcut-registry.ts` (remove sidebar conflicts, add tool keys)

---

## 2. Resize (Scale)

### Goal
Render interactive resize handles on selected entities.

### Approach
Reuse the headless `computeResize()` from `src/canvas/tools/resize/resize-handles.ts`.
Build a `SelectionOverlay` component that renders 8 small squares at bounding box
corners and edge midpoints.

### SelectionOverlay Component
- Mounted inside `CanvasViewportLayer`, after `CanvasEntityLayer`
- Receives: selected entity IDs, scene graph ref, interaction mode
- In edit mode with exactly 1 entity selected: renders 8 resize handles
- Each handle: 8x8px square, white fill, 1px border, positioned at handle location
- Cursor style per handle from `getResizeHandles()`
- Pointer events on handles: track drag delta, call `computeResize()`, emit
  `ENTITY_RESIZED` on pointerup
- Shift held during drag: aspect-lock
- Alt held during drag: center-resize
- Minimum entity size: 20x20px

### Data Flow
```
handle pointerdown -> track delta -> computeResize(handle, delta, bounds, opts)
  -> ENTITY_RESIZED bus event -> scene graph update -> re-render
```

### Files
- Create: `src/shell/canvas/components/SelectionOverlay.tsx`
- Modify: `src/shell/canvas/CanvasViewportLayer.tsx` (mount overlay)
- Modify: `src/canvas/tools/resize/resize-handles.ts` (bump min size to 20)

---

## 3. Align & Distribute

### Goal
Alignment and distribution operations for multi-selected entities.

### Approach
Pure functions in a utility file. No React, no state — takes entity transforms
in, returns new positions out. Caller emits bus events.

### Functions
- `alignLeft(entities)` — all entities' left edge matches the leftmost
- `alignRight(entities)` — all right edges match rightmost
- `alignTop(entities)` — all top edges match topmost
- `alignBottom(entities)` — all bottom edges match bottommost
- `alignCenterH(entities)` — all horizontal centers match selection center
- `alignCenterV(entities)` — all vertical centers match selection center
- `distributeH(entities)` — even horizontal spacing between outer bounds
- `distributeV(entities)` — even vertical spacing between outer bounds

Each returns `Array<{ id: string; position: Point2D }>`.

### UI Surfaces
- Floating action bar: align buttons visible when 2+ entities selected
- `SelectionOverlay`: can render alignment guides (dashed lines) during drag

### Files
- Create: `src/shell/canvas/utils/align.ts`
- Modify: `src/canvas/panels/floating-bar/floating-action-bar.ts` (add align actions)

---

## 4. Group / Ungroup

### Goal
Group multiple entities into a single composite entity; ungroup to restore.

### Existing Infrastructure
- `GroupEntity` schema with `children: string[]`
- `ENTITY_GROUPED` / `ENTITY_UNGROUPED` bus events defined
- `GroupRenderer.tsx` renders dashed border when selected
- Floating action bar already has "Group" button emitting `canvas.entity.group`

### What We Build

**Group handler** — listens for `canvas.entity.group` bus event:
1. Compute bounding box encompassing all children
2. Create `GroupEntity` at that position/size
3. Convert each child's absolute position to a position relative to the group
4. Store child IDs in group's `children` array
5. Emit `ENTITY_CREATED` for the group
6. Emit `ENTITY_UPDATED` for each child (set `parentId`, relative position)

**Ungroup handler** — listens for `canvas.entity.ungroup` bus event:
1. Read group entity's children
2. Convert each child's relative position back to absolute
3. Emit `ENTITY_UPDATED` for each child (clear `parentId`, absolute position)
4. Emit `ENTITY_DELETED` for the group entity

**Selection behavior:**
- Click grouped entity -> select the group
- Double-click -> enter group (select individual child)
- Escape while inside group -> exit group, select the group itself

**Move/Resize:**
- Moving a group emits `ENTITY_UPDATED` for group; children move with it
  (renderer reads group position + child relative offset)
- Resizing a group scales children proportionally

### Files
- Create: `src/shell/canvas/handlers/groupHandler.ts`
- Modify: `src/shell/canvas/renderers/GroupRenderer.tsx` (double-click to enter)
- Modify: `src/canvas/panels/floating-bar/floating-action-bar.ts` (add ungroup)
- Modify: `src/shell/canvas/CanvasWorkspace.tsx` (initialize group handler)

---

## 5. Crop / Uncrop

### Goal
Interactive crop tool for sticker and image entities with visual overlay,
drag handles, and aspect ratio presets.

### Schema Change
Add optional `cropRect` to `StickerEntitySchema` and any image-based entities:
```ts
cropRect: z.object({
  x: z.number().min(0).max(1),      // percentage offset from left
  y: z.number().min(0).max(1),      // percentage offset from top
  width: z.number().min(0).max(1),  // percentage of original width
  height: z.number().min(0).max(1), // percentage of original height
}).nullable().default(null)
```
Percentages (0-1) ensure crop is resolution-independent.

### Crop Mode Activation
- Double-click a croppable entity (sticker, SVG, image)
- Or select entity + press `C`
- Or select entity + click "Crop" in floating action bar

### Crop UI (rendered by SelectionOverlay)
When crop mode is active:
- Dim/darken area outside crop rect (semi-transparent overlay)
- Bright visible area inside crop rect
- 8 resize handles on the crop rect (reuses resize handle pattern)
- Drag inside crop rect to reposition the visible window
- Aspect presets above the crop overlay: Free, 1:1, 4:3, 16:9

### Apply / Cancel
- Enter or click outside -> apply crop, emit `ENTITY_UPDATED` with `cropRect`
- Escape -> cancel, revert to previous state
- "Uncrop" button or `C` on already-cropped entity -> set `cropRect` to `null`

### Rendering
Entity renderers apply crop via CSS:
```css
/* StickerRenderer / SvgRenderer */
clip-path: inset(
  ${cropRect.y * 100}%
  ${(1 - cropRect.x - cropRect.width) * 100}%
  ${(1 - cropRect.y - cropRect.height) * 100}%
  ${cropRect.x * 100}%
);
```

### Files
- Modify: `src/kernel/schemas/canvas-entity.ts` (add cropRect to sticker)
- Modify: `src/shell/canvas/components/SelectionOverlay.tsx` (crop mode UI)
- Modify: `src/shell/canvas/renderers/StickerRenderer.tsx` (apply clip-path)
- Modify: `src/shell/canvas/renderers/SvgRenderer.tsx` (apply clip-path)
- Modify: `src/canvas/panels/floating-bar/floating-action-bar.ts` (add crop action)

---

## Architecture Principles

1. **Headless-first**: All computation lives in pure functions or L4A-2 tools.
   Shell components are thin visual wrappers + input routing.
2. **Bus-driven**: All mutations go through bus events. No direct scene graph
   writes from UI components.
3. **Viewport-aware**: `SelectionOverlay` lives inside `CanvasViewportLayer`,
   so handles/guides transform automatically with pan/zoom.
4. **Mode-aware**: All edit-only UI checks `canvasInteractionMode === 'edit'`
   before rendering. Preview mode shows no handles/shortcuts.
5. **Clean and production-ready**: No dev harness code in production paths.
   Proper TypeScript types, JSDoc on public APIs, co-located tests.
