/**
 * Notion Integration Schemas
 *
 * @module @sn/types/notion-integration
 *
 * @remarks
 * Defines the typed interface for widgets to interact with Notion
 * via the integration proxy. Widgets never receive Notion credentials —
 * all calls are proxied through the host.
 */

import { z } from 'zod';

// =============================================================================
// Notion Common Types
// =============================================================================

/**
 * Notion color options
 */
export const NotionColorSchema = z.enum([
  'default',
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
  'gray_background',
  'brown_background',
  'orange_background',
  'yellow_background',
  'green_background',
  'blue_background',
  'purple_background',
  'pink_background',
  'red_background',
]);

export type NotionColor = z.infer<typeof NotionColorSchema>;

/**
 * Rich text object (simplified)
 */
export const NotionRichTextSchema = z.object({
  type: z.literal('text').default('text'),
  text: z.object({
    content: z.string(),
    link: z.object({ url: z.string().url() }).optional(),
  }),
  annotations: z
    .object({
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      strikethrough: z.boolean().optional(),
      underline: z.boolean().optional(),
      code: z.boolean().optional(),
      color: NotionColorSchema.optional(),
    })
    .optional(),
  plain_text: z.string().optional(),
});

export type NotionRichText = z.infer<typeof NotionRichTextSchema>;

/**
 * Notion parent reference
 */
export const NotionParentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('database_id'),
    database_id: z.string(),
  }),
  z.object({
    type: z.literal('page_id'),
    page_id: z.string(),
  }),
  z.object({
    type: z.literal('workspace'),
    workspace: z.literal(true),
  }),
]);

export type NotionParent = z.infer<typeof NotionParentSchema>;

// =============================================================================
// Notion Property Types (for database rows)
// =============================================================================

export const NotionPropertyValueSchema = z.discriminatedUnion('type', [
  // Title
  z.object({
    type: z.literal('title'),
    title: z.array(NotionRichTextSchema),
  }),
  // Rich text
  z.object({
    type: z.literal('rich_text'),
    rich_text: z.array(NotionRichTextSchema),
  }),
  // Number
  z.object({
    type: z.literal('number'),
    number: z.number().nullable(),
  }),
  // Select
  z.object({
    type: z.literal('select'),
    select: z
      .object({
        id: z.string().optional(),
        name: z.string(),
        color: NotionColorSchema.optional(),
      })
      .nullable(),
  }),
  // Multi-select
  z.object({
    type: z.literal('multi_select'),
    multi_select: z.array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        color: NotionColorSchema.optional(),
      }),
    ),
  }),
  // Date
  z.object({
    type: z.literal('date'),
    date: z
      .object({
        start: z.string(),
        end: z.string().nullable().optional(),
        time_zone: z.string().nullable().optional(),
      })
      .nullable(),
  }),
  // Checkbox
  z.object({
    type: z.literal('checkbox'),
    checkbox: z.boolean(),
  }),
  // URL
  z.object({
    type: z.literal('url'),
    url: z.string().nullable(),
  }),
  // Email
  z.object({
    type: z.literal('email'),
    email: z.string().nullable(),
  }),
  // Phone
  z.object({
    type: z.literal('phone_number'),
    phone_number: z.string().nullable(),
  }),
  // Status
  z.object({
    type: z.literal('status'),
    status: z
      .object({
        id: z.string().optional(),
        name: z.string(),
        color: NotionColorSchema.optional(),
      })
      .nullable(),
  }),
  // People
  z.object({
    type: z.literal('people'),
    people: z.array(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        avatar_url: z.string().optional(),
      }),
    ),
  }),
  // Files
  z.object({
    type: z.literal('files'),
    files: z.array(
      z.object({
        name: z.string(),
        type: z.enum(['file', 'external']),
        url: z.string().optional(),
      }),
    ),
  }),
  // Relation
  z.object({
    type: z.literal('relation'),
    relation: z.array(z.object({ id: z.string() })),
  }),
  // Rollup
  z.object({
    type: z.literal('rollup'),
    rollup: z.object({
      type: z.enum(['number', 'date', 'array']),
      number: z.number().nullable().optional(),
      date: z
        .object({
          start: z.string(),
          end: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
      array: z.array(z.unknown()).optional(),
    }),
  }),
  // Formula
  z.object({
    type: z.literal('formula'),
    formula: z.discriminatedUnion('type', [
      z.object({ type: z.literal('string'), string: z.string().nullable() }),
      z.object({ type: z.literal('number'), number: z.number().nullable() }),
      z.object({ type: z.literal('boolean'), boolean: z.boolean().nullable() }),
      z.object({
        type: z.literal('date'),
        date: z
          .object({
            start: z.string(),
            end: z.string().nullable().optional(),
          })
          .nullable(),
      }),
    ]),
  }),
  // Created time
  z.object({
    type: z.literal('created_time'),
    created_time: z.string(),
  }),
  // Last edited time
  z.object({
    type: z.literal('last_edited_time'),
    last_edited_time: z.string(),
  }),
]);

export type NotionPropertyValue = z.infer<typeof NotionPropertyValueSchema>;

// =============================================================================
// Notion Filter Types
// =============================================================================

export const NotionFilterConditionSchema = z.object({
  property: z.string(),
  // Common filter conditions
  equals: z.unknown().optional(),
  does_not_equal: z.unknown().optional(),
  contains: z.string().optional(),
  does_not_contain: z.string().optional(),
  starts_with: z.string().optional(),
  ends_with: z.string().optional(),
  is_empty: z.boolean().optional(),
  is_not_empty: z.boolean().optional(),
  // Number filters
  greater_than: z.number().optional(),
  greater_than_or_equal_to: z.number().optional(),
  less_than: z.number().optional(),
  less_than_or_equal_to: z.number().optional(),
  // Date filters
  before: z.string().optional(),
  after: z.string().optional(),
  on_or_before: z.string().optional(),
  on_or_after: z.string().optional(),
  past_week: z.object({}).optional(),
  past_month: z.object({}).optional(),
  past_year: z.object({}).optional(),
  next_week: z.object({}).optional(),
  next_month: z.object({}).optional(),
  next_year: z.object({}).optional(),
  // Checkbox
  checkbox: z.object({ equals: z.boolean() }).optional(),
  // Select
  select: z.object({ equals: z.string() }).optional(),
  multi_select: z.object({ contains: z.string() }).optional(),
});

export type NotionFilterCondition = z.infer<typeof NotionFilterConditionSchema>;

export const NotionFilterSchema: z.ZodType<NotionFilter> = z.lazy(() =>
  z.union([
    NotionFilterConditionSchema,
    z.object({
      and: z.array(NotionFilterSchema),
    }),
    z.object({
      or: z.array(NotionFilterSchema),
    }),
  ]),
);

export type NotionFilter =
  | NotionFilterCondition
  | { and: NotionFilter[] }
  | { or: NotionFilter[] };

// =============================================================================
// Notion Sort Types
// =============================================================================

export const NotionSortSchema = z.object({
  property: z.string().optional(),
  timestamp: z.enum(['created_time', 'last_edited_time']).optional(),
  direction: z.enum(['ascending', 'descending']),
});

export type NotionSort = z.infer<typeof NotionSortSchema>;

// =============================================================================
// Notion Page Schema (returned from queries)
// =============================================================================

export const NotionPageSchema = z.object({
  object: z.literal('page'),
  id: z.string(),
  created_time: z.string(),
  last_edited_time: z.string(),
  created_by: z.object({ id: z.string() }),
  last_edited_by: z.object({ id: z.string() }),
  parent: NotionParentSchema,
  archived: z.boolean(),
  properties: z.record(z.string(), NotionPropertyValueSchema),
  url: z.string(),
  icon: z
    .object({
      type: z.enum(['emoji', 'external', 'file']),
      emoji: z.string().optional(),
      external: z.object({ url: z.string() }).optional(),
      file: z.object({ url: z.string() }).optional(),
    })
    .nullable()
    .optional(),
  cover: z
    .object({
      type: z.enum(['external', 'file']),
      external: z.object({ url: z.string() }).optional(),
      file: z.object({ url: z.string() }).optional(),
    })
    .nullable()
    .optional(),
});

export type NotionPage = z.infer<typeof NotionPageSchema>;

// =============================================================================
// Notion Database Schema
// =============================================================================

export const NotionDatabasePropertySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  // Type-specific configuration
  select: z
    .object({
      options: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: NotionColorSchema,
        }),
      ),
    })
    .optional(),
  multi_select: z
    .object({
      options: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: NotionColorSchema,
        }),
      ),
    })
    .optional(),
  status: z
    .object({
      options: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: NotionColorSchema,
        }),
      ),
      groups: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: NotionColorSchema,
          option_ids: z.array(z.string()),
        }),
      ),
    })
    .optional(),
  relation: z
    .object({
      database_id: z.string(),
      synced_property_name: z.string().optional(),
    })
    .optional(),
  rollup: z
    .object({
      relation_property_name: z.string(),
      relation_property_id: z.string(),
      rollup_property_name: z.string(),
      rollup_property_id: z.string(),
      function: z.string(),
    })
    .optional(),
  formula: z.object({ expression: z.string() }).optional(),
  number: z.object({ format: z.string() }).optional(),
});

export type NotionDatabaseProperty = z.infer<typeof NotionDatabasePropertySchema>;

export const NotionDatabaseSchema = z.object({
  object: z.literal('database'),
  id: z.string(),
  created_time: z.string(),
  last_edited_time: z.string(),
  title: z.array(NotionRichTextSchema),
  description: z.array(NotionRichTextSchema),
  properties: z.record(z.string(), NotionDatabasePropertySchema),
  parent: NotionParentSchema,
  url: z.string(),
  archived: z.boolean(),
  is_inline: z.boolean().optional(),
  icon: z
    .object({
      type: z.enum(['emoji', 'external', 'file']),
      emoji: z.string().optional(),
    })
    .nullable()
    .optional(),
  cover: z
    .object({
      type: z.enum(['external', 'file']),
      external: z.object({ url: z.string() }).optional(),
    })
    .nullable()
    .optional(),
});

export type NotionDatabase = z.infer<typeof NotionDatabaseSchema>;

// =============================================================================
// Query Response Schema
// =============================================================================

export const NotionQueryResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(NotionPageSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});

export type NotionQueryResponse = z.infer<typeof NotionQueryResponseSchema>;

// =============================================================================
// Search Response Schema
// =============================================================================

export const NotionSearchResultSchema = z.discriminatedUnion('object', [
  NotionPageSchema,
  NotionDatabaseSchema,
]);

export type NotionSearchResult = z.infer<typeof NotionSearchResultSchema>;

export const NotionSearchResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(NotionSearchResultSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});

export type NotionSearchResponse = z.infer<typeof NotionSearchResponseSchema>;

// =============================================================================
// Notion Query Types (Discriminated Union for Widget SDK)
// =============================================================================

/**
 * All possible query request shapes for the Notion integration.
 * Widgets call: StickerNest.integration('notion').query(params)
 */
export const NotionQuerySchema = z.discriminatedUnion('type', [
  // Search across all accessible content
  z.object({
    type: z.literal('search'),
    query: z.string().optional(),
    filter: z
      .object({
        property: z.literal('object'),
        value: z.enum(['page', 'database']),
      })
      .optional(),
    sort: z
      .object({
        direction: z.enum(['ascending', 'descending']),
        timestamp: z.literal('last_edited_time'),
      })
      .optional(),
    page_size: z.number().int().min(1).max(100).optional(),
    start_cursor: z.string().optional(),
  }),

  // Query a database
  z.object({
    type: z.literal('database.query'),
    database_id: z.string(),
    filter: NotionFilterSchema.optional(),
    sorts: z.array(NotionSortSchema).optional(),
    page_size: z.number().int().min(1).max(100).optional(),
    start_cursor: z.string().optional(),
  }),

  // Get database schema/structure
  z.object({
    type: z.literal('database.retrieve'),
    database_id: z.string(),
  }),

  // Get a single page
  z.object({
    type: z.literal('page.retrieve'),
    page_id: z.string(),
  }),

  // Get page content (blocks)
  z.object({
    type: z.literal('blocks.children.list'),
    block_id: z.string(),
    page_size: z.number().int().min(1).max(100).optional(),
    start_cursor: z.string().optional(),
  }),

  // List all databases the user has access to
  z.object({
    type: z.literal('databases.list'),
    page_size: z.number().int().min(1).max(100).optional(),
    start_cursor: z.string().optional(),
  }),
]);

export type NotionQuery = z.infer<typeof NotionQuerySchema>;

// =============================================================================
// Notion Mutation Types (Discriminated Union for Widget SDK)
// =============================================================================

/**
 * Properties input for creating/updating pages
 */
export const NotionPropertiesInputSchema = z.record(
  z.string(),
  z.union([
    // Title
    z.object({
      title: z.array(
        z.object({
          text: z.object({ content: z.string() }),
        }),
      ),
    }),
    // Rich text
    z.object({
      rich_text: z.array(
        z.object({
          text: z.object({ content: z.string() }),
        }),
      ),
    }),
    // Number
    z.object({ number: z.number().nullable() }),
    // Select
    z.object({ select: z.object({ name: z.string() }).nullable() }),
    // Multi-select
    z.object({ multi_select: z.array(z.object({ name: z.string() })) }),
    // Date
    z.object({
      date: z
        .object({
          start: z.string(),
          end: z.string().nullable().optional(),
        })
        .nullable(),
    }),
    // Checkbox
    z.object({ checkbox: z.boolean() }),
    // URL
    z.object({ url: z.string().nullable() }),
    // Email
    z.object({ email: z.string().nullable() }),
    // Phone
    z.object({ phone_number: z.string().nullable() }),
    // Status
    z.object({ status: z.object({ name: z.string() }).nullable() }),
    // Relation
    z.object({ relation: z.array(z.object({ id: z.string() })) }),
  ]),
);

export type NotionPropertiesInput = z.infer<typeof NotionPropertiesInputSchema>;

/**
 * All possible mutation request shapes for the Notion integration.
 * Widgets call: StickerNest.integration('notion').mutate(params)
 */
export const NotionMutationSchema = z.discriminatedUnion('type', [
  // Create a page in a database
  z.object({
    type: z.literal('page.create'),
    parent: z.object({ database_id: z.string() }),
    properties: NotionPropertiesInputSchema,
    icon: z
      .object({
        type: z.literal('emoji'),
        emoji: z.string(),
      })
      .optional(),
    cover: z
      .object({
        type: z.literal('external'),
        external: z.object({ url: z.string().url() }),
      })
      .optional(),
  }),

  // Update page properties
  z.object({
    type: z.literal('page.update'),
    page_id: z.string(),
    properties: NotionPropertiesInputSchema,
    archived: z.boolean().optional(),
    icon: z
      .object({
        type: z.literal('emoji'),
        emoji: z.string(),
      })
      .nullable()
      .optional(),
    cover: z
      .object({
        type: z.literal('external'),
        external: z.object({ url: z.string().url() }),
      })
      .nullable()
      .optional(),
  }),

  // Archive/unarchive a page
  z.object({
    type: z.literal('page.archive'),
    page_id: z.string(),
    archived: z.boolean(),
  }),

  // Append blocks to a page (add content)
  z.object({
    type: z.literal('blocks.children.append'),
    block_id: z.string(),
    children: z.array(
      z.object({
        type: z.string(),
        // Block-type specific content
        paragraph: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
          })
          .optional(),
        heading_1: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
          })
          .optional(),
        heading_2: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
          })
          .optional(),
        heading_3: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
          })
          .optional(),
        bulleted_list_item: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
          })
          .optional(),
        numbered_list_item: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
          })
          .optional(),
        to_do: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
            checked: z.boolean(),
          })
          .optional(),
        toggle: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
          })
          .optional(),
        code: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
            language: z.string(),
          })
          .optional(),
        quote: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
          })
          .optional(),
        divider: z.object({}).optional(),
        callout: z
          .object({
            rich_text: z.array(
              z.object({
                type: z.literal('text'),
                text: z.object({ content: z.string() }),
              }),
            ),
            icon: z
              .object({
                type: z.literal('emoji'),
                emoji: z.string(),
              })
              .optional(),
          })
          .optional(),
      }),
    ),
  }),

  // Update a block
  z.object({
    type: z.literal('block.update'),
    block_id: z.string(),
    archived: z.boolean().optional(),
    // Block-type specific updates
    paragraph: z
      .object({
        rich_text: z.array(
          z.object({
            type: z.literal('text'),
            text: z.object({ content: z.string() }),
          }),
        ),
      })
      .optional(),
    to_do: z
      .object({
        checked: z.boolean(),
      })
      .optional(),
  }),

  // Delete a block
  z.object({
    type: z.literal('block.delete'),
    block_id: z.string(),
  }),
]);

export type NotionMutation = z.infer<typeof NotionMutationSchema>;

// =============================================================================
// JSON Schema Exports
// =============================================================================

export const NotionPageJSONSchema = NotionPageSchema.toJSONSchema();
export const NotionDatabaseJSONSchema = NotionDatabaseSchema.toJSONSchema();
export const NotionQueryResponseJSONSchema = NotionQueryResponseSchema.toJSONSchema();
