/**
 * Widget Error Boundary
 *
 * Catches widget crashes and shows a per-instance error state.
 * The event bus continues operating — a crashed widget never takes the bus down.
 *
 * @module runtime/lifecycle
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import React from 'react';

import { bus } from '../../kernel/bus';

/**
 * Props for the widget error boundary.
 */
export interface WidgetErrorBoundaryProps {
  instanceId: string;
  widgetName: string;
  children: React.ReactNode;
  onReload: () => void;
  onRemove: () => void;
}

/**
 * Error boundary state.
 */
export interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary that catches widget crashes and shows
 * a per-instance error state with Reload and Remove options.
 */
export class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(
      `[WidgetErrorBoundary][${this.props.instanceId}]`,
      error,
      errorInfo,
    );

    bus.emit('widget.error', {
      instanceId: this.props.instanceId,
      widgetName: this.props.widgetName,
      error: error.message,
    });
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReload();
  };

  private handleRemove = (): void => {
    this.props.onRemove();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message ?? 'Unknown error';
      const truncated =
        errorMessage.length > 200
          ? errorMessage.slice(0, 200) + '...'
          : errorMessage;

      return (
        <div
          data-testid="widget-error-boundary"
          style={{
            padding: '16px',
            border: '1px solid var(--sn-border, #ccc)',
            borderRadius: 'var(--sn-radius, 8px)',
            background: 'var(--sn-surface, #f9f9f9)',
            color: 'var(--sn-text, #333)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#9888;</div>
          <h3 style={{ margin: '0 0 8px' }}>Widget Error</h3>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--sn-text-muted, #666)',
              margin: '0 0 12px',
              wordBreak: 'break-word',
            }}
          >
            {truncated}
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              data-testid="widget-reload-btn"
              onClick={this.handleReload}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                border: '1px solid var(--sn-border, #ccc)',
                borderRadius: 'var(--sn-radius, 4px)',
                background: 'var(--sn-accent, #3B82F6)',
                color: '#fff',
              }}
            >
              Reload
            </button>
            <button
              data-testid="widget-remove-btn"
              onClick={this.handleRemove}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                border: '1px solid var(--sn-border, #ccc)',
                borderRadius: 'var(--sn-radius, 4px)',
                background: 'transparent',
                color: 'var(--sn-text, #333)',
              }}
            >
              Remove
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
