import { describe, it, expect } from 'vitest';

import { extractDesignSpec } from './design-spec-extractor';

describe('extractDesignSpec', () => {
  it('extracts colors from HTML with inline styles', () => {
    const html = `
      <div style="color: #ff0000; background-color: #ffffff; border: 1px solid #cccccc;">
        <span style="color: #333333;">Hello</span>
      </div>
    `;
    const result = extractDesignSpec(html);
    expect(result.spec.colors?.background).toBe('#ffffff');
    expect(result.spec.colors?.text).toBe('#ff0000');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('extracts typography from font declarations', () => {
    const html = `
      <style>
        body { font-family: Arial, sans-serif; font-size: 14px; }
      </style>
    `;
    const result = extractDesignSpec(html);
    expect(result.spec.typography?.fontFamily).toBe('Arial, sans-serif');
    expect(result.spec.typography?.fontSizeBase).toBe('14px');
  });

  it('extracts border-radius', () => {
    const html = '<div style="border-radius: 8px;">box</div>';
    const result = extractDesignSpec(html);
    expect(result.spec.borders?.radius).toBe('8px');
  });

  it('extracts spacing from padding/margin values', () => {
    const html = `
      <div style="padding: 4px; margin: 8px;">
        <span style="padding: 16px;">spaced</span>
      </div>
    `;
    const result = extractDesignSpec(html);
    expect(result.spec.spacing?.sm).toBe('4px');
    expect(result.spec.spacing?.md).toBe('8px');
    expect(result.spec.spacing?.lg).toBe('16px');
  });

  it('extracts CSS custom properties', () => {
    const html = `
      <style>
        :root { --my-color: blue; --my-size: 16px; }
      </style>
    `;
    const result = extractDesignSpec(html);
    expect(result.spec.customTokens?.['--my-color']).toBe('blue');
    expect(result.spec.customTokens?.['--my-size']).toBe('16px');
  });

  it('returns low confidence and suggestions for empty HTML', () => {
    const result = extractDesignSpec('<div>Plain text</div>');
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions.some((s) => s.includes('color'))).toBe(true);
  });
});
