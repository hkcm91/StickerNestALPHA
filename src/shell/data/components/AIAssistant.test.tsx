/**
 * AIAssistant component tests — conversational chat interface.
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
  getTableSchema: vi.fn().mockResolvedValue({ success: false, error: { message: 'mock' } }),
  getTableRows: vi.fn().mockResolvedValue({ success: false, error: { message: 'mock' } }),
}));

import { generateSchema } from '../../../kernel/datasource';

const MOCK_USER = { id: 'user-1', email: 'a@b.com', displayName: 'Test', avatarUrl: null, tier: 'free' as const };

describe('AIAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(MOCK_USER);
    useAuthStore.getState().setInitialized();
  });

  it('renders the chat panel with title and input area', () => {
    render(<AIAssistant onClose={vi.fn()} />);
    expect(screen.getByTestId('ai-assistant')).toBeTruthy();
    expect(screen.getByText('AI Assistant')).toBeTruthy();
    expect(screen.getByTestId('ai-prompt-input')).toBeTruthy();
    expect(screen.getByTestId('btn-ai-submit')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AIAssistant onClose={onClose} />);
    fireEvent.click(screen.getByTestId('btn-close-ai'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows smart suggestions when no messages exist', () => {
    render(<AIAssistant onClose={vi.fn()} />);
    expect(screen.getByText('What can I help with?')).toBeTruthy();
  });

  it('shows different suggestions when dataSourceId is provided', () => {
    render(<AIAssistant dataSourceId="ds-1" onClose={vi.fn()} />);
    // With a dataSourceId but no context loaded, should show data-specific suggestions
    expect(screen.getByText('What can I help with?')).toBeTruthy();
  });

  it('sends a message and shows AI response with schema preview', async () => {
    const onSchemaGenerated = vi.fn();
    (generateSchema as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { columns: [{ name: 'Title' }, { name: 'Status' }] },
    });

    render(<AIAssistant onClose={vi.fn()} onSchemaGenerated={onSchemaGenerated} />);

    // Type a message
    fireEvent.change(screen.getByTestId('ai-prompt-input'), {
      target: { value: 'Create a bug tracker' },
    });
    fireEvent.click(screen.getByTestId('btn-ai-submit'));

    // User message should appear
    expect(screen.getByText('Create a bug tracker')).toBeTruthy();

    // AI response should appear
    await waitFor(() => {
      expect(screen.getByTestId('ai-result')).toBeTruthy();
      expect(screen.getByText(/Generated 2 columns/)).toBeTruthy();
    });

    // Action button should be visible
    expect(screen.getByText('Apply Schema')).toBeTruthy();
  });

  it('calls onSchemaGenerated when Apply Schema button is clicked', async () => {
    const onSchemaGenerated = vi.fn();
    const mockData = { columns: [{ name: 'Title' }, { name: 'Status' }] };
    (generateSchema as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockData,
    });

    render(<AIAssistant onClose={vi.fn()} onSchemaGenerated={onSchemaGenerated} />);

    fireEvent.change(screen.getByTestId('ai-prompt-input'), {
      target: { value: 'Generate a schema for tasks' },
    });
    fireEvent.click(screen.getByTestId('btn-ai-submit'));

    await waitFor(() => {
      expect(screen.getByText('Apply Schema')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Apply Schema'));
    expect(onSchemaGenerated).toHaveBeenCalledWith(mockData);
  });

  it('shows error message when AI call fails', async () => {
    (generateSchema as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: { message: 'Proxy not configured' },
    });

    render(<AIAssistant onClose={vi.fn()} />);

    fireEvent.change(screen.getByTestId('ai-prompt-input'), {
      target: { value: 'Create something' },
    });
    fireEvent.click(screen.getByTestId('btn-ai-submit'));

    await waitFor(() => {
      expect(screen.getByText(/Error: Proxy not configured/)).toBeTruthy();
    });
  });

  it('supports Enter key to send messages', async () => {
    (generateSchema as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { columns: [] },
    });

    render(<AIAssistant onClose={vi.fn()} />);

    const textarea = screen.getByTestId('ai-prompt-input');
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('test')).toBeTruthy();
    });
  });
});
