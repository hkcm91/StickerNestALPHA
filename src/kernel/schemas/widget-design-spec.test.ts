import { describe, it, expect } from 'vitest';

import {
  DesignSpecColorsSchema,
  DesignSpecTypographySchema,
  DesignSpecSpacingSchema,
  DesignSpecBordersSchema,
  DesignSpecShadowsSchema,
  DesignSpecComponentSchema,
  WidgetDesignSpecSchema,
} from './widget-design-spec';

describe('DesignSpecColorsSchema', () => {
  it('parses empty object (all optional)', () => {
    const result = DesignSpecColorsSchema.parse({});
    expect(result).toEqual({});
  });

  it('parses full color palette', () => {
    const result = DesignSpecColorsSchema.parse({
      primary: '#ff0000',
      secondary: '#00ff00',
      background: '#fff',
      surface: '#eee',
      text: '#000',
      textMuted: '#666',
      accent: '#0ff',
      error: 'red',
      success: 'green',
      warning: 'orange',
    });
    expect(result.primary).toBe('#ff0000');
  });

  it('rejects non-string values', () => {
    expect(() => DesignSpecColorsSchema.parse({ primary: 123 })).toThrow();
  });
});

describe('DesignSpecTypographySchema', () => {
  it('parses empty object', () => {
    expect(DesignSpecTypographySchema.parse({})).toEqual({});
  });

  it('parses typography with font weights as numbers', () => {
    const result = DesignSpecTypographySchema.parse({
      fontFamily: 'Inter',
      fontWeightNormal: 400,
      fontWeightBold: 700,
    });
    expect(result.fontWeightBold).toBe(700);
  });

  it('rejects string for fontWeightNormal', () => {
    expect(() =>
      DesignSpecTypographySchema.parse({ fontWeightNormal: 'bold' }),
    ).toThrow();
  });
});

describe('DesignSpecSpacingSchema', () => {
  it('parses spacing values', () => {
    const result = DesignSpecSpacingSchema.parse({
      unit: '4px',
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    });
    expect(result.md).toBe('16px');
  });
});

describe('DesignSpecBordersSchema', () => {
  it('parses border config', () => {
    const result = DesignSpecBordersSchema.parse({
      radius: '4px',
      radiusFull: '9999px',
      width: '1px',
      color: '#ccc',
    });
    expect(result.radiusFull).toBe('9999px');
  });
});

describe('DesignSpecShadowsSchema', () => {
  it('parses shadow values', () => {
    const result = DesignSpecShadowsSchema.parse({
      sm: '0 1px 2px rgba(0,0,0,.1)',
      md: '0 4px 6px rgba(0,0,0,.1)',
      lg: '0 10px 15px rgba(0,0,0,.1)',
    });
    expect(result.sm).toBeDefined();
  });
});

describe('DesignSpecComponentSchema', () => {
  it('parses valid component override', () => {
    const result = DesignSpecComponentSchema.parse({
      name: 'button',
      tokens: { '--btn-bg': '#007bff', '--btn-text': '#fff' },
    });
    expect(result.name).toBe('button');
    expect(result.tokens['--btn-bg']).toBe('#007bff');
  });

  it('rejects empty name', () => {
    expect(() =>
      DesignSpecComponentSchema.parse({ name: '', tokens: {} }),
    ).toThrow();
  });

  it('rejects non-string token values', () => {
    expect(() =>
      DesignSpecComponentSchema.parse({ name: 'x', tokens: { a: 123 } }),
    ).toThrow();
  });
});

describe('WidgetDesignSpecSchema', () => {
  it('parses empty object and applies version default', () => {
    const result = WidgetDesignSpecSchema.parse({});
    expect(result.version).toBe(1);
  });

  it('parses full spec', () => {
    const result = WidgetDesignSpecSchema.parse({
      version: 1,
      name: 'My Design',
      colors: { primary: '#f00' },
      typography: { fontFamily: 'Arial' },
      spacing: { unit: '8px' },
      borders: { radius: '4px' },
      shadows: { sm: '0 1px 2px black' },
      components: [{ name: 'card', tokens: { '--card-bg': 'white' } }],
      customTokens: { '--my-token': '42px' },
    });
    expect(result.name).toBe('My Design');
    expect(result.components).toHaveLength(1);
  });

  it('rejects version other than 1', () => {
    expect(() => WidgetDesignSpecSchema.parse({ version: 2 })).toThrow();
  });

  it('rejects name longer than 100 characters', () => {
    expect(() =>
      WidgetDesignSpecSchema.parse({ name: 'x'.repeat(101) }),
    ).toThrow();
  });

  it('accepts spec without any optional sections', () => {
    const result = WidgetDesignSpecSchema.parse({ version: 1 });
    expect(result.colors).toBeUndefined();
    expect(result.typography).toBeUndefined();
    expect(result.customTokens).toBeUndefined();
  });
});
