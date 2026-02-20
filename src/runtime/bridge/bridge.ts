/**
 * Host-side Bridge
 *
 * Manages the postMessage bridge between the host application
 * and a sandboxed widget iframe. One bridge per iframe.
 *
 * @module runtime/bridge
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { createRateLimiter } from '../security/rate-limiter';

import { createMessageQueue } from './message-queue';
import type { HostMessage, WidgetMessage } from './message-types';
import { validateWidgetMessage } from './message-validator';

/**
 * Host-side bridge for a single widget iframe.
 */
export interface WidgetBridge {
  /** Send a message to the widget iframe */
  send(message: HostMessage): void;
  /** Register a handler for widget messages */
  onMessage(handler: (message: WidgetMessage) => void): void;
  /** Whether the widget has signaled READY */
  isReady(): boolean;
  /** Destroy the bridge and clean up event listeners */
  destroy(): void;
}

/**
 * Creates a host-side bridge for a widget iframe.
 *
 * @param iframe - The iframe element hosting the widget
 * @param instanceId - The widget instance ID for origin verification
 * @returns A WidgetBridge instance
 */
export function createWidgetBridge(
  iframe: HTMLIFrameElement,
  instanceId: string,
): WidgetBridge {
  let ready = false;
  const queue = createMessageQueue();
  const rateLimiter = createRateLimiter();
  const handlers = new Set<(message: WidgetMessage) => void>();

  function handleMessage(event: MessageEvent): void {
    // Origin validation: verify message source is from our iframe
    // Because sandbox without allow-same-origin gives opaque origin,
    // we compare event.source to iframe.contentWindow
    if (event.source !== iframe.contentWindow) {
      return; // Silently drop — not from our iframe
    }

    // Validate message shape
    const message = validateWidgetMessage(event.data);
    if (!message) {
      return; // Silently drop malformed messages
    }

    // Rate limiting for EMIT messages
    if (message.type === 'EMIT') {
      if (!rateLimiter.check(instanceId)) {
        return; // Silently drop — rate limited
      }
    }

    // Handle READY signal — flush queue
    if (message.type === 'READY' && !ready) {
      ready = true;
      // Flush queued messages
      const queued = queue.flush();
      for (const msg of queued) {
        iframe.contentWindow?.postMessage(msg, '*');
      }
    }

    // Dispatch to all registered handlers
    for (const handler of handlers) {
      try {
        handler(message);
      } catch (err) {
        console.error(`[WidgetBridge][${instanceId}] Handler error:`, err);
      }
    }
  }

  // Attach global message listener
  window.addEventListener('message', handleMessage);

  return {
    send(message: HostMessage): void {
      if (!ready && message.type !== 'INIT' && message.type !== 'DESTROY') {
        // Queue messages sent before widget is ready
        queue.enqueue(message);
        return;
      }
      iframe.contentWindow?.postMessage(message, '*');
    },

    onMessage(handler: (message: WidgetMessage) => void): void {
      handlers.add(handler);
    },

    isReady(): boolean {
      return ready;
    },

    destroy(): void {
      window.removeEventListener('message', handleMessage);
      queue.clear();
      handlers.clear();
      rateLimiter.reset(instanceId);
    },
  };
}
