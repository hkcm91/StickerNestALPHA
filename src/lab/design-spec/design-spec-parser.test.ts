import { describe, it, expect } from 'vitest';

import type { WidgetDesignSpec } from '@sn/types';

import { serializeDesignSpec, parseDesignSpec } from './design-spec-parser';

const SAMPLE_SPEC: WidgetDesignSpec = {
  version: 1,
  name: 'Test Theme',
  colors: { primary: '#ff0000', background: '#ffffff' },
  typography: { fontFamily: 'Arial, sans-serif', fontSizeBase: '16px', fontWeightBold: 700 },
  spacing: { sm: '4px', md: '8px' },
  borders: { radius: '8px' },
  shadows: { md: '0 2px 4px rgba(0,0,0,0.1)' },
  components: [
    { name: 'Button', tokens: { bg: '#0066ff', color: '#ffffff' } },
  ],
  customTokens: { '--custom-glow': '0 0 10px blue' },
};

describe('serializeDesignSpec', () => {
  it('produces valid markdown with all sections', () => {
    const md = serializeDesignSpec(SAMPLE_SPEC);
    expect(md).toContain('# Test Theme');
    expect(md).toContain('## Colors');
    expect(md).toContain('`#ff0000`');
    expect(md).toContain('## Typography');
    expect(md).toContain('`Arial, sans-serif`');
    expect(md).toContain('## Spacing');
    expect(md).toContain('## Borders');
    expect(md).toContain('## Shadows');
    expect(md).toContain('### Button');
    expect(md).toContain('## Custom Tokens');
  });

  it('uses default name when none provided', () => {
    const md = serializeDesignSpec({ version: 1 });
    expect(md).toContain('# Widget Design System');
  });
});

describe('parseDesignSpec', () => {
  it('round-trips through serialize/parse', () => {
    const md = serializeDesignSpec(SAMPLE_SPEC);
    const parsed = parseDesignSpec(md);

    expect(parsed.name).toBe('Test Theme');
    expect(parsed.colors?.primary).toBe('#ff0000');
    expect(parsed.colors?.background).toBe('#ffffff');
    expect(parsed.typography?.fontFamily).toBe('Arial, sans-serif');
    expect(parsed.typography?.fontWeightBold).toBe(700);
    expect(parsed.spacing?.sm).toBe('4px');
    expect(parsed.borders?.radius).toBe('8px');
    expect(parsed.shadows?.md).toBe('0 2px 4px rgba(0,0,0,0.1)');
    expect(parsed.components?.[0]?.name).toBe('Button');
    expect(parsed.components?.[0]?.tokens.bg).toBe('#0066ff');
  });

  it('handles minimal markdown', () => {
    const parsed = parseDesignSpec('# Minimal\n');
    expect(parsed.name).toBe('Minimal');
    expect(parsed.version).toBe(1);
  });
});
