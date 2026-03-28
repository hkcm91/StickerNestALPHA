-- StickerNest V5 Seed Data
-- Description: Sample data for local development and testing
-- Note: This seed file creates test users via auth.users and corresponding profiles

-- ============================================================================
-- IMPORTANT: This seed file is for LOCAL DEVELOPMENT ONLY
-- Do NOT run this on production databases
-- ============================================================================

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================
-- Note: In local development, Supabase Auth uses a test user system.
-- The UUIDs below are predetermined for testing purposes.

-- Create test users in auth.users (Supabase local dev only)
-- Password for all test users: 'password123'
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES
    -- Admin User: Kimber
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'woahitskimber@gmail.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Kimber Admin"}'
    ),
    -- Test User 1: Alice (Creator tier)
    (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'alice@example.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Alice Developer"}'
    ),
    -- Test User 2: Bob (Free tier)
    (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'bob@example.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Bob User"}'
    ),
    -- Test User 3: Charlie (Pro tier)
    (
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'charlie@example.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Charlie Pro"}'
    )
ON CONFLICT (id) DO NOTHING;

-- Create corresponding user profiles
INSERT INTO users (id, email, display_name, tier, metadata) VALUES
    ('00000000-0000-0000-0000-000000000000', 'woahitskimber@gmail.com', 'Kimber Admin', 'pro', '{"bio": "System Administrator"}'),
    ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'Alice Developer', 'creator', '{"bio": "Widget creator and canvas enthusiast"}'),
    ('22222222-2222-2222-2222-222222222222', 'bob@example.com', 'Bob User', 'free', '{"bio": "Just getting started"}'),
    ('33333333-3333-3333-3333-333333333333', 'charlie@example.com', 'Charlie Pro', 'pro', '{"bio": "Power user"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE CANVASES
-- ============================================================================

INSERT INTO canvases (id, owner_id, name, slug, description, is_public, default_role, settings) VALUES
    -- Alice's public demo canvas
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'Welcome to StickerNest',
        'welcome-demo',
        'A demo canvas showcasing StickerNest features',
        TRUE,
        'viewer',
        '{"gridSize": 20, "snapToGrid": true, "backgroundColor": "#f5f5f5"}'
    ),
    -- Alice's private workspace
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
        '11111111-1111-1111-1111-111111111111',
        'Alice''s Workshop',
        NULL,
        'Private development workspace',
        FALSE,
        'viewer',
        '{"gridSize": 10, "snapToGrid": false}'
    ),
    -- Bob's personal canvas
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222222',
        'Bob''s Board',
        NULL,
        'Personal organization board',
        FALSE,
        'viewer',
        '{}'
    ),
    -- Charlie's shared canvas
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '33333333-3333-3333-3333-333333333333',
        'Team Workspace',
        'team-workspace',
        'Shared team collaboration space',
        FALSE,
        'viewer',
        '{"gridSize": 25, "snapToGrid": true}'
    )
ON CONFLICT (id) DO NOTHING;

-- Add canvas members
INSERT INTO canvas_members (canvas_id, user_id, role, invited_by) VALUES
    -- Bob is an editor on Charlie's team workspace
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'editor', '33333333-3333-3333-3333-333333333333'),
    -- Alice is a viewer on Charlie's team workspace
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'viewer', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (canvas_id, user_id) DO NOTHING;

-- ============================================================================
-- SAMPLE WIDGETS
-- ============================================================================

INSERT INTO widgets (id, name, slug, description, version, author_id, html_content, manifest, category, tags, license, is_published) VALUES
    -- Sticky Note widget (built-in)
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'Sticky Note',
        'sticky-note',
        'A simple sticky note for quick notes and reminders',
        '1.0.0',
        '11111111-1111-1111-1111-111111111111',
        '<!DOCTYPE html><html><head><style>body{font-family:sans-serif;padding:16px;background:#fff9c4;min-height:100%;box-sizing:border-box;}</style></head><body><div id="content" contenteditable="true">Write your note here...</div><script>StickerNest.register({name:"Sticky Note",version:"1.0.0"});StickerNest.ready();</script></body></html>',
        '{"name": "Sticky Note", "version": "1.0.0", "inputs": [], "outputs": [], "config": {"defaultColor": {"type": "color", "default": "#fff9c4"}}}',
        'productivity',
        ARRAY['note', 'text', 'productivity'],
        'MIT',
        TRUE
    ),
    -- Counter widget (built-in)
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'Counter',
        'counter',
        'A simple counter with increment and decrement buttons',
        '1.0.0',
        '11111111-1111-1111-1111-111111111111',
        '<!DOCTYPE html><html><head><style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;margin:0;}button{padding:8px 16px;margin:4px;cursor:pointer;}</style></head><body><div id="count">0</div><div><button id="dec">-</button><button id="inc">+</button></div><script>let count=0;const el=document.getElementById("count");document.getElementById("inc").onclick=()=>{count++;el.textContent=count;StickerNest.emit("countChanged",{count})};document.getElementById("dec").onclick=()=>{count--;el.textContent=count;StickerNest.emit("countChanged",{count})};StickerNest.register({name:"Counter",version:"1.0.0",outputs:[{name:"countChanged",schema:{type:"object",properties:{count:{type:"number"}}}}]});StickerNest.ready();</script></body></html>',
        '{"name": "Counter", "version": "1.0.0", "inputs": [], "outputs": [{"name": "countChanged", "schema": {"type": "object", "properties": {"count": {"type": "number"}}}}], "config": {}}',
        'utilities',
        ARRAY['counter', 'interactive', 'utilities'],
        'MIT',
        TRUE
    ),
    -- Clock widget (built-in)
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'Clock',
        'clock',
        'A live clock displaying the current time',
        '1.0.0',
        '11111111-1111-1111-1111-111111111111',
        '<!DOCTYPE html><html><head><style>body{font-family:monospace;font-size:2em;display:flex;align-items:center;justify-content:center;height:100%;margin:0;}</style></head><body><div id="time"></div><script>function tick(){document.getElementById("time").textContent=new Date().toLocaleTimeString()}setInterval(tick,1000);tick();StickerNest.register({name:"Clock",version:"1.0.0"});StickerNest.ready();</script></body></html>',
        '{"name": "Clock", "version": "1.0.0", "inputs": [], "outputs": [], "config": {"format": {"type": "select", "options": ["12h", "24h"], "default": "12h"}}}',
        'utilities',
        ARRAY['clock', 'time', 'utilities'],
        'MIT',
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- Kanban Board widget (built-in, official marketplace listing)
INSERT INTO widgets (id, name, slug, description, version, author_id, html_content, manifest, category, tags, license, is_published, install_count, price_cents, metadata) VALUES
    (
        'abababab-abab-abab-abab-abababababab',
        'Kanban Board',
        'kanban-board',
        'Drag-and-drop Kanban board with columns, cards, color labels, and inline editing. Organize tasks across customizable columns, add color-coded labels, and drag cards between stages. Perfect for project management, sprint planning, and personal task tracking.',
        '1.0.0',
        NULL,
        '<!-- sn:inline-widget -->',
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
        'productivity',
        ARRAY['kanban', 'board', 'tasks', 'project', 'productivity', 'drag-and-drop'],
        'MIT',
        TRUE,
        0,
        0,
        '{"rendering": "inline", "builtIn": true, "official": true}'
    )
ON CONFLICT (id) DO NOTHING;

-- Todo List widget (built-in, official marketplace listing)
INSERT INTO widgets (id, name, slug, description, version, author_id, html_content, manifest, category, tags, license, is_published, install_count, price_cents, metadata) VALUES
    (
        'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd',
        'Todo List',
        'todo-list',
        'Task manager with priorities, filtering, and sorting. Add, complete, edit, and organize your tasks with color-coded priority levels.',
        '1.0.0',
        NULL,
        '<!-- sn:inline-widget -->',
        '{
            "id": "sn.builtin.todo-list",
            "name": "Todo List",
            "version": "1.0.0",
            "description": "Task manager with priorities, filtering, and sorting. Add, complete, edit, and organize your tasks with color-coded priority levels.",
            "author": {"name": "StickerNest", "url": "https://stickernest.com"},
            "category": "productivity",
            "tags": ["todo", "tasks", "productivity", "checklist", "organizer"],
            "permissions": [],
            "size": {
                "defaultWidth": 360,
                "defaultHeight": 480,
                "minWidth": 280,
                "minHeight": 300,
                "aspectLocked": false
            },
            "license": "MIT",
            "config": {"fields": []},
            "spatialSupport": false,
            "entry": "inline",
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
            }
        }',
        'productivity',
        ARRAY['todo', 'tasks', 'productivity', 'checklist', 'organizer'],
        'MIT',
        TRUE,
        0,
        0,
        '{"rendering": "inline", "builtIn": true, "official": true}'
    )
ON CONFLICT (id) DO NOTHING;

-- Green Screen Remover widget (built-in, official marketplace listing)
INSERT INTO widgets (id, name, slug, description, version, author_id, html_content, manifest, category, tags, license, is_published, install_count, price_cents, metadata) VALUES
    (
        'efefefef-efef-efef-efef-efefefefefef',
        'Green Screen Remover',
        'green-screen-remover',
        'Remove green-screen (chroma key) backgrounds from any image entity on the canvas. Select an image, adjust hue range and saturation tolerance, preview the result, then apply. Uses per-pixel HSL analysis with smooth edge falloff — no external APIs required.',
        '1.0.0',
        NULL,
        '<!-- sn:inline-widget -->',
        '{
            "id": "sn.builtin.green-screen-remover",
            "name": "Green Screen Remover",
            "version": "1.0.0",
            "description": "Remove green-screen backgrounds from any image entity on the canvas",
            "author": {"name": "StickerNest", "url": "https://stickernest.com"},
            "category": "media",
            "tags": ["chroma-key", "green-screen", "image", "background-removal", "media"],
            "permissions": ["canvas-write"],
            "size": {
                "defaultWidth": 320,
                "defaultHeight": 520,
                "minWidth": 280,
                "minHeight": 420,
                "aspectLocked": false
            },
            "license": "MIT",
            "config": {"fields": []},
            "spatialSupport": false,
            "entry": "inline",
            "crossCanvasChannels": [],
            "events": {
                "emits": [
                    {"name": "widget.green-screen-remover.ready"},
                    {"name": "widget.green-screen-remover.processing.started"},
                    {"name": "widget.green-screen-remover.processing.completed"},
                    {"name": "widget.green-screen-remover.processing.failed"}
                ],
                "subscribes": [
                    {"name": "canvas.entity.selected"},
                    {"name": "canvas.selection.cleared"}
                ]
            }
        }',
        'media',
        ARRAY['chroma-key', 'green-screen', 'image', 'background-removal', 'media'],
        'MIT',
        TRUE,
        0,
        0,
        '{"rendering": "inline", "builtIn": true, "official": true}'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- MARKETPLACE TEST WIDGETS (diverse categories for testing install flow)
-- ============================================================================

-- Pomodoro Timer widget (productivity, third-party by Alice)
INSERT INTO widgets (id, name, slug, description, version, author_id, html_content, manifest, category, tags, license, is_published, install_count, rating_average, rating_count, price_cents, metadata) VALUES
    (
        'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
        'Pomodoro Timer',
        'pomodoro-timer',
        'A focused work timer using the Pomodoro technique. Set 25-minute work sessions with 5-minute breaks. Tracks completed sessions and emits events on start, pause, and completion.',
        '1.2.0',
        '11111111-1111-1111-1111-111111111111',
        '<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:var(--sn-font-family,system-ui);background:var(--sn-bg,#1a1a2e);color:var(--sn-text,#e0e0e0);display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px}.timer{font-size:4em;font-variant-numeric:tabular-nums;letter-spacing:.05em}.label{font-size:.9em;color:var(--sn-text-muted,#999);text-transform:uppercase;letter-spacing:.15em}.controls{display:flex;gap:8px}button{padding:10px 20px;border:none;border-radius:var(--sn-radius,8px);cursor:pointer;font-size:.95em;font-weight:600;transition:opacity .15s}button:hover{opacity:.85}#startBtn{background:var(--sn-accent,#e94560);color:#fff}#resetBtn{background:var(--sn-surface,#16213e);color:var(--sn-text,#e0e0e0);border:1px solid var(--sn-border,#333)}.sessions{font-size:.85em;color:var(--sn-text-muted,#777)}</style></head><body><div class="label" id="phase">Work</div><div class="timer" id="display">25:00</div><div class="controls"><button id="startBtn">Start</button><button id="resetBtn">Reset</button></div><div class="sessions" id="sessions">Sessions: 0</div><script>let time=1500,running=false,interval,sessions=0,isWork=true;const display=document.getElementById("display"),phase=document.getElementById("phase"),sessionsEl=document.getElementById("sessions"),startBtn=document.getElementById("startBtn");function fmt(s){const m=Math.floor(s/60),sec=s%60;return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0")}function tick(){if(time<=0){running=false;clearInterval(interval);startBtn.textContent="Start";if(isWork){sessions++;sessionsEl.textContent="Sessions: "+sessions;StickerNest.emit("pomodoro.completed",{sessions});StickerNest.setState("sessions",sessions)}isWork=!isWork;time=isWork?1500:300;phase.textContent=isWork?"Work":"Break";display.textContent=fmt(time);return}time--;display.textContent=fmt(time)}document.getElementById("startBtn").onclick=()=>{if(running){running=false;clearInterval(interval);startBtn.textContent="Start";StickerNest.emit("pomodoro.paused",{remaining:time})}else{running=true;interval=setInterval(tick,1000);startBtn.textContent="Pause";StickerNest.emit("pomodoro.started",{duration:time,phase:isWork?"work":"break"})}};document.getElementById("resetBtn").onclick=()=>{running=false;clearInterval(interval);isWork=true;time=1500;phase.textContent="Work";display.textContent=fmt(time);startBtn.textContent="Start"};StickerNest.getState("sessions").then(v=>{if(v){sessions=v;sessionsEl.textContent="Sessions: "+sessions}});StickerNest.register({id:"sn.community.pomodoro-timer",name:"Pomodoro Timer",version:"1.2.0"});StickerNest.ready();</script></body></html>',
        '{
            "id": "sn.community.pomodoro-timer",
            "name": "Pomodoro Timer",
            "version": "1.2.0",
            "description": "A focused work timer using the Pomodoro technique. Set 25-minute work sessions with 5-minute breaks.",
            "author": {"name": "Alice Developer", "email": "alice@example.com"},
            "category": "productivity",
            "tags": ["timer", "pomodoro", "focus", "productivity", "time-management"],
            "permissions": ["storage"],
            "size": {
                "defaultWidth": 280,
                "defaultHeight": 260,
                "minWidth": 220,
                "minHeight": 200,
                "aspectLocked": false
            },
            "license": "MIT",
            "config": {"fields": [
                {"name": "workDuration", "type": "number", "label": "Work Duration (min)", "default": 25, "min": 1, "max": 60},
                {"name": "breakDuration", "type": "number", "label": "Break Duration (min)", "default": 5, "min": 1, "max": 30}
            ]},
            "spatialSupport": false,
            "entry": "index.html",
            "events": {
                "emits": [
                    {"name": "pomodoro.started", "description": "Fired when a work or break session starts"},
                    {"name": "pomodoro.paused", "description": "Fired when the timer is paused"},
                    {"name": "pomodoro.completed", "description": "Fired when a work session finishes"}
                ],
                "subscribes": []
            }
        }',
        'productivity',
        ARRAY['timer', 'pomodoro', 'focus', 'productivity', 'time-management'],
        'MIT',
        TRUE,
        47,
        4.5,
        12,
        0,
        '{"official": false}'
    )
ON CONFLICT (id) DO NOTHING;

-- Dice Roller widget (games, third-party by Charlie)
INSERT INTO widgets (id, name, slug, description, version, author_id, html_content, manifest, category, tags, license, is_published, install_count, rating_average, rating_count, price_cents, metadata) VALUES
    (
        'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
        'Dice Roller',
        'dice-roller',
        'Roll dice for tabletop games and decision-making. Supports D4, D6, D8, D10, D12, and D20 with animated rolls and roll history. Perfect for RPG sessions on the canvas.',
        '1.0.0',
        '33333333-3333-3333-3333-333333333333',
        '<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:var(--sn-font-family,system-ui);background:var(--sn-bg,#1b1b2f);color:var(--sn-text,#eee);display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:12px}.result{font-size:5em;font-weight:700;min-height:1.2em;transition:transform .15s}.rolling{animation:shake .3s ease-in-out}@keyframes shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-12deg) scale(1.1)}75%{transform:rotate(12deg) scale(1.1)}}.dice-select{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}button{padding:8px 14px;border:none;border-radius:var(--sn-radius,6px);cursor:pointer;font-weight:600;font-size:.85em;transition:all .15s}.dice-btn{background:var(--sn-surface,#162447);color:var(--sn-text,#eee);border:1px solid var(--sn-border,#333)}.dice-btn:hover,.dice-btn.active{background:var(--sn-accent,#e43f5a);color:#fff;border-color:transparent}.history{font-size:.75em;color:var(--sn-text-muted,#777);max-width:90%;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}</style></head><body><div class="result" id="result">🎲</div><div class="dice-select" id="dice"></div><div class="history" id="history"></div><script>const dice=[4,6,8,10,12,20];let current=6,history=[];const resultEl=document.getElementById("result"),historyEl=document.getElementById("history"),diceEl=document.getElementById("dice");dice.forEach(d=>{const b=document.createElement("button");b.className="dice-btn"+(d===current?" active":"");b.textContent="D"+d;b.onclick=()=>{current=d;document.querySelectorAll(".dice-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active")};diceEl.appendChild(b)});resultEl.onclick=roll;function roll(){const val=Math.floor(Math.random()*current)+1;resultEl.textContent=val;resultEl.classList.add("rolling");setTimeout(()=>resultEl.classList.remove("rolling"),300);history.unshift("D"+current+":"+val);if(history.length>10)history.pop();historyEl.textContent=history.join(" · ");StickerNest.emit("dice.rolled",{die:current,value:val});StickerNest.setState("history",history)}StickerNest.getState("history").then(v=>{if(v&&Array.isArray(v)){history=v;historyEl.textContent=history.join(" · ")}});StickerNest.register({id:"sn.community.dice-roller",name:"Dice Roller",version:"1.0.0"});StickerNest.ready();</script></body></html>',
        '{
            "id": "sn.community.dice-roller",
            "name": "Dice Roller",
            "version": "1.0.0",
            "description": "Roll dice for tabletop games and decision-making. Supports D4 through D20 with animated rolls and history.",
            "author": {"name": "Charlie Pro"},
            "category": "games",
            "tags": ["dice", "rpg", "tabletop", "games", "random"],
            "permissions": ["storage"],
            "size": {
                "defaultWidth": 240,
                "defaultHeight": 280,
                "minWidth": 200,
                "minHeight": 240,
                "aspectLocked": false
            },
            "license": "MIT",
            "config": {"fields": [
                {"name": "defaultDie", "type": "select", "label": "Default Die", "default": "6", "options": [
                    {"label": "D4", "value": "4"},
                    {"label": "D6", "value": "6"},
                    {"label": "D8", "value": "8"},
                    {"label": "D10", "value": "10"},
                    {"label": "D12", "value": "12"},
                    {"label": "D20", "value": "20"}
                ]}
            ]},
            "spatialSupport": false,
            "entry": "index.html",
            "events": {
                "emits": [
                    {"name": "dice.rolled", "description": "Fired on each roll with die type and value"}
                ],
                "subscribes": []
            }
        }',
        'games',
        ARRAY['dice', 'rpg', 'tabletop', 'games', 'random'],
        'MIT',
        TRUE,
        23,
        4.8,
        6,
        0,
        '{"official": false}'
    )
ON CONFLICT (id) DO NOTHING;

-- Markdown Viewer widget (data, official)
INSERT INTO widgets (id, name, slug, description, version, author_id, html_content, manifest, category, tags, license, is_published, install_count, rating_average, rating_count, price_cents, metadata) VALUES
    (
        'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
        'Markdown Viewer',
        'markdown-viewer',
        'Render Markdown content with live preview. Supports headings, lists, code blocks, links, and images. Paste or type Markdown and see it rendered in real time.',
        '1.1.0',
        NULL,
        '<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:var(--sn-font-family,system-ui);background:var(--sn-bg,#fff);color:var(--sn-text,#222);height:100vh;display:flex;flex-direction:column;overflow:hidden}.toolbar{display:flex;gap:4px;padding:6px 8px;border-bottom:1px solid var(--sn-border,#ddd);background:var(--sn-surface,#f8f8f8)}.toolbar button{padding:4px 10px;border:1px solid var(--sn-border,#ccc);border-radius:var(--sn-radius,4px);background:var(--sn-bg,#fff);color:var(--sn-text,#333);cursor:pointer;font-size:.8em}.toolbar button.active{background:var(--sn-accent,#4a90d9);color:#fff;border-color:transparent}.content{flex:1;overflow:auto;padding:12px 16px}textarea{width:100%;height:100%;border:none;outline:none;resize:none;font-family:monospace;font-size:.9em;background:transparent;color:var(--sn-text,#222)}.preview{line-height:1.6;font-size:.95em}.preview h1{font-size:1.6em;margin:.6em 0 .3em;border-bottom:1px solid var(--sn-border,#ddd);padding-bottom:.2em}.preview h2{font-size:1.3em;margin:.5em 0 .2em}.preview h3{font-size:1.1em;margin:.4em 0 .2em}.preview code{background:var(--sn-surface,#f0f0f0);padding:2px 5px;border-radius:3px;font-size:.88em}.preview pre{background:var(--sn-surface,#f0f0f0);padding:10px;border-radius:var(--sn-radius,6px);overflow-x:auto;margin:.6em 0}.preview pre code{background:none;padding:0}.preview ul,.preview ol{padding-left:1.5em;margin:.4em 0}.preview blockquote{border-left:3px solid var(--sn-accent,#4a90d9);padding-left:12px;margin:.5em 0;color:var(--sn-text-muted,#666)}.preview a{color:var(--sn-accent,#4a90d9)}</style></head><body><div class="toolbar"><button id="editBtn" class="active">Edit</button><button id="previewBtn">Preview</button></div><div class="content"><textarea id="editor" placeholder="Type Markdown here...">## Hello StickerNest!\n\nThis is a **Markdown Viewer** widget.\n\n- Supports lists\n- `code snippets`\n- [Links](https://stickernest.com)\n\n> And blockquotes too!</textarea><div id="preview" class="preview" style="display:none"></div></div><script>const editor=document.getElementById("editor"),preview=document.getElementById("preview"),editBtn=document.getElementById("editBtn"),previewBtn=document.getElementById("previewBtn");function parse(md){return md.replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>").replace(/```([\\s\\S]*?)```/g,"<pre><code>$1</code></pre>").replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\\*\\*(.+?)\\*\\*/g,"<strong>$1</strong>").replace(/\\*(.+?)\\*/g,"<em>$1</em>").replace(/^> (.+)$/gm,"<blockquote>$1</blockquote>").replace(/^- (.+)$/gm,"<li>$1</li>").replace(/(<li>.*<\\/li>)/s,"<ul>$1</ul>").replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g,''<a href="$2" target="_blank">$1</a>'').replace(/\\n/g,"<br>")}editBtn.onclick=()=>{editor.style.display="block";preview.style.display="none";editBtn.classList.add("active");previewBtn.classList.remove("active")};previewBtn.onclick=()=>{preview.innerHTML=parse(editor.value);editor.style.display="none";preview.style.display="block";previewBtn.classList.add("active");editBtn.classList.remove("active")};editor.oninput=()=>{StickerNest.setState("content",editor.value)};StickerNest.getState("content").then(v=>{if(v)editor.value=v});StickerNest.register({id:"sn.builtin.markdown-viewer",name:"Markdown Viewer",version:"1.1.0"});StickerNest.ready();</script></body></html>',
        '{
            "id": "sn.builtin.markdown-viewer",
            "name": "Markdown Viewer",
            "version": "1.1.0",
            "description": "Render Markdown content with live preview. Supports headings, lists, code blocks, links, and images.",
            "author": {"name": "StickerNest", "url": "https://stickernest.com"},
            "category": "data",
            "tags": ["markdown", "text", "editor", "preview", "documentation"],
            "permissions": ["storage"],
            "size": {
                "defaultWidth": 400,
                "defaultHeight": 350,
                "minWidth": 280,
                "minHeight": 250,
                "aspectLocked": false
            },
            "license": "MIT",
            "config": {"fields": []},
            "spatialSupport": false,
            "entry": "index.html",
            "events": {
                "emits": [],
                "subscribes": []
            }
        }',
        'data',
        ARRAY['markdown', 'text', 'editor', 'preview', 'documentation'],
        'MIT',
        TRUE,
        89,
        4.2,
        18,
        0,
        '{"official": true, "builtIn": false}'
    )
ON CONFLICT (id) DO NOTHING;

-- Color Palette Generator widget (media, third-party by Alice, paid widget)
INSERT INTO widgets (id, name, slug, description, version, author_id, html_content, manifest, category, tags, license, is_published, install_count, rating_average, rating_count, price_cents, currency, metadata) VALUES
    (
        'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
        'Color Palette Generator',
        'color-palette-generator',
        'Generate beautiful color palettes with one click. Explore harmonious, complementary, and analogous color schemes. Copy hex codes instantly and save your favorites.',
        '2.0.0',
        '11111111-1111-1111-1111-111111111111',
        '<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:var(--sn-font-family,system-ui);background:var(--sn-bg,#fff);color:var(--sn-text,#333);height:100vh;display:flex;flex-direction:column;gap:8px;padding:12px}.palette{display:flex;flex:1;gap:4px;border-radius:var(--sn-radius,8px);overflow:hidden}.swatch{flex:1;display:flex;align-items:flex-end;justify-content:center;padding:8px;cursor:pointer;transition:flex .2s;position:relative;min-height:0}.swatch:hover{flex:1.3}.swatch span{background:rgba(0,0,0,.45);color:#fff;padding:2px 8px;border-radius:4px;font-size:.75em;font-family:monospace}.controls{display:flex;gap:6px;justify-content:center}button{padding:8px 16px;border:none;border-radius:var(--sn-radius,6px);cursor:pointer;font-weight:600;font-size:.85em;transition:all .15s}#genBtn{background:var(--sn-accent,#6c5ce7);color:#fff}#genBtn:hover{opacity:.85}#modeBtn{background:var(--sn-surface,#f0f0f0);color:var(--sn-text,#333);border:1px solid var(--sn-border,#ddd)}.toast{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:6px 14px;border-radius:20px;font-size:.8em;opacity:0;transition:opacity .2s;pointer-events:none}</style></head><body><div class="palette" id="palette"></div><div class="controls"><button id="genBtn">Generate</button><button id="modeBtn">Harmony</button></div><div class="toast" id="toast">Copied!</div><script>const modes=["random","harmony","complementary","analogous"];let modeIdx=0,colors=[];const paletteEl=document.getElementById("palette"),modeBtn=document.getElementById("modeBtn"),toast=document.getElementById("toast");function hsl2hex(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l);const f=n=>{const k=(n+h/30)%12;const c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,"0")};return"#"+f(0)+f(8)+f(4)}function gen(){const m=modes[modeIdx];const base=Math.random()*360;colors=[];if(m==="random"){for(let i=0;i<5;i++)colors.push(hsl2hex(Math.random()*360,60+Math.random()*30,45+Math.random()*30))}else if(m==="harmony"){for(let i=0;i<5;i++)colors.push(hsl2hex((base+i*72)%360,70,55))}else if(m==="complementary"){colors.push(hsl2hex(base,70,40));colors.push(hsl2hex(base,60,55));colors.push(hsl2hex(base,50,70));colors.push(hsl2hex((base+180)%360,70,50));colors.push(hsl2hex((base+180)%360,50,65))}else{for(let i=0;i<5;i++)colors.push(hsl2hex((base+i*25)%360,65,50+i*5))}render();StickerNest.setState("colors",colors);StickerNest.emit("palette.generated",{colors,mode:m})}function render(){paletteEl.innerHTML="";colors.forEach(c=>{const d=document.createElement("div");d.className="swatch";d.style.background=c;d.innerHTML="<span>"+c+"</span>";d.onclick=()=>{navigator.clipboard.writeText(c).catch(()=>{});toast.style.opacity="1";setTimeout(()=>toast.style.opacity="0",1000);StickerNest.emit("palette.colorCopied",{color:c})};paletteEl.appendChild(d)})}document.getElementById("genBtn").onclick=gen;modeBtn.onclick=()=>{modeIdx=(modeIdx+1)%modes.length;modeBtn.textContent=modes[modeIdx].charAt(0).toUpperCase()+modes[modeIdx].slice(1)};StickerNest.getState("colors").then(v=>{if(v&&Array.isArray(v)&&v.length){colors=v;render()}else gen()});StickerNest.register({id:"sn.community.color-palette",name:"Color Palette Generator",version:"2.0.0"});StickerNest.ready();</script></body></html>',
        '{
            "id": "sn.community.color-palette",
            "name": "Color Palette Generator",
            "version": "2.0.0",
            "description": "Generate beautiful color palettes with one click. Explore harmonious, complementary, and analogous color schemes.",
            "author": {"name": "Alice Developer", "email": "alice@example.com"},
            "category": "media",
            "tags": ["color", "palette", "design", "art", "generator"],
            "permissions": ["storage", "clipboard"],
            "size": {
                "defaultWidth": 340,
                "defaultHeight": 300,
                "minWidth": 260,
                "minHeight": 220,
                "aspectLocked": false
            },
            "license": "MIT",
            "config": {"fields": [
                {"name": "defaultMode", "type": "select", "label": "Default Mode", "default": "random", "options": [
                    {"label": "Random", "value": "random"},
                    {"label": "Harmony", "value": "harmony"},
                    {"label": "Complementary", "value": "complementary"},
                    {"label": "Analogous", "value": "analogous"}
                ]},
                {"name": "swatchCount", "type": "number", "label": "Swatches", "default": 5, "min": 3, "max": 8}
            ]},
            "spatialSupport": false,
            "entry": "index.html",
            "events": {
                "emits": [
                    {"name": "palette.generated", "description": "Fired when a new palette is generated"},
                    {"name": "palette.colorCopied", "description": "Fired when a color hex is copied"}
                ],
                "subscribes": []
            }
        }',
        'media',
        ARRAY['color', 'palette', 'design', 'art', 'generator'],
        'MIT',
        TRUE,
        156,
        4.7,
        31,
        199,
        'usd',
        '{"official": false}'
    )
ON CONFLICT (id) DO NOTHING;

-- Gallery widget (built-in, official marketplace listing)
INSERT INTO widgets (id, name, slug, description, version, author_id, html_content, manifest, category, tags, license, is_published, install_count, price_cents, metadata) VALUES
    (
        'aa11ee00-aa11-ee00-aa11-ee00aa11ee00',
        'Gallery',
        'gallery',
        'Personal photo bucket. Drag images in from the canvas to collect them, drag thumbnails out to place them back. Per-user isolation — you only see your own photos.',
        '1.0.0',
        NULL,
        '<!-- sn:html-widget -->',
        '{
            "id": "sn.builtin.gallery",
            "name": "Gallery",
            "version": "1.0.0",
            "description": "Personal photo bucket. Drag images in from the canvas to collect them, drag thumbnails out to place them back.",
            "author": {"name": "StickerNest", "url": "https://stickernest.com"},
            "category": "productivity",
            "tags": ["gallery", "photos", "images", "collection", "bucket"],
            "permissions": ["canvas-write", "gallery"],
            "size": {
                "defaultWidth": 300,
                "defaultHeight": 400,
                "minWidth": 200,
                "minHeight": 200,
                "aspectLocked": false
            },
            "license": "MIT",
            "config": {"fields": []},
            "spatialSupport": false,
            "entry": "html",
            "events": {
                "emits": [
                    {"name": "gallery.ready", "description": "Gallery widget is ready"},
                    {"name": "gallery.image.absorbed", "description": "An image was absorbed into the gallery"},
                    {"name": "gallery.image.emitted", "description": "An image was emitted from the gallery to the canvas"},
                    {"name": "gallery.image.deleted", "description": "An image was deleted from the gallery"}
                ],
                "subscribes": [
                    {"name": "gallery.config.update", "description": "Gallery config update"},
                    {"name": "gallery.absorb.entity", "description": "Command to absorb an entity into the gallery"}
                ]
            }
        }',
        'productivity',
        ARRAY['gallery', 'photos', 'images', 'collection', 'bucket'],
        'MIT',
        TRUE,
        0,
        0,
        '{"rendering": "html", "builtIn": true, "official": true}'
    )
ON CONFLICT (id) DO NOTHING;

-- Install widgets for users
INSERT INTO user_installed_widgets (user_id, widget_id) VALUES
    ('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
    ('11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
    ('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    ('33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
    -- Kanban Board (official built-in) installed for all seed users
    ('00000000-0000-0000-0000-000000000000', 'abababab-abab-abab-abab-abababababab'),
    ('11111111-1111-1111-1111-111111111111', 'abababab-abab-abab-abab-abababababab'),
    ('22222222-2222-2222-2222-222222222222', 'abababab-abab-abab-abab-abababababab'),
    ('33333333-3333-3333-3333-333333333333', 'abababab-abab-abab-abab-abababababab'),
    -- Todo List (official built-in) installed for all seed users
    ('00000000-0000-0000-0000-000000000000', 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd'),
    ('11111111-1111-1111-1111-111111111111', 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd'),
    ('22222222-2222-2222-2222-222222222222', 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd'),
    ('33333333-3333-3333-3333-333333333333', 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd'),
    -- Pomodoro Timer: pre-installed for Alice only (others can discover in marketplace)
    ('11111111-1111-1111-1111-111111111111', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
    -- Markdown Viewer: pre-installed for Kimber and Alice (others discover via marketplace)
    ('00000000-0000-0000-0000-000000000000', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3'),
    ('11111111-1111-1111-1111-111111111111', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3'),
    -- Color Palette Generator: pre-installed for Alice (the author)
    ('11111111-1111-1111-1111-111111111111', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4'),
    -- Gallery (official built-in) installed for all seed users
    ('00000000-0000-0000-0000-000000000000', 'aa11ee00-aa11-ee00-aa11-ee00aa11ee00'),
    ('11111111-1111-1111-1111-111111111111', 'aa11ee00-aa11-ee00-aa11-ee00aa11ee00'),
    ('22222222-2222-2222-2222-222222222222', 'aa11ee00-aa11-ee00-aa11-ee00aa11ee00'),
    ('33333333-3333-3333-3333-333333333333', 'aa11ee00-aa11-ee00-aa11-ee00aa11ee00')
ON CONFLICT (user_id, widget_id) DO NOTHING;

-- ============================================================================
-- SAMPLE ENTITIES
-- ============================================================================

INSERT INTO entities (id, canvas_id, type, position_x, position_y, width, height, z_order, properties, created_by) VALUES
    -- Welcome canvas entities
    (
        '10000000-0000-0000-0000-000000000001',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'text',
        100,
        100,
        400,
        80,
        1,
        '{"text": "Welcome to StickerNest V5!", "fontSize": 32, "fontWeight": "bold"}',
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'text',
        100,
        200,
        600,
        40,
        2,
        '{"text": "The spatial operating system for creative minds", "fontSize": 18}',
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'widget_container',
        100,
        300,
        200,
        200,
        3,
        '{}',
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'widget_container',
        350,
        300,
        150,
        150,
        4,
        '{}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Shape examples
    (
        '10000000-0000-0000-0000-000000000005',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'shape',
        550,
        300,
        100,
        100,
        5,
        '{"shapeType": "rectangle", "fill": "#e3f2fd", "stroke": "#1976d2", "strokeWidth": 2}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Alice's workshop entities
    (
        '10000000-0000-0000-0000-000000000010',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
        'text',
        50,
        50,
        300,
        40,
        1,
        '{"text": "Development Notes", "fontSize": 24}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Bob's board entities
    (
        '10000000-0000-0000-0000-000000000020',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'widget_container',
        100,
        100,
        250,
        300,
        1,
        '{}',
        '22222222-2222-2222-2222-222222222222'
    )
ON CONFLICT (id) DO NOTHING;

-- Create widget instances for widget_container entities
INSERT INTO widget_instances (id, entity_id, widget_id, config, state) VALUES
    -- Sticky note on welcome canvas
    (
        '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000003',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '{"defaultColor": "#fff9c4"}',
        '{"content": "This is a sample sticky note. Try editing me!"}'
    ),
    -- Counter on welcome canvas
    (
        '20000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000004',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        '{}',
        '{"count": 42}'
    ),
    -- Sticky note on Bob's board
    (
        '20000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000020',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '{"defaultColor": "#c8e6c9"}',
        '{"content": "My personal notes"}'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE DATA SOURCES
-- ============================================================================

INSERT INTO data_sources (id, type, owner_id, scope, canvas_id, name, content, metadata) VALUES
    -- Alice's canvas-scoped doc
    (
        '30000000-0000-0000-0000-000000000001',
        'doc',
        '11111111-1111-1111-1111-111111111111',
        'canvas',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Welcome Guide',
        '{"content": "# Welcome to StickerNest\n\nThis is a collaborative canvas platform."}',
        '{}'
    ),
    -- Alice's user-scoped note
    (
        '30000000-0000-0000-0000-000000000002',
        'note',
        '11111111-1111-1111-1111-111111111111',
        'user',
        NULL,
        'Personal Ideas',
        '{"content": "Ideas for new widgets..."}',
        '{}'
    ),
    -- Shared table data source
    (
        '30000000-0000-0000-0000-000000000003',
        'table',
        '33333333-3333-3333-3333-333333333333',
        'shared',
        NULL,
        'Team Tasks',
        '{"columns": ["Task", "Assignee", "Status"], "rows": [["Design review", "Alice", "In Progress"], ["API integration", "Bob", "Done"]]}',
        '{}'
    )
ON CONFLICT (id) DO NOTHING;

-- Add ACL for shared data source
INSERT INTO data_source_acl (data_source_id, user_id, role, granted_by) VALUES
    ('30000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'editor', '33333333-3333-3333-3333-333333333333'),
    ('30000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'viewer', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (data_source_id, user_id) DO NOTHING;

-- ============================================================================
-- SAMPLE PIPELINE
-- ============================================================================

INSERT INTO pipelines (id, canvas_id, name, description, nodes, edges, created_by) VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Counter to Note Pipeline',
        'Updates a sticky note when the counter changes',
        '[
            {"id": "node-1", "type": "widget", "widgetInstanceId": "20000000-0000-0000-0000-000000000002", "position": {"x": 100, "y": 100}},
            {"id": "node-2", "type": "widget", "widgetInstanceId": "20000000-0000-0000-0000-000000000001", "position": {"x": 400, "y": 100}}
        ]'::jsonb,
        '[
            {"id": "edge-1", "source": "node-1", "sourcePort": "countChanged", "target": "node-2", "targetPort": "input"}
        ]'::jsonb,
        '11111111-1111-1111-1111-111111111111'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREATOR COMMERCE: STRIPE CONNECT ACCOUNTS
-- ============================================================================

INSERT INTO creator_accounts (user_id, stripe_connect_account_id, onboarding_complete, charges_enabled, payouts_enabled, country, default_currency) VALUES
    -- Alice is a fully onboarded creator with Stripe Connect
    (
        '11111111-1111-1111-1111-111111111111',
        'acct_test_alice_creator',
        TRUE,
        TRUE,
        TRUE,
        'US',
        'usd'
    )
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- CREATOR COMMERCE: ALICE'S ART SHOP CANVAS
-- ============================================================================

INSERT INTO canvases (id, owner_id, name, slug, description, is_public, default_role, settings) VALUES
    -- Alice's Art Shop - public shopping canvas
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Alice''s Art Shop',
        'alice-art-shop',
        'Digital art, stickers, and exclusive content from Alice',
        TRUE,
        'viewer',
        '{"gridSize": 20, "snapToGrid": true, "backgroundColor": "#fff5f5", "isShop": true}'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREATOR COMMERCE: SUBSCRIPTION TIERS
-- ============================================================================

INSERT INTO canvas_subscription_tiers (id, canvas_id, name, description, price_cents, currency, interval, benefits, canvas_role, sort_order, is_active) VALUES
    -- Free tier
    (
        '50000000-0000-0000-0000-000000000001',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'Free Supporter',
        'Follow along with my art journey — totally free!',
        0,
        'usd',
        'month',
        '["Access to community chat", "Early previews of new work", "Monthly wallpaper"]',
        'viewer',
        0,
        TRUE
    ),
    -- Paid tier - $5/month
    (
        '50000000-0000-0000-0000-000000000002',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'Art Patron',
        'Support my work and get exclusive perks!',
        500,
        'usd',
        'month',
        '["Everything in Free tier", "HD artwork downloads", "Behind-the-scenes content", "Vote on next artwork"]',
        'commenter',
        1,
        TRUE
    ),
    -- Premium tier - $15/month
    (
        '50000000-0000-0000-0000-000000000003',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'VIP Collector',
        'The ultimate supporter experience with exclusive access',
        1500,
        'usd',
        'month',
        '["Everything in Art Patron", "Monthly exclusive sticker pack", "1-on-1 art critique sessions", "Name in credits", "Early access to shop items"]',
        'editor',
        2,
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREATOR COMMERCE: SHOP ITEMS
-- ============================================================================

INSERT INTO shop_items (id, canvas_id, seller_id, name, description, item_type, fulfillment, price_cents, currency, stock_count, max_per_buyer, tags, is_active) VALUES
    -- Free starter pack
    (
        '60000000-0000-0000-0000-000000000001',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Starter Sticker Pack',
        'A free pack of 5 cute cat stickers to get you started!',
        'digital',
        'instant',
        0,
        'usd',
        NULL,
        1,
        ARRAY['free', 'stickers', 'cats', 'starter'],
        TRUE
    ),
    -- Paid digital item - $3
    (
        '60000000-0000-0000-0000-000000000002',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Kawaii Animals Bundle',
        '20 adorable kawaii animal stickers - cats, dogs, bunnies, and more!',
        'digital',
        'instant',
        300,
        'usd',
        NULL,
        3,
        ARRAY['stickers', 'kawaii', 'animals', 'bundle'],
        TRUE
    ),
    -- Paid digital item - $8
    (
        '60000000-0000-0000-0000-000000000003',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Artist Wallpaper Collection',
        'High-resolution wallpapers for desktop and mobile - 10 unique designs',
        'digital',
        'instant',
        800,
        'usd',
        100,
        NULL,
        ARRAY['wallpaper', 'hd', 'collection', 'digital-art'],
        TRUE
    ),
    -- Physical item - $25
    (
        '60000000-0000-0000-0000-000000000004',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Holographic Sticker Sheet',
        'A beautiful holographic sticker sheet with 15 unique stickers - ships worldwide!',
        'physical',
        'manual',
        2500,
        'usd',
        50,
        2,
        ARRAY['physical', 'holographic', 'stickers', 'premium'],
        TRUE
    ),
    -- Limited edition - $50
    (
        '60000000-0000-0000-0000-000000000005',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        'Signed Art Print (Limited Edition)',
        'Hand-signed 11x14 art print on premium paper - only 25 available!',
        'physical',
        'manual',
        5000,
        'usd',
        25,
        1,
        ARRAY['physical', 'signed', 'limited-edition', 'art-print'],
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREATOR COMMERCE: SAMPLE ORDERS
-- ============================================================================

INSERT INTO orders (id, buyer_id, seller_id, order_type, item_id, amount_cents, currency, platform_fee_cents, status, metadata) VALUES
    -- Bob subscribes to Free tier
    (
        '70000000-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'canvas_subscription',
        '50000000-0000-0000-0000-000000000001',
        0,
        'usd',
        0,
        'paid',
        '{"tier_name": "Free Supporter"}'
    ),
    -- Bob buys free starter pack
    (
        '70000000-0000-0000-0000-000000000002',
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'shop_item',
        '60000000-0000-0000-0000-000000000001',
        0,
        'usd',
        0,
        'fulfilled',
        '{"item_name": "Starter Sticker Pack"}'
    ),
    -- Charlie subscribes to Art Patron tier ($5)
    (
        '70000000-0000-0000-0000-000000000003',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'canvas_subscription',
        '50000000-0000-0000-0000-000000000002',
        500,
        'usd',
        60,
        'paid',
        '{"tier_name": "Art Patron", "stripe_payment_intent": "pi_test_charlie_sub"}'
    ),
    -- Charlie buys Kawaii Animals Bundle ($3)
    (
        '70000000-0000-0000-0000-000000000004',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'shop_item',
        '60000000-0000-0000-0000-000000000002',
        300,
        'usd',
        36,
        'fulfilled',
        '{"item_name": "Kawaii Animals Bundle"}'
    ),
    -- Charlie buys Holographic Sticker Sheet ($25) - shipped
    (
        '70000000-0000-0000-0000-000000000005',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'shop_item',
        '60000000-0000-0000-0000-000000000004',
        2500,
        'usd',
        300,
        'shipped',
        '{"item_name": "Holographic Sticker Sheet", "tracking_number": "1Z999AA10123456784"}'
    )
ON CONFLICT (id) DO NOTHING;

-- Create canvas subscription records for Bob and Charlie
INSERT INTO canvas_subscriptions (id, buyer_id, canvas_id, tier_id, status, current_period_end) VALUES
    -- Bob's free subscription
    (
        '80000000-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '50000000-0000-0000-0000-000000000001',
        'active',
        NOW() + INTERVAL '30 days'
    ),
    -- Charlie's paid subscription
    (
        '80000000-0000-0000-0000-000000000002',
        '33333333-3333-3333-3333-333333333333',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '50000000-0000-0000-0000-000000000002',
        'active',
        NOW() + INTERVAL '30 days'
    )
ON CONFLICT (buyer_id, canvas_id) DO NOTHING;

-- ============================================================================
-- ALICE'S ART SHOP ENTITIES
-- ============================================================================

INSERT INTO entities (id, canvas_id, type, position_x, position_y, width, height, z_order, properties, created_by) VALUES
    -- Shop welcome header
    (
        '10000000-0000-0000-0000-000000000101',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'text',
        100,
        50,
        500,
        80,
        1,
        '{"text": "🎨 Welcome to Alice''s Art Shop!", "fontSize": 36, "fontWeight": "bold", "color": "#e91e63"}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Shop description
    (
        '10000000-0000-0000-0000-000000000102',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'text',
        100,
        140,
        600,
        60,
        2,
        '{"text": "Digital stickers, wallpapers, and exclusive content for art lovers", "fontSize": 18, "color": "#666"}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Decorative shape
    (
        '10000000-0000-0000-0000-000000000103',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'shape',
        100,
        220,
        600,
        4,
        3,
        '{"shapeType": "rectangle", "fill": "#e91e63", "stroke": "none"}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Featured items section header
    (
        '10000000-0000-0000-0000-000000000104',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'text',
        100,
        260,
        300,
        40,
        4,
        '{"text": "✨ Featured Items", "fontSize": 24, "fontWeight": "bold"}',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Subscription section header
    (
        '10000000-0000-0000-0000-000000000105',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'text',
        100,
        550,
        300,
        40,
        5,
        '{"text": "💖 Support My Work", "fontSize": 24, "fontWeight": "bold"}',
        '11111111-1111-1111-1111-111111111111'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- OUTPUT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE 'Test users created:';
    RAISE NOTICE '  - alice@example.com (Creator tier) - password: password123';
    RAISE NOTICE '  - bob@example.com (Free tier) - password: password123';
    RAISE NOTICE '  - charlie@example.com (Pro tier) - password: password123';
    RAISE NOTICE '';
    RAISE NOTICE 'Commerce test data:';
    RAISE NOTICE '  - Alice''s Art Shop canvas: /canvas/alice-art-shop';
    RAISE NOTICE '  - 3 subscription tiers (Free, $5/mo, $15/mo)';
    RAISE NOTICE '  - 5 shop items (free to $50)';
    RAISE NOTICE '  - 5 sample orders from Bob and Charlie';
END $$;
