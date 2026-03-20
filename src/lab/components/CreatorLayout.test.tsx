/**
 * Tests for CreatorLayout component.
 *
 * @vitest-environment happy-dom
 * @module lab/components
 * @layer L2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { CreatorLayout } from './CreatorLayout';

// Minimal props factory
function createProps(overrides: Partial<Parameters<typeof CreatorLayout>[0]> = {}) {
  return {
    activeView: 'graph' as const,
    onViewChange: vi.fn(),
    activeBottomTab: null,
    onBottomTabChange: vi.fn(),
    graphCollapsed: false,
    onToggleGraphCollapsed: vi.fn(),
    previewSlot: <div data-testid="preview">Preview content</div>,
    graphSlot: <div data-testid="graph">Graph content</div>,
    editorSlot: <div data-testid="editor">Editor content</div>,
    inspectorSlot: <div data-testid="inspector">Inspector</div>,
    manifestSlot: <div data-testid="manifest">Manifest</div>,
    publishSlot: <div data-testid="publish">Publish</div>,
    ...overrides,
  };
}

describe('CreatorLayout', () => {
  it('renders preview slot as the primary content', () => {
    render(<CreatorLayout {...createProps()} />);
    expect(screen.getByTestId('preview')).toBeDefined();
    expect(screen.getByText('Preview content')).toBeDefined();
  });

  it('renders graph slot when graph view is active and not collapsed', () => {
    render(<CreatorLayout {...createProps({ activeView: 'graph' })} />);
    expect(screen.getByTestId('graph')).toBeDefined();
  });

  it('renders editor slot when editor view is active', () => {
    render(<CreatorLayout {...createProps({ activeView: 'editor' })} />);
    expect(screen.getByTestId('editor')).toBeDefined();
  });

  it('hides graph panel when graphCollapsed is true', () => {
    render(<CreatorLayout {...createProps({ graphCollapsed: true })} />);
    expect(screen.queryByTestId('graph')).toBeNull();
    // Preview still renders
    expect(screen.getByTestId('preview')).toBeDefined();
  });

  it('calls onToggleGraphCollapsed when collapse button is clicked', () => {
    const onToggle = vi.fn();
    render(<CreatorLayout {...createProps({ onToggleGraphCollapsed: onToggle })} />);

    const collapseBtn = screen.getByLabelText('Collapse graph panel');
    fireEvent.click(collapseBtn);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('shows expand button when graph is collapsed', () => {
    render(<CreatorLayout {...createProps({ graphCollapsed: true })} />);
    expect(screen.getByLabelText('Expand graph panel')).toBeDefined();
  });

  it('renders Graph tab first and Code tab second in view toggle', () => {
    render(<CreatorLayout {...createProps()} />);
    const tabs = screen.getAllByRole('tab');
    // First two tabs are Graph and Code
    expect(tabs[0].textContent).toBe('Graph');
    expect(tabs[1].textContent).toBe('Code');
  });

  it('renders bottom tray tabs (Inspector, Manifest, Publish)', () => {
    render(<CreatorLayout {...createProps()} />);
    expect(screen.getByText('Inspector')).toBeDefined();
    expect(screen.getByText('Manifest')).toBeDefined();
    expect(screen.getByText('Publish')).toBeDefined();
  });

  it('shows inspector content when inspector bottom tab is active', () => {
    render(<CreatorLayout {...createProps({ activeBottomTab: 'inspector' })} />);
    expect(screen.getByTestId('inspector')).toBeDefined();
  });

  it('calls onBottomTabChange when bottom tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<CreatorLayout {...createProps({ onBottomTabChange: onTabChange })} />);

    fireEvent.click(screen.getByText('Manifest'));
    expect(onTabChange).toHaveBeenCalledWith('manifest');
  });

  it('toggles bottom tab off when clicking active tab', () => {
    const onTabChange = vi.fn();
    render(<CreatorLayout {...createProps({
      activeBottomTab: 'inspector',
      onBottomTabChange: onTabChange,
    })} />);

    // Use the tab role to disambiguate from the content slot
    const inspectorTab = screen.getAllByText('Inspector').find(
      (el) => el.getAttribute('role') === 'tab',
    );
    fireEvent.click(inspectorTab!);
    expect(onTabChange).toHaveBeenCalledWith(null);
  });

  it('renders toolbar extras when provided', () => {
    render(<CreatorLayout {...createProps({
      toolbarExtras: <div data-testid="extras">Play Button</div>,
    })} />);
    expect(screen.getByTestId('extras')).toBeDefined();
  });
});
