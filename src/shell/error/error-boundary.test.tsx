/**
 * App Error Boundary tests
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppErrorBoundary } from './error-boundary';

// Component that throws on demand
const ThrowingChild: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div data-testid="child">OK</div>;
};

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </AppErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('shows error UI when child throws', () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </AppErrorBoundary>,
    );
    expect(screen.getByTestId('app-error-boundary')).toBeTruthy();
    expect(screen.getByTestId('error-message').textContent).toBe('Test error');
    expect(screen.getByTestId('reload-btn')).toBeTruthy();
    expect(screen.getByTestId('home-link')).toBeTruthy();
  });

  it('truncates long error messages to 300 characters', () => {
    const LongError: React.FC = () => {
      throw new Error('x'.repeat(500));
    };

    render(
      <AppErrorBoundary>
        <LongError />
      </AppErrorBoundary>,
    );
    const msg = screen.getByTestId('error-message').textContent!;
    expect(msg.length).toBeLessThanOrEqual(303); // 300 + '...'
    expect(msg.endsWith('...')).toBe(true);
  });
});
