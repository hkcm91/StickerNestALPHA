/**
 * Onboarding Content
 *
 * First-run walkthrough steps, welcome messages, and introductory content.
 * Used by onboarding overlays, welcome modals, and guided tours.
 *
 * @module content/onboarding
 */

export interface OnboardingStep {
  /** Unique step identifier */
  id: string;
  /** Short title displayed as the step heading */
  title: string;
  /** Body text explaining the feature or action */
  body: string;
  /** CSS selector or element ID to highlight (for guided tours) */
  target?: string;
  /** Label for the primary action button */
  action: string;
}

/**
 * Welcome modal shown on first login.
 */
export const WELCOME = {
  title: 'Welcome to StickerNest',
  body: 'Your canvas is ready. Place stickers, add interactive widgets, connect them with pipelines, and build something amazing.',
  action: 'Create your first canvas',
  dismissLabel: 'Skip for now',
} as const;

/**
 * Guided tour steps for first-time canvas users.
 * Shown sequentially with highlight bubbles pointing at UI elements.
 */
export const CANVAS_TOUR: OnboardingStep[] = [
  {
    id: 'tour-toolbar',
    title: 'This is your toolbar',
    body: 'Select tools here to draw, place stickers, add widgets, and wire pipelines. Press V for select, B for pen, T for text.',
    target: '[data-tour="toolbar"]',
    action: 'Next',
  },
  {
    id: 'tour-asset-panel',
    title: 'Your assets live here',
    body: 'Open this panel to browse stickers and installed widgets. Drag anything onto the canvas to place it.',
    target: '[data-tour="asset-panel"]',
    action: 'Next',
  },
  {
    id: 'tour-properties',
    title: 'Configure anything',
    body: 'Select an entity and this panel shows its properties — position, size, and widget-specific settings.',
    target: '[data-tour="properties-panel"]',
    action: 'Next',
  },
  {
    id: 'tour-marketplace',
    title: 'Find widgets in the Marketplace',
    body: 'Browse hundreds of interactive widgets — timers, notes, data tools, games, and more. Install with one click.',
    target: '[data-tour="marketplace"]',
    action: 'Next',
  },
  {
    id: 'tour-mode-toggle',
    title: 'Edit and preview modes',
    body: 'Edit mode is for building. Preview mode locks the layout and makes widgets interactive — it\'s what your audience sees. Press P to toggle.',
    target: '[data-tour="mode-toggle"]',
    action: 'Got it',
  },
];

/**
 * Guided tour steps for the Widget Lab (shown on first Lab visit).
 */
export const LAB_TOUR: OnboardingStep[] = [
  {
    id: 'lab-editor',
    title: 'Write your widget here',
    body: 'The editor supports HTML, CSS, and JavaScript. Your widget is a single HTML file — the SDK is available on window.StickerNest.',
    target: '[data-tour="lab-editor"]',
    action: 'Next',
  },
  {
    id: 'lab-preview',
    title: 'Live preview',
    body: 'Your widget runs in a real sandbox as you type. Switch between 2D, canvas context, and 3D spatial preview modes.',
    target: '[data-tour="lab-preview"]',
    action: 'Next',
  },
  {
    id: 'lab-inspector',
    title: 'Event inspector',
    body: 'Watch every event your widget sends and receives in real time. Useful for debugging pipelines and SDK calls.',
    target: '[data-tour="lab-inspector"]',
    action: 'Next',
  },
  {
    id: 'lab-publish',
    title: 'Publish when ready',
    body: 'The publish pipeline validates, tests, and screenshots your widget automatically. One click to submit to the Marketplace.',
    target: '[data-tour="lab-publish"]',
    action: 'Start building',
  },
];
