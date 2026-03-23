# Cross-Canvas Multiplayer Games Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a suite of multiplayer game widgets (Tic-Tac-Toe, Connect Four, Battleship, Pong) that play across canvases via the cross-canvas event bus.

**Architecture:** Each game is a self-contained single-file HTML widget in `built-in-html.ts`. Games embed a shared ~50-line lobby/sync protocol inline. Players create/join rooms via a `game.lobby` channel, then exchange moves on `game.{roomId}.move`. Turn-based games enforce turns client-side; real-time games (Pong) sync at 30fps.

**Tech Stack:** Single-file HTML widgets, cross-canvas router (`emitCrossCanvas`/`subscribeCrossCanvas`), BroadcastChannel + Supabase Realtime transport.

---

## Reference Files

| File | Purpose |
|------|---------|
| `src/runtime/widgets/built-in-html.ts` | Add game widget HTML strings here (after `wgt-ai-agent`) |
| `src/shell/router/pages.tsx:61-80` | Add widget ID → HTML key mappings to `BUILT_IN_WIDGET_HTML_KEY_BY_WIDGET_ID` |
| `src/shell/canvas/seedDemoEntities.ts` | Add game widget entities to demo + claude-lab canvases |
| `src/runtime/cross-canvas/cross-canvas-router.ts` | Cross-canvas router (already working) |
| `src/runtime/sdk/sdk-template.ts` | SDK API reference (`emitCrossCanvas`, `subscribeCrossCanvas`) |

## Shared Game Protocol (embedded in each widget)

Every game widget embeds this protocol inline (~50 lines). Copy it verbatim into each game widget's `<script>` block:

```javascript
// ── Game Protocol ─────────────────────────────────────────
var LOBBY_CH = 'game.lobby';
var myPlayerId = '';
var myName = 'Player';
var roomId = null;
var isHost = false;
var opponentName = '';
var gameActive = false;

function generateRoomId() {
  return 'r-' + Math.random().toString(36).slice(2, 8);
}

function lobbyEmit(payload) {
  StickerNest.emitCrossCanvas(LOBBY_CH, payload);
}

function gameEmit(payload) {
  if (!roomId) return;
  StickerNest.emitCrossCanvas('game.' + roomId + '.move', payload);
}

function createRoom(gameId) {
  roomId = generateRoomId();
  isHost = true;
  lobbyEmit({ type: 'room.created', roomId: roomId, gameId: gameId, hostName: myName, hostId: myPlayerId });
}

function joinRoom(rid, guestName) {
  roomId = rid;
  isHost = false;
  lobbyEmit({ type: 'room.joined', roomId: rid, playerName: guestName, playerId: myPlayerId });
}

function handleLobbyMessage(payload) {
  if (payload.type === 'room.joined' && payload.roomId === roomId && isHost) {
    opponentName = payload.playerName;
    startGame();
  }
  if (payload.type === 'room.created' && !roomId) {
    showJoinOption(payload);
  }
}
// Game-specific: startGame(), showJoinOption(), handleMove() defined per widget
// ── End Game Protocol ─────────────────────────────────────
```

---

## Task 1: Tic-Tac-Toe Widget

**Files:**
- Modify: `src/runtime/widgets/built-in-html.ts` (append `'wgt-tictactoe'` entry)
- Modify: `src/shell/router/pages.tsx:61-80` (add mapping)
- Modify: `src/shell/canvas/seedDemoEntities.ts` (add entities to demo + claude-lab)

### Step 1: Write the widget HTML

Add to `BUILT_IN_WIDGET_HTML` in `src/runtime/widgets/built-in-html.ts` after the `wgt-ai-agent` entry:

Key: `'wgt-tictactoe'`

Widget structure:
- **Lobby screen:** "Create Room" button + list of available rooms to join
- **Game screen:** 3x3 grid, current turn indicator, player names
- **Result screen:** Winner/draw announcement, "Play Again" button

Game logic:
- Board: `Array(9).fill(null)` — values `'X'`, `'O'`, or `null`
- Host is X (goes first), guest is O
- On click: if it's your turn and cell is empty, place mark, emit move, check win
- Win check: 8 winning lines (3 rows, 3 cols, 2 diagonals)
- Move payload: `{ type: 'move', cell: 0-8, mark: 'X'|'O', turn: number }`

Cross-canvas channels:
- `StickerNest.subscribeCrossCanvas('game.lobby', handleLobbyMessage)` — lobby
- `StickerNest.subscribeCrossCanvas('game.' + roomId + '.move', handleMove)` — game moves

Manifest:
```javascript
StickerNest.register({
  id: 'tictactoe-v1', name: 'Tic-Tac-Toe', version: '1.0.0',
  permissions: ['cross-canvas'],
  events: { emits: ['game.lobby', 'game.move'], receives: ['game.lobby', 'game.move'] }
});
```

### Step 2: Add widget ID mapping

In `src/shell/router/pages.tsx`, add to `BUILT_IN_WIDGET_HTML_KEY_BY_WIDGET_ID`:
```javascript
'tictactoe-v1': 'wgt-tictactoe',
```

### Step 3: Add seed entities

In `src/shell/canvas/seedDemoEntities.ts`:

Add constants:
```javascript
const DEMO_TTT_ID = 'ddd00000-0000-4000-a000-000000000009';
const DEMO_TTT_INST = 'ddd00000-0000-4000-a000-100000000003';
const CLAUDE_TTT_ID = 'ccc00000-0000-4000-a000-000000000004';
const CLAUDE_TTT_INST = 'ccc00000-0000-4000-a000-100000000003';
```

Add widget entity to `seedDemoEntities()` array and `seedClaudeLabCanvas()` array. Use same pattern as the live-chat entities (position offset to avoid overlap, e.g., x: 900, y: 80).

### Step 4: Clear localStorage and test

```bash
# In browser console on both tabs:
localStorage.removeItem('sn:canvas:demo');
localStorage.removeItem('sn:canvas:claude-lab');
location.reload();
```

Test flow:
1. Open `/canvas/demo` in Tab A, `/canvas/claude-lab` in Tab B
2. Tab A: click "Create Room" in Tic-Tac-Toe widget
3. Tab B: see the room appear, click "Join"
4. Play a full game, verify moves sync and win is detected

### Step 5: Commit

```bash
git add src/runtime/widgets/built-in-html.ts src/shell/router/pages.tsx src/shell/canvas/seedDemoEntities.ts
git commit -m "feat(runtime): add Tic-Tac-Toe cross-canvas multiplayer widget"
```

---

## Task 2: Connect Four Widget

**Files:** Same as Task 1 (append to same files).

### Step 1: Write the widget HTML

Key: `'wgt-connect4'`

Widget structure:
- **Lobby screen:** same pattern as TTT
- **Game screen:** 7 columns x 6 rows grid, column hover highlights, drop animation
- **Result screen:** winner highlight, play again

Game logic:
- Board: `Array(6).fill(null).map(() => Array(7).fill(null))` — 6 rows, 7 cols
- Click column to drop piece — finds lowest empty row in that column
- Win check: scan all 4-in-a-row patterns (horizontal, vertical, both diagonals)
- Move payload: `{ type: 'move', col: 0-6, row: computed, mark: 'R'|'Y', turn: number }`

### Step 2: Add mapping, seed entities, test, commit

Same pattern as Task 1. Constants:
```javascript
const DEMO_C4_ID = 'ddd00000-0000-4000-a000-00000000000a';
const DEMO_C4_INST = 'ddd00000-0000-4000-a000-100000000004';
const CLAUDE_C4_ID = 'ccc00000-0000-4000-a000-000000000005';
const CLAUDE_C4_INST = 'ccc00000-0000-4000-a000-100000000004';
```

Commit: `feat(runtime): add Connect Four cross-canvas multiplayer widget`

---

## Task 3: Battleship Widget

**Files:** Same pattern.

### Step 1: Write the widget HTML

Key: `'wgt-battleship'`

Widget structure:
- **Lobby screen:** same pattern
- **Setup screen:** drag ships onto 10x10 grid, "Ready" button
- **Game screen:** two grids side by side — your ships (left) + attack board (right)
- **Result screen:** winner, show opponent's ship positions

Game logic:
- Ships: Carrier(5), Battleship(4), Cruiser(3), Submarine(3), Destroyer(2)
- Setup: click grid to place ships (horizontal, click again to rotate)
- Both players emit `{ type: 'ready' }` when setup is complete
- Attack: click cell on attack board → emit `{ type: 'attack', x, y }`
- Opponent receives attack → responds with `{ type: 'result', x, y, hit: bool, sunk: shipName|null }`
- **Private state:** ship positions are NEVER sent to opponent. Only hit/miss results cross the wire.
- Win: all opponent ships sunk

### Step 2: Add mapping, seed entities, test, commit

Constants:
```javascript
const DEMO_BS_ID = 'ddd00000-0000-4000-a000-00000000000b';
const DEMO_BS_INST = 'ddd00000-0000-4000-a000-100000000005';
const CLAUDE_BS_ID = 'ccc00000-0000-4000-a000-000000000006';
const CLAUDE_BS_INST = 'ccc00000-0000-4000-a000-100000000005';
```

Larger widget size: `width: 500, height: 500` (two grids side by side).

Commit: `feat(runtime): add Battleship cross-canvas multiplayer widget`

---

## Task 4: Pong Widget

**Files:** Same pattern.

### Step 1: Write the widget HTML

Key: `'wgt-pong'`

Widget structure:
- **Lobby screen:** same pattern
- **Game screen:** canvas element with ball, two paddles, score
- **Result screen:** final score, play again

Game logic:
- Uses `<canvas>` element for rendering (requestAnimationFrame loop)
- Host computes ball physics: position, velocity, collisions with walls/paddles
- Host broadcasts ball state at 30fps: `{ type: 'ball', x, y, vx, vy }`
- Each player broadcasts paddle position on mousemove (throttled 30fps): `{ type: 'paddle', y, playerId }`
- Score: ball passes left/right edge → point for opposite player
- Win: first to 5 points
- Move payload uses `emitCrossCanvas` at 30fps — validates the high-frequency cross-canvas path

### Step 2: Add mapping, seed entities, test, commit

Constants:
```javascript
const DEMO_PONG_ID = 'ddd00000-0000-4000-a000-00000000000c';
const DEMO_PONG_INST = 'ddd00000-0000-4000-a000-100000000006';
const CLAUDE_PONG_ID = 'ccc00000-0000-4000-a000-000000000007';
const CLAUDE_PONG_INST = 'ccc00000-0000-4000-a000-100000000006';
```

Commit: `feat(runtime): add Pong cross-canvas multiplayer widget`

---

## Verification

After all 4 games:

1. Clear localStorage for both canvases
2. Open `/canvas/demo` in Tab A, `/canvas/claude-lab` in Tab B
3. For each game:
   - Tab A creates room, Tab B joins
   - Play a full game to completion
   - Verify win/draw detection works on both sides
   - Verify "Play Again" resets correctly
4. Check console for `[CrossCanvas]` logs — no errors or permission warnings
5. Run `npx vitest run src/runtime/cross-canvas/` — all tests still pass
