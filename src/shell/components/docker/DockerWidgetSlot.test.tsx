/**
 * DockerWidgetSlot — Co-located Tests
 * @module shell/components/docker
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { DockerWidgetSlot } from './DockerWidgetSlot';

const noopFn = vi.fn();

describe('DockerWidgetSlot', () => {
  const defaultProps = {
    slot: { widgetInstanceId: 'w-1' },
    onRemove: noopFn,
    children: <div data-testid="widget-content">Hello Widget</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children content', () => {
    render(<DockerWidgetSlot {...defaultProps} />);
    expect(screen.getByTestId('widget-content')).toBeTruthy();
    expect(screen.getByText('Hello Widget')).toBeTruthy();
  });

  it('renders slot container with correct test id', () => {
    render(<DockerWidgetSlot {...defaultProps} />);
    expect(screen.getByTestId('docker-widget-slot-w-1')).toBeTruthy();
  });

  it('renders undock button with correct test id', () => {
    render(<DockerWidgetSlot {...defaultProps} />);
    expect(screen.getByTestId('docker-widget-remove-w-1')).toBeTruthy();
  });

  it('calls onRemove with widgetInstanceId when undock button is clicked', () => {
    const onRemove = vi.fn();
    render(<DockerWidgetSlot {...defaultProps} onRemove={onRemove} />);
    fireEvent.click(screen.getByTestId('docker-widget-remove-w-1'));
    expect(onRemove).toHaveBeenCalledWith('w-1');
  });

  it('sets height based on effectiveHeight prop', () => {
    render(<DockerWidgetSlot {...defaultProps} effectiveHeight={250} />);
    const slot = screen.getByTestId('docker-widget-slot-w-1');
    expect(slot.style.height).toBe('250px');
  });

  it('sets height to auto when no heights provided', () => {
    render(<DockerWidgetSlot {...defaultProps} />);
    const slot = screen.getByTestId('docker-widget-slot-w-1');
    expect(slot.style.height).toBe('auto');
  });

  it('uses slot height when effectiveHeight not provided', () => {
    render(<DockerWidgetSlot {...defaultProps} slot={{ widgetInstanceId: 'w-1', height: 180 }} />);
    const slot = screen.getByTestId('docker-widget-slot-w-1');
    expect(slot.style.height).toBe('180px');
  });

  it('applies minimum height', () => {
    render(<DockerWidgetSlot {...defaultProps} />);
    const slot = screen.getByTestId('docker-widget-slot-w-1');
    expect(slot.style.minHeight).toBe('60px');
  });
});
