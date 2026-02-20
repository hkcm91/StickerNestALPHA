import type { Preview, Decorator } from '@storybook/react';
import React from 'react';

/**
 * StickerNest Theme Tokens
 * These CSS variables are injected by the Shell (L6) and consumed by widgets.
 * In Storybook, we simulate both light and dark themes.
 */
const lightThemeTokens = {
  '--sn-bg': '#ffffff',
  '--sn-surface': '#f8f9fa',
  '--sn-accent': '#6366f1',
  '--sn-text': '#1f2937',
  '--sn-text-muted': '#6b7280',
  '--sn-border': '#e5e7eb',
  '--sn-radius': '8px',
  '--sn-font-family': 'Inter, system-ui, -apple-system, sans-serif',
};

const darkThemeTokens = {
  '--sn-bg': '#111827',
  '--sn-surface': '#1f2937',
  '--sn-accent': '#818cf8',
  '--sn-text': '#f9fafb',
  '--sn-text-muted': '#9ca3af',
  '--sn-border': '#374151',
  '--sn-radius': '8px',
  '--sn-font-family': 'Inter, system-ui, -apple-system, sans-serif',
};

/**
 * Widget Container Decorator
 * Simulates the widget container environment with proper theme tokens
 * and container sizing constraints.
 */
const withWidgetContainer: Decorator = (Story, context) => {
  const theme = context.globals.theme || 'light';
  const tokens = theme === 'dark' ? darkThemeTokens : lightThemeTokens;

  // CSS variables must be applied differently - they go into a style string
  const cssVarStyle = Object.entries(tokens)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');

  const containerStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: tokens['--sn-bg'],
    color: tokens['--sn-text'],
    fontFamily: tokens['--sn-font-family'],
    minHeight: '200px',
    borderRadius: tokens['--sn-radius'],
  };

  // We need to inject CSS variables via a style element since React doesn't support them directly
  return React.createElement(
    React.Fragment,
    null,
    React.createElement('style', null, `
      [data-theme] {
        ${cssVarStyle}
      }
    `),
    React.createElement(
      'div',
      {
        style: containerStyle,
        'data-theme': theme,
      },
      React.createElement(Story)
    )
  );
};

/**
 * Canvas Context Decorator
 * Simulates placement within the StickerNest canvas environment.
 * Shows the widget as it would appear on the infinite canvas.
 */
const withCanvasContext: Decorator = (Story, context) => {
  const showCanvasGrid = context.args?.showCanvasGrid ?? false;

  const canvasStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '400px',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    backgroundImage: showCanvasGrid
      ? 'radial-gradient(circle, #ccc 1px, transparent 1px)'
      : 'none',
    backgroundSize: showCanvasGrid ? '20px 20px' : 'auto',
  };

  return React.createElement(
    'div',
    { style: canvasStyle },
    React.createElement(
      'div',
      {
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        },
      },
      React.createElement(Story)
    )
  );
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // We handle backgrounds via theme tokens
    },
    layout: 'fullscreen',
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'StickerNest theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light Theme' },
          { value: 'dark', title: 'Dark Theme' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withWidgetContainer],
};

export default preview;

// Export decorators for use in individual stories
export { withWidgetContainer, withCanvasContext, lightThemeTokens, darkThemeTokens };
