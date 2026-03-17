/**
 * RothkoField component tests.
 *
 * @module shell/canvas/components
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { RothkoField } from './RothkoField';

describe('RothkoField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the rothko field when enabled', () => {
    render(<RothkoField enabled />);
    expect(screen.getByTestId('rothko-field')).toBeTruthy();
  });

  it('renders nothing when disabled', () => {
    render(<RothkoField enabled={false} />);
    expect(screen.queryByTestId('rothko-field')).toBeNull();
  });

  it('is enabled by default', () => {
    render(<RothkoField />);
    expect(screen.getByTestId('rothko-field')).toBeTruthy();
  });

  it('has pointer-events: none to avoid blocking canvas', () => {
    render(<RothkoField />);
    const field = screen.getByTestId('rothko-field');
    expect(field.style.pointerEvents).toBe('none');
  });

  it('contains multiple color band layers', () => {
    render(<RothkoField />);
    const field = screen.getByTestId('rothko-field');
    // Base ground + 3 bands + center glow + grain = 6 child divs
    expect(field.children.length).toBeGreaterThanOrEqual(5);
  });

  it('includes grain texture overlay', () => {
    render(<RothkoField />);
    const field = screen.getByTestId('rothko-field');
    // The last child is the grain overlay with an SVG data URI
    const lastChild = field.lastElementChild as HTMLElement;
    expect(lastChild.style.mixBlendMode).toBe('overlay');
  });

  it('has position absolute to layer behind canvas content', () => {
    render(<RothkoField />);
    const field = screen.getByTestId('rothko-field');
    expect(field.style.position).toBe('absolute');
  });
});
