import { describe, it, expect } from 'vitest';

import type { WidgetManifest } from '@sn/types';

import { importWidget, checkLicense } from './widget-importer';
import type { WidgetListing } from './widget-importer';

function makeManifest(license: WidgetManifest['license'] = 'MIT'): WidgetManifest {
  return {
    id: 'test-widget',
    name: 'Test Widget',
    version: '1.0.0',
    license,
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

function makeListing(license: WidgetManifest['license'] = 'MIT'): WidgetListing {
  return {
    widgetId: 'test-widget',
    html: '<div>Widget</div>',
    manifest: makeManifest(license),
  };
}

describe('checkLicense', () => {
  it('allows MIT', () => {
    expect(checkLicense('MIT')).toBe(true);
  });

  it('allows Apache-2.0', () => {
    expect(checkLicense('Apache-2.0')).toBe(true);
  });

  it('allows GPL-3.0', () => {
    expect(checkLicense('GPL-3.0')).toBe(true);
  });

  it('allows BSD-3-Clause', () => {
    expect(checkLicense('BSD-3-Clause')).toBe(true);
  });

  it('rejects no-fork', () => {
    expect(checkLicense('no-fork')).toBe(false);
  });

  it('rejects proprietary', () => {
    expect(checkLicense('proprietary')).toBe(false);
  });
});

describe('importWidget', () => {
  it('imports a widget with MIT license', () => {
    const result = importWidget(makeListing('MIT'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.html).toBe('<div>Widget</div>');
      expect(result.isFork).toBe(true);
      expect(result.originalWidgetId).toBe('test-widget');
    }
  });

  it('rejects a widget with no-fork license', () => {
    const result = importWidget(makeListing('no-fork'));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('no-fork');
      expect(result.error).toContain('cannot be forked');
    }
  });

  it('rejects a widget with proprietary license', () => {
    const result = importWidget(makeListing('proprietary'));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('proprietary');
    }
  });
});
