# Layer 4A-4 — Canvas Panels Rules
# Applies to: `src/canvas/panels/**`

## Identity and Responsibility

Canvas Panels implements all sidebar panels, floating toolbars, context menus,
and inspector panels that compose the canvas editing UI. Panels are purely
presentational — they read state from stores and dispatch actions via the event
bus. They contain no business logic.

Panels layer owns:
- Toolbar: tool selector, zoom controls, mode toggle (edit/preview)
- Properties panel: entity-specific config (position, size, style, widget config)
- Layers panel: z-order list, visibility toggles, entity rename
- Asset panel: sticker library, widget library, media uploads
- Pipeline inspector: selected pipeline node details
- Context menu: right-click menu for entities and canvas
- Floating action bar: appears near selected entities

---

## Import Rules — STRICTLY ENFORCED

- You MAY import from `src/kernel/**` (Layer 0)
- You MAY import from `src/runtime/**` (Layer 3)
- You MAY import from `src/canvas/core/**` (Layer 4A-1)
- You MUST NOT import from `src/social/**`, `src/lab/**`,
  `src/canvas/tools/**`, `src/canvas/wiring/**`,
  `src/spatial/**`, `src/marketplace/**`, or `src/shell/**`

Panels may NOT import from tools or wiring. Use the event bus to communicate
tool state changes (e.g., "user activated the pen tool").

---

## Panel Architecture

- Each panel is a standalone React component
- Panels read from Zustand stores via selectors — no prop drilling of store state
- Panels dispatch intent by emitting bus events — they do not call store actions directly
- Panel visibility and collapsed state lives in `uiStore`
- No panel contains business logic — if you find yourself writing entity math in
  a panel component, move it to Canvas Core

---

## Properties Panel

- Displays properties for the currently selected entity (or entities)
- For multi-selection: show only shared properties; show "mixed" for differing values
- Widget config fields come from the widget manifest's config schema (via `@sn/types`)
- Emit `canvas.entity.config.updated` bus event when a config value changes
- Do not debounce config writes to the store — emit on every committed change (not keystrokes for text fields)

---

## Layers Panel

- Lists all entities in z-order (top of list = front of canvas)
- Click row: select entity
- Drag row: reorder z-order
- Toggle visibility: hides entity from render without deleting
- Double-click name: inline rename
- Emit bus events for all actions — do not mutate scene graph directly

---

## Asset Panel

- Shows sticker library (browseable, searchable)
- Shows installed widget library
- Drag-to-canvas: initiates sticker or widget placement (tools layer handles drop)
- File upload: image/GIF/video files → creates sticker asset
- Pagination or virtual scrolling required for large libraries

---

## Edit vs Preview Mode

- In **preview mode**: toolbar shows mode toggle only; all edit panels are hidden
- In **edit mode**: full panel set is visible
- Mode toggle in toolbar emits `canvas.mode.changed` bus event
- Do not re-mount panels on mode switch — toggle visibility via CSS/conditional render

---

## Testing Requirements

1. **Properties panel multi-select** — selecting two entities with different sizes shows "mixed" for size field
2. **Layers panel reorder** — drag row in layers panel emits correct z-order bus event
3. **Preview mode** — edit panels are hidden in preview mode; toolbar shows only mode toggle
4. **Config update event** — changing a widget config field in properties panel emits `canvas.entity.config.updated` with correct payload
5. **Asset panel drag** — dragging a sticker from asset panel triggers sticker placement tool

---

## What You Must Not Do

- Do not import from canvas tools or wiring layers
- Do not contain business logic in panel components
- Do not mutate scene graph or entity state directly from panels
- Do not persist panel open/closed state beyond the session
- Do not show edit-only panels in preview mode
