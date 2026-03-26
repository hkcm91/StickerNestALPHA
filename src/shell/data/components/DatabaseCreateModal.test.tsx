/**
 * DatabaseCreateModal component tests.
 *
 * @vitest-environment happy-dom
 * @module shell/data
 * @layer L6
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DatabaseCreateModal } from './DatabaseCreateModal';

describe('DatabaseCreateModal', () => {
  it('renders the modal with title and form fields', () => {
    render(<DatabaseCreateModal onCreate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('create-database-modal')).toBeTruthy();
    expect(screen.getByText('New Database')).toBeTruthy();
    expect(screen.getByTestId('input-db-name')).toBeTruthy();
    expect(screen.getByTestId('select-db-type')).toBeTruthy();
  });

  it('disables Create button when name is empty', () => {
    render(<DatabaseCreateModal onCreate={vi.fn()} onClose={vi.fn()} />);
    const createBtn = screen.getByTestId('btn-confirm-create') as HTMLButtonElement;
    expect(createBtn.disabled).toBe(true);
  });

  it('enables Create button when name is provided', () => {
    render(<DatabaseCreateModal onCreate={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId('input-db-name'), { target: { value: 'My DB' } });
    const createBtn = screen.getByTestId('btn-confirm-create') as HTMLButtonElement;
    expect(createBtn.disabled).toBe(false);
  });

  it('calls onCreate with trimmed name and selected type on submit', () => {
    const onCreate = vi.fn();
    render(<DatabaseCreateModal onCreate={onCreate} onClose={vi.fn()} />);

    fireEvent.change(screen.getByTestId('input-db-name'), { target: { value: '  My Table  ' } });
    fireEvent.change(screen.getByTestId('select-db-type'), { target: { value: 'doc' } });
    fireEvent.click(screen.getByTestId('btn-confirm-create'));

    expect(onCreate).toHaveBeenCalledWith('My Table', 'doc');
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<DatabaseCreateModal onCreate={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('defaults type to table', () => {
    render(<DatabaseCreateModal onCreate={vi.fn()} onClose={vi.fn()} />);
    const select = screen.getByTestId('select-db-type') as HTMLSelectElement;
    expect(select.value).toBe('table');
  });
});
