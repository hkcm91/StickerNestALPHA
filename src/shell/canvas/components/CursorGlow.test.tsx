/**
 * CursorGlow component tests.
 *
 * @module shell/canvas/components
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CursorGlow } from './CursorGlow';

describe('CursorGlow', () => {
  it('renders the glow layer when enabled', () => {
    render(<CursorGlow enabled />);
    expect(screen.getByTestId('cursor-glow-layer')).toBeTruthy();
  });

  it('renders nothing when disabled', () => {
    render(<CursorGlow enabled={false} />);
    expect(screen.queryByTestId('cursor-glow-layer')).toBeNull();
  });

  it('is enabled by default', () => {
    render(<CursorGlow />);
    expect(screen.getByTestId('cursor-glow-layer')).toBeTruthy();
  });

  it('has pointer-events: none to avoid blocking canvas interactions', () => {
    render(<CursorGlow />);
    const layer = screen.getByTestId('cursor-glow-layer');
    expect(layer.style.pointerEvents).toBe('none');
  });

  it('updates glow position on mouse move', () => {
    render(<CursorGlow />);
    const layer = screen.getByTestId('cursor-glow-layer');

    // Mock getBoundingClientRect for percentage calculation
    Object.defineProperty(layer, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 1000, height: 800, right: 1000, bottom: 800, x: 0, y: 0, toJSON() {} }),
    });

    fireEvent.mouseMove(layer, { clientX: 500, clientY: 400 });

    // The inner glow div should exist (opacity becomes 1 on visible)
    const glowDiv = layer.firstElementChild as HTMLElement;
    expect(glowDiv).toBeTruthy();
    expect(glowDiv.style.opacity).toBe('1');
  });

  it('hides glow on mouse leave', () => {
    render(<CursorGlow />);
    const layer = screen.getByTestId('cursor-glow-layer');

    Object.defineProperty(layer, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 1000, height: 800, right: 1000, bottom: 800, x: 0, y: 0, toJSON() {} }),
    });

    // Move mouse in to make visible
    fireEvent.mouseMove(layer, { clientX: 500, clientY: 400 });
    const glowDiv = layer.firstElementChild as HTMLElement;
    expect(glowDiv.style.opacity).toBe('1');

    // Mouse leave
    fireEvent.mouseLeave(layer);
    expect(glowDiv.style.opacity).toBe('0');
  });

  it('uses CSS transition for deliberate lag (not instant tracking)', () => {
    render(<CursorGlow />);
    const layer = screen.getByTestId('cursor-glow-layer');

    Object.defineProperty(layer, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 1000, height: 800, right: 1000, bottom: 800, x: 0, y: 0, toJSON() {} }),
    });

    fireEvent.mouseMove(layer, { clientX: 100, clientY: 100 });
    const glowDiv = layer.firstElementChild as HTMLElement;
    // Should have a transition with spring curve for deliberate lag
    expect(glowDiv.style.transition).toContain('0.8s');
    expect(glowDiv.style.transition).toContain('cubic-bezier');
  });
});
