# Layer 4A-2 — Canvas Tools Rules
# Applies to: `src/canvas/tools/**`

## Identity and Responsibility

Canvas Tools implements the interactive editing tools that operate on the canvas:
select, move, resize, pen/draw, text insertion, shape tools, and the sticker
placement tool. Tools are discrete modes — only one tool is active at a time.

Tools layer owns:
- Tool registry and active tool state
- Select tool: click-to-select, marquee/region select, multi-select
- Move tool: entity drag and drop, snapping, alignment guides
- Resize tool: handle-based resize, aspect-ratio lock
- Pen/draw tool: freehand stroke rendering
- Text tool: inline text insertion and editing
- Shape tools: rectangle, ellipse, line
- Sticker tool: placing sticker entities from the asset library
- Widget placement: dropping a widget onto the canvas

---

## Import Rules — STRICTLY ENFORCED

- You MAY import from `src/kernel/**` (Layer 0)
- You MAY import from `src/runtime/**` (Layer 3)
- You MAY import from `src/canvas/core/**` (Layer 4A-1)
- You MUST NOT import from `src/social/**`, `src/lab/**`,
  `src/canvas/wiring/**`, `src/canvas/panels/**`,
  `src/spatial/**`, `src/marketplace/**`, or `src/shell/**`

---

## Tool Registry

- Tools are registered by name: `select`, `move`, `resize`, `pen`, `text`,
  `rect`, `ellipse`, `line`, `sticker`, `widget`
- Active tool is stored in `uiStore` — one active tool at a time
- Switching tools cancels any in-progress interaction on the previous tool
- Tools receive pointer events from Canvas Core via the event bus — they do
  not attach their own DOM event listeners

---

## Select Tool

- Click: select single entity (deselect others unless Shift held)
- Click on empty canvas: deselect all
- Drag on empty canvas: marquee/region select (rubber-band box)
- Shift+click: toggle entity in/out of multi-selection
- Keyboard Delete/Backspace: delete selected entities
- Multi-selection must support move, delete, and group operations

---

## Move Tool / Drag Behavior

- Drag threshold: 4px before a move operation begins (distinguish from click)
- Snap to grid: optional, configurable grid size from canvas settings
- Smart guides: show alignment lines when dragging near other entities' edges/centers
- Emit `canvas.entity.moved` bus event on drop with final canvas-space position
- Optimistic local update + broadcast via social layer (Layer 1) on drop
- Do not update entity position in the store until drop — use a drag overlay

---

## Resize Tool

- Eight handles: four corners + four edge midpoints
- Shift+drag corner: constrain aspect ratio
- Alt+drag: resize from center
- Emit `canvas.entity.resized` bus event on handle release
- Minimum size constraints must be enforced per entity type

---

## Sticker Placement

- Sticker entities are dropped onto the canvas from the asset panel
- On drop: create a `StickerEntity` at the drop coordinates (canvas space)
- Stickers have no embedded logic — they are purely visual assets
- Do not confuse Stickers with Widgets — stickers never run code

---

## Testing Requirements

1. **Select + deselect** — click entity selects it; click empty canvas deselects
2. **Marquee select** — drag region selects all entities whose bounding boxes intersect
3. **Move with snap** — entity snaps to grid when grid snap is enabled
4. **Resize aspect lock** — Shift+drag corner keeps width/height ratio constant
5. **Tool switch cancels** — switching tool while drag in progress emits no move event

---

## What You Must Not Do

- Do not attach DOM event listeners directly — receive events from Canvas Core via bus
- Do not import from canvas wiring or panels
- Do not implement pipeline logic in the tools layer
- Do not store drag state in the entity record — use a transient drag overlay
- Do not conflate Sticker placement with Widget placement
