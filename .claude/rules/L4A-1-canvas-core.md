# Layer 4A-1 — Canvas Core Rules
# Applies to: `src/canvas/core/**`

## Identity and Responsibility

Canvas Core is the foundation of all 2D canvas rendering and interaction in
StickerNest V5. It owns the infinite canvas viewport, the entity scene graph,
hit-testing, z-order management, and coordinate space transforms. All other
canvas sub-layers (tools, wiring, panels) depend on what is defined here.

Canvas Core owns:
- Viewport: pan, zoom, coordinate transforms (canvas ↔ screen space)
- Entity scene graph: add, remove, update, z-order, spatial indexing
- Hit-testing: point-in-entity, region selection, entity-at-cursor
- Render loop: frame scheduling, dirty-region tracking
- Drag scaffolding: pointer capture, delta tracking (no tool logic here)
- Canvas → screen and screen → canvas coordinate utilities

---

## Import Rules — STRICTLY ENFORCED

- You MAY import from `src/kernel/**` (Layer 0)
- You MAY import from `src/runtime/**` (Layer 3)
- You MAY import from external npm packages
- You MUST NOT import from `src/social/**`, `src/lab/**`,
  `src/canvas/tools/**`, `src/canvas/wiring/**`, `src/canvas/panels/**`,
  `src/spatial/**`, `src/marketplace/**`, or `src/shell/**`

Canvas Core must be usable in isolation — it must not depend on tools or panels.

---

## Key Modules

- `src/canvas/core/viewport/` — pan/zoom state, coordinate transforms
- `src/canvas/core/scene/` — entity scene graph, z-order, spatial index
- `src/canvas/core/hittest/` — point and region hit-testing
- `src/canvas/core/renderer/` — render loop, dirty tracking, frame scheduling
- `src/canvas/core/drag/` — pointer capture and delta tracking primitives

---

## Coordinate System

- Canvas space: infinite 2D plane, origin at (0, 0), grows right/down
- Screen space: viewport pixels, origin at top-left of the browser window
- Always transform to canvas space before storing entity positions
- Never store screen-space coordinates in entity state
- Provide `canvasToScreen(point, viewport)` and `screenToCanvas(point, viewport)` utilities

---

## Entity Scene Graph

- All entities extend `CanvasEntity` (base schema from `src/kernel/schemas/`)
- Scene graph maintains insertion order and explicit z-order
- Z-order operations: `bringToFront`, `sendToBack`, `bringForward`, `sendBackward`
- Spatial index (e.g., R-tree or grid) must be updated on every entity transform
- Hit-testing uses the spatial index — do not iterate all entities on every pointer event

---

## Render Loop

- Use `requestAnimationFrame` for the render loop — never `setInterval`
- Track dirty regions — only re-render changed areas, not the full viewport each frame
- Target 60fps for entity manipulation; drop gracefully under load
- Render loop is owned by Canvas Core; tools and widgets hook into it via events, not direct calls
- Do not allow higher layers to schedule renders directly — emit a bus event instead

---

## Edit vs Preview Mode

- Canvas Core reads `uiStore.canvasInteractionMode` to determine behavior
- In **preview mode**: entity positions are locked; pointer events pass through to widgets
- In **edit mode**: full entity manipulation is enabled
- Mode switching must not require a full canvas re-initialize — it is a runtime state change

---

## Testing Requirements

1. **Coordinate round-trip** — `screenToCanvas(canvasToScreen(p, vp), vp)` returns `p` ± epsilon
2. **Z-order operations** — bring/send operations produce correct ordering in scene graph
3. **Hit-test accuracy** — overlapping entities: topmost z-order entity is returned
4. **Dirty-region tracking** — moving one entity only marks its old and new bounding boxes dirty, not the full viewport
5. **Preview mode lock** — entity drag events are no-ops when `canvasInteractionMode === 'preview'`

---

## What You Must Not Do

- Do not import from canvas tools, wiring, or panels
- Do not implement tool-specific logic (selection box, pen stroke, etc.) here
- Do not store screen-space coordinates on entities — always canvas space
- Do not iterate all entities for hit-testing — use the spatial index
- Do not allow the render loop to be driven by higher layers
- Do not persist `canvasInteractionMode` — it is always derived on load
