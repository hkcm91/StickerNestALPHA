import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createAIGenerator, createDefaultAIGenerator, validateWidgetHtml } from './ai-generator';

describe('validateWidgetHtml', () => {
  it('accepts valid HTML with script', () => {
    const result = validateWidgetHtml('<div><script>StickerNest.ready();</script></div>');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects empty string', () => {
    const result = validateWidgetHtml('');
    expect(result.valid).toBe(false);
  });

  it('rejects non-HTML content', () => {
    const result = validateWidgetHtml('just plain text no tags at all');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not appear to be valid HTML');
  });

  it('rejects remote script sources', () => {
    const result = validateWidgetHtml('<script src="https://evil.com/hack.js"></script><div></div>');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('remote script');
  });
});

describe('createAIGenerator', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('starts with no last result', () => {
    const gen = createAIGenerator('/api/generate');
    expect(gen.getLastResult()).toBeNull();
    expect(gen.isGenerating()).toBe(false);
  });

  it('generates valid HTML via proxy', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html: '<div><script>StickerNest.ready();</script></div>' }),
    });

    const gen = createAIGenerator('/api/generate');
    const result = await gen.generate('Make a counter widget');

    expect(result.isValid).toBe(true);
    expect(result.html).toContain('StickerNest.ready()');
    expect(gen.getLastResult()).toEqual(result);
  });

  it('reports invalid HTML from proxy', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html: 'not html' }),
    });

    const gen = createAIGenerator('/api/generate');
    const result = await gen.generate('test');

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles proxy error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const gen = createAIGenerator('/api/generate');
    const result = await gen.generate('test');

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('500');
  });

  it('handles network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const gen = createAIGenerator('/api/generate');
    const result = await gen.generate('test');

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Network failure');
  });

  it('can cancel an in-progress generation', async () => {
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    const gen = createAIGenerator('/api/generate');
    const promise = gen.generate('test');

    // Cancel before fetch resolves
    gen.cancel();

    const result = await promise;
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('cancelled');
  });

  it('sends correct request body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html: '<div></div>' }),
    });

    const gen = createAIGenerator('/api/generate');
    await gen.generate('Build a clock');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/generate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ prompt: 'Build a clock', type: 'widget-generation' }),
      }),
    );
  });
});

describe('createDefaultAIGenerator', () => {
  it('returns error generator when VITE_AI_PROXY_URL is not set', async () => {
    const gen = createDefaultAIGenerator();
    const result = await gen.generate('test');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('not configured');
    expect(gen.isGenerating()).toBe(false);
    expect(gen.getLastResult()).toBeNull();
  });
});
