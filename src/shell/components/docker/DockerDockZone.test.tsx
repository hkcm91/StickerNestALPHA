/**
 * DockerDockZone — Co-located Tests
 * @module shell/components/docker
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';

import { DockerDockZone } from './DockerDockZone';

describe('DockerDockZone', () => {
  it('renders nothing when not active', () => {
    const { container } = render(<DockerDockZone side="left" active={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders left zone when active', () => {
    render(<DockerDockZone side="left" active={true} />);
    expect(screen.getByTestId('docker-dock-zone-left')).toBeTruthy();
  });

  it('renders right zone when active', () => {
    render(<DockerDockZone side="right" active={true} />);
    expect(screen.getByTestId('docker-dock-zone-right')).toBeTruthy();
  });

  it('has aria-hidden attribute for accessibility', () => {
    render(<DockerDockZone side="left" active={true} />);
    expect(screen.getByTestId('docker-dock-zone-left')).toHaveAttribute('aria-hidden');
  });

  it('has pointer-events none to allow click-through', () => {
    render(<DockerDockZone side="left" active={true} />);
    const zone = screen.getByTestId('docker-dock-zone-left');
    expect(zone.style.pointerEvents).toBe('none');
  });

  it('adjusts glow intensity based on proximity', () => {
    const { rerender } = render(<DockerDockZone side="left" active={true} proximity={0} />);
    const zone = screen.getByTestId('docker-dock-zone-left');
    const bgLow = zone.style.background;

    rerender(<DockerDockZone side="left" active={true} proximity={1} />);
    const bgHigh = zone.style.background;

    // Higher proximity should produce a different (brighter) background
    expect(bgLow).not.toBe(bgHigh);
  });
});
