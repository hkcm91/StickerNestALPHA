/**
 * Canvas Store — Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { KernelEvents } from '@sn/types';

import { bus } from '../../bus';

import {
  useCanvasStore,
  setupCanvasBusSubscriptions,
} from './canvas.store';
import type { CanvasMeta, CanvasSharingSettings } from './canvas.store';

const mockCanvasMeta: CanvasMeta = {
  id: 'canvas-1',
  name: 'Test Canvas',
  slug: 'test-canvas',
  ownerId: 'user-1',
  description: 'A test canvas',
  thumbnailUrl: null,
  isPublic: false,
  settings: {},
};

const mockSharingSettings: CanvasSharingSettings = {
  isPublic: true,
  defaultRole: 'viewer',
  slug: 'test-canvas',
};

describe('canvasStore', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  describe('initial state', () => {
    it('should have null activeCanvasId', () => {
      expect(useCanvasStore.getState().activeCanvasId).toBeNull();
    });

    it('should have null canvasMeta', () => {
      expect(useCanvasStore.getState().canvasMeta).toBeNull();
    });

    it('should have null sharingSettings', () => {
      expect(useCanvasStore.getState().sharingSettings).toBeNull();
    });

    it('should have null userRole', () => {
      expect(useCanvasStore.getState().userRole).toBeNull();
    });

    it('should not be loading', () => {
      expect(useCanvasStore.getState().isLoading).toBe(false);
    });

    it('should have null error', () => {
      expect(useCanvasStore.getState().error).toBeNull();
    });
  });

  describe('actions', () => {
    it('setActiveCanvas should update both id and meta', () => {
      useCanvasStore.getState().setActiveCanvas('canvas-1', mockCanvasMeta);
      const state = useCanvasStore.getState();
      expect(state.activeCanvasId).toBe('canvas-1');
      expect(state.canvasMeta).toEqual(mockCanvasMeta);
    });

    it('setActiveCanvas with nulls should clear canvas', () => {
      useCanvasStore.getState().setActiveCanvas('canvas-1', mockCanvasMeta);
      useCanvasStore.getState().setActiveCanvas(null, null);
      const state = useCanvasStore.getState();
      expect(state.activeCanvasId).toBeNull();
      expect(state.canvasMeta).toBeNull();
    });

    it('setSharingSettings should update sharing settings', () => {
      useCanvasStore.getState().setSharingSettings(mockSharingSettings);
      expect(useCanvasStore.getState().sharingSettings).toEqual(mockSharingSettings);
    });

    it('setUserRole should update user role', () => {
      useCanvasStore.getState().setUserRole('editor');
      expect(useCanvasStore.getState().userRole).toBe('editor');
    });

    it('setUserRole with null should clear role', () => {
      useCanvasStore.getState().setUserRole('editor');
      useCanvasStore.getState().setUserRole(null);
      expect(useCanvasStore.getState().userRole).toBeNull();
    });

    it('setLoading should update isLoading', () => {
      useCanvasStore.getState().setLoading(true);
      expect(useCanvasStore.getState().isLoading).toBe(true);
    });

    it('setError should update error', () => {
      useCanvasStore.getState().setError('Canvas not found');
      expect(useCanvasStore.getState().error).toBe('Canvas not found');
    });

    it('clearError should set error to null', () => {
      useCanvasStore.getState().setError('Some error');
      useCanvasStore.getState().clearError();
      expect(useCanvasStore.getState().error).toBeNull();
    });

    it('reset should restore initial state', () => {
      useCanvasStore.getState().setActiveCanvas('canvas-1', mockCanvasMeta);
      useCanvasStore.getState().setSharingSettings(mockSharingSettings);
      useCanvasStore.getState().setUserRole('owner');
      useCanvasStore.getState().setLoading(true);
      useCanvasStore.getState().setError('error');

      useCanvasStore.getState().reset();

      const state = useCanvasStore.getState();
      expect(state.activeCanvasId).toBeNull();
      expect(state.canvasMeta).toBeNull();
      expect(state.sharingSettings).toBeNull();
      expect(state.userRole).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('bus subscriptions', () => {
    it('should reset canvas when auth state changes to null user', () => {
      setupCanvasBusSubscriptions();

      useCanvasStore.getState().setActiveCanvas('canvas-1', mockCanvasMeta);
      useCanvasStore.getState().setUserRole('editor');

      bus.emit(KernelEvents.AUTH_STATE_CHANGED, { user: null });

      const state = useCanvasStore.getState();
      expect(state.activeCanvasId).toBeNull();
      expect(state.canvasMeta).toBeNull();
      expect(state.userRole).toBeNull();
    });

    it('should not reset canvas when auth state changes with a valid user', () => {
      setupCanvasBusSubscriptions();

      useCanvasStore.getState().setActiveCanvas('canvas-1', mockCanvasMeta);

      bus.emit(KernelEvents.AUTH_STATE_CHANGED, { user: { id: 'user-1' } });

      expect(useCanvasStore.getState().activeCanvasId).toBe('canvas-1');
    });

    it('should reset canvas when auth state payload is null', () => {
      setupCanvasBusSubscriptions();

      useCanvasStore.getState().setActiveCanvas('canvas-1', mockCanvasMeta);

      bus.emit(KernelEvents.AUTH_STATE_CHANGED, null);

      expect(useCanvasStore.getState().activeCanvasId).toBeNull();
    });
  });
});
