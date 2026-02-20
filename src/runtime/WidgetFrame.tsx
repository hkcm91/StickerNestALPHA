/**
 * WidgetFrame Component
 *
 * The sandboxed iframe host component for all third-party widgets.
 * Uses srcdoc (never src URL), memoized with useMemo,
 * never conditionally rendered (use display:none to hide).
 *
 * @module runtime
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import type React from 'react';

import type { ThemeTokens } from './bridge/message-types';

/**
 * Props for the WidgetFrame component.
 */
export interface WidgetFrameProps {
  /** Widget type ID */
  widgetId: string;
  /** Unique instance ID (used as React key) */
  instanceId: string;
  /** Widget HTML source (loaded via srcdoc) */
  widgetHtml: string;
  /** User-configured widget settings */
  config: Record<string, unknown>;
  /** Current theme tokens */
  theme: ThemeTokens;
  /** Controls display:none — NEVER unmounts the iframe */
  visible: boolean;
  /** Container width */
  width: number;
  /** Container height */
  height: number;
}

/**
 * Sandboxed iframe host component for widgets.
 *
 * Rules:
 * - sandbox="allow-scripts allow-forms" — NO allow-same-origin
 * - srcdoc-based loading — never src with external URLs
 * - Memoize srcdoc with useMemo keyed on [widgetId, widgetHtml]
 * - Never conditionally render — use display:none to hide
 * - Stable key prop using instanceId
 */
export const WidgetFrame: React.FC<WidgetFrameProps> = (_props) => {
  // TODO: Implement — see runtime plan section 2.1
  throw new Error('Not implemented: WidgetFrame');
};
