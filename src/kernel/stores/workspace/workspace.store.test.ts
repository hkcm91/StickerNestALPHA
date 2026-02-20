/**
 * Workspace Store — Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { KernelEvents } from '@sn/types';

import { bus } from '../../bus';

import {
  useWorkspaceStore,
  setupWorkspaceBusSubscriptions,
} from './workspace.store';
import type { Workspace, WorkspaceMember, WorkspaceSettings } from './workspace.store';

const mockWorkspace: Workspace = {
  id: 'ws-1',
  name: 'Test Workspace',
  ownerId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockMembers: WorkspaceMember[] = [
  { userId: 'user-1', displayName: 'Owner', role: 'owner', avatarUrl: null },
  { userId: 'user-2', displayName: 'Editor', role: 'editor', avatarUrl: 'https://example.com/avatar.png' },
];

const mockSettings: WorkspaceSettings = {
  defaultCanvasRole: 'editor',
};

describe('workspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  describe('initial state', () => {
    it('should have null activeWorkspace', () => {
      expect(useWorkspaceStore.getState().activeWorkspace).toBeNull();
    });

    it('should have empty members array', () => {
      expect(useWorkspaceStore.getState().members).toEqual([]);
    });

    it('should have default settings', () => {
      expect(useWorkspaceStore.getState().settings).toEqual({
        defaultCanvasRole: 'viewer',
      });
    });

    it('should not be loading', () => {
      expect(useWorkspaceStore.getState().isLoading).toBe(false);
    });

    it('should have null error', () => {
      expect(useWorkspaceStore.getState().error).toBeNull();
    });
  });

  describe('actions', () => {
    it('setActiveWorkspace should update activeWorkspace', () => {
      useWorkspaceStore.getState().setActiveWorkspace(mockWorkspace);
      expect(useWorkspaceStore.getState().activeWorkspace).toEqual(mockWorkspace);
    });

    it('setActiveWorkspace with null should clear workspace', () => {
      useWorkspaceStore.getState().setActiveWorkspace(mockWorkspace);
      useWorkspaceStore.getState().setActiveWorkspace(null);
      expect(useWorkspaceStore.getState().activeWorkspace).toBeNull();
    });

    it('setMembers should update members', () => {
      useWorkspaceStore.getState().setMembers(mockMembers);
      expect(useWorkspaceStore.getState().members).toEqual(mockMembers);
    });

    it('setSettings should update settings', () => {
      useWorkspaceStore.getState().setSettings(mockSettings);
      expect(useWorkspaceStore.getState().settings).toEqual(mockSettings);
    });

    it('setLoading should update isLoading', () => {
      useWorkspaceStore.getState().setLoading(true);
      expect(useWorkspaceStore.getState().isLoading).toBe(true);
    });

    it('setError should update error', () => {
      useWorkspaceStore.getState().setError('Workspace not found');
      expect(useWorkspaceStore.getState().error).toBe('Workspace not found');
    });

    it('clearError should set error to null', () => {
      useWorkspaceStore.getState().setError('Some error');
      useWorkspaceStore.getState().clearError();
      expect(useWorkspaceStore.getState().error).toBeNull();
    });

    it('reset should restore initial state', () => {
      useWorkspaceStore.getState().setActiveWorkspace(mockWorkspace);
      useWorkspaceStore.getState().setMembers(mockMembers);
      useWorkspaceStore.getState().setSettings(mockSettings);
      useWorkspaceStore.getState().setLoading(true);
      useWorkspaceStore.getState().setError('error');

      useWorkspaceStore.getState().reset();

      const state = useWorkspaceStore.getState();
      expect(state.activeWorkspace).toBeNull();
      expect(state.members).toEqual([]);
      expect(state.settings).toEqual({ defaultCanvasRole: 'viewer' });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('bus subscriptions', () => {
    it('should reset workspace when auth state changes to null user', () => {
      setupWorkspaceBusSubscriptions();

      useWorkspaceStore.getState().setActiveWorkspace(mockWorkspace);
      useWorkspaceStore.getState().setMembers(mockMembers);

      bus.emit(KernelEvents.AUTH_STATE_CHANGED, { user: null });

      const state = useWorkspaceStore.getState();
      expect(state.activeWorkspace).toBeNull();
      expect(state.members).toEqual([]);
    });

    it('should not reset workspace when auth state changes with a valid user', () => {
      setupWorkspaceBusSubscriptions();

      useWorkspaceStore.getState().setActiveWorkspace(mockWorkspace);
      useWorkspaceStore.getState().setMembers(mockMembers);

      bus.emit(KernelEvents.AUTH_STATE_CHANGED, { user: { id: 'user-1' } });

      const state = useWorkspaceStore.getState();
      expect(state.activeWorkspace).toEqual(mockWorkspace);
      expect(state.members).toEqual(mockMembers);
    });

    it('should reset workspace when auth state payload is null', () => {
      setupWorkspaceBusSubscriptions();

      useWorkspaceStore.getState().setActiveWorkspace(mockWorkspace);

      bus.emit(KernelEvents.AUTH_STATE_CHANGED, null);

      expect(useWorkspaceStore.getState().activeWorkspace).toBeNull();
    });
  });
});
