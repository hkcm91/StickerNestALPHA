/**
 * Auth — Barrel Export
 * @module kernel/auth
 */

export {
  signInWithEmail,
  signUp,
  signOut,
  signInWithOAuth,
  refreshSession,
  initAuthListener,
  enrollMFA,
  challengeMFA,
  verifyMFA,
  unenrollMFA,
  listMFAFactors,
  getMFAAssuranceLevel,
  type MFAFactor,
} from './auth';
