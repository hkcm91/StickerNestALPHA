# Real-Time Collaboration

StickerNest is multiplayer by default. When multiple people open the same canvas, they can see each other and work together in real time.

## Presence

When you open a canvas, your avatar appears in the top bar alongside everyone else who's currently viewing it. Each collaborator gets a unique color. Hovering over an avatar shows their name and role.

Guests appear as "Guest" with a randomly assigned color. They're full participants in the presence system — you can see their cursors and they can see yours.

When someone leaves the canvas, their avatar and cursor disappear immediately.

## Live Cursors

You can see every other user's cursor moving in real time on the canvas. Each cursor is labeled with the user's name and shown in their assigned color. This makes it easy to see where someone is working or what they're pointing at.

Cursors update at up to 30 frames per second — smooth enough to follow someone's movement without overwhelming the connection.

## Co-Editing

Multiple editors can work on the same canvas simultaneously. You can move different entities at the same time without conflicts. If two people try to move the same entity, the most recent action wins (last-write-wins) — the entity smoothly jumps to its final position with no error or interruption.

### Document Co-Editing

Document-type DataSources (used by rich text and markdown widgets) support true collaborative editing via CRDT technology. Multiple people can type in the same document simultaneously without losing anyone's keystrokes. Changes merge automatically — no conflict dialogs, no lost work.

### Table Co-Editing

Table DataSources use revision-based conflict detection. If two people edit the same row at the same time, the first save goes through normally. The second person sees a brief toast notification ("Row changed — refreshed") and their view updates to reflect the current data. They can then re-apply their edit on top of the latest version.

## Edit Locks

When someone is actively editing an entity (dragging it, typing in it, etc.), other users see a subtle colored border around that entity — indicating who's currently working on it. This is advisory, not blocking: you can still interact with the entity if you need to, but the visual hint helps avoid stepping on each other's toes.

Locks release automatically after 30 seconds of inactivity, when the user drops the entity, or when they leave the canvas.

## Offline Behavior

If your connection drops briefly (under 5 seconds), StickerNest continues working normally — no error messages. Your local edits are queued and applied when the connection returns.

If you're offline longer, remote cursors disappear (so you don't see stale positions) and your local edits are queued for sync on reconnect. Document co-editing (CRDT) handles offline edits natively — nothing is lost.

## What's Next?

- [Sharing and permissions](sharing.md) — Roles and access control
- [Canvas basics](canvas-basics.md) — Navigation and tools
