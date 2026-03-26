/**
 * Workspace Store — manages workspace metadata, members, and settings
 * @module kernel/stores/workspace
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { KernelEvents } from '@sn/types';

import { bus } from '../../bus';

/** Workspace metadata — a workspace contains multiple canvases */
export interface Workspace {
  /** Workspace UUID */
  id: string;
  /** Workspace display name */
  name: string;
  /** User ID of the workspace owner */
  ownerId: string;
  /** ISO timestamp when the workspace was created */
  createdAt: string;
}

/** A member of the workspace with their assigned role */
export interface WorkspaceMember {
  /** User ID */
  userId: string;
  /** Display name shown in member lists */
  displayName: string;
  /** Workspace-level role (independent of per-canvas roles) */
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  /** Avatar image URL */
  avatarUrl: string | null;
}

/** Workspace-level configuration */
export interface WorkspaceSettings {
  /** Default role assigned to new members when they join a canvas */
  defaultCanvasRole: 'viewer' | 'commenter' | 'editor';
}

export interface WorkspaceState {
  activeWorkspace: Workspace | null;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  isLoading: boolean;
  error: string | null;
}

export interface WorkspaceActions {
  setActiveWorkspace: (workspace: Workspace | null) => void;
  setMembers: (members: WorkspaceMember[]) => void;
  setSettings: (settings: WorkspaceSettings) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

const initialState: WorkspaceState = {
  activeWorkspace: null,
  members: [],
  settings: { defaultCanvasRole: 'viewer' },
  isLoading: false,
  error: null,
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialState,
      setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
      setMembers: (members) => set({ members }),
      setSettings: (settings) => set({ settings }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    })),
    { name: 'workspaceStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

/** Subscribe to workspace-related bus events for cross-store coordination */
export function setupWorkspaceBusSubscriptions(): void {
  // When auth state changes and user is null, reset workspace
  bus.subscribe(KernelEvents.AUTH_STATE_CHANGED, (event: BusEvent) => {
    const payload = event.payload as { user: unknown } | null;
    if (!payload || payload.user === null) {
      useWorkspaceStore.getState().reset();
    }
  });
}
