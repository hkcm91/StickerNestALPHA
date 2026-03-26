/**
 * MCP Database Integration Tests
 *
 * @module kernel/supabase
 * @layer L0
 */

import { describe, expect, it } from 'vitest';

import {
  STICKERNEST_PROJECT_ID,
  DATABASE_INFO,
  RLS_OWNER_POLICY,
  RLS_PUBLIC_READ_OWNER_WRITE,
  UPDATED_AT_TRIGGER,
  QUERY_TABLES,
  QUERY_COLUMNS,
  QUERY_INDEXES,
  QUERY_CONSTRAINTS,
  QUERY_RLS_POLICIES,
  QUERY_TRIGGERS,
  QUERY_ENUMS,
  QUERY_FUNCTIONS,
  QUERY_RLS_ENABLED,
  QUERY_ROW_COUNT_ESTIMATE,
  QUERY_DATABASE_SIZE,
  QUERY_TABLE_SIZES,
  generateStandardTableMigration,
  generateAddColumnMigration,
  generateIndexMigration,
} from './mcp-database';

describe('Constants', () => {
  it('exports the project ID', () => {
    expect(STICKERNEST_PROJECT_ID).toBe('lmewtcluzfzqlzwqunst');
  });

  it('exports database info with expected fields', () => {
    expect(DATABASE_INFO.projectId).toBe(STICKERNEST_PROJECT_ID);
    expect(DATABASE_INFO.host).toContain('supabase.co');
    expect(DATABASE_INFO.region).toBeDefined();
    expect(DATABASE_INFO.postgresVersion).toBeDefined();
  });
});

describe('RLS Templates', () => {
  it('RLS_OWNER_POLICY generates owner-only policy', () => {
    const sql = RLS_OWNER_POLICY('posts');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('"posts"');
    expect(sql).toContain('auth.uid() = owner_id');
    expect(sql).toContain('FOR ALL');
  });

  it('RLS_OWNER_POLICY respects custom owner column', () => {
    const sql = RLS_OWNER_POLICY('items', 'user_id');
    expect(sql).toContain('auth.uid() = user_id');
  });

  it('RLS_PUBLIC_READ_OWNER_WRITE generates two policies', () => {
    const sql = RLS_PUBLIC_READ_OWNER_WRITE('posts');
    expect(sql).toContain('public_read');
    expect(sql).toContain('owner_write');
    expect(sql).toContain('FOR SELECT');
    expect(sql).toContain('FOR ALL');
    expect(sql).toContain('authenticated, anon');
  });

  it('UPDATED_AT_TRIGGER generates trigger SQL', () => {
    const sql = UPDATED_AT_TRIGGER('posts');
    expect(sql).toContain('set_posts_updated_at');
    expect(sql).toContain('BEFORE UPDATE');
    expect(sql).toContain('handle_updated_at()');
  });
});

describe('Introspection Queries', () => {
  it('QUERY_TABLES is a valid SQL string', () => {
    expect(QUERY_TABLES).toContain('information_schema.tables');
    expect(QUERY_TABLES).toContain("table_schema = 'public'");
  });

  it('QUERY_COLUMNS accepts a table name', () => {
    const sql = QUERY_COLUMNS('users');
    expect(sql).toContain("table_name = 'users'");
    expect(sql).toContain('information_schema.columns');
  });

  it('QUERY_INDEXES accepts a table name', () => {
    const sql = QUERY_INDEXES('posts');
    expect(sql).toContain("tablename = 'posts'");
  });

  it('QUERY_CONSTRAINTS uses regclass', () => {
    const sql = QUERY_CONSTRAINTS('users');
    expect(sql).toContain("'public.users'::regclass");
  });

  it('QUERY_RLS_POLICIES uses regclass', () => {
    const sql = QUERY_RLS_POLICIES('items');
    expect(sql).toContain("'public.items'::regclass");
  });

  it('QUERY_TRIGGERS uses regclass', () => {
    const sql = QUERY_TRIGGERS('orders');
    expect(sql).toContain("'public.orders'::regclass");
  });

  it('QUERY_ENUMS queries pg_type and pg_enum', () => {
    expect(QUERY_ENUMS).toContain('pg_type');
    expect(QUERY_ENUMS).toContain('pg_enum');
  });

  it('QUERY_FUNCTIONS queries pg_proc', () => {
    expect(QUERY_FUNCTIONS).toContain('pg_proc');
    expect(QUERY_FUNCTIONS).toContain("prokind = 'f'");
  });

  it('QUERY_RLS_ENABLED checks relrowsecurity', () => {
    const sql = QUERY_RLS_ENABLED('users');
    expect(sql).toContain('relrowsecurity');
    expect(sql).toContain("relname = 'users'");
  });

  it('QUERY_ROW_COUNT_ESTIMATE queries pg_class', () => {
    const sql = QUERY_ROW_COUNT_ESTIMATE('posts');
    expect(sql).toContain('reltuples');
    expect(sql).toContain("relname = 'posts'");
  });

  it('QUERY_DATABASE_SIZE uses pg_database_size', () => {
    expect(QUERY_DATABASE_SIZE).toContain('pg_database_size');
  });

  it('QUERY_TABLE_SIZES uses pg_statio_user_tables', () => {
    expect(QUERY_TABLE_SIZES).toContain('pg_statio_user_tables');
  });
});

describe('generateStandardTableMigration', () => {
  it('generates a table with owner RLS by default', () => {
    const sql = generateStandardTableMigration({
      tableName: 'posts',
      columns: [
        { name: 'title', type: 'text', nullable: false },
        { name: 'body', type: 'text' },
      ],
    });

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public."posts"');
    expect(sql).toContain('id uuid PRIMARY KEY');
    expect(sql).toContain('"title" text NOT NULL');
    expect(sql).toContain('created_at timestamptz');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('owner_all');
    expect(sql).toContain('set_posts_updated_at');
  });

  it('generates public-read RLS type', () => {
    const sql = generateStandardTableMigration({
      tableName: 'docs',
      columns: [{ name: 'content', type: 'text' }],
      rlsType: 'public-read',
    });

    expect(sql).toContain('public_read');
    expect(sql).toContain('owner_write');
    expect(sql).toContain('FOR SELECT');
  });

  it('generates without RLS', () => {
    const sql = generateStandardTableMigration({
      tableName: 'logs',
      columns: [{ name: 'msg', type: 'text' }],
      rlsType: 'none',
    });

    expect(sql).not.toContain('ENABLE ROW LEVEL SECURITY');
  });

  it('generates without timestamps', () => {
    const sql = generateStandardTableMigration({
      tableName: 'temp',
      columns: [{ name: 'val', type: 'text' }],
      hasTimestamps: false,
    });

    expect(sql).not.toContain('created_at');
    expect(sql).not.toContain('updated_at');
    expect(sql).not.toContain('set_temp_updated_at');
  });

  it('generates column with FK reference', () => {
    const sql = generateStandardTableMigration({
      tableName: 'comments',
      columns: [
        {
          name: 'post_id',
          type: 'uuid',
          nullable: false,
          references: { table: 'posts', column: 'id' },
        },
      ],
    });

    expect(sql).toContain('REFERENCES public."posts"("id")');
    expect(sql).toContain('ON DELETE CASCADE');
  });
});

describe('generateAddColumnMigration', () => {
  it('generates ALTER TABLE ADD COLUMN', () => {
    const sql = generateAddColumnMigration({
      tableName: 'users',
      columnName: 'bio',
      columnType: 'text',
    });

    expect(sql).toContain('ALTER TABLE public."users"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "bio" text');
  });

  it('adds NOT NULL and DEFAULT', () => {
    const sql = generateAddColumnMigration({
      tableName: 'users',
      columnName: 'active',
      columnType: 'boolean',
      nullable: false,
      default: 'true',
    });

    expect(sql).toContain('NOT NULL');
    expect(sql).toContain('DEFAULT true');
  });
});

describe('generateIndexMigration', () => {
  it('generates basic btree index', () => {
    const sql = generateIndexMigration({
      tableName: 'posts',
      columns: ['user_id'],
    });

    expect(sql).toContain('CREATE INDEX IF NOT EXISTS');
    expect(sql).toContain('"idx_posts_user_id"');
    expect(sql).toContain('("user_id")');
  });

  it('generates unique GIN index with WHERE', () => {
    const sql = generateIndexMigration({
      tableName: 'docs',
      columns: ['content'],
      unique: true,
      method: 'gin',
      where: 'active = true',
    });

    expect(sql).toContain('CREATE UNIQUE INDEX');
    expect(sql).toContain('USING gin');
    expect(sql).toContain('WHERE active = true');
  });
});
