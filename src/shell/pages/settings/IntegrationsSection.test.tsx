/**
 * IntegrationsSection tests
 * @module shell/pages/settings
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockListApiKeys = vi.fn();
const mockSaveApiKey = vi.fn();
const mockDeleteApiKey = vi.fn();
const mockRevalidateApiKey = vi.fn();

vi.mock('../../../kernel/api-keys', () => ({
  listApiKeys: (...args: unknown[]) => mockListApiKeys(...args),
  saveApiKey: (...args: unknown[]) => mockSaveApiKey(...args),
  deleteApiKey: (...args: unknown[]) => mockDeleteApiKey(...args),
  revalidateApiKey: (...args: unknown[]) => mockRevalidateApiKey(...args),
}));

vi.mock('../../../kernel/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { connected: false }, error: null }),
    },
  },
}));

import { IntegrationsSection } from './IntegrationsSection';

describe('IntegrationsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListApiKeys.mockResolvedValue({ success: true, data: [] });
  });

  it('shows loading state initially', () => {
    mockListApiKeys.mockReturnValue(new Promise(() => {}));
    render(<IntegrationsSection />);
    expect(screen.getByTestId('integrations-loading')).toBeTruthy();
    expect(screen.getByText('Loading integrations...')).toBeTruthy();
  });

  it('renders section with provider cards after loading', async () => {
    render(<IntegrationsSection />);
    await waitFor(() => {
      expect(screen.getByTestId('integrations-section')).toBeTruthy();
    });
    expect(screen.getByText('Integrations')).toBeTruthy();
    expect(screen.getByTestId('provider-card-replicate')).toBeTruthy();
    expect(screen.getByTestId('provider-card-openai')).toBeTruthy();
    expect(screen.getByTestId('provider-card-anthropic')).toBeTruthy();
  });

  it('renders Notion integration card', async () => {
    render(<IntegrationsSection />);
    await waitFor(() => {
      expect(screen.getByTestId('notion-integration-card')).toBeTruthy();
    });
    expect(screen.getByText('Notion')).toBeTruthy();
  });

  it('shows "Add API Key" button for providers without keys', async () => {
    render(<IntegrationsSection />);
    await waitFor(() => {
      expect(screen.getByTestId('add-key-replicate')).toBeTruthy();
    });
    expect(screen.getByTestId('add-key-openai')).toBeTruthy();
    expect(screen.getByTestId('add-key-anthropic')).toBeTruthy();
  });

  it('shows key input when "Add API Key" is clicked', async () => {
    render(<IntegrationsSection />);
    await waitFor(() => {
      expect(screen.getByTestId('add-key-replicate')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('add-key-replicate'));
    expect(screen.getByTestId('key-input-replicate')).toBeTruthy();
    expect(screen.getByTestId('save-key-replicate')).toBeTruthy();
  });

  it('displays existing API keys with status badges', async () => {
    mockListApiKeys.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'key-1',
          provider: 'openai',
          keySuffix: 'abc123',
          status: 'active',
          validationError: null,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    render(<IntegrationsSection />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-card-openai')).toBeTruthy();
    });
    // Should show masked key suffix
    expect(screen.getByText(/abc123/)).toBeTruthy();
    // Should show active status badge
    const badges = screen.getAllByTestId('status-badge');
    const activeBadge = badges.find((b) => b.textContent === 'active');
    expect(activeBadge).toBeTruthy();
  });

  it('includes security notice', async () => {
    render(<IntegrationsSection />);
    await waitFor(() => {
      expect(screen.getByTestId('integrations-section')).toBeTruthy();
    });
    expect(screen.getByText(/API keys are encrypted/)).toBeTruthy();
  });
});
