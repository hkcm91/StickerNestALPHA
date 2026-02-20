/**
 * Bridge Message Validators
 *
 * Zod schemas for validating all postMessage messages.
 * Every message crossing the bridge is validated before processing.
 * Malformed messages are logged and discarded.
 *
 * @module runtime/bridge
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { z } from 'zod';

import type { HostMessage, WidgetMessage } from './message-types';

// ---------------------------------------------------------------------------
// Theme tokens schema
// ---------------------------------------------------------------------------
const ThemeTokensSchema = z.object({
  '--sn-bg': z.string(),
  '--sn-surface': z.string(),
  '--sn-accent': z.string(),
  '--sn-text': z.string(),
  '--sn-text-muted': z.string(),
  '--sn-border': z.string(),
  '--sn-radius': z.string(),
  '--sn-font-family': z.string(),
});

// ---------------------------------------------------------------------------
// Widget → Host message schemas (discriminated union)
// ---------------------------------------------------------------------------
const WidgetMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('READY') }),
  z.object({ type: z.literal('REGISTER'), manifest: z.unknown() }),
  z.object({ type: z.literal('EMIT'), eventType: z.string(), payload: z.unknown() }),
  z.object({ type: z.literal('SET_STATE'), key: z.string(), value: z.unknown() }),
  z.object({ type: z.literal('GET_STATE'), key: z.string() }),
  z.object({ type: z.literal('SET_USER_STATE'), key: z.string(), value: z.unknown() }),
  z.object({ type: z.literal('GET_USER_STATE'), key: z.string() }),
  z.object({ type: z.literal('RESIZE_REQUEST'), width: z.number(), height: z.number() }),
  z.object({
    type: z.literal('LOG'),
    level: z.enum(['info', 'warn', 'error']),
    message: z.string(),
  }),
  z.object({ type: z.literal('INTEGRATION_QUERY'), requestId: z.string(), name: z.string(), params: z.unknown() }),
  z.object({ type: z.literal('INTEGRATION_MUTATE'), requestId: z.string(), name: z.string(), params: z.unknown() }),
  z.object({ type: z.literal('CROSS_CANVAS_EMIT'), channel: z.string(), payload: z.unknown() }),
  z.object({ type: z.literal('CROSS_CANVAS_SUBSCRIBE'), channel: z.string() }),
  z.object({ type: z.literal('CROSS_CANVAS_UNSUBSCRIBE'), channel: z.string() }),
]);

// ---------------------------------------------------------------------------
// Host → Widget message schemas (discriminated union)
// ---------------------------------------------------------------------------
const HostMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('INIT'),
    widgetId: z.string(),
    instanceId: z.string(),
    config: z.record(z.string(), z.unknown()),
    theme: ThemeTokensSchema,
  }),
  z.object({
    type: z.literal('EVENT'),
    event: z.object({ type: z.string(), payload: z.unknown() }),
  }),
  z.object({
    type: z.literal('CONFIG_UPDATE'),
    config: z.record(z.string(), z.unknown()),
  }),
  z.object({ type: z.literal('THEME_UPDATE'), theme: ThemeTokensSchema }),
  z.object({ type: z.literal('RESIZE'), width: z.number(), height: z.number() }),
  z.object({ type: z.literal('STATE_RESPONSE'), key: z.string(), value: z.unknown() }),
  z.object({ type: z.literal('STATE_REJECTED'), key: z.string(), reason: z.string() }),
  z.object({ type: z.literal('INTEGRATION_RESPONSE'), requestId: z.string(), result: z.unknown(), error: z.string().optional() }),
  z.object({ type: z.literal('CROSS_CANVAS_EVENT'), channel: z.string(), payload: z.unknown() }),
  z.object({ type: z.literal('DESTROY') }),
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates an incoming WidgetMessage from an iframe.
 *
 * @param data - Raw message data from postMessage
 * @returns Parsed WidgetMessage or null if invalid
 */
export function validateWidgetMessage(data: unknown): WidgetMessage | null {
  const result = WidgetMessageSchema.safeParse(data);
  if (!result.success) {
    return null;
  }
  return result.data as WidgetMessage;
}

/**
 * Validates an incoming HostMessage (used by the SDK inside the iframe).
 *
 * @param data - Raw message data from postMessage
 * @returns Parsed HostMessage or null if invalid
 */
export function validateHostMessage(data: unknown): HostMessage | null {
  const result = HostMessageSchema.safeParse(data);
  if (!result.success) {
    return null;
  }
  return result.data as HostMessage;
}
