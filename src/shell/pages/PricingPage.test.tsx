/**
 * PricingPage tests
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../kernel/stores/auth/auth.store';

vi.mock('../../kernel/billing', () => ({
  createCheckoutSession: vi.fn(),
}));

import { createCheckoutSession } from '../../kernel/billing';

import { PricingPage } from './PricingPage';

const mockCheckout = createCheckoutSession as ReturnType<typeof vi.fn>;

const MOCK_USER = {
  id: 'user-1',
  email: 'a@b.c',
  displayName: 'Test User',
  avatarUrl: null,
  tier: 'free' as const,
};

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().reset();
  });

  it('renders all four tier cards', () => {
    render(<PricingPage />);
    expect(screen.getByTestId('tier-free')).toBeTruthy();
    expect(screen.getByTestId('tier-creator')).toBeTruthy();
    expect(screen.getByTestId('tier-pro')).toBeTruthy();
    expect(screen.getByTestId('tier-enterprise')).toBeTruthy();
  });

  it('displays correct prices', () => {
    render(<PricingPage />);
    expect(screen.getByTestId('tier-free').textContent).toContain('$0');
    expect(screen.getByTestId('tier-creator').textContent).toContain('$9');
    expect(screen.getByTestId('tier-pro').textContent).toContain('$29');
    expect(screen.getByTestId('tier-enterprise').textContent).toContain('Custom');
  });

  it('shows "Current Plan" button for user\'s current tier', () => {
    useAuthStore.getState().setUser(MOCK_USER);
    render(<PricingPage />);
    const freeCard = screen.getByTestId('tier-free');
    expect(freeCard.textContent).toContain('Current Plan');
  });

  it('calls createCheckoutSession when clicking a paid tier', async () => {
    useAuthStore.getState().setUser(MOCK_USER);
    mockCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });

    render(<PricingPage />);
    const creatorCard = screen.getByTestId('tier-creator');
    const button = creatorCard.querySelector('button')!;
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledWith('creator');
    });

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('displays error message when checkout fails', async () => {
    useAuthStore.getState().setUser(MOCK_USER);
    mockCheckout.mockRejectedValue(new Error('Stripe not configured'));

    render(<PricingPage />);
    const proCard = screen.getByTestId('tier-pro');
    const button = proCard.querySelector('button')!;
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Stripe not configured')).toBeTruthy();
    });
  });

  it('does not call checkout for free tier', () => {
    useAuthStore.getState().setUser({ ...MOCK_USER, tier: 'creator' });
    render(<PricingPage />);
    const freeCard = screen.getByTestId('tier-free');
    const button = freeCard.querySelector('button')!;
    fireEvent.click(button);
    expect(mockCheckout).not.toHaveBeenCalled();
  });
});
