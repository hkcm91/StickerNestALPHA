/**
 * Layer 6 — Shell
 *
 * Application shell: routing, auth gating, theme system,
 * keyboard shortcuts, and error boundary.
 *
 * @module shell
 * @layer L6
 * @see .claude/rules/L6-shell.md
 */

// Init
export { initShell, teardownShell, isShellInitialized, getShortcutRegistry } from './init';

// Theme
export { ThemeProvider, applyThemeTokens, emitThemeChange, useThemeActions } from './theme/theme-provider';
export { THEME_TOKENS } from './theme/theme-tokens';
export type { ThemeTokenMap, ThemeName } from './theme/theme-tokens';

// Animation
export { ANIMATION_EASING, ANIMATION_DURATION, ANIMATION_CSS_VARS, applyAnimationTokens } from './theme/animation-tokens';
export { injectAnimationKeyframes } from './theme/animation-keyframes';
export { animVar, transition, arrive, breathe, timing } from './theme/animation-vars';
export type { TransitionOptions, BreatheOptions } from './theme/animation-vars';
export { useStaggeredArrival } from './theme/useStaggeredArrival';

// Error Boundary
export { AppErrorBoundary } from './error/error-boundary';

// Router
export { AppRouter } from './router/router';
export { AuthGuard, TierGuard } from './router/route-guards';

// Shortcuts
export { createShortcutRegistry, registerDefaultShortcuts } from './shortcuts/shortcut-registry';
export type { ShortcutRegistry, ShortcutDefinition, ShortcutScope } from './shortcuts/shortcut-registry';
