/**
 * Room schemas for scoped event channels
 * @module @sn/types/room
 *
 * @remarks
 * Rooms provide dynamic, scoped event channels within the event bus.
 * Widgets create and join rooms to isolate their events from other
 * widget instances on the same canvas.
 *
 * Room events use namespaced bus types: `room.{roomId}.{eventType}`
 * This keeps the event bus flat while providing logical isolation.
 */

import { z } from 'zod';

/**
 * Room join policy determines how users/widgets can enter a room.
 *
 * - `invite`: Only explicitly invited instances can join
 * - `proximity`: Canvas users can discover and click "Join" on the widget
 * - `canvas-auto`: All users on the canvas automatically join
 * - `open`: Anyone can discover and join without restriction
 */
export const RoomJoinPolicySchema = z.enum([
  'invite',
  'proximity',
  'canvas-auto',
  'open',
]);

export type RoomJoinPolicy = z.infer<typeof RoomJoinPolicySchema>;

/**
 * Room member record
 */
export const RoomMemberSchema = z.object({
  /** Widget instance ID of the member */
  instanceId: z.string().min(1),
  /** User ID (if authenticated; undefined for anonymous/guest) */
  userId: z.string().uuid().optional(),
  /** Display name for presence */
  displayName: z.string().optional(),
  /** When the member joined */
  joinedAt: z.string().datetime(),
});

export type RoomMember = z.infer<typeof RoomMemberSchema>;

/**
 * Room record — represents an active scoped event channel.
 *
 * @remarks
 * Rooms are created by widgets at runtime and managed by the
 * RoomManager singleton in the Runtime layer (L3).
 * Optionally persisted to Supabase for multi-user rooms.
 */
export const RoomSchema = z.object({
  /** Unique room identifier */
  id: z.string().uuid(),
  /** Widget instance that created the room */
  creatorInstanceId: z.string().min(1),
  /** Widget type ID (from manifest) */
  creatorWidgetId: z.string().min(1),
  /** Canvas where the room exists */
  canvasId: z.string().uuid(),
  /** How users/widgets can join this room */
  joinPolicy: RoomJoinPolicySchema,
  /** Maximum number of members (undefined = unlimited) */
  maxMembers: z.number().int().positive().optional(),
  /** Arbitrary metadata for the room (game name, settings, etc.) */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Current room members */
  members: z.array(RoomMemberSchema).default([]),
  /** When the room was created */
  createdAt: z.string().datetime(),
});

export type Room = z.infer<typeof RoomSchema>;

/**
 * Input schema for creating a room (used by SDK → bridge)
 */
export const CreateRoomInputSchema = z.object({
  joinPolicy: RoomJoinPolicySchema.optional().default('invite'),
  maxMembers: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateRoomInput = z.infer<typeof CreateRoomInputSchema>;

/**
 * Room list entry — lightweight view returned by room.list()
 */
export const RoomListEntrySchema = z.object({
  roomId: z.string().uuid(),
  creatorWidgetId: z.string().min(1),
  memberCount: z.number().int().nonnegative(),
  joinPolicy: RoomJoinPolicySchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type RoomListEntry = z.infer<typeof RoomListEntrySchema>;

/**
 * JSON Schema exports for external validation
 */
export const RoomJSONSchema = RoomSchema.toJSONSchema();
export const RoomMemberJSONSchema = RoomMemberSchema.toJSONSchema();
export const RoomListEntryJSONSchema = RoomListEntrySchema.toJSONSchema();
