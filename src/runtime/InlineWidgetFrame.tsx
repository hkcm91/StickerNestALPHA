/**
 * Inline Widget Frame
 *
 * Direct React host for trusted built-in widgets.
 * No iframe, no sandboxing, zero-latency.
 * Trusted only — never use for third-party widgets.
 *
 * @module runtime/InlineWidgetFrame
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import React, { useEffect } from 'react';

import { bus } from '../kernel/bus';

import { WidgetErrorBoundary } from './lifecycle/error-boundary';
import { createLifecycleManager } from './lifecycle/manager';

/**
 * Props for the InlineWidgetFrame component.
 */
export interface InlineWidgetFrameProps {
  /** Widget type ID */
  widgetId: string;
  /** Unique instance ID */
  instanceId: string;
  /** The React component to render */
  Component: React.ComponentType<any>;
  /** User-configured widget settings */
  config: Record<string, any>;
  /** Current theme tokens */
  theme: Record<string, string>;
  /** Controls visibility (via display:none) */
  visible: boolean;
  /** Container width */
  width: number;
  /** Container height */
  height: number;
}

/**
 * Inner component for the inline widget frame.
 */
const InlineWidgetInner: React.FC<InlineWidgetFrameProps> = (props) => {
  const { widgetId, instanceId, Component, config, theme, visible, width, height } = props;

  useEffect(() => {
    const lifecycle = createLifecycleManager(instanceId);
    lifecycle.transition('LOADING');
    lifecycle.transition('INITIALIZING');
    lifecycle.transition('READY');
    lifecycle.transition('RUNNING');

    return () => {
      lifecycle.destroy();
    };
  }, [instanceId]);

  return (
    <div
      data-testid={`inline-widget-${widgetId}`}
      style={{
        display: visible ? 'block' : 'none',
        width,
        height,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <Component
        instanceId={instanceId}
        config={config}
        theme={theme}
        viewport={{ width, height }}
      />
    </div>
  );
};

/**
 * Sandboxed-equivalent host host component for trusted inline React widgets.
 */
export const InlineWidgetFrame: React.FC<InlineWidgetFrameProps> = (props) => {
  const handleReload = () => {
    // Reload is handled by React re-mounting the inner component via error boundary reset
  };

  const handleRemove = () => {
    bus.emit('widget.remove', { instanceId: props.instanceId });
  };

  return (
    <WidgetErrorBoundary
      instanceId={props.instanceId}
      widgetName={props.widgetId}
      onReload={handleReload}
      onRemove={handleRemove}
    >
      <InlineWidgetInner {...props} />
    </WidgetErrorBoundary>
  );
};
