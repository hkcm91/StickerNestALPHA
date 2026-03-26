/**
 * Tests for Capture Pipeline Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  ActionSchema,
  CaptureStepSchema,
  CaptureScriptSchema,
  CaptureResultSchema,
  CaptureConfigSchema,
} from './types.js';

// =============================================================================
// Action Schema Tests
// =============================================================================

describe('ActionSchema', () => {
  it('parses a navigate action', () => {
    const result = ActionSchema.parse({
      type: 'navigate',
      url: 'http://localhost:5173/StickerNest5.0/',
    });
    expect(result.type).toBe('navigate');
  });

  it('parses a click action with defaults', () => {
    const result = ActionSchema.parse({
      type: 'click',
      selector: '#my-button',
    });
    expect(result.type).toBe('click');
    if (result.type === 'click') {
      expect(result.button).toBe('left');
      expect(result.clickCount).toBe(1);
    }
  });

  it('parses a drag action', () => {
    const result = ActionSchema.parse({
      type: 'drag',
      from: { x: 100, y: 200 },
      to: { x: 300, y: 400 },
    });
    expect(result.type).toBe('drag');
    if (result.type === 'drag') {
      expect(result.steps).toBe(10); // default
    }
  });

  it('parses a type action', () => {
    const result = ActionSchema.parse({
      type: 'type',
      selector: 'input[name="search"]',
      text: 'hello world',
    });
    expect(result.type).toBe('type');
  });

  it('parses a keyboard action with modifiers', () => {
    const result = ActionSchema.parse({
      type: 'keyboard',
      key: 'z',
      modifiers: ['Control'],
    });
    expect(result.type).toBe('keyboard');
    if (result.type === 'keyboard') {
      expect(result.modifiers).toEqual(['Control']);
    }
  });

  it('parses a wait action', () => {
    const result = ActionSchema.parse({ type: 'wait', ms: 1000 });
    expect(result.type).toBe('wait');
  });

  it('parses a waitForSelector action', () => {
    const result = ActionSchema.parse({
      type: 'waitForSelector',
      selector: '.loaded',
    });
    expect(result.type).toBe('waitForSelector');
    if (result.type === 'waitForSelector') {
      expect(result.state).toBe('visible'); // default
      expect(result.timeout).toBe(5000); // default
    }
  });

  it('parses a viewport action', () => {
    const result = ActionSchema.parse({
      type: 'viewport',
      width: 1080,
      height: 1920,
    });
    expect(result.type).toBe('viewport');
  });

  it('parses an eval action', () => {
    const result = ActionSchema.parse({
      type: 'eval',
      script: 'document.title = "test"',
    });
    expect(result.type).toBe('eval');
  });

  it('rejects invalid action type', () => {
    expect(() =>
      ActionSchema.parse({ type: 'invalid', foo: 'bar' }),
    ).toThrow();
  });

  it('rejects navigate with invalid URL', () => {
    expect(() =>
      ActionSchema.parse({ type: 'navigate', url: 'not-a-url' }),
    ).toThrow();
  });

  it('rejects wait with negative ms', () => {
    expect(() => ActionSchema.parse({ type: 'wait', ms: -100 })).toThrow();
  });

  it('rejects wait exceeding 30s limit', () => {
    expect(() => ActionSchema.parse({ type: 'wait', ms: 31000 })).toThrow();
  });
});

// =============================================================================
// CaptureConfig Tests
// =============================================================================

describe('CaptureConfigSchema', () => {
  it('applies all defaults', () => {
    const result = CaptureConfigSchema.parse({});
    expect(result.screenshot).toBe(true);
    expect(result.video).toBe(false);
    expect(result.gif).toBe(false);
    expect(result.settleDelay).toBe(500);
  });

  it('allows overriding defaults', () => {
    const result = CaptureConfigSchema.parse({
      screenshot: false,
      video: true,
      settleDelay: 1000,
    });
    expect(result.screenshot).toBe(false);
    expect(result.video).toBe(true);
    expect(result.settleDelay).toBe(1000);
  });

  it('accepts a clip region', () => {
    const result = CaptureConfigSchema.parse({
      clip: { x: 10, y: 20, width: 300, height: 200 },
    });
    expect(result.clip).toEqual({ x: 10, y: 20, width: 300, height: 200 });
  });

  it('rejects clip with zero width', () => {
    expect(() =>
      CaptureConfigSchema.parse({
        clip: { x: 0, y: 0, width: 0, height: 100 },
      }),
    ).toThrow();
  });
});

// =============================================================================
// CaptureStep Tests
// =============================================================================

describe('CaptureStepSchema', () => {
  it('parses a minimal step', () => {
    const result = CaptureStepSchema.parse({
      id: 'my-step',
      label: 'My Step',
      action: { type: 'wait', ms: 100 },
    });
    expect(result.id).toBe('my-step');
    expect(result.capture.screenshot).toBe(true); // default
  });

  it('parses a step with narration', () => {
    const result = CaptureStepSchema.parse({
      id: 'narrated',
      label: 'Narrated Step',
      action: { type: 'wait', ms: 100 },
      narration: 'This is what we see on screen.',
    });
    expect(result.narration).toBe('This is what we see on screen.');
  });

  it('rejects invalid step ID (uppercase)', () => {
    expect(() =>
      CaptureStepSchema.parse({
        id: 'MyStep',
        label: 'Bad ID',
        action: { type: 'wait', ms: 100 },
      }),
    ).toThrow();
  });

  it('rejects invalid step ID (spaces)', () => {
    expect(() =>
      CaptureStepSchema.parse({
        id: 'my step',
        label: 'Bad ID',
        action: { type: 'wait', ms: 100 },
      }),
    ).toThrow();
  });
});

// =============================================================================
// CaptureScript Tests
// =============================================================================

describe('CaptureScriptSchema', () => {
  const validScript = {
    name: 'test-demo',
    feature: 'Canvas basics',
    steps: [
      {
        id: 'step-one',
        label: 'First step',
        action: { type: 'wait', ms: 100 },
      },
    ],
    metadata: {
      hook: 'Watch this amazing feature',
      cta: 'Try it now',
    },
  };

  it('parses a valid script with defaults', () => {
    const result = CaptureScriptSchema.parse(validScript);
    expect(result.name).toBe('test-demo');
    expect(result.audience).toBe('creator'); // default
    expect(result.target.baseUrl).toBe('http://localhost:5173/StickerNest5.0/');
    expect(result.target.viewport.width).toBe(1920);
    expect(result.target.viewport.height).toBe(1080);
    expect(result.setup).toEqual([]); // default
  });

  it('accepts a full script with all fields', () => {
    const fullScript = {
      ...validScript,
      audience: 'developer',
      target: {
        baseUrl: 'https://preview.stickernest.com/',
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      },
      setup: [
        {
          id: 'setup-step',
          label: 'Setup',
          action: { type: 'wait', ms: 500 },
        },
      ],
      metadata: {
        ...validScript.metadata,
        tags: ['webdev', 'buildinpublic'],
        description: 'A developer walkthrough of the event bus.',
      },
    };
    const result = CaptureScriptSchema.parse(fullScript);
    expect(result.audience).toBe('developer');
    expect(result.target.baseUrl).toBe('https://preview.stickernest.com/');
    expect(result.setup.length).toBe(1);
    expect(result.metadata.tags).toEqual(['webdev', 'buildinpublic']);
  });

  it('rejects empty steps array', () => {
    expect(() =>
      CaptureScriptSchema.parse({
        ...validScript,
        steps: [],
      }),
    ).toThrow();
  });

  it('rejects invalid script name (uppercase)', () => {
    expect(() =>
      CaptureScriptSchema.parse({
        ...validScript,
        name: 'TestDemo',
      }),
    ).toThrow();
  });

  it('rejects missing metadata.hook', () => {
    expect(() =>
      CaptureScriptSchema.parse({
        ...validScript,
        metadata: { cta: 'Try it' },
      }),
    ).toThrow();
  });

  it('rejects missing metadata.cta', () => {
    expect(() =>
      CaptureScriptSchema.parse({
        ...validScript,
        metadata: { hook: 'Watch this' },
      }),
    ).toThrow();
  });
});

// =============================================================================
// CaptureResult Tests
// =============================================================================

describe('CaptureResultSchema', () => {
  it('parses a valid result', () => {
    const result = CaptureResultSchema.parse({
      scriptName: 'test-demo',
      feature: 'Canvas basics',
      audience: 'creator',
      screenshots: [
        {
          stepId: 'step-one',
          label: 'First step',
          path: 'screenshots/01-step-one.png',
          timestamp: 1500,
        },
      ],
      recordings: [],
      gifs: [],
      totalDurationMs: 3000,
      capturedAt: '2026-03-24T12:00:00.000Z',
      metadata: {
        hook: 'Watch this',
        cta: 'Try it',
        tags: [],
      },
      targetUrl: 'http://localhost:5173/StickerNest5.0/',
      viewport: { width: 1920, height: 1080 },
    });
    expect(result.screenshots.length).toBe(1);
    expect(result.totalDurationMs).toBe(3000);
  });

  it('parses a result with all capture types', () => {
    const result = CaptureResultSchema.parse({
      scriptName: 'full-demo',
      feature: 'Full feature',
      audience: 'developer',
      screenshots: [
        {
          stepId: 's1',
          label: 'Screenshot',
          path: 'screenshots/01-s1.png',
          timestamp: 1000,
          annotation: 'Look here',
          narration: 'This is the first step.',
        },
      ],
      recordings: [
        {
          stepId: 's2',
          label: 'Recording',
          path: 'recordings/video.webm',
          startMs: 2000,
          endMs: 5000,
          narration: 'Now watch this.',
        },
      ],
      gifs: [
        {
          stepId: 's3',
          label: 'GIF',
          path: 'gifs/01-s3.gif',
          durationMs: 3000,
        },
      ],
      totalDurationMs: 8000,
      capturedAt: '2026-03-24T12:00:00.000Z',
      metadata: {
        hook: 'Hook text',
        cta: 'CTA text',
        tags: ['webdev'],
        description: 'A full demo.',
      },
      targetUrl: 'http://localhost:5173/StickerNest5.0/',
      viewport: { width: 1920, height: 1080 },
    });
    expect(result.recordings.length).toBe(1);
    expect(result.gifs.length).toBe(1);
  });
});

// =============================================================================
// Example Script File Validation
// =============================================================================

describe('Example capture script', () => {
  it('validates the example-canvas-demo.json file', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const scriptPath = path.resolve(
      import.meta.dirname || '.',
      '../scripts/example-canvas-demo.json',
    );

    let raw: string;
    try {
      raw = await fs.readFile(scriptPath, 'utf-8');
    } catch {
      // Skip if file not found (CI environment may differ)
      return;
    }

    const json = JSON.parse(raw);
    const result = CaptureScriptSchema.parse(json);
    expect(result.name).toBe('canvas-basics-demo');
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.metadata.hook).toBeTruthy();
    expect(result.metadata.cta).toBeTruthy();
  });
});
