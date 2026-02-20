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

/**
 * Validates an incoming WidgetMessage from an iframe.
 *
 * @param data - Raw message data from postMessage
 * @returns Parsed WidgetMessage or null if invalid
 */
export function validateWidgetMessage(_data: unknown): unknown | null {
  // TODO: Implement — Zod schemas from @sn/types
  throw new Error('Not implemented: validateWidgetMessage');
}

/**
 * Validates an incoming HostMessage (used by the SDK inside the iframe).
 *
 * @param data - Raw message data from postMessage
 * @returns Parsed HostMessage or null if invalid
 */
export function validateHostMessage(_data: unknown): unknown | null {
  // TODO: Implement — Zod schemas from @sn/types
  throw new Error('Not implemented: validateHostMessage');
}
