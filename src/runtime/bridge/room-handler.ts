/**
 * Room Bridge Handler
 *
 * Host-side handler for ROOM_* messages from widgets.
 * Enforces 'rooms' permission and delegates to the RoomManager singleton.
 *
 * @module runtime/bridge
 * @layer L3
 */

import { RoomEvents } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { useCanvasStore } from '../../kernel/stores/canvas/canvas.store';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';
import { roomManager } from '../rooms/room-manager';

import type { WidgetBridge } from './bridge';
import type { WidgetMessage } from './message-types';

/**
 * Checks whether a widget has the 'rooms' permission.
 */
function hasRoomsPermission(widgetId: string): boolean {
  const entry = useWidgetStore.getState().registry[widgetId];
  return entry?.manifest?.permissions?.includes('rooms') ?? false;
}

interface HandlerContext {
  widgetId: string;
  instanceId: string;
  bridge: WidgetBridge;
}

/** Track room event subscriptions per instance for cleanup */
const instanceRoomSubs = new Map<string, Map<string, () => void>>();

/**
 * Handles room messages from a widget iframe.
 * Returns true if the message was handled, false otherwise.
 */
export function handleRoomMessage(
  message: WidgetMessage,
  ctx: HandlerContext,
): boolean {
  if (!message.type.startsWith('ROOM_')) {
    return false;
  }

  const { widgetId, instanceId, bridge } = ctx;

  switch (message.type) {
    case 'ROOM_CREATE': {
      if (!hasRoomsPermission(widgetId)) {
        bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: null, error: 'Permission denied: widget lacks rooms permission' });
        return true;
      }
      try {
        const canvasId = useCanvasStore.getState().activeCanvasId ?? '';
        const roomId = roomManager.createRoom(instanceId, widgetId, canvasId, {
          joinPolicy: message.joinPolicy,
          maxMembers: message.maxMembers,
          metadata: message.metadata,
        });
        // Auto-join the creator
        const user = useAuthStore.getState().user;
        roomManager.joinRoom(roomId, instanceId, user?.id, user?.displayName ?? undefined);
        bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: { roomId } });
      } catch (err: unknown) {
        bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: null, error: err instanceof Error ? err.message : 'Failed to create room' });
      }
      return true;
    }

    case 'ROOM_JOIN': {
      if (!hasRoomsPermission(widgetId)) {
        bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: null, error: 'Permission denied: widget lacks rooms permission' });
        return true;
      }
      try {
        const user = useAuthStore.getState().user;
        roomManager.joinRoom(message.roomId, instanceId, user?.id, user?.displayName ?? undefined);
        // Subscribe to member change events for this room
        subscribeToMemberChanges(message.roomId, instanceId, bridge);
        bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: { success: true } });
      } catch (err: unknown) {
        bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: null, error: err instanceof Error ? err.message : 'Failed to join room' });
      }
      return true;
    }

    case 'ROOM_LEAVE': {
      const roomId = message.roomId;
      if (roomId) {
        roomManager.leaveRoom(roomId, instanceId);
      } else {
        roomManager.leaveAllRooms(instanceId);
      }
      // Clean up room subscriptions
      cleanupRoomSubs(instanceId, roomId);
      bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: { success: true } });
      return true;
    }

    case 'ROOM_EMIT': {
      if (!hasRoomsPermission(widgetId)) {
        return true; // Silently drop, matching cross-canvas pattern
      }
      // Verify instance is a member of the room
      const room = roomManager.getRoom(message.roomId);
      if (!room || !room.members.some((m) => m.instanceId === instanceId)) {
        console.warn(`[RoomHandler][${instanceId}] ROOM_EMIT blocked: not a member of room ${message.roomId}`);
        return true;
      }
      try {
        roomManager.emitToRoom(message.roomId, message.eventType, message.payload);
      } catch (err: unknown) {
        console.warn(`[RoomHandler][${instanceId}] ROOM_EMIT error:`, err);
      }
      return true;
    }

    case 'ROOM_SUBSCRIBE': {
      if (!hasRoomsPermission(widgetId)) {
        return true;
      }
      try {
        const unsub = roomManager.subscribeToRoom(message.roomId, message.eventType, (payload) => {
          bridge.send({ type: 'ROOM_EVENT', roomId: message.roomId, eventType: message.eventType, payload });
        });
        // Track for cleanup
        let subs = instanceRoomSubs.get(instanceId);
        if (!subs) {
          subs = new Map();
          instanceRoomSubs.set(instanceId, subs);
        }
        const subKey = `${message.roomId}:${message.eventType}`;
        // If already subscribed, unsub old one first
        const existing = subs.get(subKey);
        if (existing) existing();
        subs.set(subKey, unsub);
      } catch (err: unknown) {
        console.warn(`[RoomHandler][${instanceId}] ROOM_SUBSCRIBE error:`, err);
      }
      return true;
    }

    case 'ROOM_UNSUBSCRIBE': {
      const subs = instanceRoomSubs.get(instanceId);
      if (subs) {
        const subKey = `${message.roomId}:${message.eventType}`;
        const unsub = subs.get(subKey);
        if (unsub) {
          unsub();
          subs.delete(subKey);
        }
      }
      return true;
    }

    case 'ROOM_LIST': {
      if (!hasRoomsPermission(widgetId)) {
        bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: null, error: 'Permission denied: widget lacks rooms permission' });
        return true;
      }
      const canvasId = useCanvasStore.getState().activeCanvasId ?? '';
      const rooms = roomManager.listRooms(canvasId);
      bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: rooms });
      return true;
    }

    case 'ROOM_INVITE': {
      if (!hasRoomsPermission(widgetId)) {
        bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: null, error: 'Permission denied: widget lacks rooms permission' });
        return true;
      }
      try {
        roomManager.inviteToRoom(message.roomId, message.targetInstanceId);
        bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: { success: true } });
      } catch (err: unknown) {
        bridge.send({ type: 'ROOM_RESPONSE', requestId: message.requestId, result: null, error: err instanceof Error ? err.message : 'Failed to invite to room' });
      }
      return true;
    }

    default:
      return false;
  }
}

/**
 * Subscribes to member join/leave bus events for a room and forwards them to the widget.
 */
function subscribeToMemberChanges(roomId: string, instanceId: string, bridge: WidgetBridge): void {
  // Listen for member joined/left events and forward current member list
  const sendMemberUpdate = (event: { payload: { roomId: string } }) => {
    // Only forward events for the specific room
    if (event.payload.roomId !== roomId) return;
    const room = roomManager.getRoom(roomId);
    if (room) {
      bridge.send({
        type: 'ROOM_MEMBER_CHANGE',
        roomId,
        members: room.members.map((m) => ({
          instanceId: m.instanceId,
          userId: m.userId,
          displayName: m.displayName,
        })),
      });
    }
  };

  const unsubJoined = bus.subscribe(RoomEvents.MEMBER_JOINED, sendMemberUpdate);
  const unsubLeft = bus.subscribe(RoomEvents.MEMBER_LEFT, sendMemberUpdate);

  let subs = instanceRoomSubs.get(instanceId);
  if (!subs) {
    subs = new Map();
    instanceRoomSubs.set(instanceId, subs);
  }
  subs.set(`${roomId}:__member_joined`, unsubJoined);
  subs.set(`${roomId}:__member_left`, unsubLeft);
}

/**
 * Cleans up all room subscriptions for an instance.
 * If roomId is provided, only cleans subs for that room.
 */
function cleanupRoomSubs(instanceId: string, roomId?: string): void {
  const subs = instanceRoomSubs.get(instanceId);
  if (!subs) return;

  if (roomId) {
    // Remove only subs for this room
    for (const [key, unsub] of subs.entries()) {
      if (key.startsWith(`${roomId}:`)) {
        unsub();
        subs.delete(key);
      }
    }
  } else {
    // Remove all subs for this instance
    for (const unsub of subs.values()) {
      unsub();
    }
    instanceRoomSubs.delete(instanceId);
  }
}

/**
 * Cleans up all room resources for a widget instance on unmount.
 */
export function cleanupRoomResources(instanceId: string): void {
  roomManager.leaveAllRooms(instanceId);
  cleanupRoomSubs(instanceId);
}
