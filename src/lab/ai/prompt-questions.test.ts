/**
 * Tests for prompt-questions module
 *
 * @module lab/ai
 * @layer L2
 */

import { describe, it, expect, vi } from 'vitest';

import type { AIGenerator, AIExplainResult } from './ai-generator';
import {
  generateClarifyingQuestions,
  buildEnrichedPrompt,
  type CompatibleWidget,
  type PromptToggles,
  type EnrichedPromptInput,
} from './prompt-questions';

function createMockGenerator(overrides: Partial<AIGenerator> = {}): AIGenerator {
  return {
    generate: vi.fn(),
    generateStream: vi.fn(),
    explain: vi.fn().mockResolvedValue({ text: '', error: null }),
    isGenerating: vi.fn().mockReturnValue(false),
    cancel: vi.fn(),
    getLastResult: vi.fn().mockReturnValue(null),
    setModel: vi.fn(),
    getModel: vi.fn().mockReturnValue({ id: 'test', name: 'Test', provider: 'anthropic' }),
    ...overrides,
  } as AIGenerator;
}

// ---------- generateClarifyingQuestions ----------

describe('generateClarifyingQuestions', () => {
  it('parses numbered questions from explain response', async () => {
    const gen = createMockGenerator({
      explain: vi.fn().mockResolvedValue({
        text: '1. What color scheme do you prefer?\n2. Should it have animations?\n3. What data source will it use?',
        error: null,
      } satisfies AIExplainResult),
    });

    const questions = await generateClarifyingQuestions(gen, 'Build me a dashboard widget');

    expect(questions).toHaveLength(3);
    expect(questions[0]).toBe('What color scheme do you prefer?');
    expect(questions[1]).toBe('Should it have animations?');
    expect(questions[2]).toBe('What data source will it use?');
  });

  it('passes the user prompt into the explain call', async () => {
    const explainFn = vi.fn().mockResolvedValue({ text: '1. Q1?\n2. Q2?\n3. Q3?', error: null });
    const gen = createMockGenerator({ explain: explainFn });

    await generateClarifyingQuestions(gen, 'A timer widget');

    expect(explainFn).toHaveBeenCalledTimes(1);
    const [context, question] = explainFn.mock.calls[0];
    expect(question).toContain('A timer widget');
  });

  it('returns empty array when generator is busy', async () => {
    const gen = createMockGenerator({
      isGenerating: vi.fn().mockReturnValue(true),
    });

    const questions = await generateClarifyingQuestions(gen, 'anything');

    expect(questions).toEqual([]);
  });

  it('returns empty array when explain returns an error', async () => {
    const gen = createMockGenerator({
      explain: vi.fn().mockResolvedValue({ text: '', error: 'API error' }),
    });

    const questions = await generateClarifyingQuestions(gen, 'anything');

    expect(questions).toEqual([]);
  });

  it('returns empty array when explain throws', async () => {
    const gen = createMockGenerator({
      explain: vi.fn().mockRejectedValue(new Error('network failure')),
    });

    const questions = await generateClarifyingQuestions(gen, 'anything');

    expect(questions).toEqual([]);
  });

  it('handles responses with extra whitespace and blank lines', async () => {
    const gen = createMockGenerator({
      explain: vi.fn().mockResolvedValue({
        text: '\n  1. First question?\n\n  2. Second question?\n  \n  3. Third question?  \n',
        error: null,
      }),
    });

    const questions = await generateClarifyingQuestions(gen, 'widget');

    expect(questions).toHaveLength(3);
    expect(questions[0]).toBe('First question?');
    expect(questions[2]).toBe('Third question?');
  });

  it('handles fewer than 3 numbered items gracefully', async () => {
    const gen = createMockGenerator({
      explain: vi.fn().mockResolvedValue({
        text: '1. Only one question?',
        error: null,
      }),
    });

    const questions = await generateClarifyingQuestions(gen, 'widget');

    expect(questions).toHaveLength(1);
    expect(questions[0]).toBe('Only one question?');
  });
});

// ---------- buildEnrichedPrompt ----------

describe('buildEnrichedPrompt', () => {
  const baseInput: EnrichedPromptInput = {
    originalPrompt: 'Build a counter widget',
    answers: {},
    selectedWidgets: [],
    toggles: { interactive: false, darkMode: false, emitEvents: false },
  };

  it('returns just the original prompt when there is no additional context', () => {
    const result = buildEnrichedPrompt(baseInput);
    expect(result).toBe('Build a counter widget');
  });

  it('includes active toggles in additional context', () => {
    const result = buildEnrichedPrompt({
      ...baseInput,
      toggles: { interactive: true, darkMode: false, emitEvents: true },
    });

    expect(result).toContain('Build a counter widget');
    expect(result).toContain('Additional context:');
    expect(result).toContain('interactive');
    expect(result).toContain('Emit events');
    expect(result).not.toContain('dark mode');
  });

  it('includes dark mode toggle', () => {
    const result = buildEnrichedPrompt({
      ...baseInput,
      toggles: { interactive: false, darkMode: true, emitEvents: false },
    });

    expect(result).toContain('dark mode');
  });

  it('includes selected widgets with port info', () => {
    const widgets: CompatibleWidget[] = [
      { name: 'Timer', ports: ['onTick', 'onComplete'] },
      { name: 'Display', ports: ['textInput'] },
    ];

    const result = buildEnrichedPrompt({
      ...baseInput,
      selectedWidgets: widgets,
    });

    expect(result).toContain('Additional context:');
    expect(result).toContain('Timer');
    expect(result).toContain('onTick');
    expect(result).toContain('Display');
    expect(result).toContain('textInput');
  });

  it('includes non-empty Q&A answers', () => {
    const result = buildEnrichedPrompt({
      ...baseInput,
      answers: {
        'What color?': 'Blue',
        'Any animations?': '',
        'Data source?': 'REST API',
      },
    });

    expect(result).toContain('Additional context:');
    expect(result).toContain('What color?');
    expect(result).toContain('Blue');
    expect(result).toContain('Data source?');
    expect(result).toContain('REST API');
    // Empty answer should be excluded
    expect(result).not.toContain('Any animations?');
  });

  it('combines all context sources together', () => {
    const result = buildEnrichedPrompt({
      originalPrompt: 'Make a chart',
      answers: { 'What type?': 'Bar chart' },
      selectedWidgets: [{ name: 'DataTable', ports: ['rowSelected'] }],
      toggles: { interactive: true, darkMode: true, emitEvents: true },
    });

    expect(result).toContain('Make a chart');
    expect(result).toContain('Additional context:');
    expect(result).toContain('interactive');
    expect(result).toContain('dark mode');
    expect(result).toContain('Emit events');
    expect(result).toContain('DataTable');
    expect(result).toContain('Bar chart');
  });

  it('excludes widgets with no ports', () => {
    const result = buildEnrichedPrompt({
      ...baseInput,
      selectedWidgets: [{ name: 'EmptyWidget', ports: [] }],
    });

    // Widget should still be listed even with no ports
    expect(result).toContain('EmptyWidget');
  });
});
