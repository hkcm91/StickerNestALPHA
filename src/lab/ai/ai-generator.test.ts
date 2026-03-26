import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client
vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Import the mocked supabase after vi.mock
import { supabase } from '../../kernel/supabase/client';

import { createAIGenerator, createDefaultAIGenerator, validateWidgetHtml } from './ai-generator';

const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

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
  beforeEach(() => {
    mockInvoke.mockReset();
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  it('starts with no last result', () => {
    const gen = createAIGenerator();
    expect(gen.getLastResult()).toBeNull();
    expect(gen.isGenerating()).toBe(false);
  });

  it('generates valid HTML via edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, html: '<div><script>StickerNest.ready();</script></div>' },
      error: null,
    });

    const gen = createAIGenerator();
    const result = await gen.generate('Make a counter widget');

    expect(result.isValid).toBe(true);
    expect(result.html).toContain('StickerNest.ready()');
    expect(gen.getLastResult()).toEqual(result);
  });

  it('reports invalid HTML from edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, html: 'not html' },
      error: null,
    });

    const gen = createAIGenerator();
    const result = await gen.generate('test');

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles edge function error response', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'No API key configured', code: 'NO_API_KEY' },
      error: null,
    });

    const gen = createAIGenerator();
    const result = await gen.generate('test');

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('No API key configured');
  });

  it('handles supabase invoke error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Function not found' },
    });

    const gen = createAIGenerator();
    const result = await gen.generate('test');

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Function not found');
  });

  it('handles auth not available', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    });

    const gen = createAIGenerator();
    const result = await gen.generate('test');

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Not authenticated');
  });

  it('supports model switching', () => {
    const gen = createAIGenerator();

    // Default model
    expect(gen.getModel().id).toBe('anthropic/claude-sonnet-4');

    // Switch to Kimi
    gen.setModel('replicate/kimi-k2.5');
    expect(gen.getModel().id).toBe('replicate/kimi-k2.5');
    expect(gen.getModel().provider).toBe('replicate');

    // Switch back
    gen.setModel('anthropic/claude-sonnet-4');
    expect(gen.getModel().provider).toBe('anthropic');
  });

  it('sends correct provider and model in request', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, html: '<div></div>' },
      error: null,
    });

    const gen = createAIGenerator();
    gen.setModel('replicate/kimi-k2.5');
    await gen.generate('Build a clock');

    expect(mockInvoke).toHaveBeenCalledWith(
      'ai-widget-generate',
      expect.objectContaining({
        body: expect.objectContaining({
          provider: 'replicate',
          model: 'moonshotai/kimi-k2.5',
          type: 'widget-generation',
        }),
      }),
    );
  });

  it('falls back to default model for unknown model id', () => {
    const gen = createAIGenerator();
    gen.setModel('unknown/model');
    expect(gen.getModel().id).toBe('anthropic/claude-sonnet-4');
  });
});

describe('createDefaultAIGenerator', () => {
  it('returns a working generator (same as createAIGenerator)', () => {
    const gen = createDefaultAIGenerator();
    expect(gen.isGenerating()).toBe(false);
    expect(gen.getLastResult()).toBeNull();
    expect(gen.getModel()).toBeDefined();
  });
});
