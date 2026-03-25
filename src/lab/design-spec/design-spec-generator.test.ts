import { describe, it, expect } from 'vitest';

import type { AIGenerator } from '../ai/ai-generator';

import { generateDesignSpec } from './design-spec-generator';

function mockGenerator(html: string): AIGenerator {
  return {
    async generate() {
      return { html, isValid: true, errors: [] };
    },
    async generateStream(_prompt: string, onChunk: (partialHtml: string) => void) {
      onChunk(html);
      return { html, isValid: true, errors: [] };
    },
    async explain() {
      return { text: '', error: null };
    },
    isGenerating() { return false; },
    cancel() {},
    getLastResult() { return null; },
    setModel() {},
    getModel() { return { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic' as const, description: 'Test' }; },
  };
}

describe('generateDesignSpec', () => {
  it('parses valid JSON response into WidgetDesignSpec', async () => {
    const gen = mockGenerator(JSON.stringify({
      version: 1,
      name: 'Dark Theme',
      colors: { primary: '#6366f1', background: '#1a1a1a' },
    }));

    const result = await generateDesignSpec(gen, 'A dark-themed timer widget');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Dark Theme');
    expect(result?.colors?.primary).toBe('#6366f1');
  });

  it('handles JSON inside code fences', async () => {
    const gen = mockGenerator('```json\n{"version": 1, "name": "Fenced"}\n```');
    const result = await generateDesignSpec(gen, 'test');
    expect(result?.name).toBe('Fenced');
  });

  it('returns null for invalid JSON', async () => {
    const gen = mockGenerator('this is not json at all');
    const result = await generateDesignSpec(gen, 'test');
    expect(result).toBeNull();
  });

  it('returns null for empty response', async () => {
    const gen = mockGenerator('');
    const result = await generateDesignSpec(gen, 'test');
    expect(result).toBeNull();
  });

  it('returns null for JSON that fails schema validation', async () => {
    const gen = mockGenerator(JSON.stringify({
      version: 999,
      name: 'Bad version',
    }));
    const result = await generateDesignSpec(gen, 'test');
    expect(result).toBeNull();
  });
});
