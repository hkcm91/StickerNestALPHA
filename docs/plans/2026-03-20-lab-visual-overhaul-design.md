# Lab Pipeline Builder — Visual Overhaul Design

**Date**: 2026-03-20
**Status**: Approved
**Scope**: `src/lab/components/**`

## Context

The Lab underwent a structural redesign (icon rail + sidebar panels + single canvas)
but the visual result is disconnected: light background kills atmosphere, old toolbar
lingers, competing CTAs confuse the entry point, empty state is generic, and the
floating preview window clutters the canvas.

This overhaul addresses all of those issues in one pass.

## Decisions

### 1. Remove GraphToolbar

The toolbar ("SCENE / + Add Entity / Build Pipeline") is killed entirely. Its
functionality now lives in the sidebar panels:
- Entity creation → Entities panel
- Pipeline building → implicit via canvas interactions
- Scene management → handled by sidebar + canvas tools

### 2. Remove floating preview window

The floating preview (bottom-right of canvas) is removed from CanvasView. Preview
moves into the Inspector sidebar panel:
- **No node selected**: show live widget preview (full panel height)
- **Node selected**: split view — node properties top, live preview bottom
- Preview shows running/stopped indicator dot (moss green when live)

### 3. Ghost pipeline empty state

When the canvas has no entities, show a centered ghost wireframe:
- Two translucent nodes connected by a single dashed edge
- Centered on canvas, using `textFaint` opacity (~0.15)
- Subtle label below: "Add entities to start building your pipeline"
- Faint dot grid pattern across the canvas background (both modes)
- Ghost fades out (600ms ease) when the first real entity is added

### 4. Theme-aware atmosphere

Both light and dark modes get atmospheric effects, adapted per mode:

**Dark mode** (existing, tuned):
- Aurora gradients at current opacity
- Dual-layer grain overlay
- Cursor-following ember light

**Light mode** (new):
- Aurora gradients at ~40% of dark mode opacity, using warm pastels
- Single-layer grain at ~50% of dark mode opacity
- Cursor light using a warm tint instead of ember

**Canvas background**: Always `var(--sn-bg)`. Sidebars use `var(--sn-surface)` or
glass variant for subtle depth separation. No hardcoded color values in canvas area.

### 5. Simplified CTAs

Only two entry points remain:
- **Primary**: AI prompt bar (bottom-center of canvas, always visible). Glows softly
  when canvas is empty to draw attention.
- **Secondary**: sidebar panels — Entities panel for dragging, Widgets panel for
  AI generation / library / marketplace / upload.

All other canvas-surface buttons ("+ Add widget", "Browse templates", "See examples")
are removed.

## Files affected

| File | Change |
|---|---|
| `src/lab/components/LabGraph/LabGraph.tsx` | Remove GraphToolbar rendering |
| `src/lab/components/views/CanvasView.tsx` | Remove FloatingPreview, remove previewSlot prop |
| `src/lab/components/LabPage.tsx` | Stop passing previewSlot to CanvasView |
| `src/lab/components/LabContextSidebar.tsx` | Rewrite InspectorPanel to include live preview |
| `src/lab/components/LabGraph/EmptyState.tsx` | New — ghost pipeline wireframe + dot grid |
| `src/lab/components/shared/atmosphere.tsx` | Extract aurora/grain/cursor into theme-aware components |
| `src/lab/components/views/CanvasView.tsx` | Update prompt bar glow behavior for empty state |

## Out of scope

- Debug mode visual effects (node glow, dead-end highlighting) — separate task
- Actual entity drag-to-canvas wiring — separate task
- AI generation integration — already wired, just needs CTA cleanup
