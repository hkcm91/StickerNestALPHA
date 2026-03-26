/**
 * Docker Store — Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { DockerEvents } from '@sn/types';
import type { Docker } from '@sn/types';

import { bus } from '../../bus';

import {
  useDockerStore,
  selectVisibleDockers,
  selectLeftDockedDockers,
  selectRightDockedDockers,
  selectFloatingDockers,
  setupDockerBusSubscriptions,
} from './docker.store';

const createMockDocker = (overrides: Partial<Docker> = {}): Docker => ({
  id: crypto.randomUUID(),
  name: 'Test Docker',
  dockMode: 'floating',
  position: { x: 100, y: 100 },
  size: { width: 300, height: 400 },
  visible: true,
  pinned: false,
  tabs: [{ id: crypto.randomUUID(), name: 'Tab 1', widgets: [] }],
  activeTabIndex: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('dockerStore', () => {
  beforeEach(() => {
    useDockerStore.getState().reset();
    bus.unsubscribeAll();
  });

  afterEach(() => {
    bus.unsubscribeAll();
  });

  describe('initial state', () => {
    it('should have empty dockers', () => {
      expect(useDockerStore.getState().dockers).toEqual({});
    });

    it('should have empty activeDockerOrder', () => {
      expect(useDockerStore.getState().activeDockerOrder).toEqual([]);
    });

    it('should not be loading', () => {
      expect(useDockerStore.getState().isLoading).toBe(false);
    });

    it('should have null error', () => {
      expect(useDockerStore.getState().error).toBeNull();
    });
  });

  describe('Docker CRUD', () => {
    it('addDocker should create a new docker and return its id', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'My Docker',
        size: { width: 300, height: 400 },
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const docker = useDockerStore.getState().dockers[id];
      expect(docker).toBeDefined();
      expect(docker.name).toBe('My Docker');
      expect(docker.size).toEqual({ width: 300, height: 400 });
      expect(docker.dockMode).toBe('floating');
      expect(docker.visible).toBe(false);
      expect(docker.tabs).toHaveLength(1);
    });

    it('addDocker should emit CREATED event', () => {
      const handler = vi.fn();
      bus.subscribe(DockerEvents.CREATED, handler);

      useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].payload.docker).toBeDefined();
    });

    it('addDocker should add to activeDockerOrder', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      expect(useDockerStore.getState().activeDockerOrder).toContain(id);
    });

    it('removeDocker should remove a docker', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().removeDocker(id);

      expect(useDockerStore.getState().dockers[id]).toBeUndefined();
      expect(useDockerStore.getState().activeDockerOrder).not.toContain(id);
    });

    it('removeDocker should emit DELETED event', () => {
      const handler = vi.fn();
      bus.subscribe(DockerEvents.DELETED, handler);

      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().removeDocker(id);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].payload.dockerId).toBe(id);
    });

    it('removeDocker should no-op for unknown docker', () => {
      const before = { ...useDockerStore.getState() };
      useDockerStore.getState().removeDocker('unknown-id');
      expect(useDockerStore.getState().dockers).toEqual(before.dockers);
    });

    it('updateDocker should update docker properties', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Original',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().updateDocker(id, { name: 'Updated' });

      expect(useDockerStore.getState().dockers[id].name).toBe('Updated');
    });

    it('updateDocker should emit UPDATED event', () => {
      const handler = vi.fn();
      bus.subscribe(DockerEvents.UPDATED, handler);

      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().updateDocker(id, { name: 'Updated' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Docking', () => {
    it('setDockMode should update dock mode', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().setDockMode(id, 'docked-left');

      expect(useDockerStore.getState().dockers[id].dockMode).toBe('docked-left');
    });

    it('setDockMode should emit DOCK_MODE_CHANGED event', () => {
      const handler = vi.fn();
      bus.subscribe(DockerEvents.DOCK_MODE_CHANGED, handler);

      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().setDockMode(id, 'docked-right');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].payload.mode).toBe('docked-right');
    });

    it('setPosition should update position', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
        position: { x: 0, y: 0 },
      });

      useDockerStore.getState().setPosition(id, { x: 150, y: 250 });

      expect(useDockerStore.getState().dockers[id].position).toEqual({ x: 150, y: 250 });
    });

    it('setSize should update size', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().setSize(id, { width: 400, height: 500 });

      expect(useDockerStore.getState().dockers[id].size).toEqual({ width: 400, height: 500 });
    });
  });

  describe('Visibility', () => {
    it('toggleVisible should toggle visibility', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
        visible: true,
      });

      useDockerStore.getState().toggleVisible(id);
      expect(useDockerStore.getState().dockers[id].visible).toBe(false);

      useDockerStore.getState().toggleVisible(id);
      expect(useDockerStore.getState().dockers[id].visible).toBe(true);
    });

    it('setVisible should set visibility', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
        visible: true,
      });

      useDockerStore.getState().setVisible(id, false);
      expect(useDockerStore.getState().dockers[id].visible).toBe(false);
    });

    it('toggleVisible should emit VISIBILITY_CHANGED event', () => {
      const handler = vi.fn();
      bus.subscribe(DockerEvents.VISIBILITY_CHANGED, handler);

      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().toggleVisible(id);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('togglePinned should toggle pinned state', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
        pinned: false,
      });

      useDockerStore.getState().togglePinned(id);
      expect(useDockerStore.getState().dockers[id].pinned).toBe(true);
    });
  });

  describe('Tabs', () => {
    it('addTab should add a new tab', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      const tabId = useDockerStore.getState().addTab(id, { name: 'New Tab' });

      expect(tabId).toBeDefined();
      const docker = useDockerStore.getState().dockers[id];
      expect(docker.tabs).toHaveLength(2);
      expect(docker.tabs[1].name).toBe('New Tab');
    });

    it('addTab should emit TAB_ADDED event', () => {
      const handler = vi.fn();
      bus.subscribe(DockerEvents.TAB_ADDED, handler);

      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().addTab(id);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('removeTab should remove a tab', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().addTab(id, { name: 'Tab 2' });
      expect(useDockerStore.getState().dockers[id].tabs).toHaveLength(2);

      useDockerStore.getState().removeTab(id, 1);
      expect(useDockerStore.getState().dockers[id].tabs).toHaveLength(1);
    });

    it('removeTab should not remove the last tab', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().removeTab(id, 0);

      // Should still have 1 tab
      expect(useDockerStore.getState().dockers[id].tabs).toHaveLength(1);
    });

    it('setActiveTab should update active tab index', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().addTab(id);
      useDockerStore.getState().setActiveTab(id, 1);

      expect(useDockerStore.getState().dockers[id].activeTabIndex).toBe(1);
    });

    it('setActiveTab should emit TAB_ACTIVATED event', () => {
      const handler = vi.fn();
      bus.subscribe(DockerEvents.TAB_ACTIVATED, handler);

      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().addTab(id);
      useDockerStore.getState().setActiveTab(id, 1);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('renameTab should rename a tab', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().renameTab(id, 0, 'Renamed');

      expect(useDockerStore.getState().dockers[id].tabs[0].name).toBe('Renamed');
    });

    it('reorderTabs should reorder tabs', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      const tab1Id = useDockerStore.getState().dockers[id].tabs[0].id;
      const tab2Id = useDockerStore.getState().addTab(id, { name: 'Tab 2' });

      useDockerStore.getState().reorderTabs(id, [tab2Id, tab1Id]);

      const tabs = useDockerStore.getState().dockers[id].tabs;
      expect(tabs[0].id).toBe(tab2Id);
      expect(tabs[1].id).toBe(tab1Id);
    });
  });

  describe('Widgets in Tabs', () => {
    it('addWidgetToTab should add widget to tab', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().addWidgetToTab(id, 0, 'widget-instance-1', 150);

      const tab = useDockerStore.getState().dockers[id].tabs[0];
      expect(tab.widgets).toHaveLength(1);
      expect(tab.widgets[0].widgetInstanceId).toBe('widget-instance-1');
      expect(tab.widgets[0].height).toBe(150);
    });

    it('addWidgetToTab should emit WIDGET_ADDED event', () => {
      const handler = vi.fn();
      bus.subscribe(DockerEvents.WIDGET_ADDED, handler);

      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().addWidgetToTab(id, 0, 'widget-instance-1');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('removeWidgetFromTab should remove widget from tab', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().addWidgetToTab(id, 0, 'widget-instance-1');
      useDockerStore.getState().removeWidgetFromTab(id, 0, 'widget-instance-1');

      expect(useDockerStore.getState().dockers[id].tabs[0].widgets).toHaveLength(0);
    });

    it('resizeWidgetInTab should update widget height', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().addWidgetToTab(id, 0, 'widget-instance-1', 100);
      useDockerStore.getState().resizeWidgetInTab(id, 0, 'widget-instance-1', 200);

      expect(useDockerStore.getState().dockers[id].tabs[0].widgets[0].height).toBe(200);
    });

    it('reorderWidgetsInTab should reorder widgets', () => {
      const id = useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });

      useDockerStore.getState().addWidgetToTab(id, 0, 'widget-1');
      useDockerStore.getState().addWidgetToTab(id, 0, 'widget-2');

      useDockerStore.getState().reorderWidgetsInTab(id, 0, ['widget-2', 'widget-1']);

      const widgets = useDockerStore.getState().dockers[id].tabs[0].widgets;
      expect(widgets[0].widgetInstanceId).toBe('widget-2');
      expect(widgets[1].widgetInstanceId).toBe('widget-1');
    });
  });

  describe('Z-order', () => {
    it('bringToFront should move docker to end of activeDockerOrder', () => {
      const id1 = useDockerStore.getState().addDocker({
        name: 'Docker 1',
        size: { width: 200, height: 200 },
      });
      const id2 = useDockerStore.getState().addDocker({
        name: 'Docker 2',
        size: { width: 200, height: 200 },
      });

      expect(useDockerStore.getState().activeDockerOrder).toEqual([id1, id2]);

      useDockerStore.getState().bringToFront(id1);

      expect(useDockerStore.getState().activeDockerOrder).toEqual([id2, id1]);
    });
  });

  describe('Persistence', () => {
    it('loadFromConfig should load dockers from array', () => {
      const docker1 = createMockDocker({ name: 'Docker 1' });
      const docker2 = createMockDocker({ name: 'Docker 2' });

      useDockerStore.getState().loadFromConfig([docker1, docker2]);

      expect(useDockerStore.getState().dockers[docker1.id]).toEqual(docker1);
      expect(useDockerStore.getState().dockers[docker2.id]).toEqual(docker2);
      expect(useDockerStore.getState().activeDockerOrder).toEqual([docker1.id, docker2.id]);
    });

    it('loadFromConfig should emit CONFIG_LOADED event', () => {
      const handler = vi.fn();
      bus.subscribe(DockerEvents.CONFIG_LOADED, handler);

      useDockerStore.getState().loadFromConfig([]);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('getConfig should return dockers in order', () => {
      const id1 = useDockerStore.getState().addDocker({
        name: 'Docker 1',
        size: { width: 200, height: 200 },
      });
      const id2 = useDockerStore.getState().addDocker({
        name: 'Docker 2',
        size: { width: 200, height: 200 },
      });

      const config = useDockerStore.getState().getConfig();

      expect(config).toHaveLength(2);
      expect(config[0].id).toBe(id1);
      expect(config[1].id).toBe(id2);
    });
  });

  describe('Selectors', () => {
    it('selectVisibleDockers should return only visible dockers', () => {
      const id1 = useDockerStore.getState().addDocker({
        name: 'Visible',
        size: { width: 200, height: 200 },
        visible: true,
      });
      useDockerStore.getState().addDocker({
        name: 'Hidden',
        size: { width: 200, height: 200 },
        visible: false,
      });

      const visible = selectVisibleDockers(useDockerStore.getState());

      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe(id1);
    });

    it('selectLeftDockedDockers should return left-docked dockers', () => {
      useDockerStore.getState().addDocker({
        name: 'Floating',
        size: { width: 200, height: 200 },
        dockMode: 'floating',
      });
      const id2 = useDockerStore.getState().addDocker({
        name: 'Left',
        size: { width: 200, height: 200 },
        dockMode: 'docked-left',
      });

      const leftDocked = selectLeftDockedDockers(useDockerStore.getState());

      expect(leftDocked).toHaveLength(1);
      expect(leftDocked[0].id).toBe(id2);
    });

    it('selectRightDockedDockers should return right-docked dockers', () => {
      useDockerStore.getState().addDocker({
        name: 'Floating',
        size: { width: 200, height: 200 },
        dockMode: 'floating',
      });
      const id2 = useDockerStore.getState().addDocker({
        name: 'Right',
        size: { width: 200, height: 200 },
        dockMode: 'docked-right',
      });

      const rightDocked = selectRightDockedDockers(useDockerStore.getState());

      expect(rightDocked).toHaveLength(1);
      expect(rightDocked[0].id).toBe(id2);
    });

    it('selectFloatingDockers should return floating dockers in z-order', () => {
      const id1 = useDockerStore.getState().addDocker({
        name: 'Floating 1',
        size: { width: 200, height: 200 },
        dockMode: 'floating',
      });
      const id2 = useDockerStore.getState().addDocker({
        name: 'Floating 2',
        size: { width: 200, height: 200 },
        dockMode: 'floating',
      });
      useDockerStore.getState().addDocker({
        name: 'Docked',
        size: { width: 200, height: 200 },
        dockMode: 'docked-left',
      });

      const floating = selectFloatingDockers(useDockerStore.getState());

      expect(floating).toHaveLength(2);
      expect(floating[0].id).toBe(id1);
      expect(floating[1].id).toBe(id2);
    });
  });

  describe('Utility', () => {
    it('setLoading should update isLoading', () => {
      useDockerStore.getState().setLoading(true);
      expect(useDockerStore.getState().isLoading).toBe(true);
    });

    it('setError should update error', () => {
      useDockerStore.getState().setError('Test error');
      expect(useDockerStore.getState().error).toBe('Test error');
    });

    it('reset should restore initial state', () => {
      useDockerStore.getState().addDocker({
        name: 'Test',
        size: { width: 200, height: 200 },
      });
      useDockerStore.getState().setLoading(true);
      useDockerStore.getState().setError('error');

      useDockerStore.getState().reset();

      const state = useDockerStore.getState();
      expect(state.dockers).toEqual({});
      expect(state.activeDockerOrder).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Bus subscriptions', () => {
    it('setupDockerBusSubscriptions should not throw', () => {
      expect(() => setupDockerBusSubscriptions()).not.toThrow();
    });
  });
});
