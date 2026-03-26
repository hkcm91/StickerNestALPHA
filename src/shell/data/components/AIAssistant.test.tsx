/**
 * AIAssistant component tests.
 *
 * @vitest-environment happy-dom
 * @module shell/data
 * @layer L6
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

import { AIAssistant } from './AIAssistant';

vi.mock('../../../kernel/datasource', () => ({
  generateSchema: vi.fn(),
  autofill: vi.fn(),
  suggestColumn: vi.fn(),
  naturalLanguageQuery: vi.fn(),
  extractData: vi.fn(),
}));

import { generateSchema } from '../../../kernel/datasource';

const MOCK_USER = { id: 'user-1', email: 'a@b.com', displayName: 'Test', avatarUrl: null, tier: 'free' as const };

describe('AIAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().setInitialized();
  });

  it('renders the panel with title and mode buttons', () => {
    render(<AIAssistant onClose={vi.fn()} />);
    expect(screen.getByTestId('ai-assistant')).toBeTruthy();
    expect(screen.getByText('AI Assistant')).toBeTruthy();
    expect(screen.getByTestId('mode-generate')).toBeTruthy();
    expect(screen.getByTestId('mode-autofill')).toBeTruthy();
    expect(screen.getByTestId('mode-suggest')).toBeTruthy();
    expect(screen.getByTestId('mode-query')).toBeTruthy();
    expect(screen.getByTestId('mode-extract')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AIAssistant onClose={onClose} />);
    fireEvent.click(screen.getByTestId('btn-close-ai'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows tips section in idle mode', () => {
    render(<AIAssistant onClose={vi.fn()} />);
    expect(screen.getByText('What can AI do?')).toBeTruthy();
    // No input area visible in idle
    expect(screen.queryByTestId('ai-prompt-input')).toBeNull();
    expect(screen.queryByTestId('btn-ai-submit')).toBeNull();
  });

  it('shows prompt input after selecting generate schema mode', () => {
    render(<AIAssistant onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mode-generate'));
    expect(screen.getByTestId('ai-prompt-input')).toBeTruthy();
    expect(screen.getByTestId('btn-ai-submit')).toBeTruthy();
  });

  it('shows textarea for extract mode instead of text input', () => {
    render(<AIAssistant dataSourceId="ds-1" onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mode-extract'));
    expect(screen.getByTestId('ai-paste-input')).toBeTruthy();
    expect(screen.queryByTestId('ai-prompt-input')).toBeNull();
  });

  it('disables dataSource-dependent modes when no dataSourceId is provided', () => {
    render(<AIAssistant onClose={vi.fn()} />);
    expect((screen.getByTestId('mode-autofill') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('mode-suggest') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('mode-query') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('mode-extract') as HTMLButtonElement).disabled).toBe(true);
    // generate_schema does not require dataSourceId
    expect((screen.getByTestId('mode-generate') as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls generateSchema and shows result on successful submit', async () => {
    const onSchemaGenerated = vi.fn();
    (generateSchema as any).mockResolvedValue({
      success: true,
      data: { columns: [{ name: 'Title' }, { name: 'Status' }] },
    });

    render(<AIAssistant onClose={vi.fn()} onSchemaGenerated={onSchemaGenerated} />);
    fireEvent.click(screen.getByTestId('mode-generate'));
    fireEvent.change(screen.getByTestId('ai-prompt-input'), { target: { value: 'a bug tracker' } });
    fireEvent.click(screen.getByTestId('btn-ai-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-result')).toBeTruthy();
      expect(screen.getByText(/Generated 2 columns/)).toBeTruthy();
    });
    expect(onSchemaGenerated).toHaveBeenCalled();
  });
});
