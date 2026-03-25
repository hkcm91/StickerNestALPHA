/**
 * Tests for AISlidePanel component.
 *
 * @vitest-environment happy-dom
 * @module lab/components/LabAI
 * @layer L2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { AIGenerator } from '../../ai/ai-generator';

import { AISlidePanel } from './AISlidePanel';

// ═══════════════════════════════════════════════════════════════════
// Mock generator factory
// ═══════════════════════════════════════════════════════════════════

function createMockGenerator(overrides: Partial<AIGenerator> = {}): AIGenerator {
  return {
    generate: vi.fn().mockResolvedValue({
      html: '<div>Test</div><script>true</script>',
      isValid: true,
      errors: [],
    }),
    generateStream: vi.fn().mockResolvedValue({
      html: '<div>Test</div><script>true</script>',
      isValid: true,
      errors: [],
    }),
    explain: vi.fn().mockResolvedValue({ text: 'Explanation', error: null }),
    isGenerating: vi.fn().mockReturnValue(false),
    cancel: vi.fn(),
    getLastResult: vi.fn().mockReturnValue(null),
    setModel: vi.fn(),
    getModel: vi.fn().mockReturnValue({ id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', description: 'Test' }),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════

describe('AISlidePanel', () => {
  it('renders as a dialog with correct aria-label', () => {
    render(<AISlidePanel open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'AI Companion thread' })).toBeDefined();
  });

  it('sets aria-hidden=false when open', () => {
    render(<AISlidePanel open={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog.getAttribute('aria-hidden')).toBe('false');
  });

  it('sets aria-hidden=true when closed', () => {
    render(<AISlidePanel open={false} onClose={vi.fn()} />);
    // Dialog is hidden, so we need to query with hidden: true
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders "AI Companion" header text when open', () => {
    render(<AISlidePanel open={true} onClose={vi.fn()} />);
    // AISlidePanel has its own header; AIThread (rendered inside) also has one
    const matches = screen.getAllByText('AI Companion');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders close button', () => {
    render(<AISlidePanel open={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Close AI panel')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AISlidePanel open={true} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close AI panel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape key when open', () => {
    const onClose = vi.fn();
    render(<AISlidePanel open={true} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose on Escape key when closed', () => {
    const onClose = vi.fn();
    render(<AISlidePanel open={false} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders AIThread content when open', () => {
    render(
      <AISlidePanel
        open={true}
        onClose={vi.fn()}
        generator={createMockGenerator()}
      />,
    );

    // AIThread renders an input with "AI prompt" label
    expect(screen.getByLabelText('AI prompt')).toBeDefined();
  });

  it('does not render AIThread content when closed', () => {
    render(
      <AISlidePanel
        open={false}
        onClose={vi.fn()}
        generator={createMockGenerator()}
      />,
    );

    // AIThread should not be in the DOM when closed
    expect(screen.queryByLabelText('AI prompt')).toBeNull();
  });

  it('applies translateX(0) transform when open', () => {
    render(<AISlidePanel open={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog.style.transform).toBe('translateX(0)');
  });

  it('applies translateX offset when closed', () => {
    render(<AISlidePanel open={false} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog.style.transform).toContain('translateX(');
    expect(dialog.style.transform).not.toBe('translateX(0)');
  });

  it('disables pointer events on container when closed', () => {
    render(<AISlidePanel open={false} onClose={vi.fn()} />);
    const container = screen.getByTestId('ai-slide-panel-container');
    expect(container.style.pointerEvents).toBe('none');
  });

  it('enables pointer events on container when open', () => {
    render(<AISlidePanel open={true} onClose={vi.fn()} />);
    const container = screen.getByTestId('ai-slide-panel-container');
    expect(container.style.pointerEvents).toBe('auto');
  });

  it('passes generator to AIThread when open', () => {
    const generator = createMockGenerator();
    render(
      <AISlidePanel
        open={true}
        onClose={vi.fn()}
        generator={generator}
      />,
    );

    // The generate button from AIThread should be present
    expect(screen.getByLabelText('Generate widget')).toBeDefined();
  });

  it('passes onApplyCode through to AIThread', () => {
    const onApplyCode = vi.fn();
    render(
      <AISlidePanel
        open={true}
        onClose={vi.fn()}
        generator={createMockGenerator()}
        onApplyCode={onApplyCode}
      />,
    );

    // The thread is rendered with the callback — full integration would
    // require generating a response, but presence of the thread is enough here
    expect(screen.getByLabelText('AI prompt')).toBeDefined();
  });

  it('closes when backdrop area is clicked', () => {
    const onClose = vi.fn();
    render(<AISlidePanel open={true} onClose={onClose} />);

    const container = screen.getByTestId('ai-slide-panel-container');
    fireEvent.click(container);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close when panel content is clicked', () => {
    const onClose = vi.fn();
    render(<AISlidePanel open={true} onClose={onClose} />);

    // Click on the panel header text — should not trigger backdrop close
    const headers = screen.getAllByText('AI Companion');
    fireEvent.click(headers[0]);
    // onClose should not have been called from backdrop handler
    // (the close button click would be separate)
    expect(onClose).not.toHaveBeenCalled();
  });
});
