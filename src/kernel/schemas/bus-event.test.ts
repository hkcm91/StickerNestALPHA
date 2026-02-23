/**
 * Event Bus schema tests
 * @module @sn/types/bus-event.test
 */

import { describe, it, expect } from 'vitest';

import {
  BusEventSchema,
  createBusEvent,
  KernelEvents,
  SocialEvents,
  CanvasEvents,
  WidgetEvents,
  ShellEvents,
  SpatialEvents,
  BusEventJSONSchema,
  type BusEvent,
} from './bus-event';
import { SpatialContextSchema } from './spatial';

describe('BusEvent Schemas', () => {
  describe('BusEventSchema', () => {
    it('should parse valid event without spatial context', () => {
      const input = {
        type: 'widget.mounted',
        payload: { widgetId: '123' },
      };
      const result = BusEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('widget.mounted');
        expect(result.data.payload).toEqual({ widgetId: '123' });
        expect(result.data.spatial).toBeUndefined();
      }
    });

    it('should parse valid event with spatial context', () => {
      const input = {
        type: 'spatial.controller.select',
        payload: { entityId: '456' },
        spatial: {
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          normal: { x: 0, y: 1, z: 0 },
        },
      };
      const result = BusEventSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.spatial).toBeDefined();
        expect(result.data.spatial?.position).toEqual({ x: 1, y: 2, z: 3 });
      }
    });

    it('should accept null payload', () => {
      const input = {
        type: 'kernel.store.syncRequest',
        payload: null,
      };
      const result = BusEventSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept complex payload objects', () => {
      const input = {
        type: 'canvas.entity.updated',
        payload: {
          entityId: '123',
          changes: {
            position: { x: 100, y: 200 },
            zIndex: 5,
          },
          timestamp: '2024-01-01T00:00:00Z',
        },
      };
      const result = BusEventSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject empty event type', () => {
      const input = {
        type: '',
        payload: {},
      };
      const result = BusEventSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid spatial context', () => {
      const input = {
        type: 'spatial.entity.placed',
        payload: {},
        spatial: {
          position: { x: 1, y: 2 }, // missing z
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          normal: { x: 0, y: 1, z: 0 },
        },
      };
      const result = BusEventSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('createBusEvent', () => {
    it('should create event without spatial context', () => {
      const event = createBusEvent('widget.ready', { instanceId: '123' });

      expect(event.type).toBe('widget.ready');
      expect(event.payload).toEqual({ instanceId: '123' });
      expect(event.spatial).toBeUndefined();
    });

    it('should create event with spatial context', () => {
      const spatial = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        normal: { x: 0, y: 1, z: 0 },
      };
      const event = createBusEvent('spatial.controller.select', { entityId: '456' }, spatial);

      expect(event.type).toBe('spatial.controller.select');
      expect(event.spatial).toEqual(spatial);
    });

    it('should create type-safe events', () => {
      interface WidgetReadyPayload {
        instanceId: string;
        loadTime: number;
      }

      const event: BusEvent<WidgetReadyPayload> = createBusEvent('widget.ready', {
        instanceId: '123',
        loadTime: 150,
      });

      expect(event.payload.instanceId).toBe('123');
      expect(event.payload.loadTime).toBe(150);
    });
  });

  describe('Event Constants', () => {
    describe('KernelEvents', () => {
      it('should have auth events', () => {
        expect(KernelEvents.AUTH_STATE_CHANGED).toBe('kernel.auth.stateChanged');
        expect(KernelEvents.AUTH_SESSION_EXPIRED).toBe('kernel.auth.sessionExpired');
      });

      it('should have datasource events', () => {
        expect(KernelEvents.DATASOURCE_CREATED).toBe('kernel.datasource.created');
        expect(KernelEvents.DATASOURCE_UPDATED).toBe('kernel.datasource.updated');
        expect(KernelEvents.DATASOURCE_DELETED).toBe('kernel.datasource.deleted');
      });

      it('should have store sync events', () => {
        expect(KernelEvents.STORE_SYNC_REQUEST).toBe('kernel.store.syncRequest');
      });
    });

    describe('SocialEvents', () => {
      it('should have presence events', () => {
        expect(SocialEvents.PRESENCE_JOINED).toBe('social.presence.joined');
        expect(SocialEvents.PRESENCE_LEFT).toBe('social.presence.left');
      });

      it('should have cursor events', () => {
        expect(SocialEvents.CURSOR_MOVED).toBe('social.cursor.moved');
      });

      it('should have collaboration events', () => {
        expect(SocialEvents.ENTITY_TRANSFORMED).toBe('social.entity.transformed');
        expect(SocialEvents.DATASOURCE_UPDATED).toBe('social.datasource.updated');
        expect(SocialEvents.CONFLICT_REJECTED).toBe('social.conflict.rejected');
      });
    });

    describe('CanvasEvents', () => {
      it('should have entity events', () => {
        expect(CanvasEvents.ENTITY_CREATED).toBe('canvas.entity.created');
        expect(CanvasEvents.ENTITY_UPDATED).toBe('canvas.entity.updated');
        expect(CanvasEvents.ENTITY_DELETED).toBe('canvas.entity.deleted');
        expect(CanvasEvents.ENTITY_MOVED).toBe('canvas.entity.moved');
        expect(CanvasEvents.ENTITY_RESIZED).toBe('canvas.entity.resized');
        expect(CanvasEvents.ENTITY_CONFIG_UPDATED).toBe('canvas.entity.config.updated');
      });

      it('should have group/container events', () => {
        expect(CanvasEvents.ENTITY_GROUPED).toBe('canvas.entity.grouped');
        expect(CanvasEvents.ENTITY_UNGROUPED).toBe('canvas.entity.ungrouped');
        expect(CanvasEvents.GROUP_CHILDREN_CHANGED).toBe('canvas.group.children.changed');
      });

      it('should have mode events', () => {
        expect(CanvasEvents.MODE_CHANGED).toBe('canvas.mode.changed');
      });

      it('should have pipeline events', () => {
        expect(CanvasEvents.PIPELINE_INVALID).toBe('canvas.pipeline.invalid');
      });
    });

    describe('WidgetEvents', () => {
      it('should have lifecycle events', () => {
        expect(WidgetEvents.MOUNTED).toBe('widget.mounted');
        expect(WidgetEvents.UNMOUNTED).toBe('widget.unmounted');
        expect(WidgetEvents.READY).toBe('widget.ready');
        expect(WidgetEvents.ERROR).toBe('widget.error');
      });

      it('should have state events', () => {
        expect(WidgetEvents.STATE_CHANGED).toBe('widget.state.changed');
      });
    });

    describe('ShellEvents', () => {
      it('should have theme events', () => {
        expect(ShellEvents.THEME_CHANGED).toBe('shell.theme.changed');
      });

      it('should have route events', () => {
        expect(ShellEvents.ROUTE_CHANGED).toBe('shell.route.changed');
      });
    });

    describe('SpatialEvents', () => {
      it('should have session events', () => {
        expect(SpatialEvents.SESSION_STARTED).toBe('spatial.session.started');
        expect(SpatialEvents.SESSION_ENDED).toBe('spatial.session.ended');
      });

      it('should have controller events', () => {
        expect(SpatialEvents.CONTROLLER_SELECT).toBe('spatial.controller.select');
        expect(SpatialEvents.CONTROLLER_GRAB).toBe('spatial.controller.grab');
        expect(SpatialEvents.CONTROLLER_RELEASE).toBe('spatial.controller.release');
      });

      it('should have entity events', () => {
        expect(SpatialEvents.ENTITY_PLACED).toBe('spatial.entity.placed');
      });
    });
  });

  describe('Group/Container bus events', () => {
    it('should create a valid entity.grouped event via factory', () => {
      const event = createBusEvent(CanvasEvents.ENTITY_GROUPED, {
        groupId: '550e8400-e29b-41d4-a716-446655440000',
        childIds: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ],
      });

      expect(event.type).toBe('canvas.entity.grouped');
      expect(event.payload.groupId).toBeDefined();
      expect(event.payload.childIds.length).toBe(2);
    });

    it('should create a valid group.children.changed event via factory', () => {
      const event = createBusEvent(CanvasEvents.GROUP_CHILDREN_CHANGED, {
        groupId: '550e8400-e29b-41d4-a716-446655440000',
        added: ['550e8400-e29b-41d4-a716-446655440003'],
        removed: [],
      });

      expect(event.type).toBe('canvas.group.children.changed');
      expect(event.payload.added.length).toBe(1);
      expect(event.payload.removed.length).toBe(0);
    });
  });

  describe('JSON Schema export', () => {
    it('should export valid JSON schema', () => {
      expect(BusEventJSONSchema).toBeDefined();
      expect(typeof BusEventJSONSchema).toBe('object');
    });
  });

  describe('Type inference', () => {
    it('should allow typed payloads', () => {
      interface TestPayload {
        id: string;
        value: number;
      }

      const event: BusEvent<TestPayload> = {
        type: 'test.event',
        payload: { id: '123', value: 42 },
      };

      expect(event.payload.id).toBe('123');
      expect(event.payload.value).toBe(42);
    });

    it('should allow optional spatial field', () => {
      const eventWithoutSpatial: BusEvent = {
        type: 'widget.ready',
        payload: {},
      };

      const eventWithSpatial: BusEvent = {
        type: 'spatial.entity.placed',
        payload: {},
        spatial: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          normal: { x: 0, y: 1, z: 0 },
        },
      };

      expect(eventWithoutSpatial.spatial).toBeUndefined();
      expect(eventWithSpatial.spatial).toBeDefined();
    });
  });
});
