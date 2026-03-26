/**
 * Database Architect Tests
 *
 * @module kernel/supabase
 * @layer L0
 */

import { describe, expect, it } from 'vitest';

import {
  generateCreateTableSQL,
  generateCreateIndexSQL,
  generateRLSPolicySQL,
  generateCreateTriggerSQL,
  generateCreateFunctionSQL,
  generateCreateEnumSQL,
  createMigration,
  addTable,
  addIndex,
  addPolicy,
  addRawSQL,
  compileMigration,
  withAuditColumns,
  withOwnerColumn,
  uuidPrimaryKey,
  metadataColumn,
  generateOwnerPolicies,
  generatePublicReadPolicy,
  generateUpdatedAtTrigger,
  objectToTableDefinition,
} from './db-architect';

describe('generateCreateTableSQL', () => {
  it('generates CREATE TABLE with columns and RLS enabled by default', () => {
    const sql = generateCreateTableSQL({
      name: 'posts',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'title', type: 'text', nullable: false },
      ],
    });

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "public"."posts"');
    expect(sql).toContain('"id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()');
    expect(sql).toContain('"title" text NOT NULL');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
  });

  it('generates varchar with length', () => {
    const sql = generateCreateTableSQL({
      name: 'test',
      columns: [{ name: 'code', type: 'varchar', length: 10 }],
    });

    expect(sql).toContain('varchar(10)');
  });

  it('generates decimal with precision and scale', () => {
    const sql = generateCreateTableSQL({
      name: 'test',
      columns: [{ name: 'amount', type: 'decimal', precision: 10, scale: 2 }],
    });

    expect(sql).toContain('decimal(10, 2)');
  });

  it('generates array column type', () => {
    const sql = generateCreateTableSQL({
      name: 'test',
      columns: [{ name: 'tags', type: 'array', arrayOf: 'text' }],
    });

    expect(sql).toContain('text[]');
  });

  it('generates foreign key references with ON DELETE', () => {
    const sql = generateCreateTableSQL({
      name: 'comments',
      columns: [
        {
          name: 'post_id',
          type: 'uuid',
          references: { table: 'posts', column: 'id', onDelete: 'CASCADE' },
        },
      ],
    });

    expect(sql).toContain('REFERENCES "posts"("id")');
    expect(sql).toContain('ON DELETE CASCADE');
  });

  it('generates composite primary key', () => {
    const sql = generateCreateTableSQL({
      name: 'pivot',
      columns: [
        { name: 'user_id', type: 'uuid' },
        { name: 'role_id', type: 'uuid' },
      ],
      primaryKey: ['user_id', 'role_id'],
    });

    expect(sql).toContain('PRIMARY KEY ("user_id", "role_id")');
  });

  it('generates unique constraints', () => {
    const sql = generateCreateTableSQL({
      name: 'users',
      columns: [{ name: 'email', type: 'text' }],
      uniqueConstraints: [{ name: 'uq_email', columns: ['email'] }],
    });

    expect(sql).toContain('CONSTRAINT "uq_email" UNIQUE ("email")');
  });

  it('generates check constraints', () => {
    const sql = generateCreateTableSQL({
      name: 'items',
      columns: [{ name: 'qty', type: 'integer' }],
      checkConstraints: [{ expression: 'qty > 0' }],
    });

    expect(sql).toContain('CHECK (qty > 0)');
  });

  it('includes table and column comments', () => {
    const sql = generateCreateTableSQL({
      name: 'test',
      columns: [{ name: 'val', type: 'text', comment: "it's a value" }],
      comment: 'Test table',
    });

    expect(sql).toContain("COMMENT ON TABLE");
    expect(sql).toContain("'Test table'");
    expect(sql).toContain("COMMENT ON COLUMN");
    expect(sql).toContain("it''s a value");
  });

  it('disables RLS when enableRLS is false', () => {
    const sql = generateCreateTableSQL({
      name: 'test',
      columns: [{ name: 'id', type: 'uuid' }],
      enableRLS: false,
    });

    expect(sql).not.toContain('ENABLE ROW LEVEL SECURITY');
  });
});

describe('generateCreateIndexSQL', () => {
  it('generates a basic btree index', () => {
    const sql = generateCreateIndexSQL({
      table: 'posts',
      columns: ['user_id'],
    });

    expect(sql).toContain('CREATE INDEX');
    expect(sql).toContain('idx_posts_user_id');
    expect(sql).toContain('ON "public"."posts"');
    expect(sql).toContain('("user_id")');
    expect(sql).not.toContain('USING'); // btree is default, not printed
  });

  it('generates a unique GIN index with partial condition', () => {
    const sql = generateCreateIndexSQL({
      table: 'docs',
      columns: ['content'],
      unique: true,
      method: 'gin',
      where: 'active = true',
    });

    expect(sql).toContain('CREATE UNIQUE INDEX');
    expect(sql).toContain('USING gin');
    expect(sql).toContain('WHERE active = true');
  });

  it('generates concurrent index', () => {
    const sql = generateCreateIndexSQL({
      table: 'big_table',
      columns: ['col'],
      concurrently: true,
    });

    expect(sql).toContain('CONCURRENTLY');
  });

  it('generates covering index with INCLUDE', () => {
    const sql = generateCreateIndexSQL({
      table: 'orders',
      columns: ['customer_id'],
      include: ['total'],
    });

    expect(sql).toContain('INCLUDE ("total")');
  });

  it('uses custom index name when provided', () => {
    const sql = generateCreateIndexSQL({
      name: 'my_custom_idx',
      table: 'test',
      columns: ['col'],
    });

    expect(sql).toContain('"my_custom_idx"');
  });
});

describe('generateRLSPolicySQL', () => {
  it('generates a SELECT policy with USING clause', () => {
    const sql = generateRLSPolicySQL({
      name: 'posts_read',
      table: 'posts',
      operation: 'SELECT',
      using: 'auth.uid() = owner_id',
    });

    expect(sql).toContain('CREATE POLICY "posts_read"');
    expect(sql).toContain('FOR SELECT');
    expect(sql).toContain('TO authenticated');
    expect(sql).toContain('USING (auth.uid() = owner_id)');
  });

  it('generates INSERT policy with WITH CHECK', () => {
    const sql = generateRLSPolicySQL({
      name: 'posts_insert',
      table: 'posts',
      operation: 'INSERT',
      withCheck: 'auth.uid() = owner_id',
    });

    expect(sql).toContain('FOR INSERT');
    expect(sql).toContain('WITH CHECK (auth.uid() = owner_id)');
  });

  it('uses custom role', () => {
    const sql = generateRLSPolicySQL({
      name: 'public_read',
      table: 'posts',
      operation: 'SELECT',
      role: 'anon',
      using: 'true',
    });

    expect(sql).toContain('TO anon');
  });
});

describe('generateCreateTriggerSQL', () => {
  it('generates a BEFORE UPDATE trigger', () => {
    const sql = generateCreateTriggerSQL({
      name: 'update_timestamp',
      table: 'posts',
      timing: 'BEFORE',
      events: ['UPDATE'],
      function: 'handle_updated_at',
    });

    expect(sql).toContain('CREATE TRIGGER "update_timestamp"');
    expect(sql).toContain('BEFORE UPDATE');
    expect(sql).toContain('FOR EACH ROW');
    expect(sql).toContain('EXECUTE FUNCTION handle_updated_at()');
  });

  it('generates a trigger with multiple events and WHEN clause', () => {
    const sql = generateCreateTriggerSQL({
      name: 'audit_trigger',
      table: 'items',
      timing: 'AFTER',
      events: ['INSERT', 'DELETE'],
      when: 'pg_trigger_depth() = 0',
      function: 'audit_log',
    });

    expect(sql).toContain('AFTER INSERT OR DELETE');
    expect(sql).toContain('WHEN (pg_trigger_depth() = 0)');
  });
});

describe('generateCreateFunctionSQL', () => {
  it('generates a basic plpgsql function', () => {
    const sql = generateCreateFunctionSQL({
      name: 'my_func',
      body: 'BEGIN RETURN 1; END;',
      returns: 'integer',
    });

    expect(sql).toContain('CREATE OR REPLACE FUNCTION "public"."my_func"()');
    expect(sql).toContain('RETURNS integer');
    expect(sql).toContain('LANGUAGE plpgsql');
    expect(sql).toContain('VOLATILE');
    expect(sql).toContain('SECURITY INVOKER');
    expect(sql).toContain('BEGIN RETURN 1; END;');
  });

  it('generates function with args and comment', () => {
    const sql = generateCreateFunctionSQL({
      name: 'add_nums',
      args: [
        { name: 'a', type: 'integer' },
        { name: 'b', type: 'integer', default: '0' },
      ],
      returns: 'integer',
      body: 'BEGIN RETURN a + b; END;',
      comment: "Adds two numbers",
    });

    expect(sql).toContain('a integer');
    expect(sql).toContain('b integer DEFAULT 0');
    expect(sql).toContain("COMMENT ON FUNCTION");
  });
});

describe('generateCreateEnumSQL', () => {
  it('generates a DO block with CREATE TYPE', () => {
    const sql = generateCreateEnumSQL({
      name: 'status',
      values: ['active', 'inactive', 'pending'],
    });

    expect(sql).toContain('CREATE TYPE "public"."status" AS ENUM');
    expect(sql).toContain("'active', 'inactive', 'pending'");
    expect(sql).toContain('EXCEPTION');
    expect(sql).toContain('duplicate_object');
  });

  it('includes comment when provided', () => {
    const sql = generateCreateEnumSQL({
      name: 'role',
      values: ['admin', 'user'],
      comment: "User's role",
    });

    expect(sql).toContain("COMMENT ON TYPE");
    expect(sql).toContain("User''s role");
  });
});

describe('Migration Builder', () => {
  it('creates and compiles a migration with multiple statements', () => {
    const m = createMigration('test_migration');
    addTable(m, {
      name: 'things',
      columns: [uuidPrimaryKey()],
    });
    addIndex(m, { table: 'things', columns: ['id'] });
    addRawSQL(m, 'SELECT 1;');

    const sql = compileMigration(m);

    expect(sql).toContain('-- Migration: test_migration');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS');
    expect(sql).toContain('CREATE INDEX');
    expect(sql).toContain('SELECT 1;');
  });
});

describe('Helper Functions', () => {
  it('withAuditColumns appends created_at and updated_at', () => {
    const cols = withAuditColumns([{ name: 'id', type: 'uuid' as const }]);
    expect(cols).toHaveLength(3);
    expect(cols[1].name).toBe('created_at');
    expect(cols[2].name).toBe('updated_at');
  });

  it('withOwnerColumn appends owner_id with FK reference', () => {
    const cols = withOwnerColumn([{ name: 'id', type: 'uuid' as const }]);
    expect(cols).toHaveLength(2);
    expect(cols[1].name).toBe('owner_id');
    expect(cols[1].references!.table).toBe('users');
  });

  it('uuidPrimaryKey creates correct column definition', () => {
    const col = uuidPrimaryKey();
    expect(col.name).toBe('id');
    expect(col.type).toBe('uuid');
    expect(col.primaryKey).toBe(true);
    expect(col.default).toBe('gen_random_uuid()');
  });

  it('metadataColumn creates jsonb column', () => {
    const col = metadataColumn('meta');
    expect(col.name).toBe('meta');
    expect(col.type).toBe('jsonb');
  });

  it('generateOwnerPolicies returns 4 policies', () => {
    const policies = generateOwnerPolicies('posts');
    expect(policies).toHaveLength(4);
    expect(policies.map((p) => p.operation)).toEqual(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
  });

  it('generatePublicReadPolicy uses anon role', () => {
    const policy = generatePublicReadPolicy('posts');
    expect(policy.role).toBe('anon');
    expect(policy.operation).toBe('SELECT');
  });

  it('generateUpdatedAtTrigger creates trigger SQL', () => {
    const sql = generateUpdatedAtTrigger('posts');
    expect(sql).toContain('BEFORE UPDATE');
    expect(sql).toContain('handle_updated_at()');
  });
});

describe('objectToTableDefinition', () => {
  it('maps simple schema types to postgres types', () => {
    const def = objectToTableDefinition('test', {
      id: 'uuid',
      name: 'string',
      count: 'number',
      active: 'boolean',
      data: 'json',
      ts: 'timestamp',
    });

    expect(def.name).toBe('test');
    const colTypes = Object.fromEntries(def.columns.filter(c => !['created_at', 'updated_at'].includes(c.name)).map((c) => [c.name, c.type]));
    expect(colTypes.id).toBe('uuid');
    expect(colTypes.name).toBe('text');
    expect(colTypes.count).toBe('numeric');
    expect(colTypes.active).toBe('boolean');
    expect(colTypes.data).toBe('jsonb');
    expect(colTypes.ts).toBe('timestamptz');
  });

  it('auto-adds audit columns by default', () => {
    const def = objectToTableDefinition('test', { id: 'uuid' });
    const names = def.columns.map((c) => c.name);
    expect(names).toContain('created_at');
    expect(names).toContain('updated_at');
  });

  it('skips audit columns when disabled', () => {
    const def = objectToTableDefinition('test', { id: 'uuid' }, { includeAuditColumns: false });
    const names = def.columns.map((c) => c.name);
    expect(names).not.toContain('created_at');
  });

  it('sets primary key on the id column', () => {
    const def = objectToTableDefinition('test', { id: 'uuid', title: 'string' });
    const idCol = def.columns.find((c) => c.name === 'id');
    expect(idCol!.primaryKey).toBe(true);
    expect(idCol!.nullable).toBe(false);
  });

  it('enables RLS by default', () => {
    const def = objectToTableDefinition('test', { id: 'uuid' });
    expect(def.enableRLS).toBe(true);
  });
});
