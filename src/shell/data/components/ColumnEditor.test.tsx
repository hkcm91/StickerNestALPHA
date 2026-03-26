/**
 * ColumnEditor component tests.
 *
 * @vitest-environment happy-dom
 * @module shell/data
 * @layer L6
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ColumnEditor } from './ColumnEditor';

const baseProps = {
  onSave: vi.fn(),
  onClose: vi.fn(),
};

describe('ColumnEditor', () => {
  it('renders in "new column" mode when no column prop is given', () => {
    render(<ColumnEditor {...baseProps} />);
    expect(screen.getByTestId('column-editor')).toBeTruthy();
    expect(screen.getByText('New Column')).toBeTruthy();
    expect(screen.getByTestId('btn-save-column').textContent).toBe('Add Column');
  });

  it('renders in "edit column" mode when a column prop is given', () => {
    const column = { id: 'col-1', name: 'Status', type: 'select' as const, order: 0 };
    render(<ColumnEditor {...baseProps} column={column} />);
    expect(screen.getByText('Edit Column')).toBeTruthy();
    expect(screen.getByTestId('btn-save-column').textContent).toBe('Save');
    expect((screen.getByTestId('column-name') as HTMLInputElement).value).toBe('Status');
  });

  it('disables save button when name is empty', () => {
    render(<ColumnEditor {...baseProps} />);
    const saveBtn = screen.getByTestId('btn-save-column') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('enables save button when name has content and calls onSave on click', () => {
    const onSave = vi.fn();
    render(<ColumnEditor {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByTestId('column-name'), { target: { value: 'Priority' } });
    const saveBtn = screen.getByTestId('btn-save-column') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);

    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
    const savedCol = onSave.mock.calls[0][0];
    expect(savedCol.name).toBe('Priority');
    expect(savedCol.type).toBe('text');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ColumnEditor {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('x'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows select options section when type is select', () => {
    render(<ColumnEditor {...baseProps} />);
    fireEvent.change(screen.getByTestId('column-type'), { target: { value: 'select' } });
    expect(screen.getByTestId('option-input')).toBeTruthy();
    expect(screen.getByText('Add')).toBeTruthy();
  });

  it('shows delete button only when editing an existing column with onDelete', () => {
    const column = { id: 'col-1', name: 'X', type: 'text' as const, order: 0 };
    const onDelete = vi.fn();
    render(<ColumnEditor {...baseProps} column={column} onDelete={onDelete} />);
    const deleteBtn = screen.getByTestId('btn-delete-column');
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not show delete button for new columns', () => {
    render(<ColumnEditor {...baseProps} />);
    expect(screen.queryByTestId('btn-delete-column')).toBeNull();
  });
});
