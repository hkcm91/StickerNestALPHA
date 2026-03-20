# Lab Creator Mode — UI Overhaul for Non-Technical Users

**Date**: 2026-03-20
**Status**: Proposed
**Scope**: `src/lab/components/`, `src/lab/hooks/`, `src/lab/ai/`

---

## Problem

The current Lab layout is a developer IDE: code editor on the left (60%), preview
squeezed into the right (40%), inspector below it, and manifest/versions/publish
in a bottom drawer. This layout says "you are writing code" — not "you are creating
something magical."

Non-technical creators (the primary audience for Creator Mode) face:

1. **Code-first intimidation** — the editor is the largest panel and the default view.
   A creator who wants to build visually must manually switch to the Graph tab.
2. **Preview is secondary** — the live widget occupies 40% of a 55% split, meaning
   the thing the creator is actually building gets about 22% of screen real estate.
3. **No onboarding** — the Lab opens cold with an empty editor, no prompt, no templates.
   Canva's core insight: never start with a blank canvas.
4. **AI is a floating chatbot** — the AI Companion sits in the corner as a chat bubble.
   Google Stitch's insight: the canvas IS the prompt surface. AI should be woven into
   the primary workflow, not a sidebar conversation.
5. **Graph lacks creative affordance** — nodes are functional but clinical. No card
   previews, no connection animations, no celebratory feedback. Scratch's insight:
   visual programming should feel like snapping puzzle pieces, not wiring a circuit board.

## Research Context

Analysis of Google Stitch (March 2026 redesign), Canva, tldraw, Scratch, Webflow,
and Framer Motion reveals consistent patterns across successful creative tools:

- **The preview IS the workspace** — you always look at the thing you're making
- **Template-first** — never start blank (Canva)
- **Progressive disclosure** — simple surface, power underneath (Webflow)
- **Physics-based micro-interactions** — spring animations, celebratory moments (Framer)
- **Event-driven visual programming** — blocks shaped so you can't make syntax errors (Scratch)
- **Canvas-as-prompt-surface** — bring anything onto the canvas as AI context (Stitch)
- **Voice interaction** — speak to your canvas, not type into a prompt (Stitch)

## Solution: Creator Mode Layout Overhaul

### Phase 1 — Creator Mode Layout + Onboarding

**New layout structure:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Toolbar: [Graph | Code] | [Preview size: phone/tablet/desktop] |  │
│           [Play ▶] [Share] [Publish]                AI prompt bar  │
├────────────────┬────────────────────────────────────────────────────┤
│                │                                                    │
│   Graph /      │              LIVE PREVIEW                         │
│   Code         │              (PRIMARY — 65%)                      │
│   (35%)        │                                                   │
│                │         ┌──────────────────┐                      │
│   Collapsible  │         │   Widget runs    │                      │
│   to 0%        │         │   here, inside   │                      │
│                │         │   device frame   │                      │
│                │         └──────────────────┘                      │
│                │                                                    │
├────────────────┴────────────────────────────────────────────────────┤
│  Bottom tray (collapsed by default): Inspector | Manifest | Publish│
└─────────────────────────────────────────────────────────────────────┘
```

Key changes:
- **Preview is primary** — 65% default, can expand to 100% with graph collapsed
- **Graph is the default secondary** — not the code editor. Code is power-user mode.
- **AI prompt bar in toolbar** — not a floating chatbot. One-line natural language input
  always visible. Full AI thread accessible via expand.
- **Device frame preview** — widget renders inside a phone/tablet/desktop frame mockup,
  matching how end users will experience it.

**Onboarding (first-time flow):**
When the Lab opens with no active widget:
1. Full-screen overlay: "What do you want to create?"
2. Three paths presented as large cards with preview animations:
   - **Start from template** — grid of pre-built widgets (counter, weather, todo, etc.)
   - **Describe it** — large text area: "I want a widget that..." → AI generates it
   - **Build visually** — opens Graph view with a starter node already placed
3. Selecting any path immediately produces a running preview — the widget appears
   within 2 seconds of the first action.

### Phase 2 — Graph Visual Overhaul

**Card nodes instead of boxes:**
- Each node renders a mini card showing: icon, name, and a live thumbnail of the
  widget's current state (for widget nodes). Inspired by Scratch's block shapes.
- Color-coded by category (existing palette: Storm, Ember, Opal, Violet, Moss).
- Rounded corners, subtle drop shadow, glassmorphism consistent with existing GlassPanel.

**Aurora edges instead of plain lines:**
- Existing GlowEdge already has glow effects — enhance with:
  - Animated gradient flow along edges (particles moving from output to input)
  - Edge color matches the event type being carried
  - Connection animation: spring-based snap when ports connect (200ms spring)
  - Rejection animation: red pulse + gentle shake when types don't match

**Scratch-inspired connection feedback:**
- When dragging from an output port, compatible input ports "breathe" (scale pulse 1.0→1.15)
- Incompatible ports dim to 30% opacity
- On successful connection: brief confetti burst at the connection point
- On port hover: tooltip showing the event type and a one-line description

### Phase 3 — Preview-as-Primary

**Play button and device frames:**
- Large "Play ▶" button in toolbar — click to toggle preview from inline to
  expanded mode (preview fills 100% with graph collapsed to a narrow strip)
- Device frame selector: phone (375×812), tablet (768×1024), desktop (1280×800)
- QR code button: generates a QR code linking to the preview URL for testing on
  a real phone (uses the existing Runtime sandbox URL)

**Preview chrome:**
- Top bar inside preview: shows widget name + a "running" indicator (green pulse dot)
- Reload button (restart widget lifecycle)
- Console toggle (shows console.log output from the widget — feeds into inspector)
- Expand/collapse animation: spring-based morph (300ms, stiffness: 200, damping: 25)

### Phase 4 — AI Companion Upgrade

**From chatbot to co-creator:**
- **Prompt bar** always visible in toolbar — type "add a weather API call" and the AI
  modifies the widget in-place. No need to open a chat panel first.
- **Explain mode** — click any node in the graph and ask "what does this do?" → AI
  explains the node's role in context of the full pipeline.
- **Natural language wiring** — type "connect the timer output to the display input"
  → AI creates the edge in the graph.
- **Stitch-inspired context** — drag an image, screenshot, or text onto the canvas
  as context for the AI ("make it look like this").

**AI thread (expanded view):**
- Existing AICompanion thread UI is preserved but moves from floating bottom-right
  to a slide-out panel from the right edge.
- Thread maintains full conversation history for the session.
- Each AI message includes an "Apply" button that applies the code change to the
  editor/graph with a diff preview.

---

## Implementation Strategy

Four Ralph loops, each self-contained and shippable:

1. **Creator Mode Layout** — new LabLayout variant, onboarding overlay, toolbar redesign
2. **Graph Visual Overhaul** — card nodes, aurora edges, connection animations
3. **Preview-as-Primary** — device frames, play mode, QR, preview chrome
4. **AI Companion Upgrade** — prompt bar, explain mode, natural language wiring

Each loop produces working code with tests. Later loops build on earlier ones but
each is independently valuable.

---

## Files Affected

### New files
- `src/lab/components/CreatorLayout.tsx` — new layout variant
- `src/lab/components/OnboardingOverlay.tsx` — first-time experience
- `src/lab/components/DeviceFrame.tsx` — phone/tablet/desktop frame wrapper
- `src/lab/components/PreviewChrome.tsx` — preview top bar with controls
- `src/lab/components/PromptBar.tsx` — inline AI prompt in toolbar
- `src/lab/components/LabGraph/CardNode.tsx` — card-style graph nodes
- `src/lab/components/LabGraph/AuroraEdge.tsx` — animated gradient edges
- `src/lab/components/LabGraph/ConnectionFeedback.tsx` — port breathing/confetti
- `src/lab/hooks/useCreatorMode.ts` — state management for creator mode
- `src/lab/hooks/useDeviceFrame.ts` — device frame size state

### Modified files
- `src/lab/components/LabPage.tsx` — integrate CreatorLayout, onboarding, prompt bar
- `src/lab/components/LabLayout.tsx` — support new layout proportions
- `src/lab/components/LabAI/AICompanion.tsx` — slide-out panel instead of floating
- `src/lab/components/LabGraph/LabGraph.tsx` — card nodes, aurora edges
- `src/lab/components/LabGraph/NodeShell.tsx` — card node rendering
- `src/lab/components/LabGraph/GlowEdge.tsx` — aurora edge enhancement
- `src/lab/components/LabGraph/PortDot.tsx` — breathing animation on compatible ports
- `src/lab/components/LabPreview.tsx` — device frame wrapper, preview chrome
- `src/lab/hooks/useLabState.ts` — add creator mode state

---

## Layer Compliance

All changes are within `src/lab/**` (Layer 2). No new cross-layer imports needed.
Existing imports from `src/kernel/**` (L0) and `src/runtime/**` (L3) are sufficient.
AI prompt bar communicates with the existing AI generator via the same interface
used by the current AICompanion.

---

## Testing Requirements

- Onboarding overlay renders on first visit; does not render with active widget
- Template selection produces running preview within 2 seconds
- Device frame correctly constrains preview dimensions for all three sizes
- Graph card nodes render with correct color per category
- Port breathing animation activates only for type-compatible ports
- Connection confetti fires on successful edge creation, not on failure
- AI prompt bar dispatches to AI generator and applies result to editor
- Play mode expands preview to 100% and collapses graph
- Layout respects existing mobile guard (desktop-only)
- All new components have co-located test files

---

## Decision

Proposed. Pending review and Ralph loop execution.
