/**
 * Error Message Content
 *
 * User-facing error messages and recovery guidance. Every error message
 * should explain what happened AND what the user can do about it.
 *
 * @module content/errors
 */

export interface ErrorContent {
  /** Short heading describing the error */
  title: string;
  /** Longer explanation with recovery guidance */
  body: string;
  /** Optional action button label */
  action?: string;
}

export const ERROR_MESSAGES = {
  // --- Network and Connection ---

  networkOffline: {
    title: 'You\'re offline',
    body: 'Your changes are saved locally and will sync when you reconnect.',
  },

  connectionLost: {
    title: 'Connection lost',
    body: 'Trying to reconnect. Your local changes are safe.',
    action: 'Retry now',
  },

  reconnected: {
    title: 'Back online',
    body: 'Your changes have been synced.',
  },

  // --- Auth ---

  sessionExpired: {
    title: 'Session expired',
    body: 'Your session has timed out. Please sign in again to continue.',
    action: 'Sign in',
  },

  loginFailed: {
    title: 'Sign in failed',
    body: 'Check your email and password and try again. If you signed up with Google, GitHub, or Discord, use that option instead.',
  },

  oauthFailed: {
    title: 'Sign in failed',
    body: 'We couldn\'t complete sign in with your provider. Please try again or use a different sign-in method.',
    action: 'Try again',
  },

  // --- Permissions ---

  permissionDenied: {
    title: 'You don\'t have access',
    body: 'You need at least Editor access to make changes to this canvas. Ask the canvas owner to update your role.',
  },

  canvasNotFound: {
    title: 'Canvas not found',
    body: 'This canvas may have been deleted or the link may be incorrect.',
    action: 'Go home',
  },

  // --- Widgets ---

  widgetCrashed: {
    title: 'This widget hit an error',
    body: 'The widget encountered a problem. Try refreshing. If the issue persists, the widget may need an update.',
    action: 'Refresh widget',
  },

  widgetLoadTimeout: {
    title: 'Widget didn\'t load in time',
    body: 'The widget took too long to start. This might be a network issue or a bug in the widget.',
    action: 'Retry',
  },

  widgetInstallFailed: {
    title: 'Installation failed',
    body: 'The widget couldn\'t be installed. It may have an invalid configuration. Try again later or choose a different widget.',
    action: 'Back to Marketplace',
  },

  manifestInvalid: {
    title: 'Invalid widget',
    body: 'This widget\'s configuration doesn\'t meet the platform requirements and can\'t be installed.',
  },

  // --- DataSource ---

  conflictDetected: {
    title: 'Row changed — refreshed',
    body: 'Someone else updated this data. We\'ve loaded the latest version. You can re-apply your changes.',
  },

  datasourceWriteDenied: {
    title: 'Can\'t edit this data',
    body: 'You have view-only access to this data source. Ask the owner to grant you editor access.',
  },

  // --- Canvas ---

  canvasSaveFailed: {
    title: 'Couldn\'t save',
    body: 'Your changes didn\'t save. Check your connection and try again. Your recent edits are preserved locally.',
    action: 'Retry save',
  },

  // --- Lab / Publish ---

  publishValidationFailed: {
    title: 'Validation failed',
    body: 'Your widget didn\'t pass the publish checks. Review the errors below and fix them before submitting.',
  },

  publishTestFailed: {
    title: 'Widget test failed',
    body: 'Your widget didn\'t signal READY within 500ms or threw an uncaught error on load. Check the preview for details.',
  },

  thumbnailFailed: {
    title: 'Thumbnail generation failed',
    body: 'We couldn\'t capture a screenshot of your widget. Make sure it renders correctly in preview mode.',
    action: 'Retry',
  },

  // --- General ---

  unexpectedError: {
    title: 'Something went wrong',
    body: 'An unexpected error occurred. Try refreshing the page. If it keeps happening, please report it.',
    action: 'Refresh',
  },

  rateLimited: {
    title: 'Slow down',
    body: 'You\'re sending too many requests. Wait a moment and try again.',
  },
} as const satisfies Record<string, ErrorContent>;
