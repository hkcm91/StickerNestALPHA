/**
 * Widget Lifecycle State Machine
 *
 * Manages the lifecycle of a widget instance:
 * UNLOADED → LOADING → INITIALIZING → READY → RUNNING → DESTROYING → DEAD
 * With ERROR state for crash recovery.
 *
 * @module runtime/lifecycle
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

/**
 * Widget lifecycle states.
 */
export type WidgetLifecycleState =
  | 'UNLOADED'
  | 'LOADING'
  | 'INITIALIZING'
  | 'READY'
  | 'RUNNING'
  | 'DESTROYING'
  | 'DEAD'
  | 'ERROR';

/**
 * Lifecycle transition event.
 */
export interface LifecycleTransition {
  from: WidgetLifecycleState;
  to: WidgetLifecycleState;
  instanceId: string;
  timestamp: number;
}

/**
 * Manages the lifecycle of a single widget instance.
 */
export interface WidgetLifecycleManager {
  /** Current lifecycle state */
  getState(): WidgetLifecycleState;
  /** Transition to a new state */
  transition(to: WidgetLifecycleState): void;
  /** Subscribe to state transitions */
  onTransition(handler: (transition: LifecycleTransition) => void): void;
  /** Destroy and clean up */
  destroy(): void;
}

/**
 * Creates a lifecycle manager for a widget instance.
 *
 * @param instanceId - The widget instance ID
 * @returns A WidgetLifecycleManager
 */
export function createLifecycleManager(_instanceId: string): WidgetLifecycleManager {
  // TODO: Implement — see runtime plan section 2.4
  throw new Error('Not implemented: createLifecycleManager');
}
