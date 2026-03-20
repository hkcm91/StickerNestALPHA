/**
 * Tests for DeviceFrame component.
 *
 * @vitest-environment happy-dom
 * @module lab/components
 * @layer L2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DeviceFrame } from './DeviceFrame';

function createProps(overrides: Partial<Parameters<typeof DeviceFrame>[0]> = {}) {
  return {
    device: 'phone' as const,
    onDeviceChange: vi.fn(),
    containerWidth: 800,
    containerHeight: 600,
    children: <div data-testid="content">Widget content</div>,
    ...overrides,
  };
}

describe('DeviceFrame', () => {
  it('renders children inside the device content area', () => {
    render(<DeviceFrame {...createProps()} />);
    expect(screen.getByTestId('content')).toBeDefined();
    expect(screen.getByText('Widget content')).toBeDefined();
  });

  it('renders the device selector with all three options', () => {
    render(<DeviceFrame {...createProps()} />);
    expect(screen.getByLabelText('Phone')).toBeDefined();
    expect(screen.getByLabelText('Tablet')).toBeDefined();
    expect(screen.getByLabelText('Desktop')).toBeDefined();
  });

  it('marks the active device as checked in the radio group', () => {
    render(<DeviceFrame {...createProps({ device: 'tablet' })} />);
    expect(screen.getByLabelText('Tablet').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Phone').getAttribute('aria-checked')).toBe('false');
  });

  it('calls onDeviceChange when a device button is clicked', () => {
    const onDeviceChange = vi.fn();
    render(<DeviceFrame {...createProps({ onDeviceChange })} />);

    fireEvent.click(screen.getByLabelText('Desktop'));
    expect(onDeviceChange).toHaveBeenCalledWith('desktop');
  });

  it('displays phone dimensions in the size label', () => {
    render(<DeviceFrame {...createProps({ device: 'phone' })} />);
    expect(screen.getByTestId('device-size-label').textContent).toBe('375 x 812');
  });

  it('displays tablet dimensions in the size label', () => {
    render(<DeviceFrame {...createProps({ device: 'tablet' })} />);
    expect(screen.getByTestId('device-size-label').textContent).toBe('768 x 1024');
  });

  it('displays desktop dimensions in the size label', () => {
    render(<DeviceFrame {...createProps({ device: 'desktop' })} />);
    expect(screen.getByTestId('device-size-label').textContent).toBe('1280 x 800');
  });

  it('renders phone notch element for phone device', () => {
    render(<DeviceFrame {...createProps({ device: 'phone' })} />);
    expect(screen.getByTestId('device-notch')).toBeDefined();
  });

  it('renders desktop title bar with traffic lights for desktop device', () => {
    render(<DeviceFrame {...createProps({ device: 'desktop' })} />);
    expect(screen.getByTestId('device-titlebar')).toBeDefined();
  });

  it('renders home indicator for phone device', () => {
    render(<DeviceFrame {...createProps({ device: 'phone' })} />);
    expect(screen.getByTestId('device-home-indicator')).toBeDefined();
  });

  it('does not render phone notch for desktop device', () => {
    render(<DeviceFrame {...createProps({ device: 'desktop' })} />);
    expect(screen.queryByTestId('device-notch')).toBeNull();
  });

  it('does not render desktop titlebar for phone device', () => {
    render(<DeviceFrame {...createProps({ device: 'phone' })} />);
    expect(screen.queryByTestId('device-titlebar')).toBeNull();
  });

  it('scales down when container is smaller than device frame', () => {
    render(<DeviceFrame {...createProps({
      device: 'desktop',
      containerWidth: 400,
      containerHeight: 300,
    })} />);
    const bezel = screen.getByTestId('device-bezel');
    // Should be scaled down since 1280+16 > 400
    const transform = bezel.style.transform;
    expect(transform).toMatch(/scale\([\d.]+\)/);
    // Extract scale value — should be less than 1
    const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
    expect(scaleMatch).not.toBeNull();
    expect(parseFloat(scaleMatch![1])).toBeLessThan(1);
  });

  it('does not scale beyond 1 when container is larger than device frame', () => {
    render(<DeviceFrame {...createProps({
      device: 'phone',
      containerWidth: 2000,
      containerHeight: 2000,
    })} />);
    const bezel = screen.getByTestId('device-bezel');
    const transform = bezel.style.transform;
    const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
    expect(scaleMatch).not.toBeNull();
    expect(parseFloat(scaleMatch![1])).toBeLessThanOrEqual(1);
  });

  it('has a radiogroup with the correct aria-label', () => {
    render(<DeviceFrame {...createProps()} />);
    expect(screen.getByRole('radiogroup', { name: 'Device frame size' })).toBeDefined();
  });
});
