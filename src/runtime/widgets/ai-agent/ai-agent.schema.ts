/**
 * AI Agent Widget Schemas
 *
 * @module runtime/widgets/ai-agent
 * @layer L3
 */

import { z } from 'zod';

/**
 * A single message in the agent conversation.
 */
export const AgentMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number(),
});
export type AgentMessage = z.infer<typeof AgentMessageSchema>;

/**
 * Agent persona configuration (stored in widget config).
 */
export const AgentPersonaSchema = z.object({
  name: z.string().default('AI Agent'),
  role: z.string().default('General assistant'),
  systemInstructions: z.string().default('You are a helpful AI assistant.'),
  model: z.string().optional(),
});
export type AgentPersona = z.infer<typeof AgentPersonaSchema>;

/**
 * Max conversation history length before truncation.
 */
export const MAX_CONVERSATION_LENGTH = 100;

/**
 * Colors for the agent chat UI.
 */
export const AGENT_COLORS = {
  userBubble: 'var(--sn-accent, #4A90D9)',
  assistantBubble: 'var(--sn-surface, #f0f0f0)',
  userText: '#ffffff',
  assistantText: 'var(--sn-text, #1a1a1a)',
} as const;
