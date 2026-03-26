/**
 * SpatialCanvas2DPanel — unit tests.
 * @vitest-environment happy-dom
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drei-html">{children}</div>
  ),
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}));

vi.mock('three', () => ({
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    copy: vi.fn().mockReturnThis(),
    sub: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis(),
  })),
  Quaternion: vi.fn().mockImplementation((x = 0, y = 0, z = 0, w = 1) => ({
    x, y, z, w,
    copy: vi.fn().mockReturnThis(),
  })),
  Group: vi.fn(),
}));

import { bus } from '../../kernel/bus';

import { SpatialCanvas2DPanel } from './SpatialCanvas2DPanel';

describe('SpatialCanvas2DPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the panel with children content', () => {
    const { getByText } = render(
      <SpatialCanvas2DPanel panelId="test-panel">
        <div>My 2D Canvas Content</div>
      </SpatialCanvas2DPanel>,
    );

    expect(getByText('My 2D Canvas Content')).toBeDefined();
  });

  it('renders the panel label in the handle bar', () => {
    const { getByText } = render(
      <SpatialCanvas2DPanel panelId="test-panel" label="Workspace A">
        <div>Content</div>
      </SpatialCanvas2DPanel>,
    );

    expect(getByText('Workspace A')).toBeDefined();
  });

  it('renders pin and close buttons', () => {
    const { getByTitle } = render(
      <SpatialCanvas2DPanel panelId="test-panel">
        <div>Content</div>
      </SpatialCanvas2DPanel>,
    );

    expect(getByTitle('Pin panel')).toBeDefined();
    expect(getByTitle('Close panel')).toBeDefined();
  });

  it('emits panel close event when close button clicked', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('spatial.panel.closed', handler);

    const { getByTitle } = render(
      <SpatialCanvas2DPanel panelId="close-test">
        <div>Content</div>
      </SpatialCanvas2DPanel>,
    );

    getByTitle('Close panel').click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ panelId: 'close-test' }),
      }),
    );

    unsub();
  });

  it('toggles pinned state via bus events', () => {
    const pinHandler = vi.fn();
    const unsubPin = bus.subscribe('spatial.panel.pinned', pinHandler);

    const { getByTitle } = render(
      <SpatialCanvas2DPanel panelId="pin-test">
        <div>Content</div>
      </SpatialCanvas2DPanel>,
    );

    getByTitle('Pin panel').click();
    expect(pinHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ panelId: 'pin-test' }),
      }),
    );

    unsubPin();
  });
});
