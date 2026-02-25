import type { Preview, Decorator } from '@storybook/react';
/**
 * StickerNest Theme Tokens
 * These CSS variables are injected by the Shell (L6) and consumed by widgets.
 * In Storybook, we simulate both light and dark themes.
 */
declare const lightThemeTokens: {
    '--sn-bg': string;
    '--sn-surface': string;
    '--sn-accent': string;
    '--sn-text': string;
    '--sn-text-muted': string;
    '--sn-border': string;
    '--sn-radius': string;
    '--sn-font-family': string;
};
declare const darkThemeTokens: {
    '--sn-bg': string;
    '--sn-surface': string;
    '--sn-accent': string;
    '--sn-text': string;
    '--sn-text-muted': string;
    '--sn-border': string;
    '--sn-radius': string;
    '--sn-font-family': string;
};
/**
 * Widget Container Decorator
 * Simulates the widget container environment with proper theme tokens
 * and container sizing constraints.
 */
declare const withWidgetContainer: Decorator;
/**
 * Canvas Context Decorator
 * Simulates placement within the StickerNest canvas environment.
 * Shows the widget as it would appear on the infinite canvas.
 */
declare const withCanvasContext: Decorator;
declare const preview: Preview;
export default preview;
export { withWidgetContainer, withCanvasContext, lightThemeTokens, darkThemeTokens };
//# sourceMappingURL=preview.d.ts.map