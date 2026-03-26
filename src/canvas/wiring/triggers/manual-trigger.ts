/**
 * Manual Trigger — fires a pipeline on user button click.
 *
 * @module canvas/wiring/triggers
 * @layer L4A-3
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

export interface ManualTriggerConfig {
  pipelineId: string;
  label?: string;
}

/**
 * Creates a manual trigger that emits a pipeline start event when fired.
 */
export function createManualTrigger(config: ManualTriggerConfig) {
  return {
    type: 'manual' as const,
    pipelineId: config.pipelineId,
    label: config.label ?? 'Run Pipeline',

    fire(payload?: Record<string, unknown>) {
      bus.emit(CanvasEvents.PIPELINE_NODE_ADDED, {
        pipelineId: config.pipelineId,
        triggerType: 'manual',
        payload: payload ?? {},
        firedAt: new Date().toISOString(),
      });
    },
  };
}
