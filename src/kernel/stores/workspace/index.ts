/**
 * Workspace Store — Barrel Export
 * @module kernel/stores/workspace
 */

export {
  useWorkspaceStore,
  setupWorkspaceBusSubscriptions,
} from './workspace.store';

export type {
  Workspace,
  WorkspaceMember,
  WorkspaceSettings,
  WorkspaceState,
  WorkspaceActions,
  WorkspaceStore,
} from './workspace.store';
