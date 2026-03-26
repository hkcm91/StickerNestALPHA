# Canvas User Guide

> **Audience:** Anyone using StickerNest to create, edit, or view canvases
> **Also see:** [Getting Started](getting-started.md) for project setup

## What Is the Canvas?

The Canvas is an infinite 2D workspace where you place and arrange entities — stickers, widgets, text, shapes, and more. Think of it as a boundless whiteboard that can also run interactive programs.

You navigate the canvas by panning (click and drag the background, or use the scroll wheel) and zooming (pinch-to-zoom, scroll wheel with Ctrl/Cmd, or the zoom controls in the toolbar). The canvas uses its own coordinate system — positions are always stored in "canvas space," independent of your browser window size.

---

## Edit Mode vs Preview Mode

The canvas has two interaction modes, controlled by a toggle in the toolbar.

**Edit mode** is the full creation environment. You can select, move, resize, and delete entities, wire pipelines, and configure widgets through the Properties panel. Edit mode is available to users with the Owner or Editor role.

**Preview mode** locks the layout and lets widgets run interactively. This is what viewers and commenters see. Widgets still function — buttons work, data updates flow — but entity positions are frozen. Preview mode is also what appears on public slug URLs and embedded canvases.

The mode is never saved — it is always derived from your role and URL context when you open the canvas. Keyboard shortcut: there is a toolbar toggle to switch between modes.

---

## Entities

Everything on the canvas is an **Entity**. All entities have a position, size, and z-order (front-to-back layering). The main entity types are:

**Stickers** are visual assets — images, GIFs, or videos — placed on the canvas. They are purely decorative and never contain logic or run code. You can use stickers as icons, decorations, or visual triggers.

**Widgets** are interactive programs running in sandboxed iframes. Each widget communicates with the platform through the Widget SDK. Widgets can persist state, emit events, subscribe to events from other widgets, and connect to external services via integrations.

**Text Entities** are inline text blocks you can type directly on the canvas using the Text tool.

**Shape Entities** include rectangles, ellipses, and lines drawn with the shape tools.

**Widget Containers (Dockers)** are dockable panels that host widget instances in a tabbed interface. Dockers can float, dock to the left or right side, and be resized.

---

## Tools

Only one tool is active at a time. Select a tool from the toolbar or use keyboard shortcuts. Switching tools cancels any in-progress interaction.

### Select Tool
The default tool for interacting with entities.

- **Click an entity** to select it. All other entities are deselected (unless you hold Shift).
- **Click empty canvas** to deselect everything.
- **Drag on empty canvas** to draw a marquee selection box — all entities whose bounding boxes intersect the box are selected.
- **Shift+click** an entity to toggle it in/out of a multi-selection.
- **Delete / Backspace** deletes all selected entities.

### Move Tool
Dragging an entity moves it to a new position.

- A **4px drag threshold** distinguishes clicks from drags — small accidental movements don't trigger a move.
- **Snap to grid** aligns entities to a configurable grid (set in canvas settings). When enabled, entities snap to grid lines during drag.
- **Smart guides** appear automatically when you drag near another entity's edges or center, helping you align elements precisely.
- The entity's position is not saved until you release (drop). During drag, a visual overlay shows the entity's new position.

### Resize Tool
Resize handles appear when you select an entity — four corners and four edge midpoints.

- **Drag a corner** to resize freely.
- **Shift + drag a corner** to constrain the aspect ratio (width and height scale proportionally).
- **Alt + drag** to resize from the center instead of from the opposite corner.
- Minimum size constraints are enforced per entity type.

### Pen / Draw Tool
Freehand drawing. Click and drag to draw strokes on the canvas.

### Text Tool
Click on the canvas to place a text entity and start typing inline.

### Shape Tools
Rectangle, Ellipse, and Line. Click and drag to draw the shape at the desired position and size.

### Sticker Tool
Activated when you drag a sticker from the Asset panel. Drop it on the canvas to create a Sticker entity at that position.

### Widget Tool
Activated when you drag a widget from the Asset panel. Drop it on the canvas to create a new Widget instance.

---

## Selection

Multi-selection enables bulk operations:

- **Move** — drag any selected entity to move the entire selection.
- **Delete** — press Delete/Backspace to remove all selected entities.
- **Properties** — when multiple entities are selected, the Properties panel shows only shared properties. Values that differ across the selection show "mixed."

---

## Panels

Panels are the sidebar UI elements that appear in edit mode.

### Toolbar
The horizontal bar at the top with tool buttons, zoom controls, and the edit/preview mode toggle.

### Properties Panel
Shows the configurable properties of the currently selected entity: position, size, style, and (for widgets) the widget's config fields from its manifest. Changing a config field emits a bus event that the widget receives immediately.

### Layers Panel
A z-order list of all entities on the canvas. The top of the list is the frontmost entity.

- **Click a row** to select that entity on the canvas.
- **Drag a row** to reorder z-order (bring forward / send backward).
- **Toggle visibility** to hide an entity from rendering without deleting it.
- **Double-click the name** to rename an entity inline.

### Asset Panel
Browse and search your sticker library and installed widgets. Drag from the asset panel to the canvas to place stickers or widgets. You can also upload image, GIF, and video files here — they become sticker assets.

---

## Pipelines

Pipelines are visual event chains that connect widget outputs to widget inputs. They are the backbone of interactivity between widgets.

A Pipeline is a directed graph (no cycles allowed):

- **Nodes** represent widget instances or built-in transforms (filter, map, merge, delay, etc.).
- **Ports** are typed inputs and outputs on each node, declared in the widget's manifest.
- **Edges** connect an output port to an input port. Type compatibility is checked at connection time — incompatible types show a red indicator and refuse to connect.

To wire a pipeline: in edit mode, drag from an output port to an input port on another widget. The pipeline graph is only visible in edit mode, but pipeline event routing runs in both modes — so widgets connected by pipelines work in preview mode too.

The pipeline editor validates the graph continuously. If you create a cycle, it is rejected immediately. If a type mismatch is detected, the edge is not created.

---

## Z-Order

Entities have a stacking order (z-order) that determines which entity appears in front when they overlap. You can reorder entities using the Layers panel or through context menu actions:

- **Bring to Front** — moves the entity to the very top of the stack.
- **Send to Back** — moves the entity to the very bottom.
- **Bring Forward** — moves the entity one step up.
- **Send Backward** — moves the entity one step down.

---

## Sharing and Roles

Canvases can be shared with other users. Each user has a role that determines their permissions:

| Role | Can View | Can Comment | Can Edit | Can Manage |
|------|----------|-------------|----------|------------|
| Viewer | Yes | No | No | No |
| Commenter | Yes | Yes | No | No |
| Editor | Yes | Yes | Yes | No |
| Owner | Yes | Yes | Yes | Yes |

**Public access:** Set a canvas to public and assign a URL slug. Anyone with the link can view the canvas in preview mode with the default role (usually viewer).

**Embedding:** Public canvases can be embedded in other websites. The embedded view always uses preview mode.

Note: Canvas roles are independent of DataSource ACL roles. A user can be a canvas viewer but a DataSource editor — both are respected separately.

---

## Collaboration

When multiple users are on the same canvas, you see their cursors in real time. Each user has a randomly assigned color and their display name appears next to their cursor. Guest users appear as "Guest."

Entity edits are synchronized in real time. If two users move the same entity simultaneously, the platform uses last-write-wins resolution — the most recent position wins silently. For DataSource conflicts (table/custom types), a non-intrusive toast notifies you to refresh.

---

## Spatial / VR Mode

StickerNest supports a 3D spatial mode alongside the 2D canvas. In spatial mode, entities are rendered in a Three.js scene and can be positioned in 3D space. On compatible hardware, you can enter VR via WebXR — interacting with entities using VR controllers (ray casting, trigger to select, grip to grab).

The 2D canvas and 3D spatial views are peers — neither depends on the other. They synchronize through the event bus.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Delete / Backspace | Delete selected entities |
| Cmd/Ctrl + Z | Undo |
| Cmd/Ctrl + Shift + Z | Redo |
| Cmd/Ctrl + S | Save |
| Shift + click | Toggle multi-select |
| Shift + drag corner | Constrain aspect ratio on resize |
| Alt + drag | Resize from center |

---

## Next Steps

- [Widget Creator Guide](widget-creator.md) — Build your own widgets
- [Getting Started](getting-started.md) — Project setup and development commands
- [Zustand Stores Reference](../api/stores.md) — Deep dive into canvas, UI, and widget stores
