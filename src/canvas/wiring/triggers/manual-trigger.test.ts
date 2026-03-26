/**
 * Manual Trigger — unit tests
 * @module canvas/wiring/triggers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CanvasEvents } from '@sn/types';

vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn() },
}));

import { bus } from '../../../kernel/bus';

import { createManualTrigger } from './manual-trigger';

describe('manual-trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should emit pipeline event when fired', () => {
    const trigger = createManualTrigger({ pipelineId: 'pipe-1' });
    trigger.fire();

    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.PIPELINE_NODE_ADDED,
      expect.objectContaining({
        pipelineId: 'pipe-1',
        triggerType: 'manual',
      }),
    );
  });

  it('should pass payload when provided', () => {
    const trigger = createManualTrigger({ pipelineId: 'pipe-2' });
    trigger.fire({ key: 'value' });

    expect(bus.emit).toHaveBeenCalledWith(
      CanvasEvents.PIPELINE_NODE_ADDED,
      expect.objectContaining({
        payload: { key: 'value' },
      }),
    );
  });

  it('should have correct type and label', () => {
    const trigger = createManualTrigger({
      pipelineId: 'pipe-3',
      label: 'Custom Label',
    });
    expect(trigger.type).toBe('manual');
    expect(trigger.label).toBe('Custom Label');
    expect(trigger.pipelineId).toBe('pipe-3');
  });
});
