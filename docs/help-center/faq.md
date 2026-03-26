# Frequently Asked Questions

## General

**What is StickerNest?**
A spatial platform where you build interactive spaces on an infinite canvas. Stickers are your visuals, widgets are your apps, and pipelines connect them together. Think of it as a creative operating system you can share and collaborate on in real time. [Read more](what-is-stickernest.md)

**Is StickerNest free?**
Yes — the Free tier lets you create canvases, install widgets, and collaborate with others. Paid tiers (Creator, Pro, Enterprise) unlock features like the Widget Lab, higher limits, and advanced tools. [See plans](account-billing.md)

**What browsers are supported?**
StickerNest works best on modern Chromium-based browsers (Chrome, Edge, Brave, Arc) and Firefox. Safari is supported with some limitations on WebXR features. The canvas editor requires a desktop browser — on mobile devices, you'll be redirected to a prompt suggesting desktop access.

**Can I use StickerNest on mobile?**
You can view published canvases and interact with widgets in preview mode on mobile browsers. The full editor (edit mode, Widget Lab) requires a desktop browser.

## Canvas

**How big can a canvas be?**
The canvas is infinite — there are no size boundaries. You can zoom out as far as you need and place entities anywhere.

**How many entities can I put on a canvas?**
There's no hard limit on entity count. Performance depends on your device — most modern machines handle hundreds of entities smoothly. Very large canvases (thousands of entities) may see some frame rate reduction.

**Can I undo mistakes?**
Yes. `Cmd/Ctrl+Z` undoes the last action, and `Cmd/Ctrl+Shift+Z` redoes. The undo history tracks movements, additions, deletions, and configuration changes.

**What's the difference between edit mode and preview mode?**
Edit mode is for building — you can move things, resize widgets, draw pipelines, and configure settings. Preview mode locks the layout and makes widgets fully interactive. Preview mode is what your audience sees. [Read more](canvas-basics.md)

## Widgets

**What are widgets?**
Interactive apps that run on your canvas — timers, notes, data tables, games, and more. They're built by creators and published to the Marketplace. [Read more](widgets.md)

**Are widgets safe?**
Widgets run in a secure sandbox (isolated iframe) with strict security policies. They can't access your browser data, other websites, or other widgets except through the official event system. All external data requests are proxied through the platform — no direct network access from widgets.

**Can I build my own widgets?**
Yes, with a Creator tier account or above. The Widget Lab is an in-app IDE where you write, test, and publish widgets. Widgets are single-file HTML with a JavaScript SDK. [Read more in the Widget Lab Guide](../guides/widget-lab.md)

**What happens to my data when I uninstall a widget?**
All saved state for that widget across all your canvases is deleted. You'll see a confirmation dialog before this happens. If you just want to remove a widget from a specific canvas, delete the instance instead of uninstalling.

## Collaboration

**How many people can collaborate on a canvas?**
There's no hard cap on simultaneous collaborators. Real-time features (cursors, presence) work smoothly for typical team sizes. Very large groups may experience slight cursor update delays.

**What happens if two people edit the same thing at once?**
For entity movements, the last action wins — the entity goes to wherever it was most recently placed. For document editing (text), changes merge automatically with no data loss. For table data, the second editor sees a brief "Row changed — refreshed" notification and can re-apply their edit. [Read more](collaboration.md)

**Can I share a canvas with someone who doesn't have an account?**
Published canvases are accessible to anyone with the URL — no account required. For invite-only sharing, the recipient will need to create an account to accept the invite.

## Troubleshooting

**A widget is showing an error.**
Widget errors are contained — they don't affect other widgets or the canvas. Try refreshing the page. If the error persists, the widget may have a bug — check the Marketplace for updates or contact the widget creator.

**I can't see other people's cursors.**
Check your connection. If you're offline or on a slow network, remote cursors may not appear. They'll return when the connection stabilizes. If the issue persists, try refreshing.

**My changes aren't saving.**
StickerNest auto-saves, but look for the save indicator in the top bar. If it shows an error, check your connection. Local edits are queued and will sync when connectivity returns.

**The canvas is laggy.**
Try zooming out to reduce the number of visible entities. Close widgets you're not using. On slower devices, reducing the number of simultaneous active widgets helps performance.
