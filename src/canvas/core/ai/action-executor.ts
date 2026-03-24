/**
 * AI Action Executor
 *
 * Validates and executes AI canvas actions by mapping them to bus events.
 * The scene graph handlers already know how to process these events.
 *
 * @module canvas/core/ai
 * @layer L4A-1
 */

import type {
  AICanvasAction,
  AIActionExecutionResult,
} from '@sn/types';
import { AICanvasActionSchema, CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

/** Rate limit: max actions per minute per source */
const MAX_ACTIONS_PER_MINUTE = 100;

/** Sliding window tracker for rate limiting */
const actionTimestamps = new Map<string, number[]>();

function isRateLimited(sourceId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const timestamps = actionTimestamps.get(sourceId) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  actionTimestamps.set(sourceId, recent);
  return recent.length >= MAX_ACTIONS_PER_MINUTE;
}

function recordAction(sourceId: string): void {
  const timestamps = actionTimestamps.get(sourceId) ?? [];
  timestamps.push(Date.now());
  actionTimestamps.set(sourceId, timestamps);
}

/**
 * Generate a unique entity ID for new entities.
 */
function generateEntityId(): string {
  return `ent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build a minimal CanvasEntity from a create-entity action.
 */
function buildEntityFromAction(action: Extract<AICanvasAction, { type: 'create-entity' }>): Record<string, unknown> {
  const entity: Record<string, unknown> = {
    id: generateEntityId(),
    type: action.entityType,
    name: action.name ?? `AI ${action.entityType}`,
    visible: true,
    locked: false,
    transform: {
      position: action.position,
      size: action.size ?? { width: 200, height: 150 },
      rotation: 0,
      scale: 1,
    },
    zIndex: Date.now(),
    ...action.properties,
  };
  return entity;
}

/**
 * Execute a single AI canvas action.
 */
function executeSingleAction(action: AICanvasAction): { success: boolean; error?: string } {
  switch (action.type) {
    case 'create-entity': {
      const entity = buildEntityFromAction(action);
      bus.emit(CanvasEvents.ENTITY_CREATED, entity);
      return { success: true };
    }

    case 'update-entity': {
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        entityId: action.entityId,
        updates: action.updates,
      });
      return { success: true };
    }

    case 'delete-entity': {
      bus.emit(CanvasEvents.ENTITY_DELETED, {
        entityId: action.entityId,
      });
      return { success: true };
    }

    case 'move-entity': {
      bus.emit(CanvasEvents.ENTITY_MOVED, {
        entityId: action.entityId,
        position: action.position,
      });
      return { success: true };
    }

    case 'emit-event': {
      bus.emit(action.eventType, action.payload);
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown action type: ${(action as { type: string }).type}` };
  }
}

/**
 * Execute a batch of AI canvas actions.
 *
 * Actions are validated, rate-limited, and executed sequentially.
 * Failed actions do not stop the batch — all actions are attempted.
 *
 * @param actions - Array of AI canvas actions to execute
 * @param sourceId - Identifier for rate limiting (e.g., widget instance ID)
 * @returns Execution result with success/failure counts
 */
export function executeAIActions(
  actions: AICanvasAction[],
  sourceId: string = 'default',
): AIActionExecutionResult {
  const result: AIActionExecutionResult = {
    succeeded: 0,
    failed: [],
  };

  if (actions.length > 20) {
    return {
      succeeded: 0,
      failed: actions.map((action) => ({
        action,
        error: 'Batch exceeds maximum of 20 actions',
      })),
    };
  }

  for (const action of actions) {
    // Rate limit check
    if (isRateLimited(sourceId)) {
      result.failed.push({ action, error: 'Rate limit exceeded: 100 actions/minute' });
      continue;
    }

    // Validate action schema
    const parseResult = AICanvasActionSchema.safeParse(action);
    if (!parseResult.success) {
      result.failed.push({ action, error: `Invalid action: ${parseResult.error.message}` });
      continue;
    }

    // Execute
    const execResult = executeSingleAction(parseResult.data);
    if (execResult.success) {
      result.succeeded++;
      recordAction(sourceId);
    } else {
      result.failed.push({ action, error: execResult.error ?? 'Unknown error' });
    }
  }

  return result;
}

/**
 * Reset rate limit tracking (for testing).
 */
export function resetRateLimits(): void {
  actionTimestamps.clear();
}
