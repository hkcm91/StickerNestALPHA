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

import { bus } from '../../kernel/bus';

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
  onTransition(handler: (transition: LifecycleTransition) => void): () => void;
  /** Destroy and clean up */
  destroy(): void;
}

/**
 * Valid state transitions map.
 */
const VALID_TRANSITIONS: Record<WidgetLifecycleState, WidgetLifecycleState[]> = {
  UNLOADED: ['LOADING'],
  LOADING: ['INITIALIZING', 'ERROR'],
  INITIALIZING: ['READY', 'ERROR'],
  READY: ['RUNNING', 'DESTROYING', 'ERROR'],
  RUNNING: ['DESTROYING', 'ERROR'],
  DESTROYING: ['DEAD'],
  DEAD: [],
  ERROR: ['LOADING', 'DEAD'],
};

/**
 * Creates a lifecycle manager for a widget instance.
 *
 * @param instanceId - The widget instance ID
 * @returns A WidgetLifecycleManager
 */
export function createLifecycleManager(instanceId: string): WidgetLifecycleManager {
  let currentState: WidgetLifecycleState = 'UNLOADED';
  const handlers = new Set<(transition: LifecycleTransition) => void>();

  return {
    getState(): WidgetLifecycleState {
      return currentState;
    },

    transition(to: WidgetLifecycleState): void {
      const allowed = VALID_TRANSITIONS[currentState];
      if (!allowed.includes(to)) {
        throw new Error(
          `Invalid lifecycle transition: ${currentState} → ${to} for instance ${instanceId}. ` +
            `Allowed from ${currentState}: [${allowed.join(', ')}]`,
        );
      }

      const from = currentState;
      currentState = to;

      const transition: LifecycleTransition = {
        from,
        to,
        instanceId,
        timestamp: Date.now(),
      };

      // Notify handlers
      for (const handler of handlers) {
        try {
          handler(transition);
        } catch (err) {
          console.error(`[LifecycleManager][${instanceId}] Handler error:`, err);
        }
      }

      // Emit bus events for key transitions
      if (to === 'READY') {
        bus.emit('widget.ready', { instanceId });
      } else if (to === 'ERROR') {
        bus.emit('widget.error', { instanceId, from });
      }
    },

    onTransition(handler: (transition: LifecycleTransition) => void): () => void {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },

    destroy(): void {
      // Transition to terminal state if not already there
      if (currentState !== 'DEAD') {
        if (VALID_TRANSITIONS[currentState].includes('DESTROYING')) {
          currentState = 'DESTROYING';
        }
        currentState = 'DEAD';
      }
      handlers.clear();
    },
  };
}
