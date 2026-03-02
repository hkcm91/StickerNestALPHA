-- Add Todo List widget to the Marketplace
-- This is a built-in inline widget that renders via React (not iframe).
-- The html_content sentinel tells the runtime to use InlineWidgetFrame.

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
  'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd',
  'Todo List',
  'todo-list',
  'Task manager with priorities, filtering, and sorting. Add, complete, edit, and organize your tasks with color-coded priority levels.',
  '1.0.0',
  NULL, -- Official platform widget, no individual author
  '<!-- sn:inline-widget -->', -- Sentinel: inline React widget, not iframe
  '{
    "id": "sn.builtin.todo-list",
    "entry": "inline",
    "version": "1.0.0",
    "permissions": [],
    "events": {
      "emits": [
        {"name": "widget.todo.ready"},
        {"name": "widget.todo.item.created"},
        {"name": "widget.todo.item.completed"},
        {"name": "widget.todo.item.uncompleted"},
        {"name": "widget.todo.item.deleted"},
        {"name": "widget.todo.item.updated"},
        {"name": "widget.todo.list.cleared"}
      ],
      "subscribes": [
        {"name": "widget.todo.command.add-item"},
        {"name": "widget.todo.command.clear-completed"}
      ]
    },
    "size": {
      "defaultWidth": 360,
      "defaultHeight": 480,
      "minWidth": 280,
      "minHeight": 300,
      "aspectLocked": false
    },
    "category": "productivity",
    "tags": ["todo", "tasks", "productivity", "checklist", "organizer"]
  }'::jsonb,
  NULL, -- Thumbnail generated later
  'productivity',
  ARRAY['todo', 'tasks', 'productivity', 'checklist', 'organizer'],
  'MIT',
  true,
  0,
  0,
  '{"rendering": "inline", "builtIn": true, "official": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
