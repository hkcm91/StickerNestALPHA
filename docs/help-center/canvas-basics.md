# Canvas Basics

Your canvas is an infinite 2D workspace. This article covers navigation, tools, entity types, and the two interaction modes.

## Navigation

**Pan** by clicking and dragging on empty canvas space, or hold Space and drag from anywhere. On trackpad, use two-finger scroll.

**Zoom** with the scroll wheel (or trackpad pinch). The zoom level is shown in the toolbar. You can also use `Cmd/Ctrl +` and `Cmd/Ctrl -` to zoom in and out, or `Cmd/Ctrl 0` to reset to 100%.

**Zoom to fit** with `Shift+1` — this adjusts the view to show all entities on your canvas.

The minimap (bottom-right corner) shows a bird's-eye view of your canvas. Click anywhere on the minimap to jump to that area.

## Tools

Only one tool is active at a time. Select tools from the toolbar or use keyboard shortcuts:

| Tool | Shortcut | What it does |
|------|----------|-------------|
| Select | `V` | Click to select entities, drag to move them, Shift+click for multi-select |
| Move | `M` | Drag entities to reposition them. Shows alignment guides. |
| Resize | (use handles) | Select an entity, then drag its corner or edge handles |
| Pen | `B` | Freehand drawing on the canvas |
| Text | `T` | Click to place a text entity, then type |
| Rectangle | `R` | Click and drag to draw a rectangle |
| Ellipse | `E` | Click and drag to draw an ellipse |
| Line | `L` | Click and drag to draw a line |
| Sticker | `S` | Place stickers from the asset library |
| Pipeline | `W` | Connect widget ports to create pipelines |

## Entity Types

Everything on your canvas is an entity. Each entity has a position, size, rotation, and z-order (front-to-back stacking).

**Stickers** are static visual assets — images, GIFs, or videos. They don't run code or respond to events. Use them for decoration, labels, and visual organization.

**Widgets** are interactive apps in sandboxed containers. Each widget runs its own code and can communicate with other widgets through pipelines and the event bus.

**Text entities** are rich text blocks you can type into directly on the canvas.

**Shapes** (rectangle, ellipse, line) are basic drawing primitives for annotation and layout.

**Docker containers** are special widgets that host other widgets inside tabs. They act like floating windows on your canvas.

## Selecting and Manipulating

**Click** an entity to select it. Its bounding box and handles appear.

**Shift+click** to add or remove entities from your selection.

**Drag on empty space** to draw a selection box (marquee select). All entities touching the box are selected.

**Move** selected entities by dragging them. A 4px threshold prevents accidental moves from clicks. Alignment guides appear when edges or centers line up with nearby entities.

**Resize** by dragging handles. Hold Shift on a corner handle to maintain aspect ratio. Hold Alt to resize from center.

**Rotate** by dragging the rotation handle that appears above a selected entity.

**Z-order** controls front-to-back stacking. Right-click an entity for options: Bring to Front, Send to Back, Bring Forward, Send Backward. The Layers panel (left sidebar) also lets you reorder by dragging.

**Delete** selected entities with the Delete or Backspace key.

## Grid and Snapping

Toggle grid snap from the toolbar. When enabled, entities snap to a configurable grid as you move or resize them. Smart alignment guides also appear when entities line up with neighbors.

## Edit Mode vs Preview Mode

**Edit mode** gives you full control: move entities, resize widgets, configure settings, draw pipelines, and use all tools. This is the builder view.

**Preview mode** locks the layout and makes widgets fully interactive. This is the viewer experience — what your audience sees when they visit a shared or published canvas. In preview mode, clicking passes through to widgets instead of selecting them.

Toggle with the mode switch in the toolbar or press `P`. The mode is never saved — it's determined by your role and context each time you open the canvas.

## Undo and Redo

`Cmd/Ctrl+Z` undoes the last action. `Cmd/Ctrl+Shift+Z` redoes. The history tracks entity movements, additions, deletions, and configuration changes.

## What's Next?

- [Working with widgets](widgets.md) — Install and configure interactive widgets
- [Stickers and assets](stickers-assets.md) — Upload and manage visual assets
- [Pipelines](pipelines.md) — Connect widgets together
- [Keyboard shortcuts](keyboard-shortcuts.md) — Full shortcut reference
