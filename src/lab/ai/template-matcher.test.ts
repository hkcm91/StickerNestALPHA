/**
 * Template Matcher Tests
 *
 * @module lab/ai
 * @layer L2
 */

import { describe, it, expect } from 'vitest';

import { matchTemplates, bestMatch } from './template-matcher';

describe('matchTemplates', () => {
  it('matches "filter and transform data" to Data Flow', () => {
    const results = matchTemplates('I want to filter and transform data from a source');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].template.id).toBe('tpl-data-flow');
  });

  it('matches "sync two widgets" to Bidirectional Sync', () => {
    const results = matchTemplates('sync two widgets bidirectional');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].template.id).toBe('tpl-bidirectional-sync');
  });

  it('matches "broadcast to all" to Fan-Out', () => {
    const results = matchTemplates('broadcast events to multiple targets');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].template.id).toBe('tpl-fan-out');
  });

  it('matches "sensor readings" to Sensor Pipeline', () => {
    const results = matchTemplates('collect sensor readings and batch them');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].template.id).toBe('tpl-sensor-pipeline');
  });

  it('matches "AI summarize" to AI Processing', () => {
    const results = matchTemplates('use AI to summarize text');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].template.id).toBe('tpl-ai-processing');
  });

  it('returns empty for unrelated description', () => {
    const results = matchTemplates('completely unrelated request about cooking recipes');
    expect(results).toHaveLength(0);
  });

  it('sorts by score descending', () => {
    const results = matchTemplates('filter data flow stream');
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });

  it('boosts score for template name match', () => {
    const results = matchTemplates('I want a Data Flow pipeline');
    expect(results[0].template.id).toBe('tpl-data-flow');
    expect(results[0].score).toBeGreaterThanOrEqual(0.5);
  });
});

describe('bestMatch', () => {
  it('returns best matching template', () => {
    const tpl = bestMatch('broadcast to all widgets');
    expect(tpl).not.toBeNull();
    expect(tpl!.id).toBe('tpl-fan-out');
  });

  it('returns null when no match exceeds threshold', () => {
    expect(bestMatch('completely unrelated', 0.5)).toBeNull();
  });

  it('respects minScore parameter', () => {
    // This should match weakly
    const weak = bestMatch('some data', 0.99);
    expect(weak).toBeNull();
  });
});
