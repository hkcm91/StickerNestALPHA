/**
 * SQL Builder Tests
 *
 * @module kernel/supabase
 * @layer L0
 */

import { describe, expect, it } from 'vitest';

import {
  SelectBuilder,
  InsertBuilder,
  UpdateBuilder,
  DeleteBuilder,
  select,
  insert,
  update,
  deleteFrom,
  escapeValue,
  quoteIdent,
  raw,
  isRaw,
} from './sql-builder';

// ─── escapeValue ────────────────────────────────────────────────────

describe('escapeValue', () => {
  it('returns NULL for null and undefined', () => {
    expect(escapeValue(null)).toBe('NULL');
    expect(escapeValue(undefined)).toBe('NULL');
  });

  it('returns TRUE/FALSE for booleans', () => {
    expect(escapeValue(true)).toBe('TRUE');
    expect(escapeValue(false)).toBe('FALSE');
  });

  it('returns stringified number for numbers', () => {
    expect(escapeValue(42)).toBe('42');
    expect(escapeValue(3.14)).toBe('3.14');
  });

  it('throws for non-finite numbers', () => {
    expect(() => escapeValue(Infinity)).toThrow('Invalid numeric value');
    expect(() => escapeValue(NaN)).toThrow('Invalid numeric value');
  });

  it('escapes single quotes in strings', () => {
    expect(escapeValue("it's")).toBe("'it''s'");
    expect(escapeValue('hello')).toBe("'hello'");
  });

  it('formats Date as ISO string', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(escapeValue(d)).toBe("'2026-01-01T00:00:00.000Z'");
  });

  it('formats arrays with ARRAY syntax', () => {
    expect(escapeValue([1, 2, 3])).toBe('ARRAY[1, 2, 3]');
    expect(escapeValue(['a', 'b'])).toBe("ARRAY['a', 'b']");
  });

  it('formats objects as jsonb', () => {
    expect(escapeValue({ key: 'val' })).toBe("'{\"key\":\"val\"}'::jsonb");
  });
});

// ─── quoteIdent ─────────────────────────────────────────────────────

describe('quoteIdent', () => {
  it('wraps name in double quotes', () => {
    expect(quoteIdent('users')).toBe('"users"');
  });

  it('handles schema.table format', () => {
    expect(quoteIdent('public.users')).toBe('"public"."users"');
  });

  it('escapes embedded double quotes', () => {
    expect(quoteIdent('my"table')).toBe('"my""table"');
  });
});

// ─── raw / isRaw ────────────────────────────────────────────────────

describe('raw / isRaw', () => {
  it('raw creates a tagged object', () => {
    const r = raw('NOW()');
    expect(r.__raw).toBe(true);
    expect(r.sql).toBe('NOW()');
  });

  it('isRaw identifies raw objects', () => {
    expect(isRaw(raw('x'))).toBe(true);
    expect(isRaw({ __raw: true, sql: 'y' })).toBe(true);
    expect(isRaw('hello')).toBe(false);
    expect(isRaw(null)).toBe(false);
    expect(isRaw(42)).toBe(false);
  });
});

// ─── SelectBuilder ──────────────────────────────────────────────────

describe('SelectBuilder', () => {
  it('builds basic SELECT *', () => {
    const sql = new SelectBuilder().from('users').toSQL();
    expect(sql).toContain('SELECT');
    expect(sql).toContain('*');
    expect(sql).toContain('FROM "users"');
  });

  it('builds SELECT with specific columns', () => {
    const sql = select('id', 'name').from('users').toSQL();
    expect(sql).toContain('SELECT');
    expect(sql).toContain('id, name');
  });

  it('builds SELECT DISTINCT', () => {
    const sql = new SelectBuilder().distinct().select('email').from('users').toSQL();
    expect(sql).toContain('SELECT DISTINCT');
  });

  it('builds WHERE with equality', () => {
    const sql = select('*').from('users').whereEq('id', 1).toSQL();
    expect(sql).toContain('WHERE "id" = 1');
  });

  it('builds WHERE IN', () => {
    const sql = select('*').from('users').whereIn('id', [1, 2, 3]).toSQL();
    expect(sql).toContain('"id" IN (1, 2, 3)');
  });

  it('builds OR WHERE group', () => {
    const sql = select('*')
      .from('users')
      .orWhere([
        { column: 'status', operator: '=', value: 'active' },
        { column: 'status', operator: '=', value: 'pending' },
      ])
      .toSQL();
    expect(sql).toContain("\"status\" = 'active'");
    expect(sql).toContain(' OR ');
  });

  it('builds JOINs', () => {
    const sql = select('u.name', 'p.title')
      .from('users', 'u')
      .innerJoin('posts', 'u.id = p.user_id', 'p')
      .toSQL();
    expect(sql).toContain('FROM "users" AS "u"');
    expect(sql).toContain('INNER JOIN "posts" AS "p" ON u.id = p.user_id');
  });

  it('builds LEFT JOIN', () => {
    const sql = select('*')
      .from('users')
      .leftJoin('profiles', 'users.id = profiles.user_id')
      .toSQL();
    expect(sql).toContain('LEFT JOIN "profiles"');
  });

  it('builds GROUP BY and HAVING', () => {
    const sql = select('status', 'COUNT(*) as cnt')
      .from('orders')
      .groupBy('status')
      .having('status', '!=', 'cancelled')
      .toSQL();
    expect(sql).toContain('GROUP BY "status"');
    expect(sql).toContain("HAVING \"status\" != 'cancelled'");
  });

  it('builds ORDER BY with NULLS LAST', () => {
    const sql = select('*')
      .from('items')
      .orderBy('price', 'DESC', 'LAST')
      .toSQL();
    expect(sql).toContain('ORDER BY "price" DESC NULLS LAST');
  });

  it('builds LIMIT and OFFSET', () => {
    const sql = select('*').from('users').limit(10).offset(20).toSQL();
    expect(sql).toContain('LIMIT 10');
    expect(sql).toContain('OFFSET 20');
  });

  it('builds FOR UPDATE', () => {
    const sql = select('*').from('users').whereEq('id', 1).forUpdate().toSQL();
    expect(sql).toContain('FOR UPDATE');
  });

  it('builds WITH (CTE)', () => {
    const sql = new SelectBuilder()
      .with('recent', 'SELECT * FROM posts WHERE created_at > NOW() - INTERVAL \'1 day\'')
      .select('*')
      .from('recent')
      .toSQL();
    expect(sql).toContain('WITH "recent" AS');
  });

  it('builds raw WHERE clause', () => {
    const sql = select('*').from('users').whereRaw("email LIKE '%@test.com'").toSQL();
    expect(sql).toContain("email LIKE '%@test.com'");
  });
});

// ─── InsertBuilder ──────────────────────────────────────────────────

describe('InsertBuilder', () => {
  it('builds basic INSERT', () => {
    const sql = insert()
      .into('users')
      .columns('name', 'email')
      .values('Alice', 'alice@test.com')
      .toSQL();
    expect(sql).toContain('INSERT INTO "users"');
    expect(sql).toContain('("name", "email")');
    expect(sql).toContain("VALUES ('Alice', 'alice@test.com')");
  });

  it('builds INSERT from record', () => {
    const sql = insert()
      .into('users')
      .record({ name: 'Bob', age: 30 })
      .toSQL();
    expect(sql).toContain('"name"');
    expect(sql).toContain("'Bob'");
    expect(sql).toContain('30');
  });

  it('builds INSERT with multiple records', () => {
    const sql = insert()
      .into('users')
      .records([{ name: 'A' }, { name: 'B' }])
      .toSQL();
    expect(sql).toContain("('A')");
    expect(sql).toContain("('B')");
  });

  it('builds RETURNING clause', () => {
    const sql = insert().into('users').record({ name: 'X' }).returning('id').toSQL();
    expect(sql).toContain('RETURNING "id"');
  });

  it('builds RETURNING *', () => {
    const sql = insert().into('users').record({ name: 'X' }).returningAll().toSQL();
    expect(sql).toContain('RETURNING *');
  });

  it('builds ON CONFLICT DO NOTHING', () => {
    const sql = insert()
      .into('users')
      .record({ email: 'a@b.com' })
      .onConflict(['email'], 'DO NOTHING')
      .toSQL();
    expect(sql).toContain('ON CONFLICT ("email") DO NOTHING');
  });

  it('builds ON CONFLICT DO UPDATE', () => {
    const sql = insert()
      .into('users')
      .columns('email', 'name')
      .values('a@b.com', 'Alice')
      .onConflict(['email'], 'DO UPDATE', { updateColumns: ['name'] })
      .toSQL();
    expect(sql).toContain('DO UPDATE SET "name" = EXCLUDED."name"');
  });
});

// ─── UpdateBuilder ──────────────────────────────────────────────────

describe('UpdateBuilder', () => {
  it('builds basic UPDATE', () => {
    const sql = update('users').set('name', 'Alice').whereEq('id', 1).toSQL();
    expect(sql).toContain('UPDATE "users"');
    expect(sql).toContain("SET \"name\" = 'Alice'");
    expect(sql).toContain('WHERE "id" = 1');
  });

  it('builds UPDATE with setAll', () => {
    const sql = update('users').setAll({ name: 'Bob', active: true }).toSQL();
    expect(sql).toContain("\"name\" = 'Bob'");
    expect(sql).toContain('"active" = TRUE');
  });

  it('builds UPDATE with FROM clause', () => {
    const sql = update('users')
      .set('role', 'admin')
      .from('admin_list')
      .whereRaw('users.id = admin_list.user_id')
      .toSQL();
    expect(sql).toContain('FROM "admin_list"');
  });

  it('builds UPDATE with RETURNING', () => {
    const sql = update('users').set('name', 'X').returningAll().toSQL();
    expect(sql).toContain('RETURNING *');
  });

  it('builds UPDATE with raw WHERE', () => {
    const sql = update('items').set('qty', 0).whereRaw('expired_at < NOW()').toSQL();
    expect(sql).toContain('expired_at < NOW()');
  });
});

// ─── DeleteBuilder ──────────────────────────────────────────────────

describe('DeleteBuilder', () => {
  it('builds basic DELETE', () => {
    const sql = deleteFrom('users').whereEq('id', 1).toSQL();
    expect(sql).toContain('DELETE FROM "users"');
    expect(sql).toContain('WHERE "id" = 1');
  });

  it('builds DELETE with USING', () => {
    const sql = deleteFrom('orders')
      .using('old_orders')
      .whereRaw('orders.id = old_orders.id')
      .toSQL();
    expect(sql).toContain('USING "old_orders"');
  });

  it('builds DELETE with RETURNING', () => {
    const sql = deleteFrom('users').whereEq('id', 1).returning('id', 'name').toSQL();
    expect(sql).toContain('RETURNING "id", "name"');
  });

  it('builds DELETE with raw WHERE', () => {
    const sql = deleteFrom('logs').whereRaw("created_at < '2025-01-01'").toSQL();
    expect(sql).toContain("created_at < '2025-01-01'");
  });

  it('builds DELETE without WHERE (full table)', () => {
    const sql = deleteFrom('temp').toSQL();
    expect(sql).toBe('DELETE FROM "temp"');
  });
});

// ─── Factory functions ──────────────────────────────────────────────

describe('Factory Functions', () => {
  it('select() returns a SelectBuilder', () => {
    expect(select('id')).toBeInstanceOf(SelectBuilder);
  });

  it('insert() returns an InsertBuilder', () => {
    expect(insert()).toBeInstanceOf(InsertBuilder);
  });

  it('update() returns an UpdateBuilder', () => {
    expect(update('t')).toBeInstanceOf(UpdateBuilder);
  });

  it('deleteFrom() returns a DeleteBuilder', () => {
    expect(deleteFrom('t')).toBeInstanceOf(DeleteBuilder);
  });
});
