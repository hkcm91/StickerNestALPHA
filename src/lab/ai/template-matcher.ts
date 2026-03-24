/**
 * Template Matcher — suggests pipeline templates from natural language.
 *
 * Uses keyword matching for instant local results. Falls back to AI
 * for ambiguous requests when a generator is provided.
 *
 * @module lab/ai
 * @layer L2
 */

import {
  PIPELINE_TEMPLATES,
  type PipelineTemplate,
} from '../../kernel/pipeline/templates';

// ─── Types ───────────────────────────────────────────────────────────

export interface TemplateMatch {
  template: PipelineTemplate;
  score: number;
  reason: string;
}

// ─── Keyword Map ─────────────────────────────────────────────────────

const KEYWORD_MAP: Record<string, string[]> = {
  'tpl-data-flow': [
    'data', 'flow', 'filter', 'transform', 'process', 'route', 'pipe',
    'source', 'display', 'stream', 'etl',
  ],
  'tpl-bidirectional-sync': [
    'sync', 'bidirectional', 'two-way', 'mirror', 'keep in sync',
    'synchronize', 'both ways', 'mutual',
  ],
  'tpl-fan-out': [
    'broadcast', 'fan-out', 'fanout', 'distribute', 'multiple',
    'all', 'every', 'replicate', 'clone', 'split',
  ],
  'tpl-sensor-pipeline': [
    'sensor', 'iot', 'monitor', 'collect', 'batch', 'aggregate',
    'readings', 'telemetry', 'metrics', 'chart', 'dashboard',
  ],
  'tpl-ai-processing': [
    'ai', 'llm', 'gpt', 'claude', 'intelligent', 'smart', 'summarize',
    'analyze', 'sentiment', 'extract', 'classify', 'generate',
  ],
};

// ─── Matcher ─────────────────────────────────────────────────────────

/**
 * Matches a natural language description against pipeline templates
 * using keyword scoring.
 *
 * @returns Matches sorted by score descending. Empty if no match.
 */
export function matchTemplates(description: string): TemplateMatch[] {
  const lower = description.toLowerCase();
  const tokens = lower.split(/\s+/);
  const results: TemplateMatch[] = [];

  for (const template of PIPELINE_TEMPLATES) {
    const keywords = KEYWORD_MAP[template.id] ?? [];
    let hits = 0;
    const matchedKeywords: string[] = [];

    for (const kw of keywords) {
      if (kw.includes(' ')) {
        // Multi-word keyword — check if phrase is in description
        if (lower.includes(kw)) {
          hits += 2; // Phrase matches worth more
          matchedKeywords.push(kw);
        }
      } else {
        // Single word — check tokens
        if (tokens.includes(kw) || lower.includes(kw)) {
          hits++;
          matchedKeywords.push(kw);
        }
      }
    }

    // Also check if template name appears in description
    if (lower.includes(template.name.toLowerCase())) {
      hits += 3;
      matchedKeywords.push(template.name);
    }

    if (hits > 0) {
      const score = Math.min(1.0, hits / 4); // Normalize: 4+ hits → 1.0
      results.push({
        template,
        score,
        reason: `Matched keywords: ${matchedKeywords.join(', ')}`,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Returns the best matching template, or null if no match exceeds the threshold.
 */
export function bestMatch(description: string, minScore = 0.25): PipelineTemplate | null {
  const matches = matchTemplates(description);
  if (matches.length === 0 || matches[0].score < minScore) return null;
  return matches[0].template;
}
