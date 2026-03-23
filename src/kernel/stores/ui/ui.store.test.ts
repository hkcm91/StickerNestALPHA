/**
 * UI Store — Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { CanvasEvents, ShellEvents } from '@sn/types';

import { bus } from '../../bus';

import {
  useUIStore,
  setupUIBusSubscriptions,
} from './ui.store';
import type { Toast } from './ui.store';

const mockToast: Toast = {
  id: 'toast-1',
  message: 'Something happened',
  type: 'info',
  duration: 3000,
};

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  describe('initial state', () => {
    it('should have edit canvas interaction mode', () => {
      expect(useUIStore.getState().canvasInteractionMode).toBe('edit');
    });

    it('should have select as active tool', () => {
      expect(useUIStore.getState().activeTool).toBe('select');
    });

    it('should have left sidebar closed', () => {
      expect(useUIStore.getState().sidebarLeftOpen).toBe(false);
    });

    it('should have right sidebar closed', () => {
      expect(useUIStore.getState().sidebarRightOpen).toBe(false);
    });

    it('should have empty panels', () => {
      expect(useUIStore.getState().panels).toEqual({});
    });

    it('should have light theme', () => {
      expect(useUIStore.getState().theme).toBe('light');
    });

    it('should not be globally loading', () => {
      expect(useUIStore.getState().isGlobalLoading).toBe(false);
    });

    it('should have empty toasts', () => {
      expect(useUIStore.getState().toasts).toEqual([]);
    });
  });

  describe('actions', () => {
    it('setCanvasInteractionMode should update mode', () => {
      useUIStore.getState().setCanvasInteractionMode('preview');
      expect(useUIStore.getState().canvasInteractionMode).toBe('preview');

      useUIStore.getState().setCanvasInteractionMode('edit');
      expect(useUIStore.getState().canvasInteractionMode).toBe('edit');
    });

    it('setActiveTool should update active tool', () => {
      useUIStore.getState().setActiveTool('pen');
      expect(useUIStore.getState().activeTool).toBe('pen');
    });

    it('toggleSidebarLeft should toggle left sidebar', () => {
      useUIStore.getState().toggleSidebarLeft();
      expect(useUIStore.getState().sidebarLeftOpen).toBe(true);

      useUIStore.getState().toggleSidebarLeft();
      expect(useUIStore.getState().sidebarLeftOpen).toBe(false);
    });

    it('toggleSidebarRight should toggle right sidebar', () => {
      useUIStore.getState().toggleSidebarRight();
      expect(useUIStore.getState().sidebarRightOpen).toBe(true);

      useUIStore.getState().toggleSidebarRight();
      expect(useUIStore.getState().sidebarRightOpen).toBe(false);
    });

    it('setPanelOpen should set panel state', () => {
      useUIStore.getState().setPanelOpen('layers', true);
      expect(useUIStore.getState().panels['layers']).toBe(true);

      useUIStore.getState().setPanelOpen('layers', false);
      expect(useUIStore.getState().panels['layers']).toBe(false);
    });

    it('setPanelOpen should not affect other panels', () => {
      useUIStore.getState().setPanelOpen('layers', true);
      useUIStore.getState().setPanelOpen('properties', true);
      useUIStore.getState().setPanelOpen('layers', false);

      expect(useUIStore.getState().panels['layers']).toBe(false);
      expect(useUIStore.getState().panels['properties']).toBe(true);
    });

    it('setTheme should update theme', () => {
      useUIStore.getState().setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');

      useUIStore.getState().setTheme('high-contrast');
      expect(useUIStore.getState().theme).toBe('high-contrast');
    });

    it('setGlobalLoading should update loading state', () => {
      useUIStore.getState().setGlobalLoading(true);
      expect(useUIStore.getState().isGlobalLoading).toBe(true);

      useUIStore.getState().setGlobalLoading(false);
      expect(useUIStore.getState().isGlobalLoading).toBe(false);
    });

    it('addToast should add toast to array', () => {
      useUIStore.getState().addToast(mockToast);
      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0]).toEqual(mockToast);
    });

    it('addToast should append to existing toasts', () => {
      const toast2: Toast = { id: 'toast-2', message: 'Another', type: 'success' };
      useUIStore.getState().addToast(mockToast);
      useUIStore.getState().addToast(toast2);
      expect(useUIStore.getState().toasts).toHaveLength(2);
    });

    it('removeToast should remove specific toast', () => {
      const toast2: Toast = { id: 'toast-2', message: 'Another', type: 'success' };
      useUIStore.getState().addToast(mockToast);
      useUIStore.getState().addToast(toast2);

      useUIStore.getState().removeToast('toast-1');

      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0].id).toBe('toast-2');
    });

    it('removeToast should no-op for unknown id', () => {
      useUIStore.getState().addToast(mockToast);
      useUIStore.getState().removeToast('unknown');
      expect(useUIStore.getState().toasts).toHaveLength(1);
    });

    it('reset should restore initial state', () => {
      useUIStore.getState().setCanvasInteractionMode('preview');
      useUIStore.getState().setActiveTool('pen');
      useUIStore.getState().toggleSidebarLeft();
      useUIStore.getState().setTheme('dark');
      useUIStore.getState().setGlobalLoading(true);
      useUIStore.getState().addToast(mockToast);
      useUIStore.getState().setPanelOpen('layers', true);

      useUIStore.getState().reset();

      const state = useUIStore.getState();
      expect(state.canvasInteractionMode).toBe('edit');
      expect(state.activeTool).toBe('select');
      expect(state.sidebarLeftOpen).toBe(false);
      expect(state.sidebarRightOpen).toBe(false);
      expect(state.panels).toEqual({});
      expect(state.theme).toBe('light');
      expect(state.isGlobalLoading).toBe(false);
      expect(state.toasts).toEqual([]);
    });
  });

  describe('bus subscriptions', () => {
    it('should update interaction mode on canvas.mode.changed', () => {
      setupUIBusSubscriptions();

      bus.emit(CanvasEvents.MODE_CHANGED, { mode: 'preview' });
      expect(useUIStore.getState().canvasInteractionMode).toBe('preview');

      bus.emit(CanvasEvents.MODE_CHANGED, { mode: 'edit' });
      expect(useUIStore.getState().canvasInteractionMode).toBe('edit');
    });

    it('should ignore canvas.mode.changed with invalid mode', () => {
      setupUIBusSubscriptions();

      bus.emit(CanvasEvents.MODE_CHANGED, { mode: 'invalid' });
      expect(useUIStore.getState().canvasInteractionMode).toBe('edit');
    });

    it('should ignore canvas.mode.changed with null payload', () => {
      setupUIBusSubscriptions();

      bus.emit(CanvasEvents.MODE_CHANGED, null);
      expect(useUIStore.getState().canvasInteractionMode).toBe('edit');
    });

    it('should update theme on shell.theme.changed', () => {
      setupUIBusSubscriptions();

      bus.emit(ShellEvents.THEME_CHANGED, { theme: 'dark' });
      expect(useUIStore.getState().theme).toBe('dark');

      bus.emit(ShellEvents.THEME_CHANGED, { theme: 'high-contrast' });
      expect(useUIStore.getState().theme).toBe('high-contrast');

      bus.emit(ShellEvents.THEME_CHANGED, { theme: 'light' });
      expect(useUIStore.getState().theme).toBe('light');
    });

    it('should ignore shell.theme.changed with invalid theme', () => {
      setupUIBusSubscriptions();

      bus.emit(ShellEvents.THEME_CHANGED, { theme: 'neon' });
      expect(useUIStore.getState().theme).toBe('light');
    });

    it('should ignore shell.theme.changed with null payload', () => {
      setupUIBusSubscriptions();

      bus.emit(ShellEvents.THEME_CHANGED, null);
      expect(useUIStore.getState().theme).toBe('light');
    });
  });
});
