/**
 * Upgrade Prompt Content
 *
 * Tier-gating messages and upgrade CTAs shown when users hit feature
 * boundaries or try to access premium features.
 *
 * @module content/upgrades
 */

export interface UpgradePrompt {
  /** Short heading */
  title: string;
  /** Explanation of what the feature does and why it requires an upgrade */
  body: string;
  /** CTA button label */
  action: string;
  /** Which tier is required */
  requiredTier: 'creator' | 'pro' | 'enterprise';
}

export const UPGRADE_PROMPTS = {
  /** Shown when a Free user tries to access the Widget Lab */
  labAccess: {
    title: 'Widget Lab requires Creator tier',
    body: 'The Widget Lab is a full in-browser IDE where you can build, test, and publish interactive widgets. Upgrade to Creator to start building.',
    action: 'Upgrade to Creator',
    requiredTier: 'creator' as const,
  },

  /** Shown when a Free user tries to use AI generation */
  aiGeneration: {
    title: 'AI generation requires Creator tier',
    body: 'Generate widgets from a text prompt using AI. Describe what you want, and StickerNest builds it for you.',
    action: 'Upgrade to Creator',
    requiredTier: 'creator' as const,
  },

  /** Shown when a Free user tries to publish a widget */
  publishWidget: {
    title: 'Publishing requires Creator tier',
    body: 'Share your widgets with the entire StickerNest community by publishing to the Marketplace.',
    action: 'Upgrade to Creator',
    requiredTier: 'creator' as const,
  },

  /** Shown when a user hits their storage limit */
  storageFull: {
    title: 'Storage limit reached',
    body: 'You\'ve used all your available storage. Upgrade to Pro for 50 GB of storage, or delete some assets to free up space.',
    action: 'Upgrade to Pro',
    requiredTier: 'pro' as const,
  },

  /** Shown when a user hits their collaborator limit */
  collaboratorLimit: {
    title: 'Collaborator limit reached',
    body: 'Free accounts support up to 5 collaborators per canvas. Upgrade to Creator for 25, or Pro for unlimited.',
    action: 'See plans',
    requiredTier: 'creator' as const,
  },

  /** Shown when a user wants advanced widget analytics */
  advancedAnalytics: {
    title: 'Advanced analytics requires Pro',
    body: 'See detailed usage data, install trends, and user engagement metrics for your published widgets.',
    action: 'Upgrade to Pro',
    requiredTier: 'pro' as const,
  },

  /** Shown when asking about SSO/SAML */
  sso: {
    title: 'SSO is an Enterprise feature',
    body: 'SAML-based single sign-on, workspace administration, custom branding, and SLA guarantees are available on Enterprise plans.',
    action: 'Contact Sales',
    requiredTier: 'enterprise' as const,
  },

  /** Shown when asking about custom branding */
  customBranding: {
    title: 'Custom branding requires Enterprise',
    body: 'Apply your organization\'s logo, colors, and domain to your StickerNest workspace.',
    action: 'Contact Sales',
    requiredTier: 'enterprise' as const,
  },
} as const satisfies Record<string, UpgradePrompt>;
