/**
 * PanelSlide component tests.
 *
 * @module shell/components
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { PanelSlide, PanelSlideItem } from './PanelSlide';

describe('PanelSlide', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with zero width when closed', () => {
    render(
      <PanelSlide open={false}>
        <div>Content</div>
      </PanelSlide>,
    );

    const panel = screen.getByTestId('panel-slide-right');
    expect(panel.style.width).toBe('0px');
  });

  it('renders with specified width when open', () => {
    render(
      <PanelSlide open={true} width={320}>
        <div>Content</div>
      </PanelSlide>,
    );

    const panel = screen.getByTestId('panel-slide-right');
    expect(panel.style.width).toBe('320px');
  });

  it('defaults to right side', () => {
    render(
      <PanelSlide open={true}>
        <div>Content</div>
      </PanelSlide>,
    );

    expect(screen.getByTestId('panel-slide-right')).toBeTruthy();
  });

  it('supports left side', () => {
    render(
      <PanelSlide open={true} side="left">
        <div>Content</div>
      </PanelSlide>,
    );

    expect(screen.getByTestId('panel-slide-left')).toBeTruthy();
  });

  it('shows title when provided', () => {
    render(
      <PanelSlide open={true} title="Layers">
        <div>Content</div>
      </PanelSlide>,
    );

    expect(screen.getByText('Layers')).toBeTruthy();
  });

  it('shows close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(
      <PanelSlide open={true} title="Layers" onClose={onClose}>
        <div>Content</div>
      </PanelSlide>,
    );

    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses spring curve for width transition', () => {
    render(
      <PanelSlide open={true}>
        <div>Content</div>
      </PanelSlide>,
    );

    const panel = screen.getByTestId('panel-slide-right');
    expect(panel.style.transition).toContain('cubic-bezier(0.16, 1, 0.3, 1)');
  });

  it('delays content visibility for two-phase animation', () => {
    render(
      <PanelSlide open={true}>
        <div>Content</div>
      </PanelSlide>,
    );

    // Initially content should be invisible (opacity 0)
    const panel = screen.getByTestId('panel-slide-right');
    const contentWrapper = panel.querySelector('div > div') as HTMLElement;
    expect(contentWrapper.style.opacity).toBe('0');

    // After delay, content becomes visible
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(contentWrapper.style.opacity).toBe('1');
  });

  it('defaults to 280px width', () => {
    render(
      <PanelSlide open={true}>
        <div>Content</div>
      </PanelSlide>,
    );

    const panel = screen.getByTestId('panel-slide-right');
    expect(panel.style.width).toBe('280px');
  });
});

describe('PanelSlideItem', () => {
  it('is visible when visible prop is true', () => {
    render(
      <PanelSlideItem index={0} visible={true}>
        <div>Item content</div>
      </PanelSlideItem>,
    );

    const item = screen.getByText('Item content').parentElement!;
    expect(item.style.opacity).toBe('1');
    expect(item.style.transform).toContain('translateX(0');
  });

  it('is hidden when visible prop is false', () => {
    render(
      <PanelSlideItem index={0} visible={false}>
        <div>Item content</div>
      </PanelSlideItem>,
    );

    const item = screen.getByText('Item content').parentElement!;
    expect(item.style.opacity).toBe('0');
  });

  it('applies staggered transition delay based on index', () => {
    render(
      <PanelSlideItem index={3} visible={true}>
        <div>Item content</div>
      </PanelSlideItem>,
    );

    const item = screen.getByText('Item content').parentElement!;
    // Delay = 0.15 + 3 * 0.05 = 0.3s
    // 0.15 + 3 * 0.05 = 0.3 (floating-point may produce 0.30000000000000004)
    expect(parseFloat(item.style.transitionDelay)).toBeCloseTo(0.3);
  });
});
