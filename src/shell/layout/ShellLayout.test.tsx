/**
 * ShellLayout tests
 * @module shell/layout
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useUIStore } from '../../kernel/stores/ui/ui.store';

// Mock the DockerLayer to avoid pulling in complex dependencies
vi.mock('../components/docker', () => ({
  DockerLayer: () => <div data-testid="docker-layer" />,
}));

import { ShellLayout } from './ShellLayout';

describe('ShellLayout', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarLeftOpen: false,
      sidebarRightOpen: false,
    });
  });

  it('renders the main layout container with children', () => {
    render(
      <ShellLayout>
        <div data-testid="canvas-content">Canvas</div>
      </ShellLayout>,
    );
    expect(screen.getByTestId('shell-layout')).toBeTruthy();
    expect(screen.getByTestId('canvas-content')).toBeTruthy();
  });

  it('renders topbar when provided', () => {
    render(
      <ShellLayout topbar={<div data-testid="my-topbar">Toolbar</div>}>
        <div>Main</div>
      </ShellLayout>,
    );
    expect(screen.getByTestId('shell-topbar')).toBeTruthy();
    expect(screen.getByTestId('my-topbar')).toBeTruthy();
  });

  it('does not render topbar when not provided', () => {
    render(
      <ShellLayout>
        <div>Main</div>
      </ShellLayout>,
    );
    expect(screen.queryByTestId('shell-topbar')).toBeNull();
  });

  it('renders left sidebar and toggle tab when sidebarLeft is provided', () => {
    render(
      <ShellLayout sidebarLeft={<div data-testid="left-content">Left</div>}>
        <div>Main</div>
      </ShellLayout>,
    );
    expect(screen.getByTestId('shell-sidebar-left')).toBeTruthy();
    expect(screen.getByTestId('tray-tab-left')).toBeTruthy();
  });

  it('renders right sidebar and toggle tab when sidebarRight is provided', () => {
    render(
      <ShellLayout sidebarRight={<div data-testid="right-content">Right</div>}>
        <div>Main</div>
      </ShellLayout>,
    );
    expect(screen.getByTestId('shell-sidebar-right')).toBeTruthy();
    expect(screen.getByTestId('tray-tab-right')).toBeTruthy();
  });

  it('does not render sidebar elements when not provided', () => {
    render(
      <ShellLayout>
        <div>Main</div>
      </ShellLayout>,
    );
    expect(screen.queryByTestId('shell-sidebar-left')).toBeNull();
    expect(screen.queryByTestId('shell-sidebar-right')).toBeNull();
    expect(screen.queryByTestId('tray-tab-left')).toBeNull();
    expect(screen.queryByTestId('tray-tab-right')).toBeNull();
  });

  it('clicking left tab toggles the sidebar open state', () => {
    render(
      <ShellLayout sidebarLeft={<div>Left Panel</div>}>
        <div>Main</div>
      </ShellLayout>,
    );
    const tab = screen.getByTestId('tray-tab-left');
    // Initially closed — tab should say "Assets"
    expect(tab.textContent).toBe('Assets');

    fireEvent.click(tab);
    // After click, sidebar should be open
    expect(useUIStore.getState().sidebarLeftOpen).toBe(true);
  });

  it('clicking right tab toggles the sidebar open state', () => {
    render(
      <ShellLayout sidebarRight={<div>Right Panel</div>}>
        <div>Main</div>
      </ShellLayout>,
    );
    const tab = screen.getByTestId('tray-tab-right');
    expect(tab.textContent).toBe('Props');

    fireEvent.click(tab);
    expect(useUIStore.getState().sidebarRightOpen).toBe(true);
  });

  it('renders DockerLayer when renderDockerWidget is provided', () => {
    render(
      <ShellLayout renderDockerWidget={(id) => <div>{id}</div>}>
        <div>Main</div>
      </ShellLayout>,
    );
    expect(screen.getByTestId('docker-layer')).toBeTruthy();
  });

  it('does not render DockerLayer when renderDockerWidget is not provided', () => {
    render(
      <ShellLayout>
        <div>Main</div>
      </ShellLayout>,
    );
    expect(screen.queryByTestId('docker-layer')).toBeNull();
  });
});
