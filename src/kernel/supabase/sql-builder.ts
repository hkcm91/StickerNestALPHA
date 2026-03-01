/**
 * SQL Builder - Fluent API for constructing SQL statements
 *
 * Provides a type-safe, chainable interface for building:
 * - SELECT queries
 * - INSERT statements
 * - UPDATE statements
 * - DELETE statements
 * - Complex joins and subqueries
 */

// ============================================================================
// Types
// ============================================================================

type WhereOperator = '=' | '!=' | '<' | '>' | '<=' | '>=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN' | 'IS' | 'IS NOT' | '@>' | '<@' | '?' | '?|' | '?&' | '&&';
type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
type OrderDirection = 'ASC' | 'DESC';
type ConflictAction = 'DO NOTHING' | 'DO UPDATE';

interface WhereClause {
  type: 'simple' | 'and' | 'or' | 'raw';
  column?: string;
  operator?: WhereOperator;
  value?: unknown;
  clauses?: WhereClause[];
  sql?: string;
}

interface JoinClause {
  type: JoinType;
  table: string;
  alias?: string;
  on: string;
}

interface OrderClause {
  column: string;
  direction: OrderDirection;
  nulls?: 'FIRST' | 'LAST';
}

interface SelectBuilderState {
  distinct: boolean;
  columns: string[];
  from: string;
  fromAlias?: string;
  joins: JoinClause[];
  where: WhereClause[];
  groupBy: string[];
  having: WhereClause[];
  orderBy: OrderClause[];
  limit?: number;
  offset?: number;
  forUpdate: boolean;
  ctes: Array<{ name: string; query: string }>;
}

interface InsertBuilderState {
  into: string;
  columns: string[];
  values: unknown[][];
  returning: string[];
  onConflict?: {
    columns: string[];
    action: ConflictAction;
    updateColumns?: string[];
    updateWhere?: string;
  };
}

interface UpdateBuilderState {
  table: string;
  set: Record<string, unknown>;
  from?: string;
  where: WhereClause[];
  returning: string[];
}

interface DeleteBuilderState {
  from: string;
  using?: string;
  where: WhereClause[];
  returning: string[];
}

// ============================================================================
// Value Escaping
// ============================================================================

/**
 * Escape a value for use in SQL
 */
export function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid numeric value: ${value}`);
    }
    return String(value);
  }

  if (typeof value === 'string') {
    // Escape single quotes by doubling them
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }

  if (Array.isArray(value)) {
    const escaped = value.map(escapeValue);
    return `ARRAY[${escaped.join(', ')}]`;
  }

  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }

  throw new Error(`Unsupported value type: ${typeof value}`);
}

/**
 * Quote an identifier (table or column name)
 */
export function quoteIdent(name: string): string {
  // Handle schema.table format
  if (name.includes('.')) {
    return name
      .split('.')
      .map((part) => `"${part.replace(/"/g, '""')}"`)
      .join('.');
  }
  return `"${name.replace(/"/g, '""')}"`;
}

// ============================================================================
// WHERE Clause Builder
// ============================================================================

function buildWhereClause(clause: WhereClause): string {
  switch (clause.type) {
    case 'simple': {
      const col = clause.column!;
      const op = clause.operator!;
      const val = clause.value;

      if (op === 'IN' || op === 'NOT IN') {
        if (!Array.isArray(val)) {
          throw new Error(`${op} requires an array value`);
        }
        const values = val.map(escapeValue).join(', ');
        return `${quoteIdent(col)} ${op} (${values})`;
      }

      if ((op === 'IS' || op === 'IS NOT') && val === null) {
        return `${quoteIdent(col)} ${op} NULL`;
      }

      return `${quoteIdent(col)} ${op} ${escapeValue(val)}`;
    }

    case 'and': {
      const parts = clause.clauses!.map(buildWhereClause);
      return `(${parts.join(' AND ')})`;
    }

    case 'or': {
      const parts = clause.clauses!.map(buildWhereClause);
      return `(${parts.join(' OR ')})`;
    }

    case 'raw': {
      return clause.sql!;
    }

    default:
      throw new Error(`Unknown clause type: ${clause.type}`);
  }
}

// ============================================================================
// SELECT Builder
// ============================================================================

export class SelectBuilder {
  private state: SelectBuilderState = {
    distinct: false,
    columns: [],
    from: '',
    joins: [],
    where: [],
    groupBy: [],
    having: [],
    orderBy: [],
    forUpdate: false,
    ctes: [],
  };

  /**
   * Add a CTE (WITH clause)
   */
  with(name: string, query: string | SelectBuilder): this {
    const sql = typeof query === 'string' ? query : query.toSQL();
    this.state.ctes.push({ name, query: sql });
    return this;
  }

  /**
   * Set SELECT DISTINCT
   */
  distinct(): this {
    this.state.distinct = true;
    return this;
  }

  /**
   * Add columns to select
   */
  select(...columns: string[]): this {
    this.state.columns.push(...columns);
    return this;
  }

  /**
   * Set the FROM clause
   */
  from(table: string, alias?: string): this {
    this.state.from = table;
    this.state.fromAlias = alias;
    return this;
  }

  /**
   * Add a JOIN clause
   */
  join(type: JoinType, table: string, on: string, alias?: string): this {
    this.state.joins.push({ type, table, alias, on });
    return this;
  }

  /**
   * Add an INNER JOIN
   */
  innerJoin(table: string, on: string, alias?: string): this {
    return this.join('INNER', table, on, alias);
  }

  /**
   * Add a LEFT JOIN
   */
  leftJoin(table: string, on: string, alias?: string): this {
    return this.join('LEFT', table, on, alias);
  }

  /**
   * Add a WHERE condition
   */
  where(column: string, operator: WhereOperator, value: unknown): this {
    this.state.where.push({ type: 'simple', column, operator, value });
    return this;
  }

  /**
   * Add a WHERE ... = ... condition
   */
  whereEq(column: string, value: unknown): this {
    return this.where(column, '=', value);
  }

  /**
   * Add a WHERE ... IN (...) condition
   */
  whereIn(column: string, values: unknown[]): this {
    return this.where(column, 'IN', values);
  }

  /**
   * Add a raw WHERE clause
   */
  whereRaw(sql: string): this {
    this.state.where.push({ type: 'raw', sql });
    return this;
  }

  /**
   * Add an OR WHERE group
   */
  orWhere(clauses: Array<{ column: string; operator: WhereOperator; value: unknown }>): this {
    this.state.where.push({
      type: 'or',
      clauses: clauses.map((c) => ({
        type: 'simple' as const,
        column: c.column,
        operator: c.operator,
        value: c.value,
      })),
    });
    return this;
  }

  /**
   * Add GROUP BY columns
   */
  groupBy(...columns: string[]): this {
    this.state.groupBy.push(...columns);
    return this;
  }

  /**
   * Add HAVING condition
   */
  having(column: string, operator: WhereOperator, value: unknown): this {
    this.state.having.push({ type: 'simple', column, operator, value });
    return this;
  }

  /**
   * Add ORDER BY
   */
  orderBy(column: string, direction: OrderDirection = 'ASC', nulls?: 'FIRST' | 'LAST'): this {
    this.state.orderBy.push({ column, direction, nulls });
    return this;
  }

  /**
   * Set LIMIT
   */
  limit(count: number): this {
    this.state.limit = count;
    return this;
  }

  /**
   * Set OFFSET
   */
  offset(count: number): this {
    this.state.offset = count;
    return this;
  }

  /**
   * Add FOR UPDATE
   */
  forUpdate(): this {
    this.state.forUpdate = true;
    return this;
  }

  /**
   * Build the SQL string
   */
  toSQL(): string {
    const parts: string[] = [];

    // CTEs
    if (this.state.ctes.length > 0) {
      const ctes = this.state.ctes.map((cte) => `${quoteIdent(cte.name)} AS (${cte.query})`);
      parts.push(`WITH ${ctes.join(', ')}`);
    }

    // SELECT
    parts.push(this.state.distinct ? 'SELECT DISTINCT' : 'SELECT');
    parts.push(this.state.columns.length > 0 ? this.state.columns.join(', ') : '*');

    // FROM
    if (this.state.from) {
      let fromClause = `FROM ${quoteIdent(this.state.from)}`;
      if (this.state.fromAlias) {
        fromClause += ` AS ${quoteIdent(this.state.fromAlias)}`;
      }
      parts.push(fromClause);
    }

    // JOINs
    for (const join of this.state.joins) {
      let joinClause = `${join.type} JOIN ${quoteIdent(join.table)}`;
      if (join.alias) {
        joinClause += ` AS ${quoteIdent(join.alias)}`;
      }
      joinClause += ` ON ${join.on}`;
      parts.push(joinClause);
    }

    // WHERE
    if (this.state.where.length > 0) {
      const whereClauses = this.state.where.map(buildWhereClause);
      parts.push(`WHERE ${whereClauses.join(' AND ')}`);
    }

    // GROUP BY
    if (this.state.groupBy.length > 0) {
      parts.push(`GROUP BY ${this.state.groupBy.map(quoteIdent).join(', ')}`);
    }

    // HAVING
    if (this.state.having.length > 0) {
      const havingClauses = this.state.having.map(buildWhereClause);
      parts.push(`HAVING ${havingClauses.join(' AND ')}`);
    }

    // ORDER BY
    if (this.state.orderBy.length > 0) {
      const orderClauses = this.state.orderBy.map((o) => {
        let clause = `${quoteIdent(o.column)} ${o.direction}`;
        if (o.nulls) {
          clause += ` NULLS ${o.nulls}`;
        }
        return clause;
      });
      parts.push(`ORDER BY ${orderClauses.join(', ')}`);
    }

    // LIMIT
    if (this.state.limit !== undefined) {
      parts.push(`LIMIT ${this.state.limit}`);
    }

    // OFFSET
    if (this.state.offset !== undefined) {
      parts.push(`OFFSET ${this.state.offset}`);
    }

    // FOR UPDATE
    if (this.state.forUpdate) {
      parts.push('FOR UPDATE');
    }

    return parts.join('\n');
  }
}

// ============================================================================
// INSERT Builder
// ============================================================================

export class InsertBuilder {
  private state: InsertBuilderState = {
    into: '',
    columns: [],
    values: [],
    returning: [],
  };

  /**
   * Set the target table
   */
  into(table: string): this {
    this.state.into = table;
    return this;
  }

  /**
   * Set columns to insert
   */
  columns(...cols: string[]): this {
    this.state.columns.push(...cols);
    return this;
  }

  /**
   * Add values to insert
   */
  values(...vals: unknown[]): this {
    this.state.values.push(vals);
    return this;
  }

  /**
   * Insert from an object (auto-extracts columns and values)
   */
  record(obj: Record<string, unknown>): this {
    const entries = Object.entries(obj);
    if (this.state.columns.length === 0) {
      this.state.columns = entries.map(([k]) => k);
    }
    this.state.values.push(entries.map(([, v]) => v));
    return this;
  }

  /**
   * Insert multiple records
   */
  records(objs: Array<Record<string, unknown>>): this {
    for (const obj of objs) {
      this.record(obj);
    }
    return this;
  }

  /**
   * Set RETURNING columns
   */
  returning(...cols: string[]): this {
    this.state.returning.push(...cols);
    return this;
  }

  /**
   * Return all columns
   */
  returningAll(): this {
    this.state.returning = ['*'];
    return this;
  }

  /**
   * Set ON CONFLICT clause
   */
  onConflict(
    columns: string[],
    action: ConflictAction,
    options?: { updateColumns?: string[]; updateWhere?: string }
  ): this {
    this.state.onConflict = {
      columns,
      action,
      updateColumns: options?.updateColumns,
      updateWhere: options?.updateWhere,
    };
    return this;
  }

  /**
   * Build the SQL string
   */
  toSQL(): string {
    const parts: string[] = [];

    parts.push(`INSERT INTO ${quoteIdent(this.state.into)}`);

    // Columns
    if (this.state.columns.length > 0) {
      parts.push(`(${this.state.columns.map(quoteIdent).join(', ')})`);
    }

    // Values
    const valueRows = this.state.values.map((row) => `(${row.map(escapeValue).join(', ')})`);
    parts.push(`VALUES ${valueRows.join(', ')}`);

    // ON CONFLICT
    if (this.state.onConflict) {
      const oc = this.state.onConflict;
      const conflictCols = oc.columns.map(quoteIdent).join(', ');

      if (oc.action === 'DO NOTHING') {
        parts.push(`ON CONFLICT (${conflictCols}) DO NOTHING`);
      } else {
        const updateCols = (oc.updateColumns || this.state.columns)
          .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
          .join(', ');
        let updateClause = `ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateCols}`;
        if (oc.updateWhere) {
          updateClause += ` WHERE ${oc.updateWhere}`;
        }
        parts.push(updateClause);
      }
    }

    // RETURNING
    if (this.state.returning.length > 0) {
      const cols = this.state.returning[0] === '*' ? '*' : this.state.returning.map(quoteIdent).join(', ');
      parts.push(`RETURNING ${cols}`);
    }

    return parts.join('\n');
  }
}

// ============================================================================
// UPDATE Builder
// ============================================================================

export class UpdateBuilder {
  private state: UpdateBuilderState = {
    table: '',
    set: {},
    where: [],
    returning: [],
  };

  /**
   * Set the target table
   */
  table(name: string): this {
    this.state.table = name;
    return this;
  }

  /**
   * Set a single column value
   */
  set(column: string, value: unknown): this {
    this.state.set[column] = value;
    return this;
  }

  /**
   * Set multiple column values from an object
   */
  setAll(values: Record<string, unknown>): this {
    Object.assign(this.state.set, values);
    return this;
  }

  /**
   * Set FROM clause for updates with joins
   */
  from(table: string): this {
    this.state.from = table;
    return this;
  }

  /**
   * Add a WHERE condition
   */
  where(column: string, operator: WhereOperator, value: unknown): this {
    this.state.where.push({ type: 'simple', column, operator, value });
    return this;
  }

  /**
   * Add a WHERE ... = ... condition
   */
  whereEq(column: string, value: unknown): this {
    return this.where(column, '=', value);
  }

  /**
   * Add a raw WHERE clause
   */
  whereRaw(sql: string): this {
    this.state.where.push({ type: 'raw', sql });
    return this;
  }

  /**
   * Set RETURNING columns
   */
  returning(...cols: string[]): this {
    this.state.returning.push(...cols);
    return this;
  }

  /**
   * Return all columns
   */
  returningAll(): this {
    this.state.returning = ['*'];
    return this;
  }

  /**
   * Build the SQL string
   */
  toSQL(): string {
    const parts: string[] = [];

    parts.push(`UPDATE ${quoteIdent(this.state.table)}`);

    // SET
    const setClauses = Object.entries(this.state.set)
      .map(([col, val]) => `${quoteIdent(col)} = ${escapeValue(val)}`)
      .join(', ');
    parts.push(`SET ${setClauses}`);

    // FROM
    if (this.state.from) {
      parts.push(`FROM ${quoteIdent(this.state.from)}`);
    }

    // WHERE
    if (this.state.where.length > 0) {
      const whereClauses = this.state.where.map(buildWhereClause);
      parts.push(`WHERE ${whereClauses.join(' AND ')}`);
    }

    // RETURNING
    if (this.state.returning.length > 0) {
      const cols = this.state.returning[0] === '*' ? '*' : this.state.returning.map(quoteIdent).join(', ');
      parts.push(`RETURNING ${cols}`);
    }

    return parts.join('\n');
  }
}

// ============================================================================
// DELETE Builder
// ============================================================================

export class DeleteBuilder {
  private state: DeleteBuilderState = {
    from: '',
    where: [],
    returning: [],
  };

  /**
   * Set the target table
   */
  from(table: string): this {
    this.state.from = table;
    return this;
  }

  /**
   * Set USING clause for deletes with joins
   */
  using(table: string): this {
    this.state.using = table;
    return this;
  }

  /**
   * Add a WHERE condition
   */
  where(column: string, operator: WhereOperator, value: unknown): this {
    this.state.where.push({ type: 'simple', column, operator, value });
    return this;
  }

  /**
   * Add a WHERE ... = ... condition
   */
  whereEq(column: string, value: unknown): this {
    return this.where(column, '=', value);
  }

  /**
   * Add a raw WHERE clause
   */
  whereRaw(sql: string): this {
    this.state.where.push({ type: 'raw', sql });
    return this;
  }

  /**
   * Set RETURNING columns
   */
  returning(...cols: string[]): this {
    this.state.returning.push(...cols);
    return this;
  }

  /**
   * Build the SQL string
   */
  toSQL(): string {
    const parts: string[] = [];

    parts.push(`DELETE FROM ${quoteIdent(this.state.from)}`);

    // USING
    if (this.state.using) {
      parts.push(`USING ${quoteIdent(this.state.using)}`);
    }

    // WHERE
    if (this.state.where.length > 0) {
      const whereClauses = this.state.where.map(buildWhereClause);
      parts.push(`WHERE ${whereClauses.join(' AND ')}`);
    }

    // RETURNING
    if (this.state.returning.length > 0) {
      const cols = this.state.returning[0] === '*' ? '*' : this.state.returning.map(quoteIdent).join(', ');
      parts.push(`RETURNING ${cols}`);
    }

    return parts.join('\n');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new SELECT query builder
 */
export function select(...columns: string[]): SelectBuilder {
  return new SelectBuilder().select(...columns);
}

/**
 * Create a new INSERT query builder
 */
export function insert(): InsertBuilder {
  return new InsertBuilder();
}

/**
 * Create a new UPDATE query builder
 */
export function update(table: string): UpdateBuilder {
  return new UpdateBuilder().table(table);
}

/**
 * Create a new DELETE query builder
 */
export function deleteFrom(table: string): DeleteBuilder {
  return new DeleteBuilder().from(table);
}

// ============================================================================
// Raw SQL Helper
// ============================================================================

/**
 * Create raw SQL (bypasses escaping)
 */
export function raw(sql: string): { __raw: true; sql: string } {
  return { __raw: true, sql };
}

/**
 * Check if a value is raw SQL
 */
export function isRaw(value: unknown): value is { __raw: true; sql: string } {
  return typeof value === 'object' && value !== null && '__raw' in value;
}
