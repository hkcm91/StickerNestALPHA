/**
 * InstallButton tests
 * @vitest-environment happy-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../kernel/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
}));

import { InstallButton } from './InstallButton';

const baseProps = {
  widgetId: 'w-1',
  isInstalled: false,
  isBuiltIn: false,
  isFree: true,
  priceCents: null as number | null,
  onInstall: vi.fn(),
  onUninstall: vi.fn(),
};

describe('InstallButton', () => {
  it('shows "Built-in" for built-in widgets', () => {
    render(<InstallButton {...baseProps} isBuiltIn />);
    expect(screen.getByTestId('install-btn-builtin').textContent).toBe('Built-in');
  });

  it('shows "Install" button for free uninstalled widgets', () => {
    render(<InstallButton {...baseProps} />);
    const btn = screen.getByTestId('install-btn');
    expect(btn.textContent).toBe('Install');
  });

  it('calls onInstall when Install clicked', () => {
    const onInstall = vi.fn();
    render(<InstallButton {...baseProps} onInstall={onInstall} />);
    fireEvent.click(screen.getByTestId('install-btn'));
    expect(onInstall).toHaveBeenCalledWith('w-1');
  });

  it('shows "Buy" button with price for paid widgets', () => {
    render(<InstallButton {...baseProps} isFree={false} priceCents={99} />);
    const btn = screen.getByTestId('buy-btn');
    expect(btn.textContent).toContain('Buy');
    expect(btn.textContent).toContain('0.99');
  });

  it('shows "Uninstall" button for installed widgets', () => {
    render(<InstallButton {...baseProps} isInstalled />);
    expect(screen.getByTestId('uninstall-btn').textContent).toBe('Uninstall');
  });

  it('shows confirmation dialog after clicking Uninstall', () => {
    render(<InstallButton {...baseProps} isInstalled />);
    fireEvent.click(screen.getByTestId('uninstall-btn'));
    expect(screen.getByTestId('uninstall-confirm').textContent).toContain('Are you sure');
  });

  it('shows "Installing..." when installState is installing', () => {
    render(<InstallButton {...baseProps} installState="installing" />);
    expect(screen.getByTestId('install-btn').textContent).toBe('Installing...');
  });

  it('shows Install button after uninstall completes', () => {
    render(<InstallButton {...baseProps} isInstalled={false} uninstallState="uninstalled" />);
    expect(screen.getByTestId('install-btn').textContent).toBe('Install');
  });

  it('calls creator-checkout with buy_widget action for paid widgets', async () => {
    const { supabase: mockSupabase } = await import('../../../../kernel/supabase');
    const mockInvoke = mockSupabase.functions.invoke as ReturnType<typeof vi.fn>;
    mockInvoke.mockResolvedValue({ data: { url: 'https://checkout.stripe.com/test' } });

    // Mock window.location.href setter
    const hrefSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as Location);

    render(
      <InstallButton
        {...baseProps}
        isFree={false}
        priceCents={99}
        stripePriceId="price_test_123"
        onInstall={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('buy-btn'));

    // Wait for async handleBuy to complete
    await vi.waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('creator-checkout', {
        body: { action: 'buy_widget', widgetId: 'w-1' },
      });
    });

    hrefSpy.mockRestore();
  });

  it('calls onInstall directly for paid widget without stripePriceId', async () => {
    const onInstall = vi.fn().mockResolvedValue(undefined);
    render(
      <InstallButton
        {...baseProps}
        isFree={false}
        priceCents={99}
        stripePriceId={null}
        onInstall={onInstall}
      />,
    );

    fireEvent.click(screen.getByTestId('buy-btn'));

    await vi.waitFor(() => {
      expect(onInstall).toHaveBeenCalledWith('w-1');
    });
  });
});
