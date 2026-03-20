import { describe, it, expect } from 'vitest';

import type { WidgetDesignSpec } from '@sn/types';

import { flattenDesignSpec, generateDesignSpecStyleBlock, injectDesignSpecIntoHtml } from './design-spec-injector';

const SPEC: WidgetDesignSpec = {
  version: 1,
  colors: { primary: '#ff0000', textMuted: '#999' },
  typography: { fontFamily: 'Inter', fontSizeBase: '16px' },
  spacing: { sm: '4px', md: '8px' },
  borders: { radius: '8px', radiusLg: '16px' },
  shadows: { md: '0 2px 4px rgba(0,0,0,0.1)' },
  components: [{ name: 'Card', tokens: { bg: '#fff', padding: '16px' } }],
  customTokens: { '--my-token': 'blue' },
};

describe('flattenDesignSpec', () => {
  it('flattens all sections to CSS custom properties', () => {
    const tokens = flattenDesignSpec(SPEC);
    expect(tokens['--wd-color-primary']).toBe('#ff0000');
    expect(tokens['--wd-color-text-muted']).toBe('#999');
    expect(tokens['--wd-typo-font-family']).toBe('Inter');
    expect(tokens['--wd-space-sm']).toBe('4px');
    expect(tokens['--wd-border-radius']).toBe('8px');
    expect(tokens['--wd-shadow-md']).toBe('0 2px 4px rgba(0,0,0,0.1)');
    expect(tokens['--wd-card-bg']).toBe('#fff');
    expect(tokens['--my-token']).toBe('blue');
  });

  it('returns empty for empty spec', () => {
    expect(flattenDesignSpec({ version: 1 })).toEqual({});
  });
});

describe('generateDesignSpecStyleBlock', () => {
  it('generates a style element with :root declarations', () => {
    const block = generateDesignSpecStyleBlock(SPEC);
    expect(block).toContain('<style data-sn-design-spec>');
    expect(block).toContain(':root {');
    expect(block).toContain('--wd-color-primary: #ff0000;');
    expect(block).toContain('</style>');
  });

  it('returns empty string for empty spec', () => {
    expect(generateDesignSpecStyleBlock({ version: 1 })).toBe('');
  });
});

describe('injectDesignSpecIntoHtml', () => {
  it('injects before </head>', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = injectDesignSpecIntoHtml(html, SPEC);
    expect(result).toContain('<style data-sn-design-spec>');
    expect(result.indexOf('data-sn-design-spec')).toBeLessThan(result.indexOf('</head>'));
  });

  it('prepends if no <head> tag', () => {
    const html = '<div>Hello</div>';
    const result = injectDesignSpecIntoHtml(html, SPEC);
    expect(result.startsWith('<style data-sn-design-spec>')).toBe(true);
  });

  it('returns original html for empty spec', () => {
    const html = '<div>Hello</div>';
    expect(injectDesignSpecIntoHtml(html, { version: 1 })).toBe(html);
  });
});
