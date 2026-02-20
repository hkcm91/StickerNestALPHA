/**
 * Application-level Error Boundary
 *
 * Last-resort catch for unhandled errors. Shows a recovery UI.
 * Does NOT emit bus events (the bus might be the problem).
 *
 * @module shell/error
 * @layer L6
 */

import React from 'react';

export interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

export interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[AppErrorBoundary]', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? 'Unknown error';
      const truncated = msg.length > 300 ? msg.slice(0, 300) + '...' : msg;

      return (
        <div data-testid="app-error-boundary">
          <h1>Something went wrong</h1>
          <p data-testid="error-message">{truncated}</p>
          <button data-testid="reload-btn" onClick={this.handleReload}>
            Reload
          </button>
          <a href="/" data-testid="home-link">Return Home</a>
        </div>
      );
    }

    return this.props.children;
  }
}
