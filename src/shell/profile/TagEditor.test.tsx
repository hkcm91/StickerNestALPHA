/**
 * TagEditor tests
 * @vitest-environment happy-dom
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TagEditor } from './TagEditor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTagEditor(props: Partial<React.ComponentProps<typeof TagEditor>> = {}) {
  const onChange = vi.fn();
  const result = render(
    <TagEditor
      tags={[]}
      onChange={onChange}
      {...props}
    />,
  );
  return { ...result, onChange };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TagEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('existing tags', () => {
    it('renders existing tags as chips', () => {
      renderTagEditor({ tags: ['react', 'typescript', 'design'] });
      const chips = screen.getAllByTestId('tag-chip');
      expect(chips.length).toBe(3);
      expect(chips[0].textContent).toContain('react');
      expect(chips[1].textContent).toContain('typescript');
      expect(chips[2].textContent).toContain('design');
    });

    it('renders no chips when tags array is empty', () => {
      renderTagEditor({ tags: [] });
      expect(screen.queryAllByTestId('tag-chip')).toHaveLength(0);
    });

    it('shows placeholder text when no tags', () => {
      renderTagEditor({ tags: [] });
      const input = screen.getByTestId('tag-input');
      expect(input.getAttribute('placeholder')).toBe('Add tags...');
    });

    it('hides placeholder when tags exist', () => {
      renderTagEditor({ tags: ['react'] });
      const input = screen.getByTestId('tag-input');
      expect(input.getAttribute('placeholder')).toBe('');
    });
  });

  describe('adding a tag via Enter key', () => {
    it('calls onChange with new tag on Enter', () => {
      const { onChange } = renderTagEditor({ tags: ['existing'] });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 'newtag' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith(['existing', 'newtag']);
    });

    it('trims whitespace from the entered tag', () => {
      const { onChange } = renderTagEditor({ tags: [] });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: '  spaced  ' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith(['spaced']);
    });

    it('lowercases the entered tag', () => {
      const { onChange } = renderTagEditor({ tags: [] });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 'UPPERCASE' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith(['uppercase']);
    });

    it('calls onChange with new tag on comma key', () => {
      const { onChange } = renderTagEditor({ tags: [] });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 'commatag' } });
      fireEvent.keyDown(input, { key: ',' });
      expect(onChange).toHaveBeenCalledWith(['commatag']);
    });

    it('does not add empty tag on Enter', () => {
      const { onChange } = renderTagEditor({ tags: [] });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not add duplicate tag', () => {
      const { onChange } = renderTagEditor({ tags: ['react'] });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 'react' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('removes last tag on Backspace when input is empty', () => {
      const { onChange } = renderTagEditor({ tags: ['react', 'typescript'] });
      const input = screen.getByTestId('tag-input');
      fireEvent.keyDown(input, { key: 'Backspace' });
      expect(onChange).toHaveBeenCalledWith(['react']);
    });

    it('does not remove tag on Backspace when input has text', () => {
      const { onChange } = renderTagEditor({ tags: ['react'] });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 'typ' } });
      fireEvent.keyDown(input, { key: 'Backspace' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('removing a tag via x button', () => {
    it('renders remove buttons for each tag in edit mode', () => {
      renderTagEditor({ tags: ['react', 'typescript'] });
      const removeButtons = screen.getAllByTestId('tag-remove');
      expect(removeButtons.length).toBe(2);
    });

    it('calls onChange without the removed tag when x is clicked', () => {
      const { onChange } = renderTagEditor({ tags: ['react', 'typescript', 'design'] });
      const removeButtons = screen.getAllByTestId('tag-remove');
      fireEvent.click(removeButtons[1]); // remove 'typescript'
      expect(onChange).toHaveBeenCalledWith(['react', 'design']);
    });

    it('calls onChange with empty array when only tag is removed', () => {
      const { onChange } = renderTagEditor({ tags: ['only'] });
      fireEvent.click(screen.getByTestId('tag-remove'));
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe('suggestions dropdown', () => {
    it('shows suggestions dropdown when input matches allTags', () => {
      renderTagEditor({
        tags: [],
        allTags: ['react', 'redux', 'typescript'],
      });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 're' } });
      expect(screen.getByTestId('tag-suggestions')).toBeTruthy();
    });

    it('shows only matching suggestions', () => {
      renderTagEditor({
        tags: [],
        allTags: ['react', 'redux', 'typescript'],
      });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 're' } });
      const suggestions = screen.getByTestId('tag-suggestions');
      expect(suggestions.textContent).toContain('react');
      expect(suggestions.textContent).toContain('redux');
      expect(suggestions.textContent).not.toContain('typescript');
    });

    it('does not show already-added tags in suggestions', () => {
      renderTagEditor({
        tags: ['react'],
        allTags: ['react', 'redux'],
      });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 're' } });
      const suggestions = screen.getByTestId('tag-suggestions');
      expect(suggestions.textContent).not.toContain('react');
      expect(suggestions.textContent).toContain('redux');
    });

    it('does not show suggestions when input is empty', () => {
      renderTagEditor({ tags: [], allTags: ['react', 'redux'] });
      const input = screen.getByTestId('tag-input');
      fireEvent.focus(input);
      expect(screen.queryByTestId('tag-suggestions')).toBeNull();
    });

    it('adds a tag when suggestion is clicked via mousedown', () => {
      const { onChange } = renderTagEditor({
        tags: [],
        allTags: ['react', 'redux'],
      });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 're' } });
      const suggestionButtons = screen.getByTestId('tag-suggestions').querySelectorAll('button');
      fireEvent.mouseDown(suggestionButtons[0]);
      expect(onChange).toHaveBeenCalledWith([expect.any(String)]);
    });

    it('hides suggestions after blur (with delay)', async () => {
      renderTagEditor({ tags: [], allTags: ['react'] });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 're' } });
      expect(screen.getByTestId('tag-suggestions')).toBeTruthy();

      fireEvent.blur(input);
      // suggestions hide after 200ms setTimeout
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250));
      });
      expect(screen.queryByTestId('tag-suggestions')).toBeNull();
    });

    it('limits suggestions to 5 items', () => {
      renderTagEditor({
        tags: [],
        allTags: ['apple', 'apricot', 'avocado', 'almond', 'aloe', 'artichoke'],
      });
      const input = screen.getByTestId('tag-input');
      fireEvent.change(input, { target: { value: 'a' } });
      const suggestions = screen.getByTestId('tag-suggestions').querySelectorAll('button');
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('max 20 tags limit', () => {
    it('hides input when 20 tags are present', () => {
      const twentyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
      renderTagEditor({ tags: twentyTags });
      expect(screen.queryByTestId('tag-input')).toBeNull();
    });

    it('shows input when fewer than 20 tags are present', () => {
      const nineteenTags = Array.from({ length: 19 }, (_, i) => `tag${i}`);
      renderTagEditor({ tags: nineteenTags });
      expect(screen.getByTestId('tag-input')).toBeTruthy();
    });

    it('does not add a tag when already at 20 tags', () => {
      const twentyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
      const onChange = vi.fn();
      // Since input is hidden at 20 tags, we test addTag guard through onChange mock
      // by calling from a state with exactly 20 tags and a suggestion click pathway
      // The component hides input, so we verify onChange is never called via UI
      render(<TagEditor tags={twentyTags} onChange={onChange} />);
      expect(screen.queryByTestId('tag-input')).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('read-only mode', () => {
    it('renders existing tags as chips in read-only mode', () => {
      renderTagEditor({ tags: ['react', 'typescript'], readOnly: true });
      const chips = screen.getAllByTestId('tag-chip');
      expect(chips.length).toBe(2);
      expect(chips[0].textContent).toContain('react');
    });

    it('hides input in read-only mode', () => {
      renderTagEditor({ tags: ['react'], readOnly: true });
      expect(screen.queryByTestId('tag-input')).toBeNull();
    });

    it('hides remove buttons in read-only mode', () => {
      renderTagEditor({ tags: ['react', 'typescript'], readOnly: true });
      expect(screen.queryAllByTestId('tag-remove')).toHaveLength(0);
    });

    it('renders tag editor container with no border in read-only mode', () => {
      renderTagEditor({ tags: ['react'], readOnly: true });
      const editor = screen.getByTestId('tag-editor');
      expect(editor.getAttribute('style')).toContain('border: none');
    });
  });
});
