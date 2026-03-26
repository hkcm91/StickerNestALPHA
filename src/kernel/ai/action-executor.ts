/**
 * AI Action Executor
 *
 * Maps AIAction[] to bus events that the canvas core and other
 * layers already handle. This is the bridge between structured
 * AI output and the existing entity lifecycle.
 *
 * @module kernel/ai
 */

import type { AIAction, AIActionBatch } from '@sn/types';
import { AIActionSchema, CanvasEvents } from '@sn/types';

import { bus } from '../bus';

// ---------------------------------------------------------------------------
// Execution result types
// ---------------------------------------------------------------------------

export interface ActionResult {
  action: AIAction;
  success: boolean;
  entityId?: string;
  error?: string;
}

export interface ExecutionResult {
  results: ActionResult[];
  succeeded: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Individual action executors
// ---------------------------------------------------------------------------

function executeCreateSticker(action: AIAction & { action: 'create_sticker' }): ActionResult {
  const entityId = crypto.randomUUID();
  bus.emit(CanvasEvents.ENTITY_CREATED, {
    id: entityId,
    type: 'sticker',
    assetUrl: action.assetUrl,
    assetType: action.assetType ?? 'image',
    transform: {
      position: action.position,
      size: action.size ?? { width: 200, height: 200 },
      rotation: 0,
      scale: 1,
    },
    name: action.name,
  });
  return { action, success: true, entityId };
}

function executeCreateWidget(action: AIAction & { action: 'create_widget' }): ActionResult {
  const entityId = crypto.randomUUID();
  const widgetInstanceId = crypto.randomUUID();
  bus.emit(CanvasEvents.ENTITY_CREATED, {
    id: entityId,
    type: 'widget',
    widgetId: action.widgetId,
    widgetInstanceId,
    config: action.config ?? {},
    transform: {
      position: action.position,
      size: action.size ?? { width: 300, height: 200 },
      rotation: 0,
      scale: 1,
    },
    name: action.name,
  });
  return { action, success: true, entityId };
}

function executeCreateText(action: AIAction & { action: 'create_text' }): ActionResult {
  const entityId = crypto.randomUUID();
  bus.emit(CanvasEvents.ENTITY_CREATED, {
    id: entityId,
    type: 'text',
    content: action.content,
    fontSize: action.fontSize ?? 16,
    fontFamily: action.fontFamily ?? 'system-ui',
    color: action.color ?? '#000000',
    fontWeight: 400,
    textAlign: 'left',
    transform: {
      position: action.position,
      size: { width: 200, height: 40 },
      rotation: 0,
      scale: 1,
    },
    name: action.name,
  });
  return { action, success: true, entityId };
}

function executeCreateShape(action: AIAction & { action: 'create_shape' }): ActionResult {
  const entityId = crypto.randomUUID();
  bus.emit(CanvasEvents.ENTITY_CREATED, {
    id: entityId,
    type: 'shape',
    shapeType: action.shapeType,
    fill: action.fill ?? null,
    stroke: action.stroke ?? '#000000',
    strokeWidth: action.strokeWidth ?? 1,
    transform: {
      position: action.position,
      size: action.size,
      rotation: 0,
      scale: 1,
    },
    name: action.name,
  });
  return { action, success: true, entityId };
}

function executeMoveEntity(action: AIAction & { action: 'move_entity' }): ActionResult {
  bus.emit(CanvasEvents.ENTITY_MOVED, {
    entityId: action.entityId,
    position: action.position,
  });
  return { action, success: true, entityId: action.entityId };
}

function executeUpdateEntity(action: AIAction & { action: 'update_entity' }): ActionResult {
  bus.emit(CanvasEvents.ENTITY_UPDATED, {
    id: action.entityId,
    updates: action.updates,
  });
  return { action, success: true, entityId: action.entityId };
}

function executeDeleteEntity(action: AIAction & { action: 'delete_entity' }): ActionResult {
  bus.emit(CanvasEvents.ENTITY_DELETED, {
    id: action.entityId,
  });
  return { action, success: true, entityId: action.entityId };
}

function executeTriggerGeneration(action: AIAction & { action: 'trigger_generation' }): ActionResult {
  // Emit an AI generation request event — the image generator widget
  // or a dedicated handler will pick this up
  bus.emit('ai.generation.requested', {
    prompt: action.prompt,
    position: action.position,
    size: action.size,
  });
  return { action, success: true };
}

function executeEmitEvent(action: AIAction & { action: 'emit_event' }): ActionResult {
  bus.emit(action.eventType, action.payload);
  return { action, success: true };
}

// ---------------------------------------------------------------------------
// Dispatch map
// ---------------------------------------------------------------------------

type ActionExecutor = (action: never) => ActionResult;

const executors: Record<string, ActionExecutor> = {
  create_sticker: executeCreateSticker as ActionExecutor,
  create_widget: executeCreateWidget as ActionExecutor,
  create_text: executeCreateText as ActionExecutor,
  create_shape: executeCreateShape as ActionExecutor,
  move_entity: executeMoveEntity as ActionExecutor,
  update_entity: executeUpdateEntity as ActionExecutor,
  delete_entity: executeDeleteEntity as ActionExecutor,
  trigger_generation: executeTriggerGeneration as ActionExecutor,
  emit_event: executeEmitEvent as ActionExecutor,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a single AI action by dispatching the appropriate bus event.
 * Accepts raw action objects — defaults are applied via Zod parse.
 */
export function executeAIAction(rawAction: Record<string, unknown>): ActionResult {
  // Parse through schema to apply defaults (e.g., assetType: 'image')
  const parsed = AIActionSchema.safeParse(rawAction);
  if (!parsed.success) {
    return {
      action: rawAction as AIAction,
      success: false,
      error: `Invalid action: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    };
  }

  const action = parsed.data;
  const executor = executors[action.action];
  if (!executor) {
    return { action, success: false, error: `Unknown action type: ${action.action}` };
  }

  try {
    return executor(action as never);
  } catch (err) {
    return {
      action,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Execute a batch of AI actions in order. Each action is executed
 * synchronously (bus events are sync). Returns results for all actions.
 */
export function executeAIActions(actions: Record<string, unknown>[]): ExecutionResult {
  const results: ActionResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const action of actions) {
    const result = executeAIAction(action);
    results.push(result);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return { results, succeeded, failed };
}

/**
 * Execute an AI action batch (parsed from structured AI output).
 */
export function executeAIActionBatch(batch: AIActionBatch): ExecutionResult {
  return executeAIActions(batch.actions);
}
