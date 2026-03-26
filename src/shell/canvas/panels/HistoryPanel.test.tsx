/**
 * HistoryPanel component tests.
 *
 * @module shell/canvas/panels
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockClear = vi.fn();
let mockUndoStack: any[] = [];
let mockRedoStack: any[] = [];

vi.mock('../../../kernel/stores/history/history.store', () => ({
  useHistoryStore: vi.fn((selector) => {
    const state = {
      undoStack: mockUndoStack,
      redoStack: mockRedoStack,
      undo: mockUndo,
      redo: mockRedo,
      clear: mockClear,
    };
    return selector(state);
  }),
}));

vi.mock('../../theme/theme-vars', () => ({
  themeVar: (token: string) => `var(${token})`,
}));

import { HistoryPanel } from './HistoryPanel';

function makeHistoryEntry(type: string, ts?: number) {
  return {
    event: { type, payload: {} },
    inverseEvent: null,
    timestamp: ts ?? Date.now(),
  };
}

describe('HistoryPanel', () => {
  beforeEach(() => {
    mockUndoStack = [];
    mockRedoStack = [];
    vi.clearAllMocks();
  });

  it('renders the history panel', () => {
    render(<HistoryPanel />);
    expect(screen.getByTestId('history-panel')).toBeTruthy();
  });

  it('shows "No history yet" when stacks are empty', () => {
    render(<HistoryPanel />);
    expect(screen.getByText('No history yet')).toBeTruthy();
  });

  it('renders undo and redo buttons', () => {
    render(<HistoryPanel />);
    expect(screen.getByText('Undo')).toBeTruthy();
    expect(screen.getByText('Redo')).toBeTruthy();
  });

  it('disables undo button when undo stack is empty', () => {
    render(<HistoryPanel />);
    const undoBtn = screen.getByText('Undo');
    expect(undoBtn.hasAttribute('disabled')).toBe(true);
  });

  it('calls undo when undo button is clicked', () => {
    mockUndoStack = [makeHistoryEntry('canvas.entity.created')];
    render(<HistoryPanel />);
    const undoBtn = screen.getByText('Undo');
    fireEvent.click(undoBtn);
    expect(mockUndo).toHaveBeenCalled();
  });

  it('displays entry labels from the undo stack', () => {
    mockUndoStack = [makeHistoryEntry('canvas.entity.created')];
    render(<HistoryPanel />);
    expect(screen.getByText('Create Entity')).toBeTruthy();
  });

  it('calls clear when Clear button is clicked', () => {
    render(<HistoryPanel />);
    const clearBtn = screen.getByText('Clear');
    fireEvent.click(clearBtn);
    expect(mockClear).toHaveBeenCalled();
  });
});
