import { describe, it, expect, vi } from 'vitest';

import type { WidgetDesignSpec } from '@sn/types';

import { createDesignSpecEditor } from './design-spec-editor';

const SAMPLE_SPEC: WidgetDesignSpec = {
  version: 1,
  name: 'Test Theme',
  colors: { primary: '#ff0000', background: '#ffffff' },
  typography: { fontFamily: 'Arial, sans-serif', fontSizeBase: '16px' },
  spacing: { sm: '4px', md: '8px', lg: '16px' },
  borders: { radius: '8px' },
};

describe('createDesignSpecEditor', () => {
  it('starts null without initial spec', () => {
    const editor = createDesignSpecEditor();
    expect(editor.get()).toBeNull();
    expect(editor.isDirty()).toBe(false);
  });

  it('starts with initial spec', () => {
    const editor = createDesignSpecEditor(SAMPLE_SPEC);
    expect(editor.get()).toEqual(SAMPLE_SPEC);
    expect(editor.isDirty()).toBe(false);
  });

  it('set() replaces spec and triggers change', () => {
    const editor = createDesignSpecEditor();
    const cb = vi.fn();
    editor.onChange(cb);

    editor.set(SAMPLE_SPEC);
    expect(editor.get()).toEqual(SAMPLE_SPEC);
    expect(cb).toHaveBeenCalledWith(SAMPLE_SPEC);
    expect(editor.isDirty()).toBe(true);
  });

  it('update() merges partial spec', () => {
    const editor = createDesignSpecEditor(SAMPLE_SPEC);
    editor.update({ name: 'Updated Theme' });
    expect(editor.get()?.name).toBe('Updated Theme');
    expect(editor.get()?.colors).toEqual(SAMPLE_SPEC.colors);
  });

  it('clear() sets spec to null', () => {
    const editor = createDesignSpecEditor(SAMPLE_SPEC);
    editor.clear();
    expect(editor.get()).toBeNull();
  });

  it('validate() passes for valid spec', () => {
    const editor = createDesignSpecEditor(SAMPLE_SPEC);
    expect(editor.validate()).toEqual({ valid: true, errors: [] });
  });

  it('validate() passes for null spec', () => {
    const editor = createDesignSpecEditor();
    expect(editor.validate()).toEqual({ valid: true, errors: [] });
  });

  it('markSaved() resets dirty state', () => {
    const editor = createDesignSpecEditor();
    editor.set(SAMPLE_SPEC);
    expect(editor.isDirty()).toBe(true);
    editor.markSaved();
    expect(editor.isDirty()).toBe(false);
  });

  it('onChange() unsubscribe works', () => {
    const editor = createDesignSpecEditor();
    const cb = vi.fn();
    const unsub = editor.onChange(cb);
    unsub();
    editor.set(SAMPLE_SPEC);
    expect(cb).not.toHaveBeenCalled();
  });
});
