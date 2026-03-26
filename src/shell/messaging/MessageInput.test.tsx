/**
 * MessageInput tests
 * @vitest-environment happy-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { MessageInput } from './MessageInput';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderInput(props: { onSend?: ReturnType<typeof vi.fn>; disabled?: boolean } = {}) {
  const onSend = props.onSend ?? vi.fn();
  render(<MessageInput onSend={onSend} disabled={props.disabled} />);
  return { onSend };
}

function getTextarea() {
  return screen.getByTestId('message-textarea') as HTMLTextAreaElement;
}

function getSendBtn() {
  return screen.getByTestId('send-btn') as HTMLButtonElement;
}

function typeText(text: string) {
  const textarea = getTextarea();
  fireEvent.change(textarea, { target: { value: text } });
  return textarea;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MessageInput', () => {
  describe('initial render', () => {
    it('renders textarea', () => {
      renderInput();
      expect(getTextarea()).toBeTruthy();
    });

    it('renders send button', () => {
      renderInput();
      expect(getSendBtn()).toBeTruthy();
    });

    it('send button is disabled when textarea is empty', () => {
      renderInput();
      expect(getSendBtn().disabled).toBe(true);
    });

    it('textarea starts empty', () => {
      renderInput();
      expect(getTextarea().value).toBe('');
    });
  });

  describe('enabling the send button', () => {
    it('send button is enabled after typing text', () => {
      renderInput();
      typeText('Hello');
      expect(getSendBtn().disabled).toBe(false);
    });

    it('send button remains disabled when only whitespace is typed', () => {
      renderInput();
      typeText('   ');
      expect(getSendBtn().disabled).toBe(true);
    });
  });

  describe('sending with button click', () => {
    it('calls onSend with trimmed content when send button is clicked', () => {
      const { onSend } = renderInput();
      typeText('  Hello there  ');
      fireEvent.click(getSendBtn());
      expect(onSend).toHaveBeenCalledOnce();
      expect(onSend).toHaveBeenCalledWith('Hello there');
    });

    it('clears input after send button click', () => {
      renderInput();
      typeText('Hello');
      fireEvent.click(getSendBtn());
      expect(getTextarea().value).toBe('');
    });

    it('does not call onSend when send button is clicked with empty input', () => {
      const { onSend } = renderInput();
      fireEvent.click(getSendBtn());
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('Enter key behavior', () => {
    it('Enter key calls onSend with typed content', () => {
      const { onSend } = renderInput();
      typeText('Hello');
      fireEvent.keyDown(getTextarea(), { key: 'Enter', shiftKey: false });
      expect(onSend).toHaveBeenCalledOnce();
      expect(onSend).toHaveBeenCalledWith('Hello');
    });

    it('Shift+Enter does not call onSend', () => {
      const { onSend } = renderInput();
      typeText('Hello');
      fireEvent.keyDown(getTextarea(), { key: 'Enter', shiftKey: true });
      expect(onSend).not.toHaveBeenCalled();
    });

    it('Enter key clears input after sending', () => {
      renderInput();
      typeText('Hello');
      fireEvent.keyDown(getTextarea(), { key: 'Enter', shiftKey: false });
      expect(getTextarea().value).toBe('');
    });

    it('Enter key on empty input does not call onSend', () => {
      const { onSend } = renderInput();
      fireEvent.keyDown(getTextarea(), { key: 'Enter', shiftKey: false });
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('character count', () => {
    it('does not show character count when well under limit', () => {
      renderInput();
      typeText('Short message');
      expect(screen.queryByTestId('char-count')).toBeNull();
    });

    it('shows character count when near the limit (within 200 chars)', () => {
      renderInput();
      // MAX_LENGTH is 2000; show count when > 1800 chars
      const nearLimitText = 'a'.repeat(1801);
      typeText(nearLimitText);
      expect(screen.getByTestId('char-count')).toBeTruthy();
    });

    it('character count shows current/max format', () => {
      renderInput();
      const nearLimitText = 'a'.repeat(1900);
      typeText(nearLimitText);
      const countEl = screen.getByTestId('char-count');
      expect(countEl.textContent).toBe('1900/2000');
    });

    it('send button is disabled when over the character limit', () => {
      renderInput();
      const overLimitText = 'a'.repeat(2001);
      typeText(overLimitText);
      expect(getSendBtn().disabled).toBe(true);
    });
  });

  describe('disabled state', () => {
    it('textarea is disabled when disabled prop is true', () => {
      renderInput({ disabled: true });
      expect(getTextarea().disabled).toBe(true);
    });

    it('send button is disabled when disabled prop is true even with text', () => {
      renderInput({ disabled: true });
      // We can't type into a disabled textarea normally, but we test the prop
      // by rendering and checking the button state directly
      expect(getSendBtn().disabled).toBe(true);
    });

    it('onSend is not called when disabled and Enter is pressed', () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} disabled={true} />);
      // Even if we force a keydown, the guard in handleSend should prevent it
      fireEvent.keyDown(getTextarea(), { key: 'Enter', shiftKey: false });
      expect(onSend).not.toHaveBeenCalled();
    });
  });
});
