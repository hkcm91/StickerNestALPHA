import { describe, it, expect } from 'vitest';

import {
  NotionColorSchema,
  NotionRichTextSchema,
  NotionParentSchema,
  NotionPropertyValueSchema,
  NotionFilterConditionSchema,
  NotionFilterSchema,
  NotionSortSchema,
  NotionPageSchema,
  NotionDatabasePropertySchema,
  NotionDatabaseSchema,
  NotionQueryResponseSchema,
  NotionSearchResultSchema,
  NotionSearchResponseSchema,
  NotionQuerySchema,
  NotionPropertiesInputSchema,
  NotionMutationSchema,
} from './notion-integration';

describe('NotionColorSchema', () => {
  it('accepts all standard colors', () => {
    const colors = [
      'default', 'gray', 'brown', 'orange', 'yellow', 'green',
      'blue', 'purple', 'pink', 'red',
    ];
    for (const c of colors) {
      expect(NotionColorSchema.parse(c)).toBe(c);
    }
  });

  it('accepts background color variants', () => {
    expect(NotionColorSchema.parse('gray_background')).toBe('gray_background');
    expect(NotionColorSchema.parse('red_background')).toBe('red_background');
  });

  it('rejects invalid color', () => {
    expect(() => NotionColorSchema.parse('magenta')).toThrow();
  });
});

describe('NotionRichTextSchema', () => {
  it('parses minimal rich text', () => {
    const result = NotionRichTextSchema.parse({
      text: { content: 'Hello' },
    });
    expect(result.type).toBe('text');
    expect(result.text.content).toBe('Hello');
  });

  it('parses rich text with annotations', () => {
    const result = NotionRichTextSchema.parse({
      text: { content: 'Bold' },
      annotations: { bold: true, italic: false },
    });
    expect(result.annotations?.bold).toBe(true);
  });

  it('parses rich text with link', () => {
    const result = NotionRichTextSchema.parse({
      text: { content: 'Click', link: { url: 'https://example.com' } },
    });
    expect(result.text.link?.url).toBe('https://example.com');
  });

  it('rejects invalid link url', () => {
    expect(() =>
      NotionRichTextSchema.parse({
        text: { content: 'X', link: { url: 'not-a-url' } },
      }),
    ).toThrow();
  });

  it('applies default type of text', () => {
    const result = NotionRichTextSchema.parse({ text: { content: 'Hi' } });
    expect(result.type).toBe('text');
  });
});

describe('NotionParentSchema', () => {
  it('parses database_id parent', () => {
    const result = NotionParentSchema.parse({
      type: 'database_id',
      database_id: 'db-123',
    });
    expect(result.type).toBe('database_id');
  });

  it('parses page_id parent', () => {
    const result = NotionParentSchema.parse({
      type: 'page_id',
      page_id: 'pg-456',
    });
    expect(result.type).toBe('page_id');
  });

  it('parses workspace parent', () => {
    const result = NotionParentSchema.parse({
      type: 'workspace',
      workspace: true,
    });
    expect(result.type).toBe('workspace');
  });

  it('rejects invalid parent type', () => {
    expect(() => NotionParentSchema.parse({ type: 'block_id', block_id: 'x' })).toThrow();
  });
});

describe('NotionPropertyValueSchema', () => {
  it('parses title property', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'title',
      title: [{ text: { content: 'My Page' } }],
    });
    expect(result.type).toBe('title');
  });

  it('parses number property', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'number',
      number: 42,
    });
    expect(result.type).toBe('number');
  });

  it('parses null number property', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'number',
      number: null,
    });
    expect(result.type).toBe('number');
  });

  it('parses checkbox property', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'checkbox',
      checkbox: true,
    });
    expect(result.type).toBe('checkbox');
  });

  it('parses select property', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'select',
      select: { name: 'Option A', color: 'blue' },
    });
    expect(result.type).toBe('select');
  });

  it('parses null select property', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'select',
      select: null,
    });
    expect(result.type).toBe('select');
  });

  it('parses date property with range', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'date',
      date: { start: '2024-01-01', end: '2024-01-31' },
    });
    expect(result.type).toBe('date');
  });

  it('parses multi_select property', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'multi_select',
      multi_select: [{ name: 'Tag1' }, { name: 'Tag2', color: 'red' }],
    });
    expect(result.type).toBe('multi_select');
  });

  it('parses relation property', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'relation',
      relation: [{ id: 'page-1' }, { id: 'page-2' }],
    });
    expect(result.type).toBe('relation');
  });

  it('parses formula string property', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'formula',
      formula: { type: 'string', string: 'computed' },
    });
    expect(result.type).toBe('formula');
  });

  it('parses created_time property', () => {
    const result = NotionPropertyValueSchema.parse({
      type: 'created_time',
      created_time: '2024-01-01T00:00:00Z',
    });
    expect(result.type).toBe('created_time');
  });
});

describe('NotionFilterConditionSchema', () => {
  it('parses text filter', () => {
    const result = NotionFilterConditionSchema.parse({
      property: 'Name',
      contains: 'test',
    });
    expect(result.property).toBe('Name');
    expect(result.contains).toBe('test');
  });

  it('parses number filter', () => {
    const result = NotionFilterConditionSchema.parse({
      property: 'Amount',
      greater_than: 100,
    });
    expect(result.greater_than).toBe(100);
  });

  it('parses date filter', () => {
    const result = NotionFilterConditionSchema.parse({
      property: 'Due',
      before: '2024-12-31',
    });
    expect(result.before).toBe('2024-12-31');
  });

  it('parses checkbox filter', () => {
    const result = NotionFilterConditionSchema.parse({
      property: 'Done',
      checkbox: { equals: true },
    });
    expect(result.checkbox).toEqual({ equals: true });
  });
});

describe('NotionFilterSchema', () => {
  it('parses simple condition filter', () => {
    const result = NotionFilterSchema.parse({
      property: 'Name',
      contains: 'hello',
    });
    expect(result).toHaveProperty('property');
  });

  it('parses compound AND filter', () => {
    const result = NotionFilterSchema.parse({
      and: [
        { property: 'Name', contains: 'A' },
        { property: 'Status', is_not_empty: true },
      ],
    });
    expect(result).toHaveProperty('and');
  });

  it('parses compound OR filter', () => {
    const result = NotionFilterSchema.parse({
      or: [{ property: 'Priority', equals: 'High' }],
    });
    expect(result).toHaveProperty('or');
  });
});

describe('NotionSortSchema', () => {
  it('parses property sort', () => {
    const result = NotionSortSchema.parse({
      property: 'Name',
      direction: 'ascending',
    });
    expect(result.direction).toBe('ascending');
  });

  it('parses timestamp sort', () => {
    const result = NotionSortSchema.parse({
      timestamp: 'last_edited_time',
      direction: 'descending',
    });
    expect(result.timestamp).toBe('last_edited_time');
  });

  it('rejects invalid direction', () => {
    expect(() =>
      NotionSortSchema.parse({ property: 'X', direction: 'up' }),
    ).toThrow();
  });
});

describe('NotionQuerySchema', () => {
  it('parses search query', () => {
    const result = NotionQuerySchema.parse({
      type: 'search',
      query: 'meeting notes',
    });
    expect(result.type).toBe('search');
  });

  it('parses database.query', () => {
    const result = NotionQuerySchema.parse({
      type: 'database.query',
      database_id: 'db-123',
    });
    expect(result.type).toBe('database.query');
  });

  it('parses database.retrieve', () => {
    const result = NotionQuerySchema.parse({
      type: 'database.retrieve',
      database_id: 'db-123',
    });
    expect(result.type).toBe('database.retrieve');
  });

  it('parses page.retrieve', () => {
    const result = NotionQuerySchema.parse({
      type: 'page.retrieve',
      page_id: 'pg-456',
    });
    expect(result.type).toBe('page.retrieve');
  });

  it('parses databases.list', () => {
    const result = NotionQuerySchema.parse({
      type: 'databases.list',
      page_size: 10,
    });
    expect(result.type).toBe('databases.list');
  });

  it('rejects unknown query type', () => {
    expect(() =>
      NotionQuerySchema.parse({ type: 'unknown.action' }),
    ).toThrow();
  });
});

describe('NotionMutationSchema', () => {
  it('parses page.create mutation', () => {
    const result = NotionMutationSchema.parse({
      type: 'page.create',
      parent: { database_id: 'db-1' },
      properties: {
        Name: { title: [{ text: { content: 'New Page' } }] },
      },
    });
    expect(result.type).toBe('page.create');
  });

  it('parses page.update mutation', () => {
    const result = NotionMutationSchema.parse({
      type: 'page.update',
      page_id: 'pg-1',
      properties: {
        Status: { select: { name: 'Done' } },
      },
    });
    expect(result.type).toBe('page.update');
  });

  it('parses page.archive mutation', () => {
    const result = NotionMutationSchema.parse({
      type: 'page.archive',
      page_id: 'pg-1',
      archived: true,
    });
    expect(result.type).toBe('page.archive');
  });

  it('parses block.delete mutation', () => {
    const result = NotionMutationSchema.parse({
      type: 'block.delete',
      block_id: 'blk-1',
    });
    expect(result.type).toBe('block.delete');
  });

  it('parses blocks.children.append mutation', () => {
    const result = NotionMutationSchema.parse({
      type: 'blocks.children.append',
      block_id: 'pg-1',
      children: [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: 'Hello' } }],
          },
        },
      ],
    });
    expect(result.type).toBe('blocks.children.append');
  });

  it('rejects unknown mutation type', () => {
    expect(() =>
      NotionMutationSchema.parse({ type: 'comment.create' }),
    ).toThrow();
  });
});

describe('NotionPropertiesInputSchema', () => {
  it('parses title property input', () => {
    const result = NotionPropertiesInputSchema.parse({
      Name: { title: [{ text: { content: 'Test' } }] },
    });
    expect(result.Name).toBeDefined();
  });

  it('parses number property input', () => {
    const result = NotionPropertiesInputSchema.parse({
      Amount: { number: 42 },
    });
    expect(result.Amount).toEqual({ number: 42 });
  });

  it('parses checkbox property input', () => {
    const result = NotionPropertiesInputSchema.parse({
      Done: { checkbox: true },
    });
    expect(result.Done).toEqual({ checkbox: true });
  });

  it('parses date property input', () => {
    const result = NotionPropertiesInputSchema.parse({
      Due: { date: { start: '2024-06-01', end: null } },
    });
    expect(result.Due).toBeDefined();
  });

  it('parses relation property input', () => {
    const result = NotionPropertiesInputSchema.parse({
      Related: { relation: [{ id: 'page-1' }] },
    });
    expect(result.Related).toEqual({ relation: [{ id: 'page-1' }] });
  });
});

describe('NotionQueryResponseSchema', () => {
  it('parses valid query response with no results', () => {
    const result = NotionQueryResponseSchema.parse({
      object: 'list',
      results: [],
      next_cursor: null,
      has_more: false,
    });
    expect(result.results).toEqual([]);
    expect(result.has_more).toBe(false);
  });

  it('rejects wrong object type', () => {
    expect(() =>
      NotionQueryResponseSchema.parse({
        object: 'page',
        results: [],
        next_cursor: null,
        has_more: false,
      }),
    ).toThrow();
  });
});
