/**
 * Kanban Board Widget configuration schema.
 *
 * @module runtime/widgets/kanban
 */

import { z } from 'zod';

/**
 * Schema for a single Kanban card.
 */
export const kanbanCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  color: z.string().optional(),
  createdAt: z.number(),
});

/**
 * Schema for a single Kanban column.
 */
export const kanbanColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string().optional(),
  cards: z.array(kanbanCardSchema).default([]),
});

/**
 * Kanban Board Widget configuration schema.
 */
export const kanbanConfigSchema = z.object({
  /** Board title */
  boardTitle: z.string().default('My Board'),
  /** Whether to show card descriptions inline */
  showDescriptions: z.boolean().default(true),
  /** Whether to show card counts per column */
  showCardCounts: z.boolean().default(true),
  /** Maximum cards per column (0 = unlimited) */
  maxCardsPerColumn: z.number().default(0),
  /** Default columns for new boards */
  defaultColumns: z.array(z.string()).default(['To Do', 'In Progress', 'Done']),
});

/**
 * Inferred types.
 */
export type KanbanCard = z.infer<typeof kanbanCardSchema>;
export type KanbanColumn = z.infer<typeof kanbanColumnSchema>;
export type KanbanConfig = z.infer<typeof kanbanConfigSchema>;

/**
 * Default configuration.
 */
export const DEFAULT_KANBAN_CONFIG: KanbanConfig = kanbanConfigSchema.parse({});

/**
 * Parse and validate kanban config with defaults.
 */
export function parseKanbanConfig(raw: unknown): KanbanConfig {
  return kanbanConfigSchema.parse(raw);
}

/**
 * Safe parse variant that returns the default on failure.
 */
export function safeParseKanbanConfig(raw: unknown): KanbanConfig {
  const result = kanbanConfigSchema.safeParse(raw);
  return result.success ? result.data : DEFAULT_KANBAN_CONFIG;
}
