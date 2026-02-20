/**
 * Auth Store — Barrel Export
 * @module kernel/stores/auth
 */

export {
  useAuthStore,
  selectAuthReady,
  selectIsAuthenticated,
  setupAuthBusSubscriptions,
} from './auth.store';

export type {
  AuthUser,
  AuthSession,
  AuthState,
  AuthActions,
  AuthStore,
} from './auth.store';
