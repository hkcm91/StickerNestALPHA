/**
 * Cron Trigger — unit tests
 * @module canvas/wiring/triggers
 */

import { describe, it, expect } from 'vitest';

import { parseCronExpression, matchesCron } from './cron-trigger';

describe('parseCronExpression', () => {
  it('should parse * * * * * as all values', () => {
    const cron = parseCronExpression('* * * * *');
    expect(cron.minute).toHaveLength(60);
    expect(cron.hour).toHaveLength(24);
    expect(cron.dayOfMonth).toHaveLength(31);
    expect(cron.month).toHaveLength(12);
    expect(cron.dayOfWeek).toHaveLength(7);
  });

  it('should parse specific values', () => {
    const cron = parseCronExpression('0 9 * * *');
    expect(cron.minute).toEqual([0]);
    expect(cron.hour).toEqual([9]);
  });

  it('should parse comma-separated values', () => {
    const cron = parseCronExpression('0,30 9,17 * * *');
    expect(cron.minute).toEqual([0, 30]);
    expect(cron.hour).toEqual([9, 17]);
  });

  it('should parse ranges', () => {
    const cron = parseCronExpression('0 9-17 * * 1-5');
    expect(cron.hour).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(cron.dayOfWeek).toEqual([1, 2, 3, 4, 5]);
  });

  it('should throw on invalid expression', () => {
    expect(() => parseCronExpression('0 9')).toThrow('expected 5 fields');
  });
});

describe('matchesCron', () => {
  it('should match when all fields align', () => {
    const cron = parseCronExpression('30 9 * * *');
    // March 26, 2026 at 9:30
    const date = new Date(2026, 2, 26, 9, 30);
    expect(matchesCron(date, cron)).toBe(true);
  });

  it('should not match when minute differs', () => {
    const cron = parseCronExpression('30 9 * * *');
    const date = new Date(2026, 2, 26, 9, 31);
    expect(matchesCron(date, cron)).toBe(false);
  });

  it('should match every minute', () => {
    const cron = parseCronExpression('* * * * *');
    expect(matchesCron(new Date(), cron)).toBe(true);
  });

  it('should respect day of week', () => {
    const cron = parseCronExpression('0 9 * * 1'); // Monday only
    // Find a Monday
    const monday = new Date(2026, 2, 23, 9, 0); // March 23, 2026 is Monday
    expect(matchesCron(monday, cron)).toBe(true);
    // Tuesday
    const tuesday = new Date(2026, 2, 24, 9, 0);
    expect(matchesCron(tuesday, cron)).toBe(false);
  });
});
