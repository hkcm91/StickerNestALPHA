# Feature Highlights

Detailed feature descriptions for landing page sections, marketing pages, and promotional materials.

---

## Infinite Canvas

**Headline:** No edges. No limits.

**Body:** Your workspace is infinite. Pan, zoom, and place anything anywhere — stickers, widgets, text, shapes, media. There are no page boundaries or fixed grids. Organize your way: scattered and creative, or neat and structured. The canvas adapts to how you think.

**Key points:** Infinite 2D workspace. Pan and zoom with gestures. Place entities freely. Zoom-to-fit shows everything at once.

---

## Interactive Widgets

**Headline:** Apps that live on your canvas.

**Body:** Widgets are interactive programs that run right on your canvas. Timers, notes, data tables, games, visualizations — each one is a self-contained app you can configure, resize, and wire together. Install from the Marketplace or build your own.

**Key points:** Hundreds of widgets in the Marketplace. Secure sandbox (each widget isolated). Configure per-instance. Persistent state across sessions.

---

## Visual Pipelines

**Headline:** Wire anything to anything.

**Body:** Connect widget outputs to widget inputs with visual pipelines. A button click triggers a counter. A data update refreshes a chart. A sensor reading fires an alert. Pipelines are the nervous system of your canvas — build complex interactive flows without writing a single line of code.

**Key points:** Drag-to-connect between widget ports. Built-in transforms (filter, map, merge, delay). Automatic validation (no cycles, type checking). Invisible in preview mode for a clean viewer experience.

---

## Real-Time Collaboration

**Headline:** Build together. Right now.

**Body:** Invite your team and work on the same canvas simultaneously. See each other's cursors, co-edit documents in real time, and watch changes appear instantly. StickerNest handles conflict resolution behind the scenes — you just create.

**Key points:** Live cursors with names and colors. Instant entity sync. CRDT-powered document co-editing (no keystrokes lost). Advisory edit locks. Roles and permissions (Owner, Editor, Commenter, Viewer).

---

## Widget Lab

**Headline:** Build it. Test it. Ship it.

**Body:** The Widget Lab is a full IDE in your browser. Write widgets with the Monaco editor, preview in real time across 2D and 3D modes, inspect events as they flow, and publish to the Marketplace with a single pipeline. Generate widgets from a text prompt with AI, or compose logic visually with the node graph.

**Key points:** Monaco editor with HTML/JS/CSS support. Three preview modes (2D, 2D canvas, 3D spatial). Event inspector. AI generation. Node graph for no-code. Publish pipeline: validate → test → thumbnail → submit.

---

## Marketplace

**Headline:** An app store for your canvas.

**Body:** Browse, search, and install widgets created by the community. Every widget is validated, sandboxed, and rated by users. Publish your own creations and reach every StickerNest user. Free and paid widgets supported.

**Key points:** Search by name, category, or tags. User ratings and reviews. One-click install. Version history. License enforcement. Publisher dashboard for creators.

---

## Stickers and Assets

**Headline:** Make it yours.

**Body:** Drop in images, GIFs, videos, and SVGs to personalize your canvas. Stickers are lightweight visual assets — no code, no overhead, just vibes. Upload your own or browse the built-in gallery.

**Key points:** PNG, JPG, GIF, SVG, WebP, MP4/WebM support. Drag-and-drop upload. Gallery management with tags. Per-workspace asset library.

---

## Spatial / VR

**Headline:** Step inside your canvas.

**Body:** Put on a VR headset and walk into your workspace. Widgets float in 3D space, controlled by hand gestures and laser pointers. Everything you built in 2D works in VR — same widgets, same data, same pipelines. Built on WebXR for Quest 3 and other headsets.

**Key points:** WebXR support (Quest 3, other headsets). Ray casting selection. Grab and move entities in 3D. Same widget SDK works in 2D and 3D. Teleport and smooth locomotion.

---

## Security

**Headline:** Sandboxed by design.

**Body:** Every widget runs in an isolated iframe with strict Content Security Policy. No widget can access your browser data, other websites, or other widgets without going through the official event bus. External API calls are proxied through the platform — credentials never enter the sandbox. Media assets are served through secure proxies. Security isn't a feature — it's the architecture.

**Key points:** Strict CSP on all widget iframes. Origin validation on every message. No credentials in sandbox. Proxied media delivery. Widget crash isolation (one bad widget never takes down the canvas).
