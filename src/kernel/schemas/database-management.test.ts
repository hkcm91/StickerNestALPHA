import { describe, it, expect } from 'vitest';

import {
  ColumnTypeSchema,
  SelectOptionSchema,
  NumberFormatSchema,
  ColumnConfigSchema,
  TableColumnSchema,
  CellValueSchema,
  TableRowSchema,
  FilterOperatorSchema,
  FilterRuleSchema,
  FilterGroupSchema,
  SortDirectionSchema,
  SortRuleSchema,
  ViewTypeSchema,
  DatabaseViewSchema,
  TableSchemaSchema,
  TableContentSchema,
  AIOperationTypeSchema,
  AISchemaGenerateRequestSchema,
  AIAutofillRequestSchema,
  AIDataRequestSchema,
  TemplateCategorySchema,
  DatabaseTemplateSchema,
  NotionSyncStatusSchema,
  NotionSyncConfigSchema,
} from './database-management';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

describe('ColumnTypeSchema', () => {
  it('accepts all valid column types', () => {
    const types = [
      'text', 'number', 'select', 'multi_select', 'date',
      'checkbox', 'url', 'email', 'phone', 'relation', 'formula', 'ai',
    ];
    for (const t of types) {
      expect(ColumnTypeSchema.parse(t)).toBe(t);
    }
  });

  it('rejects invalid type', () => {
    expect(() => ColumnTypeSchema.parse('image')).toThrow();
  });
});

describe('SelectOptionSchema', () => {
  it('parses option with color', () => {
    const result = SelectOptionSchema.parse({ id: '1', name: 'High', color: 'red' });
    expect(result.color).toBe('red');
  });

  it('parses option without color', () => {
    const result = SelectOptionSchema.parse({ id: '1', name: 'Low' });
    expect(result.color).toBeUndefined();
  });
});

describe('NumberFormatSchema', () => {
  it('accepts all formats', () => {
    for (const f of ['number', 'currency', 'percent', 'rating']) {
      expect(NumberFormatSchema.parse(f)).toBe(f);
    }
  });
});

describe('ColumnConfigSchema', () => {
  it('parses empty config (all optional)', () => {
    expect(ColumnConfigSchema.parse({})).toEqual({});
  });

  it('parses config with select options', () => {
    const result = ColumnConfigSchema.parse({
      selectOptions: [{ id: '1', name: 'A' }],
      numberFormat: 'currency',
      currencyCode: 'USD',
    });
    expect(result.selectOptions).toHaveLength(1);
  });

  it('rejects non-uuid relationDataSourceId', () => {
    expect(() =>
      ColumnConfigSchema.parse({ relationDataSourceId: 'not-uuid' }),
    ).toThrow();
  });
});

describe('TableColumnSchema', () => {
  it('parses valid column', () => {
    const result = TableColumnSchema.parse({
      id: 'col1',
      name: 'Title',
      type: 'text',
      order: 0,
    });
    expect(result.name).toBe('Title');
  });

  it('rejects empty name', () => {
    expect(() =>
      TableColumnSchema.parse({ id: 'col1', name: '', type: 'text', order: 0 }),
    ).toThrow();
  });

  it('rejects negative order', () => {
    expect(() =>
      TableColumnSchema.parse({ id: 'col1', name: 'X', type: 'text', order: -1 }),
    ).toThrow();
  });
});

describe('CellValueSchema', () => {
  it('accepts string', () => {
    expect(CellValueSchema.parse('hello')).toBe('hello');
  });

  it('accepts number', () => {
    expect(CellValueSchema.parse(42)).toBe(42);
  });

  it('accepts boolean', () => {
    expect(CellValueSchema.parse(true)).toBe(true);
  });

  it('accepts null', () => {
    expect(CellValueSchema.parse(null)).toBeNull();
  });

  it('accepts string array (multi_select)', () => {
    const result = CellValueSchema.parse(['a', 'b', 'c']);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('accepts date range object', () => {
    const result = CellValueSchema.parse({ start: '2024-01-01', end: null });
    expect(result).toEqual({ start: '2024-01-01', end: null });
  });

  it('accepts relation references array', () => {
    const result = CellValueSchema.parse([{ id: 'r1', display: 'Row 1' }]);
    expect(result).toEqual([{ id: 'r1', display: 'Row 1' }]);
  });
});

describe('TableRowSchema', () => {
  it('parses valid row', () => {
    const result = TableRowSchema.parse({
      id: 'row1',
      cells: { col1: 'value', col2: 42 },
      createdAt: now(),
      updatedAt: now(),
    });
    expect(result.cells['col1']).toBe('value');
  });

  it('rejects missing timestamps', () => {
    expect(() => TableRowSchema.parse({ id: 'row1', cells: {} })).toThrow();
  });
});

describe('FilterRuleSchema', () => {
  it('parses valid filter rule', () => {
    const result = FilterRuleSchema.parse({
      columnId: 'col1',
      operator: 'equals',
      value: 'test',
    });
    expect(result.operator).toBe('equals');
  });

  it('rejects invalid operator', () => {
    expect(() =>
      FilterRuleSchema.parse({ columnId: 'c', operator: 'like' }),
    ).toThrow();
  });
});

describe('FilterGroupSchema', () => {
  it('parses compound filter', () => {
    const result = FilterGroupSchema.parse({
      connector: 'and',
      rules: [
        { columnId: 'c1', operator: 'equals', value: 'x' },
        { columnId: 'c2', operator: 'is_empty' },
      ],
    });
    expect(result.rules).toHaveLength(2);
  });

  it('parses nested filter groups', () => {
    const result = FilterGroupSchema.parse({
      connector: 'or',
      rules: [
        {
          connector: 'and',
          rules: [{ columnId: 'c1', operator: 'equals', value: 'a' }],
        },
      ],
    });
    expect(result.connector).toBe('or');
  });

  it('rejects invalid connector', () => {
    expect(() =>
      FilterGroupSchema.parse({ connector: 'xor', rules: [] }),
    ).toThrow();
  });
});

describe('SortRuleSchema', () => {
  it('parses valid sort', () => {
    expect(SortRuleSchema.parse({ columnId: 'c1', direction: 'asc' })).toEqual({
      columnId: 'c1',
      direction: 'asc',
    });
  });

  it('rejects invalid direction', () => {
    expect(() => SortRuleSchema.parse({ columnId: 'c', direction: 'up' })).toThrow();
  });
});

describe('ViewTypeSchema', () => {
  it('accepts all view types', () => {
    for (const v of ['table', 'board', 'gallery', 'list', 'calendar']) {
      expect(ViewTypeSchema.parse(v)).toBe(v);
    }
  });
});

describe('DatabaseViewSchema', () => {
  it('parses minimal view', () => {
    const result = DatabaseViewSchema.parse({
      id: 'v1',
      name: 'Default',
      type: 'table',
    });
    expect(result.filters).toBeUndefined();
  });

  it('parses view with filters and sorts', () => {
    const result = DatabaseViewSchema.parse({
      id: 'v1',
      name: 'Filtered',
      type: 'board',
      filters: [{ columnId: 'c1', operator: 'equals', value: 'x' }],
      sorts: [{ columnId: 'c1', direction: 'desc' }],
      groupBy: 'status',
    });
    expect(result.filters).toHaveLength(1);
  });
});

describe('TableSchemaSchema', () => {
  it('parses schema with columns', () => {
    const result = TableSchemaSchema.parse({
      columns: [{ id: 'c1', name: 'Name', type: 'text', order: 0 }],
    });
    expect(result.columns).toHaveLength(1);
    expect(result.views).toBeUndefined();
  });

  it('parses schema with views and primaryColumnId', () => {
    const result = TableSchemaSchema.parse({
      columns: [{ id: 'c1', name: 'Name', type: 'text', order: 0 }],
      views: [{ id: 'v1', name: 'All', type: 'table' }],
      primaryColumnId: 'c1',
    });
    expect(result.primaryColumnId).toBe('c1');
  });
});

describe('TableContentSchema', () => {
  it('parses content with rows', () => {
    const result = TableContentSchema.parse({
      rows: [{ id: 'r1', cells: { c1: 'hi' }, createdAt: now(), updatedAt: now() }],
    });
    expect(result.rows).toHaveLength(1);
  });

  it('parses empty rows', () => {
    expect(TableContentSchema.parse({ rows: [] }).rows).toEqual([]);
  });
});

describe('AIDataRequestSchema (discriminated union)', () => {
  it('parses generate_schema request', () => {
    const result = AISchemaGenerateRequestSchema.parse({
      type: 'generate_schema',
      prompt: 'Create a task tracker',
    });
    expect(result.type).toBe('generate_schema');
  });

  it('parses autofill request', () => {
    const result = AIAutofillRequestSchema.parse({
      type: 'autofill',
      dataSourceId: uuid(),
      columnId: 'col1',
    });
    expect(result.type).toBe('autofill');
  });

  it('dispatches correctly via discriminated union', () => {
    const result = AIDataRequestSchema.parse({
      type: 'natural_language_query',
      dataSourceId: uuid(),
      query: 'Show overdue tasks',
    });
    expect(result.type).toBe('natural_language_query');
  });

  it('rejects unknown type in union', () => {
    expect(() =>
      AIDataRequestSchema.parse({ type: 'unknown_op', prompt: 'x' }),
    ).toThrow();
  });
});

describe('TemplateCategorySchema', () => {
  it('accepts valid categories', () => {
    expect(TemplateCategorySchema.parse('project_management')).toBe('project_management');
    expect(TemplateCategorySchema.parse('personal')).toBe('personal');
  });
});

describe('DatabaseTemplateSchema', () => {
  it('parses valid template', () => {
    const result = DatabaseTemplateSchema.parse({
      id: 'tpl1',
      name: 'Task Board',
      description: 'A simple task board',
      icon: '📋',
      category: 'project_management',
      columns: [{ id: 'c1', name: 'Title', type: 'text', order: 0 }],
    });
    expect(result.name).toBe('Task Board');
    expect(result.views).toBeUndefined();
  });
});

describe('NotionSyncConfigSchema', () => {
  it('parses valid config', () => {
    const result = NotionSyncConfigSchema.parse({
      notionDatabaseId: 'abc123',
      columnMapping: { col1: 'Name' },
      syncDirection: 'bidirectional',
      status: 'idle',
    });
    expect(result.syncDirection).toBe('bidirectional');
    expect(result.lastSyncedAt).toBeUndefined();
  });

  it('rejects invalid sync direction', () => {
    expect(() =>
      NotionSyncConfigSchema.parse({
        notionDatabaseId: 'x',
        columnMapping: {},
        syncDirection: 'one-way',
        status: 'idle',
      }),
    ).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() =>
      NotionSyncConfigSchema.parse({
        notionDatabaseId: 'x',
        columnMapping: {},
        syncDirection: 'import',
        status: 'broken',
      }),
    ).toThrow();
  });
});
