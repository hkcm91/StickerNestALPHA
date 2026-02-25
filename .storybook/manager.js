import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';
/**
 * Custom Storybook UI Theme for StickerNest
 * Matches the StickerNest brand and provides a cohesive development experience.
 */
const stickerNestTheme = create({
    base: 'light',
    // Brand
    brandTitle: 'StickerNest V5',
    brandUrl: 'https://stickernest.app',
    brandTarget: '_blank',
    // UI Colors
    colorPrimary: '#6366f1',
    colorSecondary: '#818cf8',
    // Background Colors
    appBg: '#f8f9fa',
    appContentBg: '#ffffff',
    appBorderColor: '#e5e7eb',
    appBorderRadius: 8,
    // Text Colors
    textColor: '#1f2937',
    textInverseColor: '#f9fafb',
    textMutedColor: '#6b7280',
    // Toolbar
    barTextColor: '#6b7280',
    barSelectedColor: '#6366f1',
    barBg: '#ffffff',
    barHoverColor: '#818cf8',
    // Form Colors
    inputBg: '#ffffff',
    inputBorder: '#e5e7eb',
    inputTextColor: '#1f2937',
    inputBorderRadius: 6,
    // Typography
    fontBase: 'Inter, system-ui, -apple-system, sans-serif',
    fontCode: 'JetBrains Mono, Fira Code, monospace',
});
addons.setConfig({
    theme: stickerNestTheme,
    sidebar: {
        showRoots: true,
        collapsedRoots: ['other'],
    },
    toolbar: {
        title: { hidden: false },
        zoom: { hidden: false },
        eject: { hidden: false },
        copy: { hidden: false },
        fullscreen: { hidden: false },
    },
});
//# sourceMappingURL=manager.js.map