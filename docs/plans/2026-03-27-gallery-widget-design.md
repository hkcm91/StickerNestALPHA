# Gallery Widget Design

**Date:** 2026-03-27
**Status:** Approved
**Approach:** B — SDK Widget + Bridge Messages

## Summary

A sandboxed SDK widget that acts as a personal photo bucket. Users absorb/copy
images from the canvas into their gallery (backed by Supabase storage +
`gallery_assets` table), and can emit images back out as sticker entities.
Per-user isolation — you only see your own photos.

## Interaction Model

### Absorb (canvas -> gallery)

| Method | Semantics | Entity behavior |
|---|---|---|
| Drag onto widget | Move (absorb) | Image copied to gallery, entity removed from canvas |
| Shift+drag onto widget | Copy | Image copied to gallery, entity stays on canvas |
| Context menu "Add to Gallery" | Copy | Entity stays on canvas |
| Select entities + toolbar button | Copy | Entity stays on canvas |

### Emit (gallery -> canvas)

- Drag thumbnail out of gallery widget -> creates new sticker entity on canvas
- Gallery always keeps its copy (copy semantics only)

### Delete

- Explicit delete only (trash icon on hover, confirmation dialog)
- No silent or automatic deletion

## Architecture

```
+------------------------------------------+
|  Gallery Widget (sandboxed iframe)        |
|  - Grid UI, drag/drop, thumbnails        |
|  - Uses StickerNest SDK only             |
|  - No direct Supabase access             |
+------------------+-----------------------+
                   | postMessage (bridge)
                   v
+------------------------------------------+
|  Host (WidgetFrame + bridge handlers)     |
|  - New message types:                     |
|    GALLERY_UPLOAD, GALLERY_LIST,          |
|    GALLERY_DELETE, GALLERY_GET            |
|  - Proxies to galleryStore / Supabase    |
+------------------+-----------------------+
                   |
                   v
+------------------------------------------+
|  Supabase                                 |
|  - Storage: gallery/{userId}/{file}       |
|  - DB: gallery_assets table              |
|  - RLS: owner_id = auth.uid()            |
+------------------------------------------+
```

## New Bridge Messages

| Message | Direction | Payload | Response |
|---|---|---|---|
| `GALLERY_UPLOAD` | widget -> host | `{ imageUrl, name?, sourceEntityId? }` | `{ asset: GalleryAsset }` |
| `GALLERY_LIST` | widget -> host | `{ limit?, offset? }` | `{ assets: GalleryAsset[] }` |
| `GALLERY_DELETE` | widget -> host | `{ assetId }` | `{ success: boolean }` |
| `GALLERY_GET` | widget -> host | `{ assetId }` | `{ asset: GalleryAsset }` |

Host downloads the image from `imageUrl`, uploads to Supabase storage, and
inserts the DB row. Widget never touches credentials.

### Permission Gating

New `gallery` permission in widget manifest gates access to GALLERY_* bridge
messages. Host validates permission before processing any gallery message.

## Widget Manifest

- **id:** `sn.builtin.gallery`
- **permissions:** `['canvas-write', 'gallery']`
- **events emits:** `canvas.entity.created` (emit image back to canvas)
- **events subscribes:** `canvas.entity.dropped-on-widget`, `canvas.entity.selected`
- **size:** 300x400 default, 200x200 min
- **entry:** `inline` (React component, trusted built-in)

## UI (v1)

- Scrollable thumbnail grid (CSS grid, auto-fill)
- Image count badge in header
- Hover thumbnail: shows delete icon + filename
- Drag thumbnail out to emit to canvas
- Empty state: "Drag images here to collect them"
- Loading/upload states with skeleton placeholders

## What's NOT in v1

- No tags, folders, or albums
- No search/filter
- No bulk operations
- No sharing between users

## Key Decisions

1. **Approach B over A:** SDK-only widget with bridge messages instead of direct
   store access. Makes the widget publishable to marketplace eventually. Clean
   separation of concerns.
2. **Database-backed, not widget state:** Images stored in Supabase storage +
   gallery_assets table. No 1MB setState limit applies. Full persistence.
3. **Gallery always keeps copies:** Dragging out creates a new entity; gallery
   retains its version. Only explicit delete removes from gallery.
4. **Flat collection v1:** No organizational features. Can create specialized
   gallery widgets later (tagged, album-based, etc.).
