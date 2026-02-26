/**
 * Modal component tests.
 *
 * @module shell/components
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );

    expect(screen.queryByTestId('modal-backdrop')).toBeNull();
  });

  it('renders modal content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );

    expect(screen.getByTestId('modal-backdrop')).toBeTruthy();
    expect(screen.getByText('Test Modal')).toBeTruthy();
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    fireEvent.click(screen.getByTestId('modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when backdrop click is disabled', () => {
    const onClose = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Test Modal"
        closeOnBackdropClick={false}
      >
        <p>Content</p>
      </Modal>,
    );

    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when Escape is disabled', () => {
    const onClose = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Test Modal"
        closeOnEscape={false}
      >
        <p>Content</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders footer when provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Test Modal"
        footer={<button>Save</button>}
      >
        <p>Content</p>
      </Modal>,
    );

    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('does not close when clicking on modal content', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );

    fireEvent.click(screen.getByTestId('modal-content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has correct accessibility attributes', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Accessible Modal">
        <p>Content</p>
      </Modal>,
    );

    const content = screen.getByTestId('modal-content');
    expect(content.getAttribute('role')).toBe('dialog');
    expect(content.getAttribute('aria-modal')).toBe('true');
    expect(content.getAttribute('aria-labelledby')).toBe('modal-title');
  });
});
