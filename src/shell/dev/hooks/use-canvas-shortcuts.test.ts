/**
 * Tests for useCanvasShortcuts hook
 *
 * @module shell/dev/hooks
 * @layer L6
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { useCanvasShortcuts, type CanvasShortcutActions } from './use-canvas-shortcuts';

function makeKeyEvent(overrides: Partial<React.KeyboardEvent> = {}): React.KeyboardEvent {
  return {
    key: '',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    target: document.createElement('div'),
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as React.KeyboardEvent;
}

describe('useCanvasShortcuts', () => {
  it('calls onDelete on Delete key when hasSelection', () => {
    const onDelete = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onDelete, hasSelection: true }),
    );

    const e = makeKeyEvent({ key: 'Delete' });
    result.current.onKeyDown(e);

    expect(onDelete).toHaveBeenCalledOnce();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('calls onDelete on Backspace key when hasSelection', () => {
    const onDelete = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onDelete, hasSelection: true }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: 'Backspace' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('does not call onDelete when no selection', () => {
    const onDelete = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onDelete, hasSelection: false }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: 'Delete' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDeselect on Escape', () => {
    const onDeselect = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onDeselect }),
    );

    const e = makeKeyEvent({ key: 'Escape' });
    result.current.onKeyDown(e);

    expect(onDeselect).toHaveBeenCalledOnce();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('calls onSelectAll on Ctrl+A', () => {
    const onSelectAll = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onSelectAll }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: 'a', ctrlKey: true }));
    expect(onSelectAll).toHaveBeenCalledOnce();
  });

  it('nudges by 10px on arrow keys', () => {
    const onNudge = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onNudge, hasSelection: true }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowUp' }));
    expect(onNudge).toHaveBeenCalledWith(0, -10);

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowDown' }));
    expect(onNudge).toHaveBeenCalledWith(0, 10);

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowLeft' }));
    expect(onNudge).toHaveBeenCalledWith(-10, 0);

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowRight' }));
    expect(onNudge).toHaveBeenCalledWith(10, 0);
  });

  it('nudges by 50px on Shift+arrow keys', () => {
    const onNudge = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onNudge, hasSelection: true }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowUp', shiftKey: true }));
    expect(onNudge).toHaveBeenCalledWith(0, -50);

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowRight', shiftKey: true }));
    expect(onNudge).toHaveBeenCalledWith(50, 0);
  });

  it('does not nudge without selection', () => {
    const onNudge = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onNudge, hasSelection: false }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: 'ArrowUp' }));
    expect(onNudge).not.toHaveBeenCalled();
  });

  it('calls onBringForward on Ctrl+]', () => {
    const onBringForward = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onBringForward, hasSelection: true }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: ']', ctrlKey: true }));
    expect(onBringForward).toHaveBeenCalledOnce();
  });

  it('calls onSendBackward on Ctrl+[', () => {
    const onSendBackward = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onSendBackward, hasSelection: true }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: '[', ctrlKey: true }));
    expect(onSendBackward).toHaveBeenCalledOnce();
  });

  it('calls onBringToFront on Ctrl+Shift+]', () => {
    const onBringToFront = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onBringToFront, hasSelection: true }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: ']', ctrlKey: true, shiftKey: true }));
    expect(onBringToFront).toHaveBeenCalledOnce();
  });

  it('calls onSendToBack on Ctrl+Shift+[', () => {
    const onSendToBack = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onSendToBack, hasSelection: true }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: '[', ctrlKey: true, shiftKey: true }));
    expect(onSendToBack).toHaveBeenCalledOnce();
  });

  it('ignores shortcuts when enabled=false', () => {
    const onDelete = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onDelete, hasSelection: true, enabled: false }),
    );

    result.current.onKeyDown(makeKeyEvent({ key: 'Delete' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when target is an input element', () => {
    const onDelete = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onDelete, hasSelection: true }),
    );

    const input = document.createElement('input');
    result.current.onKeyDown(makeKeyEvent({ key: 'Delete', target: input }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when target is a textarea', () => {
    const onDeselect = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onDeselect }),
    );

    const textarea = document.createElement('textarea');
    result.current.onKeyDown(makeKeyEvent({ key: 'Escape', target: textarea }));
    expect(onDeselect).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when target is contentEditable', () => {
    const onDelete = vi.fn();
    const { result } = renderHook(() =>
      useCanvasShortcuts({ onDelete, hasSelection: true }),
    );

    const div = document.createElement('div');
    div.contentEditable = 'true';
    result.current.onKeyDown(makeKeyEvent({ key: 'Delete', target: div }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
