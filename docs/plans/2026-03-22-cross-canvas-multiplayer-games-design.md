# Cross-Canvas Multiplayer Game Suite — Design

**Date:** 2026-03-22
**Status:** Approved

## Problem

Cross-canvas communication now works (BroadcastChannel + Supabase Realtime). We want to demonstrate its power with multiplayer games where each player has a game widget on their own canvas.

## Architecture

### Game Protocol Layer

A thin protocol on top of cross-canvas events that any game widget can plug into. Handles:

- **Lobby** — player discovery, room creation/join
- **Turn management** — enforces whose turn it is
- **State sync** — move deltas + full state snapshots on join/resync
- **Result announcement** — win/draw/forfeit + rematch offer

### Cross-Canvas Channel Layout

```
game.lobby              — player presence, room create/join/leave
game.{roomId}.move      — move events (turn-enforced by sender)
game.{roomId}.state     — full state snapshots (on join, on resync)
game.{roomId}.chat      — optional in-game chat (reuses existing chat pattern)
```

Room IDs are short random strings (e.g., `r-a1b2c3`).

### Game Definition Interface

Each game registers a definition:

```ts
interface GameDefinition {
  id: string;              // e.g., 'tic-tac-toe'
  name: string;            // e.g., 'Tic-Tac-Toe'
  minPlayers: number;      // 2
  maxPlayers: number;      // 2
  turnBased: boolean;      // true for TTT, false for Pong
  initialState(): GameState;
  applyMove(state: GameState, move: GameMove, playerId: string): GameState;
  checkResult(state: GameState): GameResult | null;
}
```

The widget only needs to:
1. Register a GameDefinition
2. Render the current state
3. Emit moves when the player acts

The protocol handles everything else.

### Lobby Flow

1. Player A opens game widget → sees lobby UI with "Create Room" button
2. Player A creates room → emits `game.lobby` with `{type: 'room.created', roomId, gameId, hostName}`
3. Player B opens game widget on another canvas → sees available rooms in lobby
4. Player B joins → emits `game.lobby` with `{type: 'room.joined', roomId, playerName}`
5. Player A receives join event → game starts, both players see the board

### State Sync

- **Moves:** Each move is a delta: `{type: 'move', roomId, playerId, move: {...}, turnNumber}`
- **Snapshots:** On join or desync, the host sends full state: `{type: 'state', roomId, state: {...}}`
- **Turn enforcement:** Widget-side — only emit moves when it's your turn. Protocol doesn't hard-block but the UI disables input.

### Data Flow Example (Tic-Tac-Toe)

```
Player A (Canvas: demo)              Player B (Canvas: claude-lab)
─────────────────────                ──────────────────────────────
Create room "r-abc"
  → game.lobby {room.created}
                                     See room in lobby
                                     Join "r-abc"
  ← game.lobby {room.joined}        → game.lobby {room.joined}

Game starts (Player A = X, first turn)

Click cell (1,1)
  → game.r-abc.move {x:1,y:1,turn:1}
  → BroadcastChannel ──────────────→ receive move
                                       → render X at (1,1), enable input
                                     Click cell (0,2)
  ← BroadcastChannel ←──────────── ← game.r-abc.move {x:0,y:2,turn:2}
  render O at (0,2), enable input

... continues until win/draw ...

  → game.r-abc.move {x:2,2,turn:5}
  both detect 3-in-a-row → show result
  → game.lobby {room.finished, winner: 'A'}
```

## Game Widgets

All single-file HTML widgets with `permissions: ['cross-canvas']`.

### 1. Tic-Tac-Toe
- 3x3 grid, turn-based, X vs O
- Win: 3 in a row (horizontal, vertical, diagonal)
- Simplest game — proof of concept

### 2. Connect Four
- 7x6 grid, gravity-based drops, turn-based
- Win: 4 in a row (any direction)
- Slightly more complex state

### 3. Battleship
- Two 10x10 grids per player (own ships + attack board)
- Setup phase: place ships, then take turns attacking
- Private state: ship positions never sent to opponent, only hit/miss results
- Shows cross-canvas with hidden information

### 4. Pong
- Real-time, not turn-based
- Host player computes ball physics, broadcasts position at 30fps
- Each player controls their paddle, sends position updates
- Tests high-frequency cross-canvas events

## Implementation Notes

- All game logic lives in `src/runtime/widgets/built-in-html.ts` as built-in widget HTML strings
- The game protocol is embedded in each widget (no separate module needed — keeps it self-contained as single-file HTML)
- Common protocol functions (lobby join/create, move emit/receive) are duplicated across widgets but kept minimal (~50 lines)
- Widget manifests declare `permissions: ['cross-canvas']` and `events: { emits: ['game.*'], receives: ['game.*'] }`
- Seed entities add game widgets to demo and claude-lab canvases

## Build Order

1. **Tic-Tac-Toe** — validates the full lobby + turn + state sync + win detection flow
2. **Connect Four** — validates gravity/column-drop mechanics with same protocol
3. **Battleship** — validates private state + setup phase
4. **Pong** — validates real-time (non-turn-based) sync

## Success Criteria

- Player A on `/canvas/demo` and Player B on `/canvas/claude-lab` can play a full game
- Lobby shows available rooms across canvases
- Game state stays in sync with no desync or duplicate moves
- Win/draw is detected and announced on both sides
- Works via BroadcastChannel (same browser, two tabs) and Supabase Realtime (two browsers/devices)
