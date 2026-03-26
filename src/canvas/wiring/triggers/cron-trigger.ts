/**
 * Cron Trigger — fires a pipeline on a schedule.
 *
 * Uses a simple cron expression parser. For production, would use
 * a Supabase edge function for server-side scheduling.
 *
 * @module canvas/wiring/triggers
 * @layer L4A-3
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

export interface CronTriggerConfig {
  pipelineId: string;
  /** Cron expression (e.g., '0 9 * * *' for 9am daily) */
  expression: string;
  /** Timezone for the schedule */
  timezone?: string;
  /** Whether the trigger is currently active */
  enabled?: boolean;
}

export interface CronField {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

/**
 * Parse a simple cron expression into field ranges.
 * Supports: numbers, *, commas, and ranges (e.g., 1-5).
 * Does not support step values (/) — use a full cron-parser lib for production.
 */
export function parseCronExpression(expr: string): CronField {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: expected 5 fields, got ${parts.length}`);
  }

  return {
    minute: parseField(parts[0], 0, 59),
    hour: parseField(parts[1], 0, 23),
    dayOfMonth: parseField(parts[2], 1, 31),
    month: parseField(parts[3], 1, 12),
    dayOfWeek: parseField(parts[4], 0, 6),
  };
}

function parseField(field: string, min: number, max: number): number[] {
  if (field === '*') {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }

  const values: number[] = [];
  for (const part of field.split(',')) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) values.push(i);
      }
    } else {
      const num = Number(part);
      if (num >= min && num <= max) values.push(num);
    }
  }

  return values;
}

/**
 * Check if a Date matches a parsed cron schedule.
 */
export function matchesCron(date: Date, cron: CronField): boolean {
  return (
    cron.minute.includes(date.getMinutes()) &&
    cron.hour.includes(date.getHours()) &&
    cron.dayOfMonth.includes(date.getDate()) &&
    cron.month.includes(date.getMonth() + 1) &&
    cron.dayOfWeek.includes(date.getDay())
  );
}

/**
 * Creates a cron trigger that checks the schedule every minute
 * and fires the pipeline when matched.
 */
export function createCronTrigger(config: CronTriggerConfig) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const cron = parseCronExpression(config.expression);

  return {
    type: 'cron' as const,
    pipelineId: config.pipelineId,
    expression: config.expression,

    start() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (config.enabled === false) return;
        if (matchesCron(new Date(), cron)) {
          bus.emit(CanvasEvents.PIPELINE_NODE_ADDED, {
            pipelineId: config.pipelineId,
            triggerType: 'cron',
            expression: config.expression,
            firedAt: new Date().toISOString(),
          });
        }
      }, 60_000); // Check every minute
    },

    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}
