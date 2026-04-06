/**
 * Widget Upload schema tests
 *
 * @module @sn/types/widget-upload
 * @layer L0
 */

import { describe, it, expect } from 'vitest';

import {
  ReviewStatusSchema,
  SecurityFlagSchema,
  SecurityScanResultSchema,
  UploadInputTypeSchema,
} from './widget-upload';

describe('UploadInputTypeSchema', () => {
  it('accepts valid input types', () => {
    expect(UploadInputTypeSchema.parse('html')).toBe('html');
    expect(UploadInputTypeSchema.parse('zip')).toBe('zip');
    expect(UploadInputTypeSchema.parse('source')).toBe('source');
  });

  it('rejects invalid input types', () => {
    expect(() => UploadInputTypeSchema.parse('pdf')).toThrow();
    expect(() => UploadInputTypeSchema.parse('')).toThrow();
  });
});

describe('ReviewStatusSchema', () => {
  it('accepts valid review statuses', () => {
    expect(ReviewStatusSchema.parse('pending')).toBe('pending');
    expect(ReviewStatusSchema.parse('approved')).toBe('approved');
    expect(ReviewStatusSchema.parse('flagged')).toBe('flagged');
    expect(ReviewStatusSchema.parse('rejected')).toBe('rejected');
  });

  it('rejects invalid statuses', () => {
    expect(() => ReviewStatusSchema.parse('unknown')).toThrow();
    expect(() => ReviewStatusSchema.parse('')).toThrow();
  });
});

describe('SecurityFlagSchema', () => {
  it('validates a complete security flag', () => {
    const flag = {
      severity: 'critical',
      rule: 'eval-usage',
      message: 'eval() detected',
      line: 42,
    };
    expect(SecurityFlagSchema.parse(flag)).toEqual(flag);
  });

  it('allows optional line number', () => {
    const flag = {
      severity: 'warning',
      rule: 'innerhtml-dynamic',
      message: 'innerHTML assignment detected',
    };
    const parsed = SecurityFlagSchema.parse(flag);
    expect(parsed.line).toBeUndefined();
  });

  it('rejects invalid severity', () => {
    expect(() =>
      SecurityFlagSchema.parse({
        severity: 'info',
        rule: 'test',
        message: 'test',
      }),
    ).toThrow();
  });
});

describe('SecurityScanResultSchema', () => {
  it('validates a passing scan result', () => {
    const result = {
      passed: true,
      score: 100,
      flags: [],
    };
    expect(SecurityScanResultSchema.parse(result)).toEqual(result);
  });

  it('validates a failing scan result with flags', () => {
    const result = {
      passed: false,
      score: 40,
      flags: [
        { severity: 'critical' as const, rule: 'eval-usage', message: 'eval detected', line: 5 },
        { severity: 'warning' as const, rule: 'innerhtml-dynamic', message: 'innerHTML used' },
      ],
    };
    const parsed = SecurityScanResultSchema.parse(result);
    expect(parsed.flags).toHaveLength(2);
  });

  it('rejects score out of range', () => {
    expect(() =>
      SecurityScanResultSchema.parse({ passed: true, score: 101, flags: [] }),
    ).toThrow();
    expect(() =>
      SecurityScanResultSchema.parse({ passed: true, score: -1, flags: [] }),
    ).toThrow();
  });
});
