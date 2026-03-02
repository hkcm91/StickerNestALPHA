-- Add Kanban Board as the first official marketplace widget listing.
-- The Kanban widget already ships as a built-in (registered in init.ts),
-- but this migration makes it discoverable in the Marketplace.
-- Approach: Dual Registration — built-in registration is unchanged;
-- this only adds the DB listing so MarketplacePageFull can display it.

INSERT INTO widgets (
    id,
    name,
    slug,
    description,
    version,
    author_id,
    html_content,
    manifest,
    thumbnail_url,
    category,
    tags,
    license,
    is_published,
    install_count,
    price_cents,
    metadata
) VALUES (
    'abababab-abab-abab-abab-abababababab',
    'Kanban Board',
    'kanban-board',
    'Drag-and-drop Kanban board with columns, cards, color labels, and inline editing. Organize tasks across customizable columns, add color-coded labels, and drag cards between stages. Perfect for project management, sprint planning, and personal task tracking.',
    '1.0.0',
    NULL,  -- official platform widget, no individual author
    '<!-- sn:inline-widget -->',  -- sentinel: inline React widget, no iframe HTML
    '{
        "id": "sn.builtin.kanban",
        "name": "Kanban Board",
        "version": "1.0.0",
        "description": "Drag-and-drop Kanban board with columns, cards, color labels, and inline editing",
        "author": {"name": "StickerNest", "url": "https://stickernest.com"},
        "category": "productivity",
        "tags": ["kanban", "board", "tasks", "project", "productivity", "drag-and-drop"],
        "permissions": [],
        "size": {
            "defaultWidth": 640,
            "defaultHeight": 480,
            "minWidth": 400,
            "minHeight": 300,
            "aspectLocked": false
        },
        "license": "MIT",
        "config": {"fields": []},
        "spatialSupport": false,
        "entry": "inline",
        "events": {
            "emits": [
                {"name": "widget.kanban.ready"},
                {"name": "widget.kanban.card.created"},
                {"name": "widget.kanban.card.moved"},
                {"name": "widget.kanban.card.deleted"},
                {"name": "widget.kanban.card.updated"},
                {"name": "widget.kanban.column.created"},
                {"name": "widget.kanban.column.deleted"},
                {"name": "widget.kanban.board.cleared"}
            ],
            "subscribes": [
                {"name": "widget.kanban.command.add-card"},
                {"name": "widget.kanban.command.clear-board"}
            ]
        }
    }',
    NULL,
    'productivity',
    ARRAY['kanban', 'board', 'tasks', 'project', 'productivity', 'drag-and-drop'],
    'MIT',
    TRUE,
    0,
    0,  -- free widget (is_free auto-computes to TRUE)
    '{"rendering": "inline", "builtIn": true, "official": true}'
)
ON CONFLICT (id) DO NOTHING;
