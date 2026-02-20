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

import type React from 'react';

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

// TODO: Implement React error boundary class component
// - Catch widget crashes (unhandled errors inside iframe)
// - Show error state for that widget instance only
// - Provide "Reload" and "Remove" buttons
// - Log errors but do not propagate to parent
// - Event bus must continue operating normally

/**
 * Placeholder export for the error boundary component.
 */
export const WidgetErrorBoundary: React.FC<WidgetErrorBoundaryProps> = () => {
  // TODO: Implement as class component with getDerivedStateFromError
  throw new Error('Not implemented: WidgetErrorBoundary');
};
