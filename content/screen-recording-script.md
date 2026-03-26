# StickerNest — Screen Recording Script
## "The Big Vision" Introduction

> **What this is:** A step-by-step script to follow while recording your screen.
> Record with OBS, Loom, or QuickTime. Edit in CapCut, DaVinci, or directly in TikTok.
> **Target length:** 45–60 seconds (TikTok/YouTube Short) or 2–3 minutes (full YouTube)

---

## Before You Record

### Setup Checklist

- [ ] Run `npm run dev` — make sure the app loads at `localhost:5173`
- [ ] Navigate to `/canvas/demo` — the seeded demo canvas with entities
- [ ] Verify you can see: Welcome Text, star sticker, blue shape card, heart SVG, squiggle drawing, and widgets (Live Chat, AI Agent, Tic-Tac-Toe, Connect Four)
- [ ] Set your browser to **1920x1080** or **1440x900** for clean recording
- [ ] Use **dark theme** if available — it records better and looks more polished
- [ ] Close all browser tabs except StickerNest
- [ ] Turn off system notifications
- [ ] If recording voiceover live: use a decent mic, speak close, quiet room

### Optional Polish

- [ ] Open a second browser window if you want to show multiplayer cursors
- [ ] Have the command palette (Cmd+K) ready to show
- [ ] Have the Layers panel open to show the entity list

---

## Short Version (~45-60s) — TikTok / YouTube Short

### SCENE 1: The Hook (0–3s)
**Action:** Start on the canvas, already zoomed out enough to see several entities and widgets.
**Text overlay:** "I'm building a spatial operating system"
**Voiceover (optional):** "So I'm building something called StickerNest."

### SCENE 2: The Canvas (3–12s)
**Action:** Slowly pan across the canvas. Show the infinite space — pan left, then right. Zoom in on the "Welcome to StickerNest Canvas" text, then zoom back out.
**Text overlay:** "The canvas is your desktop"
**Voiceover:** "It starts with an infinite canvas. This is your workspace — not a whiteboard, not a doc. A living desktop."

### SCENE 3: Stickers & Entities (12–22s)
**Action:** Click on the star sticker — show the selection handles. Drag it to a new position. Then click the blue shape card. Then click the heart SVG. Show how different entity types live on the same canvas.
**Text overlay:** "Stickers are your icons"
**Voiceover:** "You place stickers — they're like desktop icons. Shapes, drawings, SVGs — everything lives here spatially."

### SCENE 4: Widgets Are Apps (22–35s)
**Action:** Click into one of the widget instances (Live Chat or Tic-Tac-Toe). Interact with it — type a message or make a move. Then drag the widget to reposition it on the canvas.
**Text overlay:** "Widgets are your apps"
**Voiceover:** "Then you drop in widgets. These are real interactive programs — built with HTML, CSS, and JS — running in sandboxed iframes right on the canvas."

### SCENE 5: The Toolbar & Panels (35–42s)
**Action:** Quick flash of the toolbar at the top — show tool icons. Open the Layers panel briefly to show the entity list. Open the Properties panel to show entity config.
**Text overlay:** "Full editing environment"
**Voiceover:** "You get a full editing environment — tools, layers, properties. Like Figma meets a desktop OS."

### SCENE 6: CTA (42–50s)
**Action:** Zoom out to show the full canvas one more time. Pause.
**Text overlay:** "Following along as I build this from scratch"
**Voiceover:** "I'm a solo dev building this from scratch. Follow along."

---

## Long Version (~2-3 min) — YouTube

### INTRO (0–15s)
**Action:** Start with the browser open on the canvas gallery page, showing canvas cards.
**Voiceover:** "What if your desktop was an infinite canvas and every app was a widget you could wire together? I'm building exactly that. It's called StickerNest."
**Action:** Click into the demo canvas.

### THE CANVAS (15–40s)
**Action:** Pan and zoom around the canvas. Show how it feels infinite. Zoom way out, then zoom way in on an entity.
**Voiceover:** "This is the canvas. It's infinite — you can pan and zoom anywhere. Everything lives here spatially. Text, stickers, shapes, drawings, and interactive widgets — all on the same surface."
**Action:** Select and drag a few entities. Show multi-select with shift-click. Show the selection overlay / resize handles.

### ENTITY TYPES (40–70s)
**Action:** Click through each entity type one by one:
1. Click the **text** entity — show it says "Welcome to StickerNest Canvas"
2. Click the **star sticker** — show it's a visual asset
3. Click the **blue shape card** — show it's a shape primitive
4. Click the **heart SVG** — show it's an embedded SVG
5. Click the **squiggle drawing** — show it's a freehand pen stroke

**Voiceover:** "You've got text, stickers, shapes, SVGs, freehand drawings — and they're all first-class entities on the canvas with their own properties, z-ordering, and transform controls."
**Action:** Open the Layers panel to show all entities listed with z-order.

### WIDGETS (70–110s)
**Action:** Click into the **Tic-Tac-Toe** widget. Make a few moves.
**Voiceover:** "But the real power is widgets. These aren't static embeds — they're full interactive programs. This is a tic-tac-toe game running inside a sandboxed iframe."
**Action:** Click into the **Live Chat** widget. Type a message.
**Voiceover:** "Here's a live chat widget. Same canvas, different app. Each widget runs in its own sandbox with a typed bridge protocol — so a crashed widget never takes down the platform."
**Action:** Drag a widget to reposition it. Show it moving smoothly on the canvas.

### THE TOOLBAR & EDITING (110–140s)
**Action:** Walk through the toolbar:
1. Show tool icons (select, move, draw, shape, text)
2. Show zoom controls
3. Show the edit/preview mode toggle
4. Open the **Properties panel** — show entity properties (position, size, opacity)
5. Open the **Asset panel** if populated — show sticker/widget library
6. Open the **Command Palette** (Cmd+K) briefly

**Voiceover:** "The editing environment gives you everything you'd expect — tool modes, a properties inspector, layers panel, asset library. Plus a command palette for power users."

### THE ARCHITECTURE (140–160s)
**Action:** Can stay on canvas or show a diagram/slide. If no visual, just keep slowly panning the canvas.
**Voiceover:** "Under the hood, this is a 7-layer architecture. Kernel, social, runtime, lab, canvas, spatial, and shell. Each layer has strict import boundaries enforced by linting. The typed event bus connects everything with sub-millisecond latency. Widgets communicate through it, not through direct imports."

### THE VISION (160–180s)
**Action:** If the 3D spatial view is wired up, toggle it. If not, stay on the 2D canvas and zoom out for the final shot.
**Voiceover:** "The same canvas will run in 3D spatial view and in VR on Quest 3. Same widgets, same data, same pipelines. Build once, run on three surfaces. I'm building this solo, from scratch, and I'm sharing the whole journey. If that sounds interesting — subscribe."

### END SCREEN (180s+)
**Action:** Pause on the full canvas. Add subscribe button / end screen overlay in editing.

---

## B-Roll Shots to Capture Separately

These short clips are useful for cutaways during editing, or as standalone content:

| Shot | What to Record | Duration |
|------|---------------|----------|
| Infinite pan | Zoom way out, slow pan across empty canvas | 5s |
| Entity drag | Select entity, drag it across canvas | 3s |
| Widget interaction | Click inside Tic-Tac-Toe, make a move | 5s |
| Layers panel | Open layers panel, scroll through entities | 4s |
| Toolbar sweep | Mouse slowly across each tool icon | 3s |
| Zoom in/out | Smooth zoom from macro to micro | 4s |
| Multi-select | Shift-click multiple entities, drag as group | 5s |
| Command palette | Hit Cmd+K, type a few chars, dismiss | 3s |
| Theme toggle | Switch between light/dark if available | 3s |
| Docker container | Show a Docker container with child widgets | 5s |

---

## Recording Tips

**Mouse movement:** Move your cursor deliberately and slowly. Jerky mouse movement looks bad on screen. Pretend you're giving a live demo to someone watching over your shoulder.

**Zoom speed:** Zoom slowly. Fast zooming causes motion blur and looks hectic. Use trackpad pinch or Ctrl+scroll at a measured pace.

**Pauses:** Leave 1-2 second pauses between actions. These become natural edit points and give the viewer time to process what they're seeing.

**Resolution:** Record at 1080p minimum. 4K if your machine handles it. TikTok is 1080x1920 (vertical) — you can crop a 1920x1080 recording to vertical in editing, but if you're specifically targeting TikTok, consider recording in a narrower browser window (e.g., 900x1600).

**Audio:** If doing voiceover live, speak naturally. If doing voiceover in post, record in a quiet room with the mic close to your face. Post-recorded voiceover is usually cleaner and easier to get right.
