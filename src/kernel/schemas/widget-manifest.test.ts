/**
 * Widget Manifest schema tests
 * @module @sn/types/widget-manifest.test
 */

import { describe, it, expect } from 'vitest';

import {
  SemVerSchema,
  WidgetPermissionSchema,
  EventPortSchema,
  WidgetEventContractSchema,
  WidgetConfigFieldSchema,
  WidgetSizeConstraintsSchema,
  WidgetAuthorSchema,
  WidgetLicenseSchema,
  WidgetManifestSchema,
  WidgetInstanceStateSchema,
  UserWidgetStateSchema,
  WidgetManifestJSONSchema,
  WidgetInstanceStateJSONSchema,
  UserWidgetStateJSONSchema,
  type WidgetPermission,
  type WidgetManifest,
  type WidgetLicense,
} from './widget-manifest';

describe('Widget Manifest Schemas', () => {
  describe('SemVerSchema', () => {
    it('should accept valid semver strings', () => {
      const validVersions = [
        '1.0.0',
        '0.1.0',
        '10.20.30',
        '1.0.0-alpha',
        '1.0.0-beta.1',
        '1.0.0+build.123',
        '1.0.0-rc.1+build.456',
      ];

      validVersions.forEach((version) => {
        const result = SemVerSchema.safeParse(version);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid semver strings', () => {
      const invalidVersions = [
        '1.0',
        '1',
        'v1.0.0',
        '1.0.0.0',
        'latest',
      ];

      invalidVersions.forEach((version) => {
        const result = SemVerSchema.safeParse(version);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('WidgetPermissionSchema', () => {
    it('should accept all valid permissions', () => {
      const permissions: WidgetPermission[] = [
        'storage',
        'user-state',
        'integrations',
        'clipboard',
        'notifications',
        'media',
        'geolocation',
        'cross-canvas',
        'gallery',
      ];

      permissions.forEach((perm) => {
        const result = WidgetPermissionSchema.safeParse(perm);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid permission', () => {
      const result = WidgetPermissionSchema.safeParse('admin');
      expect(result.success).toBe(false);
    });
  });

  describe('EventPortSchema', () => {
    it('should parse valid event port', () => {
      const input = {
        name: 'onClick',
        description: 'Fired when button is clicked',
        schema: { type: 'object' },
      };
      const result = EventPortSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('onClick');
      }
    });

    it('should require name', () => {
      const input = {
        description: 'Missing name',
      };
      const result = EventPortSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('WidgetEventContractSchema', () => {
    it('should parse valid event contract', () => {
      const input = {
        emits: [{ name: 'onValueChange' }],
        subscribes: [{ name: 'externalTrigger' }],
      };
      const result = WidgetEventContractSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emits.length).toBe(1);
        expect(result.data.subscribes.length).toBe(1);
      }
    });

    it('should default to empty arrays', () => {
      const input = {};
      const result = WidgetEventContractSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emits).toEqual([]);
        expect(result.data.subscribes).toEqual([]);
      }
    });
  });

  describe('WidgetConfigFieldSchema', () => {
    it('should parse string config field', () => {
      const input = {
        name: 'title',
        type: 'string',
        label: 'Title',
        description: 'The widget title',
        placeholder: 'Enter title...',
        required: true,
      };
      const result = WidgetConfigFieldSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('string');
        expect(result.data.required).toBe(true);
      }
    });

    it('should parse slider config field with min/max/step', () => {
      const input = {
        name: 'volume',
        type: 'slider',
        label: 'Volume',
        min: 0,
        max: 100,
        step: 5,
        default: 50,
      };
      const result = WidgetConfigFieldSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.min).toBe(0);
        expect(result.data.max).toBe(100);
        expect(result.data.step).toBe(5);
      }
    });

    it('should parse select config field with options', () => {
      const input = {
        name: 'theme',
        type: 'select',
        label: 'Theme',
        options: [
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ],
      };
      const result = WidgetConfigFieldSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.options?.length).toBe(2);
      }
    });
  });

  describe('WidgetSizeConstraintsSchema', () => {
    it('should parse size constraints', () => {
      const input = {
        minWidth: 100,
        maxWidth: 500,
        minHeight: 100,
        maxHeight: 400,
        defaultWidth: 200,
        defaultHeight: 150,
        aspectLocked: true,
        aspectRatio: 4 / 3,
      };
      const result = WidgetSizeConstraintsSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aspectLocked).toBe(true);
      }
    });

    it('should apply defaults', () => {
      const input = {};
      const result = WidgetSizeConstraintsSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.defaultWidth).toBe(200);
        expect(result.data.defaultHeight).toBe(150);
        expect(result.data.aspectLocked).toBe(false);
      }
    });
  });

  describe('WidgetAuthorSchema', () => {
    it('should parse author with all fields', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        url: 'https://johndoe.dev',
      };
      const result = WidgetAuthorSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const input = {
        email: 'john@example.com',
      };
      const result = WidgetAuthorSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('WidgetLicenseSchema', () => {
    it('should accept all valid licenses', () => {
      const licenses: WidgetLicense[] = [
        'MIT',
        'Apache-2.0',
        'GPL-3.0',
        'BSD-3-Clause',
        'proprietary',
        'no-fork',
      ];

      licenses.forEach((license) => {
        const result = WidgetLicenseSchema.safeParse(license);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('WidgetManifestSchema', () => {
    const minimalManifest = {
      id: 'com.example.clock',
      name: 'Clock Widget',
      version: '1.0.0',
    };

    it('should parse minimal manifest', () => {
      const result = WidgetManifestSchema.safeParse(minimalManifest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('com.example.clock');
        expect(result.data.license).toBe('MIT'); // default
        expect(result.data.category).toBe('other'); // default
      }
    });

    it('should parse full manifest', () => {
      const input: WidgetManifest = {
        id: 'com.example.advanced-clock',
        name: 'Advanced Clock',
        description: 'A feature-rich clock widget',
        version: '2.0.0',
        author: { name: 'Jane Doe' },
        license: 'Apache-2.0',
        homepage: 'https://example.com/clock',
        repository: 'https://github.com/example/clock',
        icon: 'https://example.com/icon.png',
        thumbnail: 'https://example.com/thumb.png',
        tags: ['clock', 'time', 'productivity'],
        category: 'productivity',
        permissions: ['storage', 'notifications'],
        events: {
          emits: [{ name: 'tick' }],
          subscribes: [{ name: 'setTime' }],
        },
        config: {
          fields: [
            { name: 'timezone', type: 'string', label: 'Timezone', required: false },
          ],
        },
        size: {
          defaultWidth: 300,
          defaultHeight: 200,
          minWidth: 150,
          aspectLocked: false,
        },
        entry: 'clock.html',
        spatialSupport: true,
        minPlatformVersion: '5.0.0',
        crossCanvasChannels: [],
      };
      const result = WidgetManifestSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.spatialSupport).toBe(true);
        expect(result.data.tags.length).toBe(3);
      }
    });

    it('should validate widget id format', () => {
      const invalidIds = [
        { ...minimalManifest, id: 'Has Spaces' },
        { ...minimalManifest, id: 'has@symbol' },
        { ...minimalManifest, id: '' },
      ];

      invalidIds.forEach((input) => {
        const result = WidgetManifestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    it('should validate name length', () => {
      const longName = { ...minimalManifest, name: 'A'.repeat(51) };
      const result = WidgetManifestSchema.safeParse(longName);

      expect(result.success).toBe(false);
    });

    it('should validate description length', () => {
      const longDesc = { ...minimalManifest, description: 'A'.repeat(501) };
      const result = WidgetManifestSchema.safeParse(longDesc);

      expect(result.success).toBe(false);
    });
  });

  describe('WidgetInstanceStateSchema', () => {
    it('should parse valid instance state', () => {
      const input = {
        instanceId: '550e8400-e29b-41d4-a716-446655440000',
        widgetId: 'com.example.clock',
        canvasId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        state: { currentTime: '12:00' },
        config: { timezone: 'UTC' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      const result = WidgetInstanceStateSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('UserWidgetStateSchema', () => {
    it('should parse valid user widget state', () => {
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        widgetId: 'com.example.notes',
        state: { recentNotes: ['note1', 'note2'] },
        updatedAt: '2024-01-01T00:00:00Z',
      };
      const result = UserWidgetStateSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('JSON Schema exports', () => {
    it('should export WidgetManifest JSON schema', () => {
      expect(WidgetManifestJSONSchema).toBeDefined();
      expect(typeof WidgetManifestJSONSchema).toBe('object');
    });

    it('should export WidgetInstanceState JSON schema', () => {
      expect(WidgetInstanceStateJSONSchema).toBeDefined();
      expect(typeof WidgetInstanceStateJSONSchema).toBe('object');
    });

    it('should export UserWidgetState JSON schema', () => {
      expect(UserWidgetStateJSONSchema).toBeDefined();
      expect(typeof UserWidgetStateJSONSchema).toBe('object');
    });
  });
});
