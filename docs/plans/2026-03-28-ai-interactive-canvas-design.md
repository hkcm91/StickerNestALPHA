# AI-Interactive Canvas System

**Date:** 2026-03-28
**Status:** Approved
**Scope:** MCP dev server, HTTP server, canvas rendering

## Problem

The MCP dev server has rich canvas/widget manipulation tools and a full HTML renderer, but the AI can't see or interact with the output. Tools like Excalidraw MCP let AI create and modify visual content in a live browser surface. StickerNest should work the same way — AI places entities, creates widgets, and verifies the result visually.

## Design

Three layers, built in order. Each layer is independently useful and adds capability.

### Layer 1: Live Canvas Server

Extend `mcp-dev/src/http-server.ts` (port 3100) with:

**`GET /canvas`** — serves a self-contained HTML page that:
- Renders the current MCP scene graph (entities, viewport, widgets)
- Uses `renderer.ts` to generate the initial canvas HTML
- Connects to a WebSocket at `ws://localhost:3100/ws` for live updates
- Widget iframes run with the SDK stub — buttons click, timers tick, notes are editable

**WebSocket state broadcast** — when any MCP tool modifies canvas/widget/theme state, broadcast the change to all connected `/canvas` pages:
- Entity CRUD: `canvas_add_entity`, `canvas_update_entity`, `canvas_remove_entity`
- Widget HTML changes: `widget_set_html`, `widget_create_html`
- Viewport changes: `viewport_pan`, `viewport_zoom`
- Theme/UI changes: `ui_set_theme`, `ui_set_interaction_mode`
- Selection changes: `selection_select`, `selection_clear`

**State sync protocol:**
```json
{ "type": "state_update", "scope": "full" | "entity" | "viewport" | "theme" | "selection", "data": { ... } }
```

On `full`: re-render entire canvas (used on initial connect and after bulk changes).
On scoped updates: apply incremental DOM updates where possible, fall back to full re-render.

**Canvas page features:**
- Pan/zoom (mouse drag + scroll wheel)
- Entity rendering for all 12 types (sticker, text, widget, shape, drawing, group, docker, lottie, audio, svg, path, object3d)
- Interactive widget iframes with StickerNest SDK stub
- Theme token injection via CSS custom properties
- Grid overlay (optional)
- Entity selection indicators
- Entity IDs as data attributes for preview_click targeting

### Layer 2: Claude Code Preview Integration

No new code needed — this is a usage pattern. Claude Code's `preview_*` tools work with any HTTP server:

```
preview_start({ url: "http://localhost:3100/canvas" })
  → Opens the canvas page in Claude Code's preview browser

preview_screenshot()
  → AI "sees" the canvas — layout, colors, widget content

preview_click({ selector: "[data-entity-id='widget-1'] button.submit" })
  → AI clicks a button inside a widget iframe

preview_fill({ selector: "[data-entity-id='note-1'] [contenteditable]", value: "Hello" })
  → AI types into a sticky note

preview_eval({ expression: "document.querySelector('[data-entity-id=\"timer-1\"]').textContent" })
  → AI reads widget output text

preview_snapshot()
  → AI gets DOM structure for precise element targeting
```

**AI workflow for widget development:**
1. `widget_create_html` with custom HTML
2. `canvas_add_entity` to place a widget entity
3. `preview_screenshot` to see the result
4. `widget_set_html` to iterate on the code
5. WebSocket pushes update → canvas re-renders
6. `preview_screenshot` to verify
7. `marketplace_publish` when satisfied

**AI workflow for canvas design:**
1. `canvas_add_entity` to place stickers, text, shapes
2. `preview_screenshot` to review layout
3. `canvas_update_entity` to adjust positions/sizes
4. `preview_screenshot` to verify spacing/alignment
5. Repeat until the canvas looks right

### Layer 3: Chat Artifacts (claude.ai)

The existing `render_canvas` and `render_widget_preview` tools already generate self-contained HTML. For claude.ai artifact support:

- Ensure HTML output is fully self-contained (inline CSS, no external deps)
- Add `<!DOCTYPE html>` and proper meta tags
- Keep the SDK stub injection for widget interactivity
- These are read-only snapshots — useful for sharing and reviewing

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `mcp-dev/src/http-server.ts` | Modify | Add `/canvas` route, WebSocket upgrade, state broadcast |
| `mcp-dev/src/canvas-page.ts` | Create | Generates the live canvas HTML page with WebSocket client |
| `mcp-dev/src/state-broadcaster.ts` | Create | Manages WebSocket connections and broadcasts state changes |
| `mcp-dev/src/index.ts` | Modify | Hook state-changing tool handlers to broadcast updates |
| `mcp-dev/package.json` | Modify | Add `ws` dependency for WebSocket server |

## Key Reuse

- `renderer.ts` — already generates full canvas HTML with entities, widgets, themes
- `sdk-stub.ts` — already provides the widget SDK for iframes
- `widget-html.ts` — already has 6 built-in widget templates
- `artifact-tools.ts` — already has the rendering pipeline wired up
- All canvas/widget MCP tools — already exist, no new tools needed

## Implementation Order

1. **WebSocket infrastructure** — `state-broadcaster.ts` + `ws` dependency
2. **Canvas page generator** — `canvas-page.ts` using renderer.ts + WebSocket client script
3. **HTTP server routes** — `/canvas` GET + WebSocket upgrade in `http-server.ts`
4. **State broadcast hooks** — wire tool handlers in `index.ts` to broadcast changes
5. **Test with preview_* tools** — verify the AI can see/interact with the canvas

## Out of Scope (for now)

- Bidirectional sync (browser edits → MCP state). Canvas page is read-only + widget interaction.
- Multi-user cursors in the canvas page
- Persistence of canvas state across server restarts
- Mobile-optimized canvas page layout
