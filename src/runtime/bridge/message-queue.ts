/**
 * Message Queue
 *
 * Queues events sent to a widget before it signals READY.
 * On READY, the queue flushes in order.
 * Max 1000 events — overflow drops oldest.
 *
 * @module runtime/bridge
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import type { HostMessage } from './message-types';

/** Maximum queued events before READY */
export const MAX_QUEUE_SIZE = 1000;

/**
 * Pre-READY message queue for a widget.
 */
export interface MessageQueue {
  /** Enqueue a message (drops oldest if over MAX_QUEUE_SIZE) */
  enqueue(message: HostMessage): void;
  /** Flush all queued messages in order */
  flush(): HostMessage[];
  /** Current queue size */
  size(): number;
  /** Clear the queue */
  clear(): void;
}

/**
 * Creates a message queue for pre-READY event buffering.
 */
export function createMessageQueue(): MessageQueue {
  // TODO: Implement — see runtime plan section 2.2
  throw new Error('Not implemented: createMessageQueue');
}
