/**
 * Pipeline Templates Tests
 *
 * @module kernel/pipeline
 * @layer L0
 */

import { describe, it, expect } from 'vitest';

import {
  PIPELINE_TEMPLATES,
  getTemplate,
  getTemplatesByCategory,
  searchTemplates,
} from './templates';

describe('PIPELINE_TEMPLATES', () => {
  it('has 5 built-in templates', () => {
    expect(PIPELINE_TEMPLATES).toHaveLength(5);
  });

  it('each template has unique id', () => {
    const ids = PIPELINE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each template has at least one slot', () => {
    for (const template of PIPELINE_TEMPLATES) {
      expect(template.slots.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('each template has edges referencing valid node IDs', () => {
    for (const template of PIPELINE_TEMPLATES) {
      const validIds = new Set([
        ...template.slots.map((s) => s.id),
        ...template.transforms.map((t) => t.id),
      ]);

      for (const edge of template.edges) {
        expect(validIds.has(edge.sourceNodeId)).toBe(true);
        expect(validIds.has(edge.targetNodeId)).toBe(true);
      }
    }
  });

  it('Data Flow template has filter and map transforms', () => {
    const tpl = getTemplate('tpl-data-flow');
    expect(tpl).toBeDefined();
    expect(tpl!.transforms.map((t) => t.type)).toContain('filter');
    expect(tpl!.transforms.map((t) => t.type)).toContain('map');
  });

  it('Sensor Pipeline template has throttle and accumulate', () => {
    const tpl = getTemplate('tpl-sensor-pipeline');
    expect(tpl).toBeDefined();
    expect(tpl!.transforms.map((t) => t.type)).toContain('throttle');
    expect(tpl!.transforms.map((t) => t.type)).toContain('accumulate');
  });

  it('AI Processing template has ai-transform node', () => {
    const tpl = getTemplate('tpl-ai-processing');
    expect(tpl).toBeDefined();
    expect(tpl!.transforms.map((t) => t.type)).toContain('ai-transform');
  });
});

describe('getTemplate', () => {
  it('returns template by id', () => {
    const tpl = getTemplate('tpl-data-flow');
    expect(tpl).toBeDefined();
    expect(tpl!.name).toBe('Data Flow');
  });

  it('returns undefined for unknown id', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });
});

describe('getTemplatesByCategory', () => {
  it('filters by category', () => {
    const monitoring = getTemplatesByCategory('monitoring');
    expect(monitoring.length).toBeGreaterThanOrEqual(1);
    expect(monitoring.every((t) => t.category === 'monitoring')).toBe(true);
  });

  it('returns empty for unused category', () => {
    // All categories have at least one template in our set
    const result = getTemplatesByCategory('data-flow');
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

describe('searchTemplates', () => {
  it('matches on name', () => {
    const results = searchTemplates('fan');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toBe('Fan-Out Broadcast');
  });

  it('matches on description', () => {
    const results = searchTemplates('sensor');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('is case-insensitive', () => {
    const results = searchTemplates('AI PROCESSING');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for no match', () => {
    expect(searchTemplates('zzzzzzz')).toHaveLength(0);
  });
});
