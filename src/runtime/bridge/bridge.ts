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

import type { HostMessage, WidgetMessage } from './message-types';

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
  _iframe: HTMLIFrameElement,
  _instanceId: string,
): WidgetBridge {
  // TODO: Implement — see runtime plan section 2.2
  throw new Error('Not implemented: createWidgetBridge');
}
