/**
 * Leaderboard Bridge Handler
 *
 * Host-side handler for LEADERBOARD_* messages from widgets.
 * Enforces 'leaderboard' permission and delegates to the kernel leaderboard API.
 *
 * @module runtime/bridge
 * @layer L3
 */

import { bus } from '../../kernel/bus';
import {
  submitScore,
  getTopScores,
  getUserRank,
  subscribeToUpdates,
} from '../../kernel/leaderboard/leaderboard-api';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { useCanvasStore } from '../../kernel/stores/canvas/canvas.store';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

import type { WidgetBridge } from './bridge';
import type { WidgetMessage } from './message-types';

/**
 * Checks whether a widget has the 'leaderboard' permission.
 */
function hasLeaderboardPermission(widgetId: string): boolean {
  const entry = useWidgetStore.getState().registry[widgetId];
  return entry?.manifest?.permissions?.includes('leaderboard') ?? false;
}

interface HandlerContext {
  widgetId: string;
  instanceId: string;
  bridge: WidgetBridge;
}

/** Track leaderboard realtime unsubscribe functions per instance */
const instanceLeaderboardSubs = new Map<string, Map<string, () => void>>();

/**
 * Handles leaderboard messages from a widget iframe.
 * Returns true if the message was handled, false otherwise.
 */
export function handleLeaderboardMessage(
  message: WidgetMessage,
  ctx: HandlerContext,
): boolean {
  if (!message.type.startsWith('LEADERBOARD_')) {
    return false;
  }

  const { widgetId, instanceId, bridge } = ctx;

  switch (message.type) {
    case 'LEADERBOARD_SUBMIT': {
      if (!hasLeaderboardPermission(widgetId)) {
        bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: 'Permission denied: widget lacks leaderboard permission' });
        return true;
      }
      const user = useAuthStore.getState().user;
      if (!user) {
        bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: 'User not authenticated' });
        return true;
      }
      const canvasId = useCanvasStore.getState().activeCanvasId ?? null;
      submitScore(widgetId, canvasId, user.id, user.displayName ?? 'Anonymous', message.score, message.metadata)
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: result.data });
          } else {
            bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: err instanceof Error ? err.message : 'Failed to submit score' });
        });
      return true;
    }

    case 'LEADERBOARD_GET_TOP': {
      if (!hasLeaderboardPermission(widgetId)) {
        bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: 'Permission denied: widget lacks leaderboard permission' });
        return true;
      }
      const canvasId = useCanvasStore.getState().activeCanvasId ?? undefined;
      getTopScores(widgetId, message.scope, canvasId, message.limit, message.offset)
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: result.data });
          } else {
            bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: err instanceof Error ? err.message : 'Failed to get top scores' });
        });
      return true;
    }

    case 'LEADERBOARD_GET_RANK': {
      if (!hasLeaderboardPermission(widgetId)) {
        bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: 'Permission denied: widget lacks leaderboard permission' });
        return true;
      }
      const user = useAuthStore.getState().user;
      if (!user) {
        bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: 'User not authenticated' });
        return true;
      }
      const canvasId = useCanvasStore.getState().activeCanvasId ?? undefined;
      getUserRank(widgetId, message.scope, canvasId, user.id)
        .then((result) => {
          if (result.success) {
            bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: result.data });
          } else {
            bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: result.error.message });
          }
        })
        .catch((err: unknown) => {
          bridge.send({ type: 'LEADERBOARD_RESPONSE', requestId: message.requestId, result: null, error: err instanceof Error ? err.message : 'Failed to get rank' });
        });
      return true;
    }

    case 'LEADERBOARD_SUBSCRIBE': {
      if (!hasLeaderboardPermission(widgetId)) {
        return true; // Silently drop
      }
      const canvasId = useCanvasStore.getState().activeCanvasId ?? undefined;
      const subKey = message.scope;

      let subs = instanceLeaderboardSubs.get(instanceId);
      if (!subs) {
        subs = new Map();
        instanceLeaderboardSubs.set(instanceId, subs);
      }

      // Don't double-subscribe
      if (subs.has(subKey)) {
        return true;
      }

      const unsub = subscribeToUpdates(widgetId, message.scope, canvasId);

      // Also subscribe to the bus event so we can forward updates to the widget
      const busUnsub = bus.subscribe('leaderboard.updated', (event: { payload: { scope: string; widgetId: string; entries?: unknown[] } }) => {
        if (event.payload.widgetId === widgetId && event.payload.scope === message.scope) {
          bridge.send({
            type: 'LEADERBOARD_UPDATE',
            scope: message.scope,
            entries: event.payload.entries ?? [],
          });
        }
      });

      subs.set(subKey, () => {
        unsub();
        busUnsub();
      });

      return true;
    }

    case 'LEADERBOARD_UNSUBSCRIBE': {
      const subs = instanceLeaderboardSubs.get(instanceId);
      if (subs) {
        const unsub = subs.get(message.scope);
        if (unsub) {
          unsub();
          subs.delete(message.scope);
        }
      }
      return true;
    }

    default:
      return false;
  }
}

/**
 * Cleans up all leaderboard subscriptions for a widget instance on unmount.
 */
export function cleanupLeaderboardResources(instanceId: string): void {
  const subs = instanceLeaderboardSubs.get(instanceId);
  if (subs) {
    for (const unsub of subs.values()) {
      unsub();
    }
    instanceLeaderboardSubs.delete(instanceId);
  }
}
