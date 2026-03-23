# Widget Lab Redesign: Pipeline Builder

**Date:** 2026-03-20
**Status:** Approved
**Supersedes:** `2026-03-20-lab-4view-mockup-specs.md`, `2026-03-20-lab-creator-mode-ui-overhaul.md`

---

## Problem

The Widget Lab has four disconnected tabs (Canvas, Library, Automation, Testing) that don't tell a coherent story. The Canvas tab tries to be a scene graph editor and a code editor simultaneously. A "New Widget" node on a graph canvas with event ports is confusing. The tabs slice the workflow wrong.

## Identity

The Lab is a **pipeline builder**. You compose automation flows out of canvas entities and widgets. Widgets are nodes that do things. Entities are nodes that represent canvas objects. Edges are event connections between them. The whole thing compiles into a working pipeline.

AI is woven into every interaction — not a separate panel.

---

## Layout

### Structure

```
[Status Bar (bottom)]
[Icon Rail (~48px) | Sidebar Panel (~220px) | Full-bleed Canvas]
```

- **No top-level tabs.** The canvas IS the Lab.
- **Left icon rail** swaps sidebar panels, one at a time.
- **Floating controls** on the canvas: Preview/Debug toggle, AI prompt bar.
- **Status bar** at bottom: pipeline health, connection, latency.

### Canvas

The primary surface. Entities and widgets are spatially arranged.

**Two modes via floating toggle:**

| Mode | What you see |
|---|---|
| **Preview** (default) | Entities look normal, pipeline runs live |
| **Debug** | Connection lines visible, nodes glow when active, dead ends highlighted in ember/red |

- Drag from sidebar to add entities/widgets to the canvas.
- Select + connect to wire pipeline edges.
- AI prompt bar floats at bottom center, context-aware to selection and pipeline state.

### Sidebar Panels (Icon Rail)

One panel visible at a time. Icon rail on the left edge swaps between:

| # | Panel | Purpose |
|---|---|---|
| 1 | **Entities** | All entity types (widget, sticker, text, shape, drawing, path, SVG, audio, lottie, 3D object, docker, group, artboard, folder). Drag to canvas. |
| 2 | **Widgets** | Four sources: AI generate, personal library, marketplace, upload from device. Browse, search, preview, then drag to canvas. |
| 3 | **Inspector** | Selected node properties, connections, config. Shows nothing when no selection. |
| 4 | **Testing** | Device simulation, latency sim, simulated users, event console. Controls for running the pipeline under different conditions. |
| 5 | **Deploy** | Publish pipeline, version history, manifest. The final step. |

### AI Integration

AI is not a panel. It is everywhere:

- **Prompt bar** (bottom of canvas): generates widgets directly as canvas nodes, creates connections, answers questions.
- **Context menu on any node**: "Explain this widget", "Suggest connections", "Why is this broken?"
- **Context menu on pipeline**: "Optimize this flow", "What's missing?", "Add error handling"
- **In Widgets panel**: "Find me a widget that does X" searches library + marketplace.
- **On dead ends/errors**: AI proactively suggests fixes.
- **Generation**: "Generate a counter widget and connect it to this timer" produces a working node on the canvas.

---

## Widget Sources (Widgets Panel)

Four ways to get a widget into the Lab:

| Source | Flow |
|---|---|
| **AI Generate** | Describe it in the prompt bar or Widgets panel. Lab generates single-file HTML widget, adds as node. |
| **Personal Library** | Browse widgets you've already built. Select to add as node. |
| **Marketplace** | Browse/search community widgets. Fork/import to add as node. |
| **Device Upload** | Upload a local `.html` widget file from your computer. |

---

## Debug Mode Details

When Debug mode is toggled on:

- Connection lines appear between connected entities/widgets, showing data flow direction.
- **Active nodes glow** (moss green) when they are online and processing events.
- **Dead ends** are highlighted (ember red) where connections stop or are broken.
- **Disconnected nodes** are visually dimmed.
- Event flow is animated along edges (subtle pulse traveling the connection line).

---

## What Gets Removed

- **Top nav tabs** (Canvas | Library | Automation | Testing) — gone. One canvas.
- **Graph/Code toggle** — replaced by Preview/Debug toggle.
- **LabContextSidebar view-switching sections** — replaced by icon rail panels.
- **Separate PipelineView** — the canvas IS the pipeline view.
- **Separate ToyBoxView** — testing controls move to Testing sidebar panel.
- **Separate WidgetLibraryView** — widget browsing moves to Widgets sidebar panel.
- **CreatorLayout / LabLayout** — already orphaned, can be deleted.

---

## What Stays

- **LabStatusBar** — bottom status bar (connection, streaming, latency).
- **Floating prompt bar** — moves from CanvasView into the new unified canvas.
- **Floating preview window** — mini preview of selected widget output.
- **LabGraph / ReactFlow** — the underlying graph engine, repurposed for pipeline visualization.
- **GraphToolbar** (Add Entity, Build Pipeline) — adapted for the new canvas.
- **Shared palette, GlassPanel, GlowButton** — design system stays.

---

## Code Editor

Parked for now. The code editor is relevant for developers who want to write widget code directly, but the pipeline builder workflow comes first. Code editing can be added later as a panel or modal without changing the architecture.

---

## Files Affected

| Action | File |
|---|---|
| **Rewrite** | `src/lab/components/LabPage.tsx` — single canvas layout, no tabs |
| **Rewrite** | `src/lab/components/LabSidebar.tsx` — icon rail instead of top nav tabs |
| **Rewrite** | `src/lab/components/LabContextSidebar.tsx` — panel-swapping sidebar |
| **Rewrite** | `src/lab/components/views/CanvasView.tsx` — unified pipeline canvas with Preview/Debug |
| **Delete** | `src/lab/components/views/WidgetLibraryView.tsx` — absorbed into Widgets panel |
| **Delete** | `src/lab/components/views/PipelineView.tsx` — absorbed into canvas |
| **Delete** | `src/lab/components/views/ToyBoxView.tsx` — absorbed into Testing panel |
| **Delete** | `src/lab/components/CreatorLayout.tsx` — orphaned |
| **Delete** | `src/lab/components/LabLayout.tsx` — orphaned |
| **Modify** | `src/lab/components/LabGraph/LabGraph.tsx` — debug mode glow, connection visualization |
| **Keep** | `src/lab/components/LabStatusBar.tsx` — unchanged |
| **Keep** | `src/lab/components/shared/*` — design system unchanged |
| **Update** | `src/lab/hooks/useLabState.ts` — simplify state (remove view switching, add debug toggle) |
