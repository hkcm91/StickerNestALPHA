# Canvas Edit / Preview Mode

**Addendum to:** v5 master build plan.pdf — Layer 4A: Canvas Editor
**Status:** Confirmed spec addition

---

## Overview

The canvas editor operates in one of two interaction modes: **Edit** or **Preview**. These are distinct from Canvas View Modes (Scene vs Desktop) — they can apply to either view. They are also distinct from collaboration roles (Owner/Editor/Commenter/Viewer), though roles do constrain which mode a user can access.

---

## Edit Mode

The default mode when a canvas owner or editor opens their canvas in the canvas editor.

**What users can do:**
- Move, resize, rotate, and reposition all entities and widget containers
- Place new stickers and entities on the canvas
- Attach/detach widgets and scripts from stickers
- Configure widget instances (open config panels)
- Wire pipelines in the connection graph
- Access panels (Docker, Web Preview, Canvas Preview, Terminal)
- Use all keyboard shortcuts and editing tools
- Interact with widgets normally (click, type, use widget controls)

**Triggered by:**
- Opening a canvas in the canvas editor while authenticated as Owner or Editor role

---

## Preview Mode

A read-only-layout experience where widgets are fully interactive but nothing on the canvas can be repositioned or reconfigured.

**What users can do:**
- Interact with any widget fully (click buttons, type in inputs, use all widget controls)
- Pan and zoom the canvas
- See presence cursors of other users

**What users cannot do:**
- Move, resize, or rotate any entity or widget container
- Place new entities
- Open config panels or change widget settings
- Access the pipeline graph or terminal
- Use edit-mode keyboard shortcuts (V, H, T, S, etc.)

**Triggered by:**
- **Fullscreen mode** — when the user toggles fullscreen on a canvas they own/edit (collapses editor chrome, enters preview)
- **Slug URL** — any visitor loading a canvas via its public slug (`stickernest.app/u/{username}/{slug}`) enters preview mode by default
- **Embed URL** — `?embed=true` always forces preview mode (already specified in embed spec)
- **Viewer/Commenter role** — users with these roles always land in preview mode

---

## Mode Indicator & Toggle

- A persistent mode indicator in the canvas toolbar shows the current mode (e.g. `Edit` / `Preview` badge)
- Owners and Editors can toggle between modes from the toolbar without leaving the canvas
- Switching to Preview hides the editor chrome (toolbar, sidebar, panel controls) to show the clean canvas surface
- Switching back to Edit restores the full editor chrome
- Mode preference is **not** persisted — always opens in Edit for owners/editors, always opens in Preview for slug/embed/lower-role visitors

---

## Relationship to Existing Specs

| Concept | Interaction in Edit | Interaction in Preview |
|---|---|---|
| Sticker click | Opens config panel (set widgetId, label, size) | Launches associated widget / runs action |
| Widget container | Draggable, resizable frame | Fixed position; widget content fully interactive |
| Pipeline graph | Visible and editable | Hidden |
| Terminal panel | Available | Hidden |
| AI Command Bar (`/`) | Available | Available (widget control commands only, no canvas mutations) |
| Keyboard shortcuts | Full shortcut map active | Pan/zoom only |

**Note:** The AI Command Bar remains available in Preview mode because it can control widgets via event bus commands. Canvas-mutating commands (move entity, place sticker, etc.) are rejected with a clear message when the user is in Preview mode or lacks edit permission.

---

## Implementation Notes (Layer 4A)

- `uiStore` gains a `canvasInteractionMode: 'edit' | 'preview'` field
- Canvas input system checks `canvasInteractionMode` before handling drag/resize/transform events on entities
- Edit chrome (toolbar, sidebar, pipeline overlay, panel controls) is conditionally rendered based on mode
- Widget containers in preview mode suppress their selection handles and resize grips — widget iframe content is unaffected
- Slug-based route (`/u/{username}/{slug}`) sets mode to `preview` on load before any canvas state hydration
- Fullscreen API toggle switches `canvasInteractionMode` to `preview` and hides editor chrome
- The mode toggle button is only rendered for users with Owner or Editor role
