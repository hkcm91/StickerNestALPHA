/**
 * AI Chat types — message, response variants, and context info
 * for the conversational AI Assistant.
 *
 * @module shell/data
 * @layer L6
 */

export type AIMessageRole = 'user' | 'assistant';

export type AIResponseVariant =
  | 'text'
  | 'schema-preview'
  | 'column-card'
  | 'fill-summary'
  | 'query-result'
  | 'extract-result';

export interface AIChatMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  timestamp: number;
  variant?: AIResponseVariant;
  /** Structured payload for rich response cards */
  payload?: unknown;
  /** Whether the action has been applied */
  applied?: boolean;
}

export interface AIContextInfo {
  tableName?: string;
  columnCount: number;
  rowCount: number;
}
