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
});
