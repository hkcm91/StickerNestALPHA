/**
 * Timeline Utilities Tests
 *
 * @module shell/canvas/panels/timeline/timeline-utils.test
 */

import { describe, it, expect } from 'vitest';

import {
  timeToPixels,
  pixelsToTime,
  formatTimecode,
  formatTime,
  getTickIntervals,
  snapTime,
  getTrackY,
  getClipColor,
} from './timeline-utils';

describe('timeToPixels', () => {
  it('converts time to pixel position', () => {
    expect(timeToPixels(5, 100, 0)).toBe(500);
  });

  it('accounts for scroll offset', () => {
    expect(timeToPixels(5, 100, 2)).toBe(300);
  });
});

describe('pixelsToTime', () => {
  it('converts pixel position to time', () => {
    expect(pixelsToTime(500, 100, 0)).toBe(5);
  });

  it('accounts for scroll offset', () => {
    expect(pixelsToTime(300, 100, 2)).toBe(5);
  });

  it('round-trips with timeToPixels', () => {
    const time = 7.5;
    const pps = 150;
    const offset = 3;
    const px = timeToPixels(time, pps, offset);
    const result = pixelsToTime(px, pps, offset);
    expect(result).toBeCloseTo(time, 10);
  });
});

describe('formatTimecode', () => {
  it('formats zero correctly', () => {
    expect(formatTimecode(0, 30)).toBe('00:00:00');
  });

  it('formats time with frames', () => {
    expect(formatTimecode(65.5, 30)).toBe('01:05:15');
  });

  it('formats time at 24fps', () => {
    expect(formatTimecode(1, 24)).toBe('00:01:00');
  });
});

describe('formatTime', () => {
  it('formats MM:SS', () => {
    expect(formatTime(125)).toBe('02:05');
  });
});

describe('getTickIntervals', () => {
  it('returns fine ticks at high zoom', () => {
    const { major, minor } = getTickIntervals(500);
    expect(major).toBe(1);
    expect(minor).toBe(0.1);
  });

  it('returns coarse ticks at low zoom', () => {
    const { major, minor } = getTickIntervals(20);
    expect(major).toBe(30);
    expect(minor).toBe(5);
  });
});

describe('snapTime', () => {
  it('snaps to grid when enabled', () => {
    expect(snapTime(2.37, 0.5, true)).toBe(2.5);
  });

  it('does not snap when disabled', () => {
    expect(snapTime(2.37, 0.5, false)).toBe(2.37);
  });
});

describe('getTrackY', () => {
  it('computes cumulative Y position', () => {
    expect(getTrackY(0, [40, 40, 40])).toBe(0);
    expect(getTrackY(1, [40, 40, 40])).toBe(40);
    expect(getTrackY(2, [40, 60, 40])).toBe(100);
  });
});

describe('getClipColor', () => {
  it('returns color for known types', () => {
    expect(getClipColor('video')).toBe('#4f46e5');
    expect(getClipColor('audio')).toBe('#059669');
  });

  it('returns default for unknown types', () => {
    expect(getClipColor('unknown')).toBe('#6b7280');
  });
});
