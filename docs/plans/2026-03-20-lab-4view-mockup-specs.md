# Lab 4-View Redesign — Mockup Specifications

**Date**: 2026-03-20
**Status**: Design reference (from user-provided HTML mockups)
**Source**: 4 complete HTML mockups provided by Kimber in conversation

---

## Design System Translation

The mockups used Material Design 3 tokens (Space Grotesk, Inter, Roboto Mono, green/blue/gold).
**Implementation will adapt layouts to the existing StickerNest design system:**

| Mockup Token | StickerNest Equivalent |
|---|---|
| `#89acff` (primary blue) | `storm` (#4E7B8E) |
| `#3fff8b` (secondary green) | `moss` (#5AA878) |
| `#ffe483` (tertiary gold) | `warning` (#D4A04C) |
| `#1a1a1a` (surface) | `surfaceGlass` (rgba(20,17,24,0.75)) |
| `Space Grotesk` (headlines) | `Newsreader` (serif, italic for labels) |
| `Inter` (body) | `var(--sn-font-family)` (system) |
| `Roboto Mono` (code) | `DM Mono` / `var(--sn-font-mono)` |
| Material card elevation | GlassPanel with bioluminescent glow |
| Sharp corners (8px) | Rounded (12-14px) with glassmorphism |

---

## Navigation Structure

All 4 views share a **left sidebar** (narrow icon rail, ~56px) with:
- Canvas icon (node graph)
- Library icon (widget marketplace)
- Pipeline icon (automation builder)
- Toy Box icon (preview/testing)
- Divider
- Settings gear at bottom

**Bottom status bar** across all views showing:
- Connection status dot
- Current project name
- Last saved timestamp
- Active users count

---

## View 1: Lab Canvas (Node Graph)

**Layout:**
```
┌──────┬──────────────────────────────────────┬──────────┐
│ Sidebar│          GRAPH CANVAS               │ Inspector│
│ (icon │  - Dot grid background (32px)       │ Panel    │
│  rail)│  - Draggable node cards             │ (280px)  │
│       │  - SVG connector lines              │          │
│       │  - Floating AI assistant pill       │          │
│       │  - Floating mini preview window     │          │
│       │                                     │          │
│       │  ┌─────────────────────┐            │          │
│       │  │ Left Hierarchy      │            │          │
│       │  │ Sidebar (240px)     │            │          │
│       │  │ - Scene tree        │            │          │
│       │  │ - Layers list       │            │          │
│       │  └─────────────────────┘            │          │
├──────┴──────────────────────────────────────┴──────────┤
│ Status bar                                              │
└─────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Full-screen graph canvas with `radial-gradient(circle, #262626 1px, transparent 1px)` dot grid at 32px
- **Node cards**: Glass panels with icon, title, type badge, input/output port dots
- **SVG connector lines**: `stroke-dasharray: 8` with flow animation (`stroke-dashoffset` keyframe)
- **Floating AI pill**: Bottom-center, pill-shaped prompt bar with expand button
- **Floating preview**: Small draggable window (320x240) showing live widget preview
- **Left hierarchy sidebar**: Collapsible panel listing scene nodes in tree structure
- **Right inspector panel**: Properties for selected node (name, type, ports, config)

**Node Card Design:**
- GlassPanel with category-colored left border (storm=data, ember=action, moss=logic, violet=UI)
- Title in body font, type in monospace badge
- Input ports on left edge, output ports on right edge
- Hover: subtle scale(1.02) + glow intensify
- Selected: storm-colored border glow

**Connector Lines:**
- Curved SVG paths between ports
- Dashed stroke with animated dash offset (flow direction)
- Color matches source port category
- Hover: line thickens + glow

---

## View 2: Widget Library & Marketplace

**Layout:**
```
┌──────┬──────────────────────────────────────────────────┐
│ Sidebar│                                                │
│       │  ┌─ Hero Header ────────────────────────────┐   │
│       │  │ "Widget Library"  [Search bar]  [Filters] │   │
│       │  └──────────────────────────────────────────┘   │
│       │                                                  │
│       │  ── My Widgets ──────────────────────────────    │
│       │  [Card] [Card] [Card] [Card] [+ Create New]     │
│       │                                                  │
│       │  ── Community Favorites (Bento Grid) ────────    │
│       │  ┌──────────┬───────┬──────────┐                │
│       │  │ Featured │ Card  │  Card    │                │
│       │  │  (large) │       │          │                │
│       │  ├──────────┤───────┴──────────┤                │
│       │  │  Card    │    Card (wide)   │                │
│       │  └──────────┴──────────────────┘                │
│       │                                                  │
│       │  ── Broadcast Channels ──────────────────────    │
│       │  [Table: channel name | subscribers | type]      │
│       │                                                  │
│       │  ── Templates ───── (horizontal scroll) ─────    │
│       │  → [Template] [Template] [Template] [Template]   │
│       │                                                  │
├──────┴──────────────────────────────────────────────────┤
│ Status bar                                               │
└──────────────────────────────────────────────────────────┘
```

**Key Elements:**
- **Hero header**: Large serif title, search input with glassmorphism, filter chips
- **My Widgets section**: Horizontal card grid, each card shows thumbnail + name + last edited
- **+ Create New card**: Dashed border, storm-colored, "Create Widget" CTA
- **Community Favorites**: Bento grid layout (CSS Grid with `grid-template-rows: masonry` or manual spans)
- **Broadcast Channels table**: GlassPanel table showing available event channels
- **Templates carousel**: Horizontal scroll with snap, template preview cards

**Widget Card Design:**
- 200x240px GlassPanel cards
- Top: thumbnail image (160x120) with rounded corners
- Bottom: widget name (bold), author, install count, star rating
- Hover: lift + glow
- Click: opens detail modal or navigates to editor

---

## View 3: Pipeline Automation Builder

**Layout:**
```
┌──────┬──────────────────────────────────────────────────┐
│ Sidebar│                                                │
│       │  ── Available Events ────────────────────────    │
│       │  [Draggable event card] [card] [card] [card]     │
│       │                                                  │
│       │  ── Pipeline Canvas ─────────────────────────    │
│       │  ┌──────────────────────────────────────────┐   │
│       │  │  [Event] ──→ [Transform] ──→ [Action]    │   │
│       │  │                                           │   │
│       │  │  [Event] ──→ [Filter] ──→ [Action]       │   │
│       │  └──────────────────────────────────────────┘   │
│       │                                                  │
│       │  ┌─ Broadcast Config ──┬─ Protocol Mapping ──┐  │
│       │  │ Channel: my-channel │ Source → Target      │  │
│       │  │ Type: broadcast     │ widget.click → log   │  │
│       │  │ Subscribers: 3      │ timer.tick → update   │  │
│       │  └────────────────────┴──────────────────────┘  │
│       │                                                  │
│       │  ┌─ AI Optimization ─────────────────────────┐  │
│       │  │ "Your pipeline has a bottleneck at..."     │  │
│       │  │ [Optimize] [Explain] [Ignore]              │  │
│       │  └───────────────────────────────────────────┘  │
│       │                                                  │
│       │  ┌─ Pipeline Health (floating) ──────────────┐  │
│       │  │ Events/sec: 142  |  Latency: 2ms  |  OK   │  │
│       │  └───────────────────────────────────────────┘  │
│       │                                                  │
├──────┴──────────────────────────────────────────────────┤
│ Status bar                                               │
└──────────────────────────────────────────────────────────┘
```

**Key Elements:**
- **Available Events palette**: Horizontal strip of draggable event type cards
- **Pipeline canvas**: Simplified graph focused on event flow (subset of Lab Canvas graph)
- **Broadcast Channel config**: GlassPanel card with channel settings
- **Protocol Mapping table**: Two-column table mapping source events to target actions
- **AI Optimization card**: Floating suggestion card with actionable buttons
- **Pipeline Health widget**: Floating status bar with throughput, latency, error rate

**Event Card Design:**
- Compact pill-shaped cards (120x48) with event icon + name
- Color-coded by category (same as node cards)
- Draggable onto pipeline canvas
- Shows port count badge

---

## View 4: The Toy Box (Preview & Testing)

**Layout:**
```
┌──────┬──────────────────────────────────────────────────┐
│ Sidebar│                                                │
│       │  ── Widget Previews (3D Perspective Grid) ───    │
│       │  ┌────────┐  ┌────────┐  ┌────────┐            │
│       │  │ Widget │  │ Widget │  │ Widget │             │
│       │  │   1    │  │   2    │  │   3    │             │
│       │  │ (live) │  │ (live) │  │ (live) │             │
│       │  └────────┘  └────────┘  └────────┘             │
│       │  (CSS perspective + rotateX for 3D effect)       │
│       │                                                  │
│       │  ── Controls ────────────────────────────────    │
│       │  [Device: Desktop v] [Theme: Dark v] [Scale: 1x] │
│       │  [Simulate Users: 1] [Latency: 0ms]             │
│       │                                                  │
│       │  ── Event Console ───────────────────────────    │
│       │  ┌──────────────────────────────────────────┐   │
│       │  │ 12:34:01 widget.mounted → Counter         │   │
│       │  │ 12:34:02 widget.state.changed count=1     │   │
│       │  │ 12:34:03 timer.tick → display.update      │   │
│       │  │ 12:34:04 user.click → counter.increment   │   │
│       │  └──────────────────────────────────────────┘   │
│       │                                                  │
├──────┴──────────────────────────────────────────────────┤
│ Status bar                                               │
└──────────────────────────────────────────────────────────┘
```

**Key Elements:**
- **3D perspective grid**: Widget preview cards rendered with CSS `perspective: 1200px` and `rotateX(5deg)` for depth
- Each preview card is a live iframe running the widget
- **Control bar**: Device size selector, theme toggle, scale, user simulation count, artificial latency
- **Event console**: Real-time scrolling log of all bus events from preview widgets
- Monospace font, color-coded by event type
- Click event row to inspect payload

**Preview Card Design:**
- GlassPanel with slight 3D tilt via CSS transforms
- Widget name label at top
- Live iframe content
- Status indicator (running/stopped/error)
- Hover: straighten tilt + scale up slightly

---

## Shared Components Across Views

### Left Sidebar (Icon Rail)
- 56px wide, full height
- GlassPanel background
- Icon buttons: 32x32, storm glow on active
- Tooltip on hover showing view name
- Active indicator: vertical storm-colored bar on left edge

### Bottom Status Bar
- 32px height, full width
- GlassPanel background (lighter opacity)
- Left: connection dot + project name
- Center: last saved timestamp
- Right: active users avatars (max 3 + overflow count)

### Floating AI Assistant Pill
- Bottom-center of canvas views
- Pill shape: 400px wide, 48px tall
- GlassPanel with ember-glow submit button
- Expand button opens full AI thread sidebar
- Used in Lab Canvas and Pipeline views
