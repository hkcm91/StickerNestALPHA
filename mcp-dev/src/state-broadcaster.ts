/**
 * State Broadcaster
 *
 * WebSocket connection manager for the live canvas page.
 * Broadcasts state updates to all connected clients when MCP tools modify state.
 *
 * Uses `ws` library in `noServer` mode so it can share the HTTP server.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';

// ============================================================================
// Types
// ============================================================================

export type UpdateScope = 'full' | 'entity' | 'viewport' | 'theme' | 'selection' | 'widget';

export interface StateUpdateMessage {
  type: 'state_update';
  scope: UpdateScope;
  data: Record<string, unknown>;
}

export interface StateProvider {
  getFullState(): Record<string, unknown>;
  getFullStateAsync?(): Promise<Record<string, unknown>>;
}

// ============================================================================
// Module State
// ============================================================================

let wss: WebSocketServer | null = null;
let stateProvider: StateProvider | null = null;
const clients = new Set<WebSocket>();

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize the WebSocket broadcaster.
 * Listens for `upgrade` events on the HTTP server for path `/ws`.
 */
export function initBroadcaster(server: Server, provider: StateProvider): void {
  stateProvider = provider;

  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);

    // Send full state on connect (prefer async if available)
    if (stateProvider?.getFullStateAsync) {
      stateProvider.getFullStateAsync().then((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'state_update', scope: 'full', data } as StateUpdateMessage));
        }
      }).catch(() => {});
    } else if (stateProvider) {
      const msg: StateUpdateMessage = {
        type: 'state_update',
        scope: 'full',
        data: stateProvider.getFullState(),
      };
      ws.send(JSON.stringify(msg));
    }

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (url.pathname === '/ws') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });
}

/**
 * Broadcast a scoped state update to all connected clients.
 */
export function broadcast(scope: UpdateScope, data: Record<string, unknown>): void {
  if (clients.size === 0) return;

  const msg: StateUpdateMessage = {
    type: 'state_update',
    scope,
    data,
  };
  const payload = JSON.stringify(msg);

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/**
 * Broadcast the full state to all connected clients.
 */
export function broadcastFullState(): void {
  if (!stateProvider || clients.size === 0) return;

  const msg: StateUpdateMessage = {
    type: 'state_update',
    scope: 'full',
    data: stateProvider.getFullState(),
  };
  const payload = JSON.stringify(msg);

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/**
 * Get the number of currently connected WebSocket clients.
 */
export function getConnectionCount(): number {
  return clients.size;
}
