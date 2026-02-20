/**
 * Social Store — Barrel Export
 * @module kernel/stores/social
 */

export {
  useSocialStore,
  selectUserCount,
  setupSocialBusSubscriptions,
} from './social.store';

export type {
  PresenceUser,
  SocialState,
  SocialActions,
  SocialStore,
} from './social.store';
