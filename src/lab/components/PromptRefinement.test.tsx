/**
 * PromptRefinement overlay component tests
 *
 * @module lab/components
 * @layer L2
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AIGenerator } from '../ai/ai-generator';
import type { CompatibleWidget } from '../ai/prompt-questions';

import { PromptRefinement } from './PromptRefinement';

// ─── Mock Generator Factory ─────────────────────────────────────────

function mockGenerator(questions: string[] = []): AIGenerator {
  return {
    explain: vi.fn().mockResolvedValue({
      text: questions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
      error: null,
    }),
    isGenerating: vi.fn().mockReturnValue(false),
    generate: vi.fn(),
    generateStream: vi.fn(),
    cancel: vi.fn(),
    getLastResult: vi.fn().mockReturnValue(null),
    setModel: vi.fn(),
    getModel: vi.fn().mockReturnValue({
      id: 'test',
      name: 'Test',
      provider: 'anthropic' as const,
      description: '',
    }),
  };
}

// ─── Default Props Helper ────────────────────────────────────────────

function defaultProps(overrides: Partial<Parameters<typeof PromptRefinement>[0]> = {}) {
  return {
    initialPrompt: 'Build a timer widget',
    generator: mockGenerator(),
    compatibleWidgets: [] as CompatibleWidget[],
    onGenerate: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('PromptRefinement', () => {
  it('renders with prompt pre-filled', () => {
    const props = defaultProps({ initialPrompt: 'A fancy clock widget' });
    render(<PromptRefinement {...props} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('A fancy clock widget');
  });

  it('shows shimmer while questions load', () => {
    // Generator that never resolves so loading stays true
    const gen = mockGenerator();
    gen.explain = vi.fn().mockReturnValue(new Promise(() => {}));

    const props = defaultProps({ generator: gen });
    render(<PromptRefinement {...props} />);

    expect(screen.getByText('QUICK QUESTIONS')).toBeTruthy();
    // Shimmer lines are rendered (no question text visible)
    expect(screen.queryByText('No additional questions')).toBeNull();
  });

  it('shows AI questions after loading', async () => {
    const gen = mockGenerator(['What color scheme?', 'How many buttons?', 'Any sound effects?']);
    const props = defaultProps({ generator: gen });
    render(<PromptRefinement {...props} />);

    await waitFor(() => {
      expect(screen.getByText('What color scheme?')).toBeTruthy();
      expect(screen.getByText('How many buttons?')).toBeTruthy();
      expect(screen.getByText('Any sound effects?')).toBeTruthy();
    });
  });

  it('calls onCancel when Cancel clicked', () => {
    const props = defaultProps();
    render(<PromptRefinement {...props} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onGenerate with enriched prompt', async () => {
    const gen = mockGenerator();
    const props = defaultProps({ generator: gen, initialPrompt: 'A weather widget' });
    render(<PromptRefinement {...props} />);

    // Wait for questions to finish loading
    await waitFor(() => {
      expect(gen.explain).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Generate'));
    expect(props.onGenerate).toHaveBeenCalledTimes(1);

    const enrichedPrompt = props.onGenerate.mock.calls[0][0] as string;
    expect(enrichedPrompt).toContain('A weather widget');
  });

  it('shows compatible widgets when provided', async () => {
    const widgets: CompatibleWidget[] = [
      {
        name: 'DataFetcher',
        ports: ['dataOut', 'errorOut'],
        portContracts: { emits: [{ name: 'dataOut' }, { name: 'errorOut' }], subscribes: [] },
        compatibility: 'high',
      },
      {
        name: 'ChartRenderer',
        ports: ['dataIn'],
        portContracts: { emits: [], subscribes: [{ name: 'dataIn' }] },
        compatibility: 'partial',
      },
    ];
    const props = defaultProps({ compatibleWidgets: widgets });
    render(<PromptRefinement {...props} />);

    expect(screen.getByText('DataFetcher')).toBeTruthy();
    expect(screen.getByText('ChartRenderer')).toBeTruthy();
    expect(screen.getByText('dataOut, errorOut')).toBeTruthy();
    expect(screen.getByText('dataIn')).toBeTruthy();
  });

  it('hides compatible widgets section when empty', () => {
    const props = defaultProps({ compatibleWidgets: [] });
    render(<PromptRefinement {...props} />);

    expect(screen.queryByText('CONNECT TO WIDGETS')).toBeNull();
  });

  it('shows toggle pills', () => {
    const props = defaultProps();
    render(<PromptRefinement {...props} />);

    expect(screen.getByText('Interactive')).toBeTruthy();
    expect(screen.getByText('Dark mode')).toBeTruthy();
    expect(screen.getByText('Emit events')).toBeTruthy();
  });
});
