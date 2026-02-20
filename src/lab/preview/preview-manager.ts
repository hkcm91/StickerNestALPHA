/**
 * Preview Manager
 *
 * Controls the live preview pane for Widget Lab.
 * Preview ALWAYS runs inside a full Runtime sandbox (WidgetFrame).
 * Debounced rebuild on editor content change.
 * Feeds event traffic to the inspector.
 *
 * @module lab/preview
 * @layer L2
 */

import type { ThemeTokens } from '../../runtime/bridge/message-types';
import type { WidgetFrameProps } from '../../runtime/WidgetFrame';
import type { EventInspector } from '../inspector/inspector';

export type PreviewMode = '2d-isolated' | '2d-canvas' | '3d-spatial';

/** Default debounce delay for preview rebuilds */
export const PREVIEW_DEBOUNCE_MS = 300;

export interface PreviewManager {
  update(html: string, config?: Record<string, unknown>, theme?: ThemeTokens): void;
  setMode(mode: PreviewMode): void;
  getMode(): PreviewMode;
  getWidgetFrameProps(): WidgetFrameProps | null;
  isReady(): boolean;
  destroy(): void;
}

/**
 * Default theme tokens for preview.
 */
export const DEFAULT_PREVIEW_THEME: ThemeTokens = {
  '--sn-bg': '#ffffff',
  '--sn-surface': '#f5f5f5',
  '--sn-accent': '#6366f1',
  '--sn-text': '#1a1a1a',
  '--sn-text-muted': '#737373',
  '--sn-border': '#e5e5e5',
  '--sn-radius': '8px',
  '--sn-font-family': 'system-ui, sans-serif',
};

let instanceCounter = 0;

/**
 * Creates a preview manager that produces WidgetFrameProps.
 *
 * @param inspector - Event inspector instance for logging preview events
 */
export function createPreviewManager(inspector: EventInspector): PreviewManager {
  let mode: PreviewMode = '2d-isolated';
  let currentHtml: string | null = null;
  let currentConfig: Record<string, unknown> = {};
  let currentTheme: ThemeTokens = { ...DEFAULT_PREVIEW_THEME };
  let instanceId = `preview-${++instanceCounter}`;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  function scheduleRebuild(html: string): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      if (destroyed) return;
      currentHtml = html;
      instanceId = `preview-${++instanceCounter}`;
      inspector.log({
        eventType: 'preview.rebuild',
        payload: { instanceId, mode },
        direction: 'received',
      });
    }, PREVIEW_DEBOUNCE_MS);
  }

  return {
    update(html: string, config?: Record<string, unknown>, theme?: ThemeTokens) {
      if (destroyed) return;
      if (config) currentConfig = config;
      if (theme) {
        currentTheme = theme;
        inspector.log({
          eventType: 'preview.theme.updated',
          payload: theme,
          direction: 'received',
        });
      }
      scheduleRebuild(html);
    },

    setMode(newMode: PreviewMode) {
      mode = newMode;
    },

    getMode() {
      return mode;
    },

    getWidgetFrameProps(): WidgetFrameProps | null {
      if (!currentHtml) return null;

      return {
        widgetId: 'lab-preview',
        instanceId,
        widgetHtml: currentHtml,
        config: currentConfig,
        theme: currentTheme,
        visible: true,
        width: 400,
        height: 300,
      };
    },

    isReady() {
      return currentHtml !== null && !destroyed;
    },

    destroy() {
      destroyed = true;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      currentHtml = null;
    },
  };
}
