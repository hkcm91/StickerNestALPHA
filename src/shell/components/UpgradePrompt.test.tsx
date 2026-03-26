/**
 * UpgradePrompt — Tests
 * @module shell/components
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../kernel/billing', () => ({
  createCheckoutSession: vi.fn(),
}));

import { createCheckoutSession } from '../../kernel/billing';

import { UpgradePrompt } from './UpgradePrompt';

describe('UpgradePrompt', () => {
  const defaultProps = {
    resource: 'canvases',
    current: 5,
    limit: 5,
    upgradeTier: 'creator' as const,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<UpgradePrompt {...defaultProps} />);
    expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
  });

  it('displays resource usage text', () => {
    render(<UpgradePrompt {...defaultProps} />);
    expect(screen.getByText(/You've used 5 of 5 canvases/)).toBeTruthy();
  });

  it('displays the upgrade tier and price', () => {
    render(<UpgradePrompt {...defaultProps} />);
    expect(screen.getByText(/Creator/)).toBeTruthy();
    expect(screen.getByText(/\$9\/mo/)).toBeTruthy();
  });

  it('calls onClose when Maybe Later button is clicked', () => {
    const onClose = vi.fn();
    render(<UpgradePrompt {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Maybe Later'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop overlay', () => {
    const onClose = vi.fn();
    render(<UpgradePrompt {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('upgrade-prompt'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders Upgrade button when upgradeTier is provided', () => {
    render(<UpgradePrompt {...defaultProps} />);
    expect(screen.getByText('Upgrade')).toBeTruthy();
  });

  it('does not render Upgrade button when upgradeTier is null', () => {
    render(<UpgradePrompt {...defaultProps} upgradeTier={null} />);
    expect(screen.queryByText('Upgrade')).toBeNull();
  });

  it('calls createCheckoutSession when Upgrade is clicked', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ url: 'https://stripe.com/checkout' });
    render(<UpgradePrompt {...defaultProps} />);
    fireEvent.click(screen.getByText('Upgrade'));
    expect(createCheckoutSession).toHaveBeenCalledWith('creator');
  });

  it('shows pro tier price correctly', () => {
    render(<UpgradePrompt {...defaultProps} upgradeTier="pro" />);
    expect(screen.getByText(/\$29\/mo/)).toBeTruthy();
  });
});
