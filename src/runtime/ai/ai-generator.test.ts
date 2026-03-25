/**
 * AI Generator Shared Core Tests
 *
 * @module runtime/ai
 * @layer L3
 */

import { describe, it, expect, vi } from 'vitest';

import { validateWidgetHtml, extractHtml } from './ai-generator';
import { AI_MODELS, getDefaultModel, getModelById } from './models';

// Mock supabase
vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { success: true, html: '<html><body><script>StickerNest.ready()</script></body></html>' },
        error: null,
      }),
    },
  },
}));

describe('validateWidgetHtml', () => {
  it('accepts valid HTML with script tag', () => {
    const result = validateWidgetHtml('<html><body><script>console.log("hi")</script></body></html>');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts HTML with div tag', () => {
    const result = validateWidgetHtml('<div>Hello</div>');
    expect(result.valid).toBe(true);
  });

  it('rejects empty string', () => {
    const result = validateWidgetHtml('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects non-HTML text', () => {
    const result = validateWidgetHtml('This is just plain text without any HTML');
    expect(result.valid).toBe(false);
  });

  it('rejects remote script sources', () => {
    const result = validateWidgetHtml('<html><script src="https://evil.com/hack.js"></script></html>');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Generated widget must not include remote script sources');
  });

  it('rejects null/undefined', () => {
    expect(validateWidgetHtml(null as unknown as string).valid).toBe(false);
    expect(validateWidgetHtml(undefined as unknown as string).valid).toBe(false);
  });
});

describe('extractHtml', () => {
  it('extracts HTML from markdown code fence', () => {
    const input = 'Here is the widget:\n```html\n<html><body>hi</body></html>\n```\nEnjoy!';
    expect(extractHtml(input)).toBe('<html><body>hi</body></html>');
  });

  it('returns raw HTML if no fence', () => {
    const input = '<html><body>hi</body></html>';
    expect(extractHtml(input)).toBe(input);
  });

  it('extracts DOCTYPE HTML from conversational text', () => {
    const input = 'Sure! Here is your widget:\n<!DOCTYPE html><html><body>hi</body></html>\nLet me know!';
    expect(extractHtml(input)).toContain('<!DOCTYPE html>');
  });

  it('handles empty string', () => {
    expect(extractHtml('')).toBe('');
  });
});

describe('AI_MODELS', () => {
  it('has at least one model', () => {
    expect(AI_MODELS.length).toBeGreaterThan(0);
  });

  it('has exactly one default model', () => {
    const defaults = AI_MODELS.filter((m) => m.isDefault);
    expect(defaults).toHaveLength(1);
  });

  it('all models have required fields', () => {
    for (const model of AI_MODELS) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.provider).toMatch(/^(anthropic|replicate)$/);
      expect(model.description).toBeTruthy();
    }
  });
});

describe('getDefaultModel', () => {
  it('returns the default model', () => {
    const model = getDefaultModel();
    expect(model.isDefault).toBe(true);
  });
});

describe('getModelById', () => {
  it('returns matching model', () => {
    const model = getModelById('anthropic/claude-sonnet-4');
    expect(model.id).toBe('anthropic/claude-sonnet-4');
  });

  it('falls back to default for unknown id', () => {
    const model = getModelById('nonexistent');
    expect(model.isDefault).toBe(true);
  });
});
