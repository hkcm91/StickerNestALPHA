/**
 * Tests for OnboardingOverlay component.
 *
 * @vitest-environment happy-dom
 * @module lab/components
 * @layer L2
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { OnboardingOverlay } from './OnboardingOverlay';

function createProps(overrides: Partial<Parameters<typeof OnboardingOverlay>[0]> = {}) {
  return {
    visible: true,
    onSelectPath: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
}

describe('OnboardingOverlay', () => {
  it('renders overlay when visible is true', () => {
    render(<OnboardingOverlay {...createProps()} />);
    expect(screen.getByTestId('onboarding-overlay')).toBeDefined();
  });

  it('does not render overlay when visible is false', () => {
    render(<OnboardingOverlay {...createProps({ visible: false })} />);
    expect(screen.queryByTestId('onboarding-overlay')).toBeNull();
  });

  it('shows the "What do you want to create?" header', () => {
    render(<OnboardingOverlay {...createProps()} />);
    expect(screen.getByText('What do you want to create?')).toBeDefined();
  });

  it('renders all three path cards', () => {
    render(<OnboardingOverlay {...createProps()} />);
    expect(screen.getByTestId('onboarding-card-template')).toBeDefined();
    expect(screen.getByTestId('onboarding-card-describe')).toBeDefined();
    expect(screen.getByTestId('onboarding-card-visual')).toBeDefined();
  });

  it('shows correct titles for each card', () => {
    render(<OnboardingOverlay {...createProps()} />);
    expect(screen.getByText('Start from a template')).toBeDefined();
    expect(screen.getByText('Describe what you want')).toBeDefined();
    expect(screen.getByText('Build visually')).toBeDefined();
  });

  it('calls onSelectPath with "template" when template card is clicked', () => {
    const onSelect = vi.fn();
    render(<OnboardingOverlay {...createProps({ onSelectPath: onSelect })} />);
    fireEvent.click(screen.getByTestId('onboarding-card-template'));
    expect(onSelect).toHaveBeenCalledWith('template');
  });

  it('calls onSelectPath with "describe" when describe card is clicked', () => {
    const onSelect = vi.fn();
    render(<OnboardingOverlay {...createProps({ onSelectPath: onSelect })} />);
    fireEvent.click(screen.getByTestId('onboarding-card-describe'));
    expect(onSelect).toHaveBeenCalledWith('describe');
  });

  it('calls onSelectPath with "visual" when visual card is clicked', () => {
    const onSelect = vi.fn();
    render(<OnboardingOverlay {...createProps({ onSelectPath: onSelect })} />);
    fireEvent.click(screen.getByTestId('onboarding-card-visual'));
    expect(onSelect).toHaveBeenCalledWith('visual');
  });

  it('calls onDismiss when Skip button is clicked', () => {
    const onDismiss = vi.fn();
    render(<OnboardingOverlay {...createProps({ onDismiss })} />);
    fireEvent.click(screen.getByLabelText('Close onboarding'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('shows subtitle text about switching approaches', () => {
    render(<OnboardingOverlay {...createProps()} />);
    expect(screen.getByText(/you can always switch approaches/i)).toBeDefined();
  });
});
