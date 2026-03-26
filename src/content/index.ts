/**
 * Centralized User-Facing Content
 *
 * All in-app copy — onboarding, tooltips, empty states, errors, and
 * upgrade prompts — is maintained here, separated from component code.
 *
 * @module content
 */

export { WELCOME, CANVAS_TOUR, LAB_TOUR } from './onboarding';
export type { OnboardingStep } from './onboarding';

export {
  TOOL_TOOLTIPS,
  ACTION_TOOLTIPS,
  PANEL_TOOLTIPS,
  ENTITY_TOOLTIPS,
  SHARING_TOOLTIPS,
  WIDGET_TOOLTIPS,
  LAB_TOOLTIPS,
} from './tooltips';

export { EMPTY_STATES } from './empty-states';
export type { EmptyState } from './empty-states';

export { ERROR_MESSAGES } from './errors';
export type { ErrorContent } from './errors';

export { UPGRADE_PROMPTS } from './upgrades';
export type { UpgradePrompt } from './upgrades';
