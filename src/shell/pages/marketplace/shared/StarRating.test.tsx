/**
 * StarRating tests
 * @vitest-environment happy-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { StarRating } from './StarRating';

describe('StarRating', () => {
  it('renders 5 stars by default', () => {
    render(<StarRating value={3} />);
    expect(screen.getByTestId('star-rating').children).toHaveLength(5);
  });

  it('displays correct filled/empty stars for value 3', () => {
    render(<StarRating value={3} />);
    // Stars 1-3 should be filled, 4-5 empty
    expect(screen.getByTestId('star-1').textContent).toBe('\u2605');
    expect(screen.getByTestId('star-2').textContent).toBe('\u2605');
    expect(screen.getByTestId('star-3').textContent).toBe('\u2605');
    expect(screen.getByTestId('star-4').textContent).toBe('\u2606');
    expect(screen.getByTestId('star-5').textContent).toBe('\u2606');
  });

  it('calls onChange when clicked in interactive mode', () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('star-4'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('does not call onChange when not interactive', () => {
    render(<StarRating value={3} />);
    // No onChange provided — clicking should not throw
    fireEvent.click(screen.getByTestId('star-4'));
  });

  it('renders custom number of stars', () => {
    render(<StarRating value={2} max={3} />);
    expect(screen.getByTestId('star-rating').children).toHaveLength(3);
  });
});
