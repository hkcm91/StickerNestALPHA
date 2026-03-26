import { describe, it, expect } from 'vitest';
import {
  StyleConfigSchema,
  NarrationConfigSchema,
  MusicConfigSchema,
  BrandingConfigSchema,
  CompositionConfigSchema,
  ExportFormatSchema,
  ExportConfigSchema,
  FORMAT_SPECS,
} from './types.js';

// =============================================================================
// StyleConfigSchema
// =============================================================================

describe('StyleConfigSchema', () => {
  it('should use defaults for empty object', () => {
    const result = StyleConfigSchema.parse({});
    expect(result.titleFont).toBe('Inter');
    expect(result.titleColor).toBe('#FFFFFF');
    expect(result.bgColor).toBe('#1a1a2e');
    expect(result.accentColor).toBe('#e94560');
    expect(result.transitionType).toBe('fade');
    expect(result.transitionDuration).toBe(0.5);
    expect(result.captionStyle).toBe('bottom-bar');
    expect(result.captionFontSize).toBe(32);
  });

  it('should accept valid hex colors', () => {
    const result = StyleConfigSchema.parse({
      titleColor: '#FF0000',
      bgColor: '#00FF00',
      accentColor: '#0000FF',
    });
    expect(result.titleColor).toBe('#FF0000');
  });

  it('should reject invalid hex colors', () => {
    expect(() => StyleConfigSchema.parse({ titleColor: 'red' })).toThrow();
    expect(() => StyleConfigSchema.parse({ bgColor: '#FFF' })).toThrow();
    expect(() => StyleConfigSchema.parse({ accentColor: '#GGGGGG' })).toThrow();
  });

  it('should reject invalid transition type', () => {
    expect(() => StyleConfigSchema.parse({ transitionType: 'slide' })).toThrow();
  });

  it('should clamp transition duration', () => {
    expect(() => StyleConfigSchema.parse({ transitionDuration: -1 })).toThrow();
    expect(() => StyleConfigSchema.parse({ transitionDuration: 4 })).toThrow();
  });
});

// =============================================================================
// NarrationConfigSchema
// =============================================================================

describe('NarrationConfigSchema', () => {
  it('should use defaults for empty object', () => {
    const result = NarrationConfigSchema.parse({});
    expect(result.voice).toBe('en-US-JennyNeural');
    expect(result.rate).toBe('+0%');
    expect(result.pitch).toBe('+0Hz');
    expect(result.enabled).toBe(true);
  });

  it('should accept valid rate and pitch values', () => {
    const result = NarrationConfigSchema.parse({
      rate: '+10%',
      pitch: '-5Hz',
    });
    expect(result.rate).toBe('+10%');
    expect(result.pitch).toBe('-5Hz');
  });

  it('should reject invalid rate format', () => {
    expect(() => NarrationConfigSchema.parse({ rate: '10%' })).toThrow();
    expect(() => NarrationConfigSchema.parse({ rate: 'fast' })).toThrow();
  });

  it('should reject invalid pitch format', () => {
    expect(() => NarrationConfigSchema.parse({ pitch: '10Hz' })).toThrow();
    expect(() => NarrationConfigSchema.parse({ pitch: '+5' })).toThrow();
  });
});

// =============================================================================
// MusicConfigSchema
// =============================================================================

describe('MusicConfigSchema', () => {
  it('should use defaults for empty object', () => {
    const result = MusicConfigSchema.parse({});
    expect(result.track).toBeUndefined();
    expect(result.volume).toBe(0.15);
    expect(result.fadeIn).toBe(1);
    expect(result.fadeOut).toBe(2);
  });

  it('should reject volume out of range', () => {
    expect(() => MusicConfigSchema.parse({ volume: 1.5 })).toThrow();
    expect(() => MusicConfigSchema.parse({ volume: -0.1 })).toThrow();
  });
});

// =============================================================================
// BrandingConfigSchema
// =============================================================================

describe('BrandingConfigSchema', () => {
  it('should use defaults for empty object', () => {
    const result = BrandingConfigSchema.parse({});
    expect(result.logo).toBeUndefined();
    expect(result.watermark).toBe(false);
    expect(result.endCard).toBe(true);
    expect(result.endCardDuration).toBe(3);
  });

  it('should reject end card duration out of range', () => {
    expect(() => BrandingConfigSchema.parse({ endCardDuration: 0 })).toThrow();
    expect(() => BrandingConfigSchema.parse({ endCardDuration: 15 })).toThrow();
  });
});

// =============================================================================
// CompositionConfigSchema
// =============================================================================

describe('CompositionConfigSchema', () => {
  it('should parse minimal config with only captureManifest', () => {
    const result = CompositionConfigSchema.parse({
      captureManifest: '/path/to/manifest.json',
    });
    expect(result.captureManifest).toBe('/path/to/manifest.json');
    expect(result.fps).toBe(30);
    expect(result.resolution.width).toBe(1920);
    expect(result.resolution.height).toBe(1080);
    expect(result.minSegmentDuration).toBe(3);
    expect(result.titleCard.enabled).toBe(true);
    expect(result.titleCard.duration).toBe(3);
    expect(result.style.transitionType).toBe('fade');
    expect(result.narration.enabled).toBe(true);
    expect(result.branding.endCard).toBe(true);
  });

  it('should accept full custom config', () => {
    const result = CompositionConfigSchema.parse({
      captureManifest: '/path/to/manifest.json',
      style: { bgColor: '#000000', transitionType: 'cut' },
      narration: { voice: 'en-GB-SoniaNeural', rate: '+10%', enabled: false },
      music: { track: '/path/to/music.mp3', volume: 0.2 },
      branding: { endCard: false },
      titleCard: { enabled: false },
      fps: 60,
      resolution: { width: 1280, height: 720 },
      minSegmentDuration: 5,
    });
    expect(result.fps).toBe(60);
    expect(result.resolution.width).toBe(1280);
    expect(result.narration.enabled).toBe(false);
    expect(result.titleCard.enabled).toBe(false);
    expect(result.branding.endCard).toBe(false);
    expect(result.style.transitionType).toBe('cut');
  });

  it('should reject missing captureManifest', () => {
    expect(() => CompositionConfigSchema.parse({})).toThrow();
  });
});

// =============================================================================
// ExportFormatSchema
// =============================================================================

describe('ExportFormatSchema', () => {
  it('should accept all valid format names', () => {
    const formats = [
      'youtube-standard', 'youtube-short', 'tiktok',
      'twitter-video', 'twitter-square',
      'gif-hero', 'gif-feature',
      'screenshot-set', 'instagram-reel',
    ];
    for (const f of formats) {
      expect(ExportFormatSchema.parse(f)).toBe(f);
    }
  });

  it('should reject invalid format names', () => {
    expect(() => ExportFormatSchema.parse('vimeo')).toThrow();
    expect(() => ExportFormatSchema.parse('mp4')).toThrow();
  });
});

// =============================================================================
// FORMAT_SPECS
// =============================================================================

describe('FORMAT_SPECS', () => {
  it('should have entries for all 9 formats', () => {
    expect(Object.keys(FORMAT_SPECS)).toHaveLength(9);
  });

  it('should have correct dimensions for youtube-standard', () => {
    expect(FORMAT_SPECS['youtube-standard'].width).toBe(1920);
    expect(FORMAT_SPECS['youtube-standard'].height).toBe(1080);
    expect(FORMAT_SPECS['youtube-standard'].maxDurationSec).toBeNull();
    expect(FORMAT_SPECS['youtube-standard'].codec).toBe('h264');
  });

  it('should have 9:16 aspect ratio for vertical formats', () => {
    const vertical = ['youtube-short', 'tiktok', 'instagram-reel'];
    for (const f of vertical) {
      const spec = FORMAT_SPECS[f as keyof typeof FORMAT_SPECS];
      expect(spec.width).toBe(1080);
      expect(spec.height).toBe(1920);
    }
  });

  it('should have GIF codec for gif formats', () => {
    expect(FORMAT_SPECS['gif-hero'].codec).toBe('gif');
    expect(FORMAT_SPECS['gif-feature'].codec).toBe('gif');
  });

  it('should enforce duration limits on short-form formats', () => {
    expect(FORMAT_SPECS['youtube-short'].maxDurationSec).toBe(60);
    expect(FORMAT_SPECS['tiktok'].maxDurationSec).toBe(60);
    expect(FORMAT_SPECS['twitter-video'].maxDurationSec).toBe(140);
    expect(FORMAT_SPECS['gif-hero'].maxDurationSec).toBe(15);
    expect(FORMAT_SPECS['gif-feature'].maxDurationSec).toBe(10);
  });
});

// =============================================================================
// ExportConfigSchema
// =============================================================================

describe('ExportConfigSchema', () => {
  it('should use default formats', () => {
    const result = ExportConfigSchema.parse({
      outputDir: '/path/to/output',
      masterVideo: '/path/to/master.mp4',
    });
    expect(result.formats).toEqual([
      'youtube-standard', 'tiktok', 'gif-hero', 'screenshot-set',
    ]);
  });

  it('should accept custom format list', () => {
    const result = ExportConfigSchema.parse({
      outputDir: '/path/to/output',
      masterVideo: '/path/to/master.mp4',
      formats: ['twitter-video', 'gif-feature'],
    });
    expect(result.formats).toEqual(['twitter-video', 'gif-feature']);
  });

  it('should reject invalid format in list', () => {
    expect(() => ExportConfigSchema.parse({
      outputDir: '/path/to/output',
      masterVideo: '/path/to/master.mp4',
      formats: ['youtube-standard', 'invalid-format'],
    })).toThrow();
  });
});
