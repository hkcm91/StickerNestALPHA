# Working with Widgets

Widgets are interactive apps that live on your canvas. A timer, a sticky note, a data table, a game — each widget is a self-contained program that runs in a secure sandbox.

## Finding Widgets

Open the **Marketplace** from the left sidebar to browse available widgets. You can search by name, filter by category (productivity, data, social, utilities, games, media), or browse the featured section for platform-recommended picks.

Each widget listing shows its name, author, rating, install count, and whether it's free or paid.

## Installing a Widget

Click a widget in the Marketplace to see its detail page — full description, screenshots, permissions it requires, and user reviews. Click **Install** to add it to your library.

Installed widgets appear in the **Asset Panel** (left sidebar) under the Widgets tab. You can install as many as you want.

## Placing a Widget on the Canvas

Drag a widget from the Asset Panel onto your canvas. It creates a new widget instance at the drop location. You can place the same widget multiple times — each instance is independent with its own state and configuration.

## Configuring a Widget

Select a widget on the canvas and open the **Properties Panel** (right sidebar). The panel shows two sections:

**Layout properties** — position, size, and rotation. These work the same for all entities.

**Widget configuration** — settings defined by the widget creator. These vary per widget: a timer widget might have a duration setting, a weather widget might have a location field, a data table might have a data source selector. Changes apply immediately.

## Interacting with Widgets

In **edit mode**, double-click a widget to interact with it (single-click selects it for moving/resizing). In **preview mode**, single-click passes directly through to the widget — the layout is locked, so there's nothing to select.

Widgets can respond to clicks, keyboard input, and other interactions just like any web app. They run in an isolated container, so they can't access your browser data or other widgets directly.

## Widget State

Widgets save their state automatically. If you close and reopen a canvas, each widget instance picks up where it left off — a sticky note retains its text, a timer retains its settings, a game retains its progress.

Uninstalling a widget deletes its saved state for all instances. You'll see a confirmation dialog before this happens.

## Widget Permissions

Some widgets request special permissions — for example, cross-canvas communication (sending events between canvases) or external integrations (connecting to third-party services). These permissions are listed on the Marketplace detail page before you install.

Widgets run in a secure sandbox. They cannot access your browser storage, other websites, or anything outside their container unless explicitly permitted.

## Removing a Widget from the Canvas

Select the widget instance and press Delete or Backspace. This removes that instance from the canvas but keeps the widget installed in your library. You can place a new instance anytime.

## Uninstalling a Widget

To fully uninstall a widget (remove it from your library), go to the Marketplace, find the widget, and click **Uninstall**. This removes the widget from your asset panel and deletes all saved state across all canvases where you placed it. You'll be asked to confirm.

## Built-in Widgets

StickerNest includes several built-in widgets that are always available without installation:

- **Sticky Note** — a simple text note
- **Clock / Timer** — displays time or counts down
- **Counter** — a numeric counter with increment/decrement
- **Image Viewer** — displays an image with zoom and pan
- **Markdown Note** — a note with markdown formatting support

## What's Next?

- [Pipelines](pipelines.md) — Connect widgets together with visual event chains
- [Stickers and assets](stickers-assets.md) — Visual assets for your canvas
- [Sharing and permissions](sharing.md) — Collaborate with others
