/**
 * Widget Store — Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { WidgetEvents } from '@sn/types';
import type { WidgetManifest } from '@sn/types';

import { bus } from '../../bus';

import {
  useWidgetStore,
  setupWidgetBusSubscriptions,
} from './widget.store';
import type { WidgetRegistryEntry, WidgetInstance } from './widget.store';

const mockManifest: WidgetManifest = {
  id: 'com.example.test-widget',
  name: 'Test Widget',
  version: '1.0.0',
  license: 'MIT',
  tags: [],
  category: 'other',
  permissions: [],
  events: { emits: [], subscribes: [] },
  config: { fields: [] },
  size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
  entry: 'index.html',
  spatialSupport: false,
  crossCanvasChannels: [],
};

const mockRegistryEntry: WidgetRegistryEntry = {
  widgetId: 'com.example.test-widget',
  manifest: mockManifest,
  htmlContent: '<html><body>Test</body></html>',
  isBuiltIn: false,
  installedAt: '2026-01-01T00:00:00.000Z',
};

const mockInstance: WidgetInstance = {
  instanceId: 'inst-1',
  widgetId: 'com.example.test-widget',
  canvasId: 'canvas-1',
  state: {},
  config: {},
};

describe('widgetStore', () => {
  beforeEach(() => {
    useWidgetStore.getState().reset();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  describe('initial state', () => {
    it('should have empty registry', () => {
      expect(useWidgetStore.getState().registry).toEqual({});
    });

    it('should have empty instances', () => {
      expect(useWidgetStore.getState().instances).toEqual({});
    });

    it('should not be loading', () => {
      expect(useWidgetStore.getState().isLoading).toBe(false);
    });

    it('should have null error', () => {
      expect(useWidgetStore.getState().error).toBeNull();
    });
  });

  describe('actions', () => {
    it('registerWidget should add to registry', () => {
      useWidgetStore.getState().registerWidget(mockRegistryEntry);
      expect(useWidgetStore.getState().registry['com.example.test-widget']).toEqual(mockRegistryEntry);
    });

    it('unregisterWidget should remove from registry', () => {
      useWidgetStore.getState().registerWidget(mockRegistryEntry);
      useWidgetStore.getState().unregisterWidget('com.example.test-widget');
      expect(useWidgetStore.getState().registry['com.example.test-widget']).toBeUndefined();
    });

    it('unregisterWidget should not affect other entries', () => {
      const secondEntry: WidgetRegistryEntry = {
        ...mockRegistryEntry,
        widgetId: 'com.example.other-widget',
        manifest: { ...mockManifest, id: 'com.example.other-widget', name: 'Other Widget' },
      };
      useWidgetStore.getState().registerWidget(mockRegistryEntry);
      useWidgetStore.getState().registerWidget(secondEntry);
      useWidgetStore.getState().unregisterWidget('com.example.test-widget');

      expect(useWidgetStore.getState().registry['com.example.other-widget']).toEqual(secondEntry);
    });

    it('addInstance should add to instances', () => {
      useWidgetStore.getState().addInstance(mockInstance);
      expect(useWidgetStore.getState().instances['inst-1']).toEqual(mockInstance);
    });

    it('removeInstance should remove from instances', () => {
      useWidgetStore.getState().addInstance(mockInstance);
      useWidgetStore.getState().removeInstance('inst-1');
      expect(useWidgetStore.getState().instances['inst-1']).toBeUndefined();
    });

    it('updateInstanceState should update instance state', () => {
      useWidgetStore.getState().addInstance(mockInstance);
      useWidgetStore.getState().updateInstanceState('inst-1', { count: 42 });
      expect(useWidgetStore.getState().instances['inst-1'].state).toEqual({ count: 42 });
    });

    it('updateInstanceState should no-op for unknown instance', () => {
      const before = useWidgetStore.getState().instances;
      useWidgetStore.getState().updateInstanceState('unknown', { count: 42 });
      expect(useWidgetStore.getState().instances).toBe(before);
    });

    it('updateInstanceConfig should update instance config', () => {
      useWidgetStore.getState().addInstance(mockInstance);
      useWidgetStore.getState().updateInstanceConfig('inst-1', { color: 'blue' });
      expect(useWidgetStore.getState().instances['inst-1'].config).toEqual({ color: 'blue' });
    });

    it('updateInstanceConfig should no-op for unknown instance', () => {
      const before = useWidgetStore.getState().instances;
      useWidgetStore.getState().updateInstanceConfig('unknown', { color: 'blue' });
      expect(useWidgetStore.getState().instances).toBe(before);
    });

    it('setLoading should update isLoading', () => {
      useWidgetStore.getState().setLoading(true);
      expect(useWidgetStore.getState().isLoading).toBe(true);
    });

    it('setError should update error', () => {
      useWidgetStore.getState().setError('Widget error');
      expect(useWidgetStore.getState().error).toBe('Widget error');
    });

    it('clearError should set error to null', () => {
      useWidgetStore.getState().setError('error');
      useWidgetStore.getState().clearError();
      expect(useWidgetStore.getState().error).toBeNull();
    });

    it('reset should restore initial state', () => {
      useWidgetStore.getState().registerWidget(mockRegistryEntry);
      useWidgetStore.getState().addInstance(mockInstance);
      useWidgetStore.getState().setLoading(true);
      useWidgetStore.getState().setError('error');

      useWidgetStore.getState().reset();

      const state = useWidgetStore.getState();
      expect(state.registry).toEqual({});
      expect(state.instances).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('bus subscriptions', () => {
    it('should add instance on widget.mounted', () => {
      setupWidgetBusSubscriptions();

      bus.emit(WidgetEvents.MOUNTED, {
        instanceId: 'inst-2',
        widgetId: 'com.example.test-widget',
        canvasId: 'canvas-1',
        state: { foo: 'bar' },
        config: { theme: 'dark' },
      });

      const instance = useWidgetStore.getState().instances['inst-2'];
      expect(instance).toBeDefined();
      expect(instance.widgetId).toBe('com.example.test-widget');
      expect(instance.state).toEqual({ foo: 'bar' });
      expect(instance.config).toEqual({ theme: 'dark' });
    });

    it('should handle widget.mounted with minimal payload', () => {
      setupWidgetBusSubscriptions();

      bus.emit(WidgetEvents.MOUNTED, {
        instanceId: 'inst-3',
        widgetId: 'com.example.test-widget',
        canvasId: 'canvas-1',
      });

      const instance = useWidgetStore.getState().instances['inst-3'];
      expect(instance).toBeDefined();
      expect(instance.state).toEqual({});
      expect(instance.config).toEqual({});
    });

    it('should ignore widget.mounted with null payload', () => {
      setupWidgetBusSubscriptions();

      bus.emit(WidgetEvents.MOUNTED, null);

      expect(Object.keys(useWidgetStore.getState().instances)).toHaveLength(0);
    });

    it('should remove instance on widget.unmounted', () => {
      setupWidgetBusSubscriptions();

      useWidgetStore.getState().addInstance(mockInstance);
      expect(useWidgetStore.getState().instances['inst-1']).toBeDefined();

      bus.emit(WidgetEvents.UNMOUNTED, { instanceId: 'inst-1' });

      expect(useWidgetStore.getState().instances['inst-1']).toBeUndefined();
    });

    it('should ignore widget.unmounted with null payload', () => {
      setupWidgetBusSubscriptions();

      useWidgetStore.getState().addInstance(mockInstance);

      bus.emit(WidgetEvents.UNMOUNTED, null);

      expect(useWidgetStore.getState().instances['inst-1']).toBeDefined();
    });
  });
});
