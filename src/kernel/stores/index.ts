/**
 * Kernel Stores — Barrel Export
 *
 * Seven Zustand stores, one domain each. Stores do NOT reach into each other's
 * state. Cross-store coordination happens exclusively via the event bus.
 *
 * @module kernel/stores
 */

// =============================================================================
// Auth Store
// =============================================================================
export {
  useAuthStore,
  selectAuthReady,
  selectIsAuthenticated,
  setupAuthBusSubscriptions,
} from './auth';

export type {
  AuthUser,
  AuthSession,
  AuthState,
  AuthActions,
  AuthStore,
} from './auth';

// =============================================================================
// Workspace Store
// =============================================================================
export {
  useWorkspaceStore,
  setupWorkspaceBusSubscriptions,
} from './workspace';

export type {
  Workspace,
  WorkspaceMember,
  WorkspaceSettings,
  WorkspaceState,
  WorkspaceActions,
  WorkspaceStore,
} from './workspace';

// =============================================================================
// Canvas Store
// =============================================================================
export {
  useCanvasStore,
  setupCanvasBusSubscriptions,
} from './canvas';

export type {
  CanvasMeta,
  CanvasSharingSettings,
  CanvasRole,
  CanvasState,
  CanvasActions,
  CanvasStore,
} from './canvas';

// =============================================================================
// History Store
// =============================================================================
export {
  useHistoryStore,
  selectCanUndo,
  selectCanRedo,
  setupHistoryBusSubscriptions,
} from './history';

export type {
  HistoryEntry,
  HistoryState,
  HistoryActions,
  HistoryStore,
} from './history';

// =============================================================================
// Widget Store
// =============================================================================
export {
  useWidgetStore,
  setupWidgetBusSubscriptions,
} from './widget';

export type {
  WidgetRegistryEntry,
  WidgetInstance,
  WidgetState,
  WidgetActions,
  WidgetStore,
} from './widget';

// =============================================================================
// Social Store
// =============================================================================
export {
  useSocialStore,
  selectUserCount,
  setupSocialBusSubscriptions,
} from './social';

export type {
  PresenceUser,
  SocialState,
  SocialActions,
  SocialStore,
} from './social';

// =============================================================================
// UI Store
// =============================================================================
export {
  useUIStore,
  setupUIBusSubscriptions,
} from './ui';

export type {
  Toast,
  UIState,
  UIActions,
  UIStore,
} from './ui';

// =============================================================================
// Setup All Bus Subscriptions
// =============================================================================

import { setupAuthBusSubscriptions as _setupAuth } from './auth';
import { setupCanvasBusSubscriptions as _setupCanvas } from './canvas';
import { setupHistoryBusSubscriptions as _setupHistory } from './history';
import { setupSocialBusSubscriptions as _setupSocial } from './social';
import { setupUIBusSubscriptions as _setupUI } from './ui';
import { setupWidgetBusSubscriptions as _setupWidget } from './widget';
import { setupWorkspaceBusSubscriptions as _setupWorkspace } from './workspace';

/**
 * Initialize all store bus subscriptions. Call this once at application startup.
 * This wires up cross-store coordination through the event bus.
 */
export function setupAllStoreBusSubscriptions(): void {
  _setupAuth();
  _setupWorkspace();
  _setupCanvas();
  _setupHistory();
  _setupWidget();
  _setupSocial();
  _setupUI();
}
