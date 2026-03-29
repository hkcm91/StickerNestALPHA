/**
 * RoomManager unit tests
 * @module runtime/rooms/room-manager.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { RoomEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

// We cannot import the singleton directly because its state persists.
// Instead, we dynamically import to get a fresh module each time,
// or we use the cleanup method.

// eslint-disable-next-line @typescript-eslint/no-require-imports -- test utility
import { roomManager } from './room-manager';

const CANVAS_ID = '00000000-0000-0000-0000-000000000001';
const WIDGET_ID = 'test-widget';
const INSTANCE_A = 'instance-a';
const INSTANCE_B = 'instance-b';
const INSTANCE_C = 'instance-c';

describe('RoomManager', () => {
  beforeEach(() => {
    roomManager.cleanup();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    roomManager.cleanup();
    bus.unsubscribeAll();
  });

  // ---- Creation ----

  describe('createRoom', () => {
    it('creates a room with correct properties', () => {
      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {
        joinPolicy: 'open',
        maxMembers: 4,
        metadata: { game: 'chess' },
      });

      const room = roomManager.getRoom(roomId);
      expect(room).toBeDefined();
      expect(room!.id).toBe(roomId);
      expect(room!.creatorInstanceId).toBe(INSTANCE_A);
      expect(room!.creatorWidgetId).toBe(WIDGET_ID);
      expect(room!.canvasId).toBe(CANVAS_ID);
      expect(room!.joinPolicy).toBe('open');
      expect(room!.maxMembers).toBe(4);
      expect(room!.metadata).toEqual({ game: 'chess' });
      expect(room!.members).toEqual([]);
      expect(room!.createdAt).toBeDefined();
    });

    it('emits RoomEvents.CREATED on the bus', () => {
      const handler = vi.fn();
      bus.subscribe(RoomEvents.CREATED, handler);

      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].payload).toMatchObject({
        roomId,
        creatorInstanceId: INSTANCE_A,
        creatorWidgetId: WIDGET_ID,
        canvasId: CANVAS_ID,
      });
    });

    it('defaults joinPolicy to invite', () => {
      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      const room = roomManager.getRoom(roomId);
      expect(room!.joinPolicy).toBe('invite');
    });
  });

  // ---- Join ----

  describe('joinRoom', () => {
    it('adds member and emits MEMBER_JOINED', () => {
      const handler = vi.fn();
      bus.subscribe(RoomEvents.MEMBER_JOINED, handler);

      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      roomManager.joinRoom(roomId, INSTANCE_B, 'user-1', 'Alice');

      const room = roomManager.getRoom(roomId);
      expect(room!.members).toHaveLength(1);
      expect(room!.members[0].instanceId).toBe(INSTANCE_B);
      expect(room!.members[0].userId).toBe('user-1');
      expect(room!.members[0].displayName).toBe('Alice');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].payload).toMatchObject({
        roomId,
        instanceId: INSTANCE_B,
        memberCount: 1,
      });
    });

    it('is idempotent — joining twice does not duplicate', () => {
      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      roomManager.joinRoom(roomId, INSTANCE_B);
      roomManager.joinRoom(roomId, INSTANCE_B);

      const room = roomManager.getRoom(roomId);
      expect(room!.members).toHaveLength(1);
    });

    it('throws when room does not exist', () => {
      expect(() => {
        roomManager.joinRoom('nonexistent-room', INSTANCE_A);
      }).toThrow('does not exist');
    });

    it('throws when room is full', () => {
      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {
        maxMembers: 1,
      });
      roomManager.joinRoom(roomId, INSTANCE_A);

      expect(() => {
        roomManager.joinRoom(roomId, INSTANCE_B);
      }).toThrow('full');
    });
  });

  // ---- Leave ----

  describe('leaveRoom', () => {
    it('removes member and emits MEMBER_LEFT', () => {
      const handler = vi.fn();
      bus.subscribe(RoomEvents.MEMBER_LEFT, handler);

      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      roomManager.joinRoom(roomId, INSTANCE_A);
      roomManager.joinRoom(roomId, INSTANCE_B);
      roomManager.leaveRoom(roomId, INSTANCE_A);

      const room = roomManager.getRoom(roomId);
      expect(room!.members).toHaveLength(1);
      expect(room!.members[0].instanceId).toBe(INSTANCE_B);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].payload).toMatchObject({
        roomId,
        instanceId: INSTANCE_A,
        memberCount: 1,
      });
    });

    it('auto-destroys room when last member leaves', () => {
      const destroyHandler = vi.fn();
      bus.subscribe(RoomEvents.DESTROYED, destroyHandler);

      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      roomManager.joinRoom(roomId, INSTANCE_A);
      roomManager.leaveRoom(roomId, INSTANCE_A);

      expect(roomManager.getRoom(roomId)).toBeUndefined();
      expect(destroyHandler).toHaveBeenCalledOnce();
      expect(destroyHandler.mock.calls[0][0].payload).toMatchObject({ roomId });
    });

    it('is a no-op for non-existent room or non-member', () => {
      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      // Leaving a room you are not in should not throw
      expect(() => roomManager.leaveRoom(roomId, INSTANCE_B)).not.toThrow();
      // Leaving a non-existent room should not throw
      expect(() => roomManager.leaveRoom('ghost-room', INSTANCE_A)).not.toThrow();
    });
  });

  // ---- leaveAllRooms ----

  describe('leaveAllRooms', () => {
    it('removes instance from all rooms', () => {
      const roomId1 = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      const roomId2 = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});

      // Join a second member so rooms don't auto-destroy when INSTANCE_B leaves
      roomManager.joinRoom(roomId1, INSTANCE_A);
      roomManager.joinRoom(roomId1, INSTANCE_B);
      roomManager.joinRoom(roomId2, INSTANCE_A);
      roomManager.joinRoom(roomId2, INSTANCE_B);

      roomManager.leaveAllRooms(INSTANCE_B);

      const room1 = roomManager.getRoom(roomId1);
      const room2 = roomManager.getRoom(roomId2);
      expect(room1!.members.every((m) => m.instanceId !== INSTANCE_B)).toBe(true);
      expect(room2!.members.every((m) => m.instanceId !== INSTANCE_B)).toBe(true);
    });

    it('is a no-op for an instance with no rooms', () => {
      expect(() => roomManager.leaveAllRooms('nobody')).not.toThrow();
    });
  });

  // ---- destroyRoom ----

  describe('destroyRoom', () => {
    it('removes room and emits DESTROYED', () => {
      const handler = vi.fn();
      bus.subscribe(RoomEvents.DESTROYED, handler);

      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      roomManager.destroyRoom(roomId);

      expect(roomManager.getRoom(roomId)).toBeUndefined();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('cleans up bus subscriptions on destroy', () => {
      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      const subHandler = vi.fn();
      roomManager.subscribeToRoom(roomId, 'test.event', subHandler);

      roomManager.destroyRoom(roomId);

      // After destroy, emitting to the old room namespace should not call the handler
      bus.emit(`room.${roomId}.test.event`, { data: 'late' });
      expect(subHandler).not.toHaveBeenCalled();
    });

    it('is a no-op for non-existent room', () => {
      expect(() => roomManager.destroyRoom('gone')).not.toThrow();
    });
  });

  // ---- emitToRoom ----

  describe('emitToRoom', () => {
    it('emits event on bus as room.{roomId}.{eventType}', () => {
      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      const handler = vi.fn();
      bus.subscribe(`room.${roomId}.game.move`, handler);

      roomManager.emitToRoom(roomId, 'game.move', { x: 1, y: 2 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].payload).toEqual({ x: 1, y: 2 });
    });

    it('throws when room does not exist', () => {
      expect(() => {
        roomManager.emitToRoom('no-room', 'event', {});
      }).toThrow('does not exist');
    });
  });

  // ---- subscribeToRoom ----

  describe('subscribeToRoom', () => {
    it('calls handler when room event is emitted', () => {
      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      const handler = vi.fn();
      roomManager.subscribeToRoom(roomId, 'chat.message', handler);

      roomManager.emitToRoom(roomId, 'chat.message', { text: 'hello' });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ text: 'hello' });
    });

    it('returns an unsubscribe function', () => {
      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      const handler = vi.fn();
      const unsub = roomManager.subscribeToRoom(roomId, 'ping', handler);

      unsub();
      roomManager.emitToRoom(roomId, 'ping', {});

      expect(handler).not.toHaveBeenCalled();
    });

    it('throws when room does not exist', () => {
      expect(() => {
        roomManager.subscribeToRoom('no-room', 'event', vi.fn());
      }).toThrow('does not exist');
    });
  });

  // ---- Room isolation ----

  describe('room isolation', () => {
    it('events in room A do not reach room B subscribers', () => {
      const roomA = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      const roomB = roomManager.createRoom(INSTANCE_B, WIDGET_ID, CANVAS_ID, {});

      const handlerA = vi.fn();
      const handlerB = vi.fn();
      roomManager.subscribeToRoom(roomA, 'action', handlerA);
      roomManager.subscribeToRoom(roomB, 'action', handlerB);

      roomManager.emitToRoom(roomA, 'action', { source: 'A' });

      expect(handlerA).toHaveBeenCalledOnce();
      expect(handlerB).not.toHaveBeenCalled();
    });
  });

  // ---- listRooms ----

  describe('listRooms', () => {
    it('lists rooms for a given canvas', () => {
      const otherCanvas = '00000000-0000-0000-0000-000000000002';
      roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, { joinPolicy: 'open' });
      roomManager.createRoom(INSTANCE_B, WIDGET_ID, CANVAS_ID, { joinPolicy: 'invite' });
      roomManager.createRoom(INSTANCE_C, WIDGET_ID, otherCanvas, {});

      const entries = roomManager.listRooms(CANVAS_ID);
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.creatorWidgetId === WIDGET_ID)).toBe(true);
    });

    it('returns empty array for canvas with no rooms', () => {
      expect(roomManager.listRooms('empty-canvas')).toEqual([]);
    });
  });

  // ---- getRoomsByInstance ----

  describe('getRoomsByInstance', () => {
    it('returns all rooms an instance belongs to', () => {
      const roomId1 = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      const roomId2 = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});

      roomManager.joinRoom(roomId1, INSTANCE_B);
      roomManager.joinRoom(roomId2, INSTANCE_B);

      const rooms = roomManager.getRoomsByInstance(INSTANCE_B);
      expect(rooms).toHaveLength(2);
      expect(rooms.map((r) => r.id).sort()).toEqual([roomId1, roomId2].sort());
    });

    it('returns empty array for unknown instance', () => {
      expect(roomManager.getRoomsByInstance('unknown')).toEqual([]);
    });
  });

  // ---- inviteToRoom ----

  describe('inviteToRoom', () => {
    it('emits an invite event on the room namespace', () => {
      const roomId = roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {
        metadata: { game: 'chess' },
      });
      const handler = vi.fn();
      bus.subscribe(`room.${roomId}.invite`, handler);

      roomManager.inviteToRoom(roomId, INSTANCE_B);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].payload).toMatchObject({
        roomId,
        targetInstanceId: INSTANCE_B,
        creatorWidgetId: WIDGET_ID,
      });
    });

    it('throws when room does not exist', () => {
      expect(() => {
        roomManager.inviteToRoom('no-room', INSTANCE_B);
      }).toThrow('does not exist');
    });
  });

  // ---- cleanup ----

  describe('cleanup', () => {
    it('destroys all rooms', () => {
      roomManager.createRoom(INSTANCE_A, WIDGET_ID, CANVAS_ID, {});
      roomManager.createRoom(INSTANCE_B, WIDGET_ID, CANVAS_ID, {});

      roomManager.cleanup();

      expect(roomManager.listRooms(CANVAS_ID)).toEqual([]);
    });
  });
});
