import { describe, it, expect, vi } from 'vitest';

import { createLabEditor } from './editor';

describe('createLabEditor', () => {
  it('starts with empty content by default', () => {
    const editor = createLabEditor();
    expect(editor.getContent()).toBe('');
  });

  it('starts with initial content when provided', () => {
    const editor = createLabEditor({ initialContent: '<div>Hello</div>' });
    expect(editor.getContent()).toBe('<div>Hello</div>');
  });

  it('updates content via setContent', () => {
    const editor = createLabEditor();
    editor.setContent('<p>Test</p>');
    expect(editor.getContent()).toBe('<p>Test</p>');
  });

  it('calls onChange callbacks when content changes', () => {
    const editor = createLabEditor();
    const cb = vi.fn();
    editor.onChange(cb);
    editor.setContent('<div>New</div>');
    expect(cb).toHaveBeenCalledWith('<div>New</div>');
  });

  it('unsubscribes onChange callbacks', () => {
    const editor = createLabEditor();
    const cb = vi.fn();
    const unsub = editor.onChange(cb);
    unsub();
    editor.setContent('<div>New</div>');
    expect(cb).not.toHaveBeenCalled();
  });

  it('tracks dirty state correctly', () => {
    const editor = createLabEditor({ initialContent: 'original' });
    expect(editor.isDirty()).toBe(false);

    editor.setContent('modified');
    expect(editor.isDirty()).toBe(true);

    editor.markSaved();
    expect(editor.isDirty()).toBe(false);
  });

  it('stops notifying after dispose', () => {
    const editor = createLabEditor();
    const cb = vi.fn();
    editor.onChange(cb);
    editor.dispose();
    editor.setContent('after dispose');
    expect(cb).not.toHaveBeenCalled();
  });
});
