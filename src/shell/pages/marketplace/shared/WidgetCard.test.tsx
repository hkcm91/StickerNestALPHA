/**
 * WidgetCard tests
 * @vitest-environment happy-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { WidgetCard } from './WidgetCard';

const baseProps = {
  id: 'w-1',
  name: 'Test Widget',
  description: 'A test widget for testing.',
  thumbnailUrl: null,
  ratingAverage: 4.2,
  ratingCount: 15,
  installCount: 1200,
  isFree: true,
  priceCents: null,
  currency: 'usd',
  isOfficial: false,
  onClick: vi.fn(),
};

describe('WidgetCard', () => {
  it('renders widget name and description', () => {
    render(<WidgetCard {...baseProps} />);
    const card = screen.getByTestId('marketplace-widget-card');
    expect(card.textContent).toContain('Test Widget');
    expect(card.textContent).toContain('A test widget for testing.');
  });

  it('calls onClick with widget id when clicked', () => {
    const onClick = vi.fn();
    render(<WidgetCard {...baseProps} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('marketplace-widget-card'));
    expect(onClick).toHaveBeenCalledWith('w-1');
  });

  it('shows Free badge for free widgets', () => {
    render(<WidgetCard {...baseProps} />);
    expect(screen.getByTestId('price-tag').textContent).toBe('Free');
  });

  it('shows price for paid widgets', () => {
    render(<WidgetCard {...baseProps} isFree={false} priceCents={99} />);
    expect(screen.getByTestId('price-tag').textContent).toContain('0.99');
  });

  it('shows Official badge when isOfficial is true', () => {
    render(<WidgetCard {...baseProps} isOfficial />);
    expect(screen.getByTestId('marketplace-widget-card').textContent).toContain('Official');
  });

  it('shows Deprecated badge when deprecated', () => {
    render(<WidgetCard {...baseProps} isDeprecated />);
    expect(screen.getByTestId('marketplace-widget-card').textContent).toContain('Deprecated');
  });

  it('renders install count', () => {
    render(<WidgetCard {...baseProps} />);
    expect(screen.getByTestId('marketplace-widget-card').textContent).toContain('1,200');
  });

  it('renders action slot', () => {
    render(
      <WidgetCard {...baseProps} action={<button data-testid="action-btn">Install</button>} />,
    );
    expect(screen.getByTestId('action-btn')).toBeTruthy();
  });

  it('stops event propagation on action slot click', () => {
    const onClick = vi.fn();
    const actionClick = vi.fn();
    render(
      <WidgetCard
        {...baseProps}
        onClick={onClick}
        action={<button data-testid="action-btn" onClick={actionClick}>Install</button>}
      />,
    );
    fireEvent.click(screen.getByTestId('action-btn'));
    expect(actionClick).toHaveBeenCalled();
    // onClick should NOT be called because action area stops propagation
    expect(onClick).not.toHaveBeenCalled();
  });
});
