/**
 * DockerLayer — Co-located Tests
 * @module shell/components/docker
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Docker } from '@sn/types';

// Mock the bus
vi.mock('../../../kernel/bus', () => ({
  bus: {
    subscribe: vi.fn(() => vi.fn()),
    emit: vi.fn(),
  },
}));

// Mock the dockerStore
const mockDockers: Record<string, Docker> = {};
const mockActiveDockerOrder: string[] = [];

vi.mock('../../../kernel/stores/docker', () => ({
  useDockerStore: vi.fn((selector: (s: unknown) => unknown) => {
    const state = {
      dockers: mockDockers,
      activeDockerOrder: mockActiveDockerOrder,
      updateDocker: vi.fn(),
      setDockMode: vi.fn(),
      setPosition: vi.fn(),
      setSize: vi.fn(),
      toggleVisible: vi.fn(),
      togglePinned: vi.fn(),
      addTab: vi.fn(),
      removeTab: vi.fn(),
      setActiveTab: vi.fn(),
      renameTab: vi.fn(),
      addDocker: vi.fn(),
      addWidgetToTab: vi.fn(),
      resizeWidgetInTab: vi.fn(),
      removeWidgetFromTab: vi.fn(),
      bringToFront: vi.fn(),
      setVisible: vi.fn(),
    };
    return selector(state);
  }),
}));

import { DockerLayer } from './DockerLayer';

describe('DockerLayer', () => {
  const defaultProps = {
    renderWidget: (id: string) => <div data-testid={`widget-${id}`}>Widget {id}</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear dockers
    Object.keys(mockDockers).forEach((k) => delete mockDockers[k]);
    mockActiveDockerOrder.length = 0;
  });

  it('renders nothing when no visible dockers exist', () => {
    const { container } = render(<DockerLayer {...defaultProps} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders docker layer when dockers are visible', () => {
    const docker: Docker = {
      id: 'docker-1',
      name: 'Test',
      dockMode: 'floating',
      position: { x: 50, y: 50 },
      size: { width: 300, height: 400 },
      visible: true,
      pinned: false,
      tabs: [{ id: 'tab-1', name: 'Tab 1', widgets: [] }],
      activeTabIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDockers['docker-1'] = docker;
    mockActiveDockerOrder.push('docker-1');

    render(<DockerLayer {...defaultProps} />);
    expect(screen.getByTestId('docker-layer')).toBeTruthy();
  });

  it('renders docker container for visible dockers', () => {
    const docker: Docker = {
      id: 'docker-1',
      name: 'Floating Docker',
      dockMode: 'floating',
      position: { x: 50, y: 50 },
      size: { width: 300, height: 400 },
      visible: true,
      pinned: false,
      tabs: [{ id: 'tab-1', name: 'Tab 1', widgets: [] }],
      activeTabIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDockers['docker-1'] = docker;
    mockActiveDockerOrder.push('docker-1');

    render(<DockerLayer {...defaultProps} />);
    expect(screen.getByTestId('docker-container-docker-1')).toBeTruthy();
    expect(screen.getByText('Floating Docker')).toBeTruthy();
  });

  it('skips invisible dockers', () => {
    const docker: Docker = {
      id: 'docker-hidden',
      name: 'Hidden',
      dockMode: 'floating',
      position: { x: 50, y: 50 },
      size: { width: 300, height: 400 },
      visible: false,
      pinned: false,
      tabs: [{ id: 'tab-1', name: 'Tab 1', widgets: [] }],
      activeTabIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDockers['docker-hidden'] = docker;
    mockActiveDockerOrder.push('docker-hidden');

    const { container } = render(<DockerLayer {...defaultProps} />);
    expect(container.innerHTML).toBe('');
  });
});
