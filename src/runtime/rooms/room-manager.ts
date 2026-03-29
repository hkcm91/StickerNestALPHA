/**
 * RoomManager — singleton for managing scoped event rooms
 * @module runtime/rooms/room-manager
 *
 * @remarks
 * Rooms provide dynamic, scoped event channels within the event bus.
 * Widgets create and join rooms to isolate their events from other
 * widget instances on the same canvas.
 *
 * Room events are namespaced on the bus as `room.{roomId}.{eventType}`,
 * keeping the bus flat while providing logical isolation.
 *
 * @layer L3 — Runtime
 */

import type { z } from 'zod';

import { RoomEvents } from '@sn/types';
import type { Room, RoomMember, RoomListEntry , CreateRoomInputSchema } from '@sn/types';

import { bus } from '../../kernel/bus';


/** Input type for createRoom — joinPolicy is optional (defaults to 'invite') */
type CreateRoomOptions = z.input<typeof CreateRoomInputSchema>;

/**
 * Manages room lifecycle: creation, membership, scoped event routing, and cleanup.
 *
 * All room lifecycle events (created, destroyed, member joined/left) are emitted
 * on the kernel event bus using the `RoomEvents` constants.
 *
 * Room-scoped widget events use the naming convention `room.{roomId}.{eventType}`
 * and are routed through the same event bus with no structural changes required.
 */
class RoomManager {
  /** Active rooms keyed by room ID */
  private rooms = new Map<string, Room>();

  /**
   * Bus subscriptions per room, keyed by roomId then by a composite
   * key of eventType + handler reference. Values are unsubscribe functions.
   */
  private roomSubscriptions = new Map<string, Map<string, () => void>>();

  /** Track which rooms each instance belongs to for bulk cleanup */
  private instanceRooms = new Map<string, Set<string>>();

  /** Whether the beforeunload handler has been registered */
  private cleanupRegistered = false;

  constructor() {
    this.registerCleanup();
  }

  /**
   * Creates a new room owned by the specified widget instance.
   *
   * @param creatorInstanceId - Widget instance ID that creates the room
   * @param creatorWidgetId - Widget type ID (from manifest)
   * @param canvasId - Canvas where the room exists
   * @param input - Room configuration (join policy, max members, metadata)
   * @returns The new room's UUID
   */
  createRoom(
    creatorInstanceId: string,
    creatorWidgetId: string,
    canvasId: string,
    input: CreateRoomOptions,
  ): string {
    const roomId = crypto.randomUUID();
    const now = new Date().toISOString();

    const room: Room = {
      id: roomId,
      creatorInstanceId,
      creatorWidgetId,
      canvasId,
      joinPolicy: input.joinPolicy ?? 'invite',
      maxMembers: input.maxMembers,
      metadata: input.metadata,
      members: [],
      createdAt: now,
    };

    this.rooms.set(roomId, room);
    this.roomSubscriptions.set(roomId, new Map());

    bus.emit(RoomEvents.CREATED, {
      roomId,
      creatorInstanceId,
      creatorWidgetId,
      canvasId,
      joinPolicy: room.joinPolicy,
      metadata: room.metadata,
    });

    return roomId;
  }

  /**
   * Adds a widget instance as a member of a room.
   *
   * @param roomId - Room to join
   * @param instanceId - Widget instance joining the room
   * @param userId - Optional user ID (for authenticated users)
   * @param displayName - Optional display name for presence
   * @throws Error if room does not exist or is full
   */
  joinRoom(roomId: string, instanceId: string, userId?: string, displayName?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} does not exist`);
    }

    // Check if already a member
    if (room.members.some((m) => m.instanceId === instanceId)) {
      return; // Idempotent — already joined
    }

    // Check capacity
    if (room.maxMembers !== undefined && room.members.length >= room.maxMembers) {
      throw new Error(`Room ${roomId} is full (max ${room.maxMembers} members)`);
    }

    const member: RoomMember = {
      instanceId,
      userId,
      displayName,
      joinedAt: new Date().toISOString(),
    };

    room.members.push(member);

    // Track instance → room mapping for leaveAllRooms
    let instanceSet = this.instanceRooms.get(instanceId);
    if (!instanceSet) {
      instanceSet = new Set();
      this.instanceRooms.set(instanceId, instanceSet);
    }
    instanceSet.add(roomId);

    bus.emit(RoomEvents.MEMBER_JOINED, {
      roomId,
      instanceId,
      userId,
      displayName,
      memberCount: room.members.length,
    });
  }

  /**
   * Removes a widget instance from a room.
   * If the room has no members after removal, it is automatically destroyed.
   *
   * @param roomId - Room to leave
   * @param instanceId - Widget instance leaving the room
   */
  leaveRoom(roomId: string, instanceId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return; // Room already gone — no-op
    }

    const memberIndex = room.members.findIndex((m) => m.instanceId === instanceId);
    if (memberIndex === -1) {
      return; // Not a member — no-op
    }

    room.members.splice(memberIndex, 1);

    // Update instance tracking
    const instanceSet = this.instanceRooms.get(instanceId);
    if (instanceSet) {
      instanceSet.delete(roomId);
      if (instanceSet.size === 0) {
        this.instanceRooms.delete(instanceId);
      }
    }

    bus.emit(RoomEvents.MEMBER_LEFT, {
      roomId,
      instanceId,
      memberCount: room.members.length,
    });

    // Auto-destroy empty rooms
    if (room.members.length === 0) {
      this.destroyRoom(roomId);
    }
  }

  /**
   * Removes a widget instance from all rooms it belongs to.
   * Typically called on widget unmount or disconnect.
   *
   * @param instanceId - Widget instance to remove from all rooms
   */
  leaveAllRooms(instanceId: string): void {
    const roomIds = this.instanceRooms.get(instanceId);
    if (!roomIds) {
      return;
    }

    // Copy the set since leaveRoom modifies it
    const roomIdsCopy = [...roomIds];
    for (const roomId of roomIdsCopy) {
      this.leaveRoom(roomId, instanceId);
    }
  }

  /**
   * Destroys a room: removes all subscriptions and emits DESTROYED event.
   *
   * @param roomId - Room to destroy
   */
  destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return; // Already destroyed — no-op
    }

    // Clean up all bus subscriptions for this room
    const subs = this.roomSubscriptions.get(roomId);
    if (subs) {
      for (const unsub of subs.values()) {
        unsub();
      }
      this.roomSubscriptions.delete(roomId);
    }

    // Clean up instance tracking for remaining members
    for (const member of room.members) {
      const instanceSet = this.instanceRooms.get(member.instanceId);
      if (instanceSet) {
        instanceSet.delete(roomId);
        if (instanceSet.size === 0) {
          this.instanceRooms.delete(member.instanceId);
        }
      }
    }

    this.rooms.delete(roomId);

    bus.emit(RoomEvents.DESTROYED, {
      roomId,
      creatorInstanceId: room.creatorInstanceId,
      canvasId: room.canvasId,
    });
  }

  /**
   * Emits an event scoped to a room.
   * The event is published on the bus as `room.{roomId}.{eventType}`.
   *
   * @param roomId - Target room
   * @param eventType - Event type (will be prefixed with room namespace)
   * @param payload - Event payload
   * @throws Error if room does not exist
   */
  emitToRoom(roomId: string, eventType: string, payload: unknown): void {
    if (!this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} does not exist`);
    }

    bus.emit(`room.${roomId}.${eventType}`, payload);
  }

  /**
   * Subscribes to an event scoped to a room.
   * Listens on the bus for `room.{roomId}.{eventType}`.
   *
   * @param roomId - Target room
   * @param eventType - Event type to subscribe to
   * @param handler - Callback invoked with the event payload
   * @returns Unsubscribe function
   * @throws Error if room does not exist
   */
  subscribeToRoom(
    roomId: string,
    eventType: string,
    handler: (payload: unknown) => void,
  ): () => void {
    if (!this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} does not exist`);
    }

    const namespacedType = `room.${roomId}.${eventType}`;
    const unsub = bus.subscribe(namespacedType, (event) => {
      handler(event.payload);
    });

    // Track subscription for cleanup on room destroy
    const subs = this.roomSubscriptions.get(roomId);
    if (subs) {
      // Use a unique key per subscription
      const key = `${eventType}:${Date.now()}:${Math.random()}`;
      subs.set(key, unsub);
    }

    return unsub;
  }

  /**
   * Lists rooms on a given canvas as lightweight entries.
   *
   * @param canvasId - Canvas to list rooms for
   * @returns Array of room list entries
   */
  listRooms(canvasId: string): RoomListEntry[] {
    const entries: RoomListEntry[] = [];
    for (const room of this.rooms.values()) {
      if (room.canvasId === canvasId) {
        entries.push({
          roomId: room.id,
          creatorWidgetId: room.creatorWidgetId,
          memberCount: room.members.length,
          joinPolicy: room.joinPolicy,
          metadata: room.metadata,
        });
      }
    }
    return entries;
  }

  /**
   * Retrieves a room by ID.
   *
   * @param roomId - Room to look up
   * @returns The room record, or undefined if not found
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Returns all rooms that a given widget instance belongs to.
   *
   * @param instanceId - Widget instance to look up
   * @returns Array of rooms the instance is a member of
   */
  getRoomsByInstance(instanceId: string): Room[] {
    const roomIds = this.instanceRooms.get(instanceId);
    if (!roomIds) {
      return [];
    }

    const rooms: Room[] = [];
    for (const roomId of roomIds) {
      const room = this.rooms.get(roomId);
      if (room) {
        rooms.push(room);
      }
    }
    return rooms;
  }

  /**
   * Sends an invitation event to a target widget instance for a specific room.
   * The invitation is delivered via the event bus; the target widget decides
   * whether to accept by calling joinRoom.
   *
   * @param roomId - Room to invite the target to
   * @param targetInstanceId - Widget instance to invite
   * @throws Error if room does not exist
   */
  inviteToRoom(roomId: string, targetInstanceId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} does not exist`);
    }

    bus.emit(`room.${roomId}.invite`, {
      roomId,
      targetInstanceId,
      creatorWidgetId: room.creatorWidgetId,
      canvasId: room.canvasId,
      joinPolicy: room.joinPolicy,
      metadata: room.metadata,
    });
  }

  /**
   * Registers a window beforeunload handler to clean up rooms on page close.
   * Only registers once; safe to call multiple times.
   */
  private registerCleanup(): void {
    if (this.cleanupRegistered) {
      return;
    }

    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('beforeunload', () => {
        this.cleanup();
      });
      this.cleanupRegistered = true;
    }
  }

  /**
   * Destroys all rooms. Called on beforeunload and available for testing.
   */
  cleanup(): void {
    // Copy keys since destroyRoom modifies the map
    const roomIds = [...this.rooms.keys()];
    for (const roomId of roomIds) {
      this.destroyRoom(roomId);
    }
  }
}

/** Singleton RoomManager instance */
export const roomManager = new RoomManager();
