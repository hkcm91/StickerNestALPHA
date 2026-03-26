/**
 * LicenseBadge tests
 * @vitest-environment happy-dom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { LicenseBadge } from './LicenseBadge';

describe('LicenseBadge', () => {
  it('renders MIT license', () => {
    render(<LicenseBadge license="MIT" />);
    expect(screen.getByTestId('license-badge').textContent).toBe('MIT');
  });

  it('renders no-fork license with red color', () => {
    render(<LicenseBadge license="no-fork" />);
    const badge = screen.getByTestId('license-badge');
    expect(badge.textContent).toBe('no-fork');
    expect(badge.style.color).toBe('#dc2626');
  });

  it('renders unknown license with muted color', () => {
    render(<LicenseBadge license="Custom" />);
    expect(screen.getByTestId('license-badge').textContent).toBe('Custom');
  });
});
