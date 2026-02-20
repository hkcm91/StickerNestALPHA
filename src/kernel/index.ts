/**
 * Layer 0 — Kernel
 *
 * The foundation of StickerNest V5. Zero dependencies on other application layers.
 *
 * @module kernel
 */

// Schemas (re-exported from @sn/types)
export * from './schemas';

// Event Bus
export { bus } from './bus';
export type { BusHandler, IEventBus, Unsubscribe, BenchResult, SubscribeOptions } from './bus';

// Supabase Client
export { supabase } from './supabase';
export type { Database } from './supabase';

// Zustand Stores
export {
  useAuthStore,
  useWorkspaceStore,
  useCanvasStore,
  useHistoryStore,
  useWidgetStore,
  useSocialStore,
  useUIStore,
} from './stores';

// Auth
export {
  signInWithEmail,
  signUp,
  signOut,
  signInWithOAuth,
  refreshSession,
  initAuthListener,
} from './auth';

// DataSource CRUD + ACL
export {
  createDataSource,
  readDataSource,
  updateDataSource,
  deleteDataSource,
  listDataSources,
  getEffectiveRole,
  grantAccess,
  revokeAccess,
} from './datasource';
export type { DataSourceResult, DataSourceError, ListDataSourcesOptions } from './datasource';

// Kernel Init
export { initKernel, teardownKernel, isKernelInitialized } from './init';
