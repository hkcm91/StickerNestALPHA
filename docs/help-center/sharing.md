# Sharing and Permissions

StickerNest gives you fine-grained control over who can access your canvases and what they can do.

## Sharing a Canvas

Click the **Share** button in the top bar to open the sharing panel. You have three ways to share:

**Invite by email** — enter an email address and choose a role. The recipient gets an invite link. They must sign in (or create an account) to access the canvas.

**Copy link** — generate a shareable URL. Anyone with the link can access the canvas at the role you specify. You can reset the link at any time to revoke access.

**Publish** — make the canvas publicly accessible at a custom slug URL (e.g., `stickernest.com/s/my-project`). Published canvases open in preview mode for all visitors.

## Roles

There are four roles, from most to least access:

**Owner** — full control over the canvas. Can edit content, manage sharing settings, delete the canvas, and transfer ownership. Only one owner per canvas.

**Editor** — can add, move, delete, and configure all entities and widgets. Can use all tools and switch between edit and preview modes. Cannot manage sharing or delete the canvas.

**Commenter** — can view the canvas and leave annotations, but cannot move, add, or delete entities. Can interact with widgets in preview mode.

**Viewer** — read-only access. Can view the canvas in preview mode and interact with widgets, but cannot make any changes or leave comments.

## What Each Role Can Do

| Action | Owner | Editor | Commenter | Viewer |
|--------|-------|--------|-----------|--------|
| View canvas | Yes | Yes | Yes | Yes |
| Interact with widgets (preview) | Yes | Yes | Yes | Yes |
| Leave comments/annotations | Yes | Yes | Yes | No |
| Add/move/delete entities | Yes | Yes | No | No |
| Configure widgets | Yes | Yes | No | No |
| Create/edit pipelines | Yes | Yes | No | No |
| Manage sharing settings | Yes | No | No | No |
| Delete canvas | Yes | No | No | No |

## DataSource Permissions

DataSources (documents, tables, notes, etc. that widgets use) have their own independent permission system. A user might be a canvas Viewer but a DataSource Editor — both are respected separately.

DataSource roles are: Owner (full control including deletion), Editor (read/write), Commenter (annotate only), and Viewer (read only).

## Guest Access

Guests — users who aren't signed in — can view published canvases in preview mode. They appear in the presence list as "Guest" with a randomly assigned color. Guests cannot edit or comment.

## Embedding

You can embed a canvas in another website using an iframe. The embedded view always opens in preview mode. Use the embed URL from the Share panel.

## What's Next?

- [Real-time collaboration](collaboration.md) — Live cursors and co-editing
- [Canvas basics](canvas-basics.md) — Navigation and tools
- [Account and billing](account-billing.md) — Plans and payment
