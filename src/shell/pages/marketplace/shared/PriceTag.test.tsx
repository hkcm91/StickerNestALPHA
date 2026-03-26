/**
 * PriceTag tests
 * @vitest-environment happy-dom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PriceTag } from './PriceTag';

describe('PriceTag', () => {
  it('renders "Free" for free widgets', () => {
    render(<PriceTag isFree priceCents={null} />);
    expect(screen.getByTestId('price-tag').textContent).toBe('Free');
  });

  it('renders formatted price for paid widgets', () => {
    render(<PriceTag isFree={false} priceCents={99} currency="usd" />);
    expect(screen.getByTestId('price-tag').textContent).toContain('0.99');
  });

  it('renders $0.00 when priceCents is null for paid widget', () => {
    render(<PriceTag isFree={false} priceCents={null} />);
    expect(screen.getByTestId('price-tag').textContent).toContain('0.00');
  });
});
