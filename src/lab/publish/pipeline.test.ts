import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { WidgetManifest } from '@sn/types';
import { MarketplaceEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

import { createPublishPipeline } from './pipeline';
import { submitWidget } from './submitter';
import { testWidget } from './tester';
import { generateThumbnail } from './thumbnail';
import { validateWidget } from './validator';

function makeManifest(): WidgetManifest {
  return {
    id: 'test-widget',
    name: 'Test',
    version: '1.0.0',
    license: 'MIT',
    tags: [],
    category: 'other',
    permissions: [],
    events: { emits: [], subscribes: [] },
    config: { fields: [] },
    size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
    entry: 'index.html',
    spatialSupport: false,
    crossCanvasChannels: [],
  };
}

const VALID_HTML = `<script>
StickerNest.register({ events: { emits: [], subscribes: [] } });
StickerNest.ready();
</script>`;

const INVALID_HTML = '<div>No SDK calls</div>';

describe('validateWidget', () => {
  it('accepts HTML with register() and ready()', () => {
    const result = validateWidget(VALID_HTML);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects empty HTML', () => {
    const result = validateWidget('');
    expect(result.valid).toBe(false);
  });

  it('rejects HTML without ready()', () => {
    const result = validateWidget('<script>StickerNest.register({});</script>');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('ready()'))).toBe(true);
  });

  it('rejects HTML without register()', () => {
    const result = validateWidget('<script>StickerNest.ready();</script>');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('register('))).toBe(true);
  });

  it('rejects HTML with remote scripts', () => {
    const result = validateWidget('<script src="https://cdn.example.com/lib.js"></script><script>StickerNest.register({});StickerNest.ready();</script>');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('remote scripts'))).toBe(true);
  });
});

describe('testWidget', () => {
  it('passes for valid widget', () => {
    const result = testWidget(VALID_HTML, makeManifest());
    expect(result.passed).toBe(true);
  });

  it('fails for empty HTML', () => {
    const result = testWidget('', makeManifest());
    expect(result.passed).toBe(false);
  });

  it('fails for widget using eval', () => {
    const html = '<script>eval("code"); StickerNest.ready();</script>';
    const result = testWidget(html, makeManifest());
    expect(result.passed).toBe(false);
    expect(result.errors.some((e) => e.includes('eval()'))).toBe(true);
  });
});

describe('generateThumbnail', () => {
  it('returns a placeholder thumbnail (stub)', async () => {
    const result = await generateThumbnail(VALID_HTML);
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Blob);
  });
});

describe('submitWidget', () => {
  it('emits PUBLISH_REQUEST and resolves on PUBLISH_RESPONSE', async () => {
    // Simulate marketplace responding to the publish request
    const unsub = bus.subscribe(MarketplaceEvents.PUBLISH_REQUEST, () => {
      bus.emit(MarketplaceEvents.PUBLISH_RESPONSE, {
        success: true,
        listingId: 'listing-123',
      });
    });

    const result = await submitWidget({
      html: VALID_HTML,
      manifest: makeManifest(),
      thumbnail: new Blob(['test']),
      authorId: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.listingId).toBe('listing-123');
    unsub();
  });

  it('times out when no response is received', async () => {
    vi.useFakeTimers();

    const promise = submitWidget({
      html: VALID_HTML,
      manifest: makeManifest(),
      thumbnail: new Blob(['test']),
      authorId: 'user-1',
    });

    // Fast-forward past the 30s timeout
    vi.advanceTimersByTime(31_000);

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');

    vi.useRealTimers();
  });
});

describe('createPublishPipeline', () => {
  let unsub: (() => void) | null = null;

  beforeEach(() => {
    // Set up marketplace responder for submit step
    unsub = bus.subscribe(MarketplaceEvents.PUBLISH_REQUEST, () => {
      bus.emit(MarketplaceEvents.PUBLISH_RESPONSE, {
        success: true,
        listingId: 'listing-456',
      });
    });
  });

  afterEach(() => {
    if (unsub) {
      unsub();
      unsub = null;
    }
  });

  it('starts in idle state', () => {
    const pipeline = createPublishPipeline();
    expect(pipeline.getStatus().step).toBe('idle');
  });

  it('completes full pipeline for valid widget', async () => {
    const pipeline = createPublishPipeline();
    const status = await pipeline.run(VALID_HTML, makeManifest(), 'author-1');

    expect(status.step).toBe('done');
    expect(status.result?.success).toBe(true);
    expect(status.result?.listingId).toBe('listing-456');
  });

  it('fails at validation step for invalid HTML', async () => {
    const pipeline = createPublishPipeline();
    const status = await pipeline.run(INVALID_HTML, makeManifest());

    expect(status.step).toBe('failed');
    expect(status.error).toBe('Validation failed');
    expect(status.errors!.length).toBeGreaterThan(0);
  });

  it('fails at test step for widget using eval', async () => {
    const html = `<script>
StickerNest.register({});
eval("bad");
StickerNest.ready();
</script>`;
    const pipeline = createPublishPipeline();
    const status = await pipeline.run(html, makeManifest());

    expect(status.step).toBe('failed');
    expect(status.error).toBe('Testing failed');
  });

  it('resets to idle', async () => {
    const pipeline = createPublishPipeline();
    await pipeline.run(INVALID_HTML, makeManifest());
    expect(pipeline.getStatus().step).toBe('failed');

    pipeline.reset();
    expect(pipeline.getStatus().step).toBe('idle');
  });
});
