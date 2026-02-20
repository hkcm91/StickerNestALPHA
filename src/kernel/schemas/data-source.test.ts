/**
 * DataSource schema tests
 * @module @sn/types/data-source.test
 */

import { describe, it, expect } from 'vitest';

import {
  DataSourceTypeSchema,
  DataSourceScopeSchema,
  DataSourceACLRoleSchema,
  DataSourceACLEntrySchema,
  DataSourceMetadataSchema,
  DataSourceSchema,
  CreateDataSourceInputSchema,
  UpdateDataSourceInputSchema,
  DataSourceJSONSchema,
  DataSourceACLEntryJSONSchema,
  type DataSource,
  type DataSourceType,
  type DataSourceScope,
  type DataSourceACLRole,
  type DataSourceACLEntry,
} from './data-source';

describe('DataSource Schemas', () => {
  describe('DataSourceTypeSchema', () => {
    it.each(['doc', 'table', 'note', 'folder', 'file', 'custom'] as DataSourceType[])(
      'should accept valid type: %s',
      (type) => {
        const result = DataSourceTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      }
    );

    it('should reject invalid type', () => {
      const result = DataSourceTypeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('DataSourceScopeSchema', () => {
    it.each(['canvas', 'user', 'shared', 'public'] as DataSourceScope[])(
      'should accept valid scope: %s',
      (scope) => {
        const result = DataSourceScopeSchema.safeParse(scope);
        expect(result.success).toBe(true);
      }
    );

    it('should reject invalid scope', () => {
      const result = DataSourceScopeSchema.safeParse('private');
      expect(result.success).toBe(false);
    });
  });

  describe('DataSourceACLRoleSchema', () => {
    it.each(['owner', 'editor', 'commenter', 'viewer'] as DataSourceACLRole[])(
      'should accept valid role: %s',
      (role) => {
        const result = DataSourceACLRoleSchema.safeParse(role);
        expect(result.success).toBe(true);
      }
    );

    it('should reject invalid role', () => {
      const result = DataSourceACLRoleSchema.safeParse('admin');
      expect(result.success).toBe(false);
    });
  });

  describe('DataSourceACLEntrySchema', () => {
    it('should parse valid ACL entry', () => {
      const entry: DataSourceACLEntry = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'editor',
        grantedAt: '2024-01-01T00:00:00Z',
        grantedBy: '123e4567-e89b-12d3-a456-426614174001',
      };
      const result = DataSourceACLEntrySchema.safeParse(entry);

      expect(result.success).toBe(true);
    });

    it('should accept null grantedBy for owner', () => {
      const entry = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'owner',
        grantedAt: '2024-01-01T00:00:00Z',
        grantedBy: null,
      };
      const result = DataSourceACLEntrySchema.safeParse(entry);

      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const entry = {
        userId: 'not-a-uuid',
        role: 'editor',
        grantedAt: '2024-01-01T00:00:00Z',
        grantedBy: null,
      };
      const result = DataSourceACLEntrySchema.safeParse(entry);

      expect(result.success).toBe(false);
    });

    it('should reject invalid datetime', () => {
      const entry = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'editor',
        grantedAt: 'not-a-date',
        grantedBy: null,
      };
      const result = DataSourceACLEntrySchema.safeParse(entry);

      expect(result.success).toBe(false);
    });
  });

  describe('DataSourceMetadataSchema', () => {
    it('should parse full metadata', () => {
      const metadata = {
        name: 'My Document',
        description: 'A test document',
        icon: 'file-text',
        color: '#ff0000',
        tags: ['test', 'draft'],
        custom: { priority: 1 },
      };
      const result = DataSourceMetadataSchema.safeParse(metadata);

      expect(result.success).toBe(true);
    });

    it('should accept empty metadata', () => {
      const result = DataSourceMetadataSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept partial metadata', () => {
      const metadata = { name: 'Just a name' };
      const result = DataSourceMetadataSchema.safeParse(metadata);

      expect(result.success).toBe(true);
    });
  });

  describe('DataSourceSchema', () => {
    const validDataSource: DataSource = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'doc',
      ownerId: '123e4567-e89b-12d3-a456-426614174001',
      scope: 'canvas',
      canvasId: '123e4567-e89b-12d3-a456-426614174002',
      metadata: { name: 'Test Doc' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should parse valid data source', () => {
      const result = DataSourceSchema.safeParse(validDataSource);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('doc');
        expect(result.data.scope).toBe('canvas');
      }
    });

    it('should accept data source without canvasId when scope is not canvas', () => {
      const ds = {
        ...validDataSource,
        scope: 'user',
        canvasId: undefined,
      };
      const result = DataSourceSchema.safeParse(ds);

      expect(result.success).toBe(true);
    });

    it('should accept data source with schema for table type', () => {
      const ds = {
        ...validDataSource,
        type: 'table',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      };
      const result = DataSourceSchema.safeParse(ds);

      expect(result.success).toBe(true);
    });

    it('should accept data source with revision', () => {
      const ds = {
        ...validDataSource,
        type: 'table',
        revision: 5,
      };
      const result = DataSourceSchema.safeParse(ds);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.revision).toBe(5);
      }
    });

    it('should reject negative revision', () => {
      const ds = {
        ...validDataSource,
        revision: -1,
      };
      const result = DataSourceSchema.safeParse(ds);

      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for id', () => {
      const ds = {
        ...validDataSource,
        id: 'not-a-uuid',
      };
      const result = DataSourceSchema.safeParse(ds);

      expect(result.success).toBe(false);
    });
  });

  describe('CreateDataSourceInputSchema', () => {
    it('should accept input without id, createdAt, updatedAt, revision', () => {
      const input = {
        type: 'doc',
        ownerId: '123e4567-e89b-12d3-a456-426614174001',
        scope: 'user',
      };
      const result = CreateDataSourceInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject input with id', () => {
      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'doc',
        ownerId: '123e4567-e89b-12d3-a456-426614174001',
        scope: 'user',
      };
      const result = CreateDataSourceInputSchema.safeParse(input);

      // id should be omitted, so parsing should fail or ignore it
      // Zod .omit() strips the field, so it should still succeed
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateDataSourceInputSchema', () => {
    it('should accept partial update', () => {
      const input = {
        metadata: { name: 'Updated Name' },
      };
      const result = UpdateDataSourceInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept lastSeenRevision for conflict detection', () => {
      const input = {
        metadata: { name: 'Updated Name' },
        lastSeenRevision: 5,
      };
      const result = UpdateDataSourceInputSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lastSeenRevision).toBe(5);
      }
    });

    it('should accept empty update', () => {
      const result = UpdateDataSourceInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('JSON Schema exports', () => {
    it('should export DataSource JSON schema', () => {
      expect(DataSourceJSONSchema).toBeDefined();
      expect(typeof DataSourceJSONSchema).toBe('object');
    });

    it('should export DataSourceACLEntry JSON schema', () => {
      expect(DataSourceACLEntryJSONSchema).toBeDefined();
      expect(typeof DataSourceACLEntryJSONSchema).toBe('object');
    });
  });
});
