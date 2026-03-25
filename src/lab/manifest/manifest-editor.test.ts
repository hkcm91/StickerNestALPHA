import { describe, it, expect } from 'vitest';

import type { WidgetManifest } from '@sn/types';

import { createManifestEditor } from './manifest-editor';

function makeManifest(overrides?: Partial<WidgetManifest>): WidgetManifest {
  return {
    id: 'test-widget',
    name: 'Test Widget',
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
    ...overrides,
  };
}

describe('createManifestEditor', () => {
  it('returns null when no valid manifest is set', () => {
    const editor = createManifestEditor();
    expect(editor.getManifest()).toBeNull();
  });

  it('returns manifest after setManifest', () => {
    const editor = createManifestEditor();
    const manifest = makeManifest();
    editor.setManifest(manifest);
    expect(editor.getManifest()).toEqual(manifest);
  });

  it('validates a correct manifest', () => {
    const editor = createManifestEditor();
    editor.setManifest(makeManifest());
    const result = editor.validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.manifest).toBeTruthy();
  });

  it('reports validation errors for invalid manifest', () => {
    const editor = createManifestEditor({ id: '', version: 'bad' } as Partial<WidgetManifest>);
    const result = editor.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('updates a field via path', () => {
    const editor = createManifestEditor();
    editor.setManifest(makeManifest());
    editor.updateField('name', 'Updated Widget');

    const manifest = editor.getManifest();
    expect(manifest?.name).toBe('Updated Widget');
  });

  it('updates a nested field via dot path', () => {
    const editor = createManifestEditor();
    editor.setManifest(makeManifest());
    editor.updateField('size.defaultWidth', 300);

    const manifest = editor.getManifest();
    expect(manifest?.size.defaultWidth).toBe(300);
  });

  it('detects breaking changes — removed emit', () => {
    const editor = createManifestEditor();
    const prev = makeManifest({
      events: {
        emits: [{ name: 'click' }, { name: 'hover' }],
        subscribes: [],
      },
    });
    const next = makeManifest({
      events: {
        emits: [{ name: 'click' }],
        subscribes: [],
      },
    });
    const changes = editor.getBreakingChanges(prev, next);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ type: 'removed_emit', portName: 'hover' });
  });

  it('detects breaking changes — removed subscribe', () => {
    const editor = createManifestEditor();
    const prev = makeManifest({
      events: {
        emits: [],
        subscribes: [{ name: 'data.updated' }],
      },
    });
    const next = makeManifest({
      events: {
        emits: [],
        subscribes: [],
      },
    });
    const changes = editor.getBreakingChanges(prev, next);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ type: 'removed_subscribe', portName: 'data.updated' });
  });

  it('reports no breaking changes when ports are unchanged', () => {
    const editor = createManifestEditor();
    const manifest = makeManifest({
      events: { emits: [{ name: 'click' }], subscribes: [{ name: 'data' }] },
    });
    expect(editor.getBreakingChanges(manifest, manifest)).toEqual([]);
  });

  it('produces JSON schema', () => {
    const editor = createManifestEditor();
    const schema = editor.toJsonSchema();
    expect(schema).toBeTruthy();
    expect(typeof schema).toBe('object');
  });
});
