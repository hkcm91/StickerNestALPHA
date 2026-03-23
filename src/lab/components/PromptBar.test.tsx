/**
 * Tests for PromptBar component.
 *
 * @vitest-environment happy-dom
 * @module lab/components
 * @layer L2
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { AIGenerator, AIGenerationResult } from '../ai/ai-generator';
import { getDefaultModel } from '../ai/models';

import { PromptBar } from './PromptBar';

// ═══════════════════════════════════════════════════════════════════
// Mock generator factory
// ═══════════════════════════════════════════════════════════════════

function createMockGenerator(overrides: Partial<AIGenerator> = {}): AIGenerator {
  return {
    generate: vi.fn<AIGenerator['generate']>().mockResolvedValue({
      html: '<div>Hello</div><script>console.log("hi")</script>',
      isValid: true,
      errors: [],
    }),
    generateStream: vi.fn<AIGenerator['generateStream']>().mockResolvedValue({
      html: '<div>Hello</div><script>console.log("hi")</script>',
      isValid: true,
      errors: [],
    }),
    explain: vi.fn<AIGenerator['explain']>().mockResolvedValue({
      text: 'Explanation here',
      error: null,
    }),
    isGenerating: vi.fn().mockReturnValue(false),
    cancel: vi.fn(),
    getLastResult: vi.fn().mockReturnValue(null),
    setModel: vi.fn(),
    getModel: vi.fn().mockReturnValue(getDefaultModel()),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════

describe('PromptBar', () => {
  it('renders the prompt input', () => {
    render(<PromptBar />);
    expect(screen.getByLabelText('AI prompt input')).toBeDefined();
  });

  it('renders with search role and label', () => {
    render(<PromptBar />);
    expect(screen.getByRole('search', { name: 'AI prompt bar' })).toBeDefined();
  });

  it('shows "Describe a widget..." placeholder when no editor content', () => {
    render(<PromptBar />);
    const input = screen.getByLabelText('AI prompt input') as HTMLInputElement;
    expect(input.placeholder).toBe('Describe a widget...');
  });

  it('shows "Describe a change..." placeholder when editor content exists', () => {
    render(<PromptBar currentEditorContent="<html>existing</html>" />);
    const input = screen.getByLabelText('AI prompt input') as HTMLInputElement;
    expect(input.placeholder).toBe('Describe a change...');
  });

  it('shows "Go" button when no editor content', () => {
    render(<PromptBar />);
    expect(screen.getByLabelText('Generate widget')).toBeDefined();
    expect(screen.getByText('Generate')).toBeDefined();
  });

  it('shows "Edit" button when editor content exists', () => {
    render(<PromptBar currentEditorContent="<html>existing</html>" />);
    expect(screen.getByLabelText('Apply AI edit')).toBeDefined();
    expect(screen.getByText('Edit')).toBeDefined();
  });

  it('disables submit button when prompt is empty', () => {
    render(<PromptBar generator={createMockGenerator()} />);
    const btn = screen.getByLabelText('Generate widget') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('dispatches to generator on submit and applies result', async () => {
    const generator = createMockGenerator();
    const onApplyCode = vi.fn();

    render(
      <PromptBar
        generator={generator}
        onApplyCode={onApplyCode}
      />,
    );

    const input = screen.getByLabelText('AI prompt input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'add a weather API call' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(generator.generate).toHaveBeenCalledWith(
        'add a weather API call',
        undefined,
      );
    });

    await waitFor(() => {
      expect(onApplyCode).toHaveBeenCalledWith(
        '<div>Hello</div><script>console.log("hi")</script>',
      );
    });
  });

  it('sends edit prompt when editor content exists', async () => {
    const generator = createMockGenerator();
    const onApplyCode = vi.fn();

    render(
      <PromptBar
        generator={generator}
        onApplyCode={onApplyCode}
        currentEditorContent="<html>old</html>"
      />,
    );

    const input = screen.getByLabelText('AI prompt input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'make it blue' } });
    fireEvent.click(screen.getByText('Edit'));

    await waitFor(() => {
      expect(generator.generate).toHaveBeenCalled();
      const callArg = (generator.generate as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(callArg).toContain('Edit this widget:');
      expect(callArg).toContain('<html>old</html>');
      expect(callArg).toContain('make it blue');
    });
  });

  it('shows error when generation fails', async () => {
    const generator = createMockGenerator({
      generate: vi.fn<AIGenerator['generate']>().mockResolvedValue({
        html: '',
        isValid: false,
        errors: ['Generation failed: timeout'],
      }),
    });

    render(<PromptBar generator={generator} />);

    const input = screen.getByLabelText('AI prompt input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'make something' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Generation failed: timeout')).toBeDefined();
    });
  });

  it('clears error when user types again', async () => {
    const generator = createMockGenerator({
      generate: vi.fn<AIGenerator['generate']>().mockResolvedValue({
        html: '',
        isValid: false,
        errors: ['Oops'],
      }),
    });

    render(<PromptBar generator={generator} />);

    const input = screen.getByLabelText('AI prompt input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'fail' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Oops')).toBeDefined();
    });

    fireEvent.change(input, { target: { value: 'retry' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('clears input after submit', async () => {
    const generator = createMockGenerator();

    render(<PromptBar generator={generator} />);

    const input = screen.getByLabelText('AI prompt input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test prompt' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Input should be cleared immediately
    expect(input.value).toBe('');
  });

  it('passes graphContext to generator', async () => {
    const generator = createMockGenerator();

    render(
      <PromptBar
        generator={generator}
        graphContext="Pipeline: nodes=[timer, display]"
      />,
    );

    const input = screen.getByLabelText('AI prompt input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'connect them' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(generator.generate).toHaveBeenCalledWith(
        'connect them',
        'Pipeline: nodes=[timer, display]',
      );
    });
  });

  it('does not submit on Enter when generating', async () => {
    let resolveGenerate: (v: AIGenerationResult) => void;
    const generatePromise = new Promise<AIGenerationResult>((resolve) => {
      resolveGenerate = resolve;
    });
    const generator = createMockGenerator({
      generate: vi.fn<AIGenerator['generate']>().mockReturnValue(generatePromise),
    });

    render(<PromptBar generator={generator} onApplyCode={vi.fn()} />);

    const input = screen.getByLabelText('AI prompt input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'first prompt' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Try to submit again while generating
    fireEvent.change(input, { target: { value: 'second prompt' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Only one call
    expect(generator.generate).toHaveBeenCalledTimes(1);

    // Clean up
    resolveGenerate!({ html: '', isValid: true, errors: [] });
  });
});
