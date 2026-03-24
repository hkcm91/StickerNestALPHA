/**
 * Prompt Questions — clarifying question generation and enriched prompt assembly
 *
 * Supports the prompt refinement overlay that appears before AI widget generation.
 * Uses the existing AIGenerator to ask clarifying questions and assembles enriched
 * prompts from multiple context sources (toggles, selected widgets, Q&A).
 *
 * @module lab/ai
 * @layer L2
 */

import type { AIGenerator } from './ai-generator';

// ---------- Types ----------

export interface PortContract {
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface CompatibleWidget {
  name: string;
  widgetId?: string;
  ports: string[];
  portContracts: {
    emits: PortContract[];
    subscribes: PortContract[];
  };
  compatibility: 'high' | 'partial' | 'none';
}

export interface PromptToggles {
  interactive: boolean;
  darkMode: boolean;
  emitEvents: boolean;
}

export interface EnrichedPromptInput {
  originalPrompt: string;
  answers: Record<string, string>;
  selectedWidgets: CompatibleWidget[];
  toggles: PromptToggles;
}

// ---------- Clarifying Questions ----------

const CLARIFYING_SYSTEM_PROMPT =
  'You are a widget design assistant. Given the user\'s widget idea, ask exactly 3 clarifying questions ' +
  'that would help you build a better widget. Format your response as a numbered list (1. 2. 3.). ' +
  'Keep questions concise and focused on design, functionality, and user interaction.';

/**
 * Calls `generator.explain()` with a system prompt asking for 3 clarifying
 * questions about the user's widget prompt. Parses the numbered response
 * into an array of strings. Returns empty array if generator is busy or
 * the call fails.
 */
export async function generateClarifyingQuestions(
  generator: AIGenerator,
  prompt: string,
): Promise<string[]> {
  if (generator.isGenerating()) {
    return [];
  }

  try {
    const result = await generator.explain(CLARIFYING_SYSTEM_PROMPT, prompt);

    if (result.error || !result.text) {
      return [];
    }

    return parseNumberedQuestions(result.text);
  } catch {
    return [];
  }
}

/**
 * Parse a numbered list (e.g. "1. Question?\n2. Question?") into an array of strings.
 */
function parseNumberedQuestions(text: string): string[] {
  const lines = text.split('\n');
  const questions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines starting with a digit followed by . or )
    const match = trimmed.match(/^\d+[.)]\s*(.+)/);
    if (match) {
      const question = match[1].trim();
      if (question) {
        questions.push(question);
      }
    }
  }

  return questions;
}

// ---------- Enriched Prompt Builder ----------

/**
 * Assembles a final prompt from the original prompt plus additional context
 * (toggles, selected widgets, Q&A answers).
 *
 * Format: original prompt, then "Additional context:" section with bullet
 * points for active toggles, selected widgets, and non-empty Q&A.
 * If no additional context exists, returns just the original prompt.
 */
export function buildEnrichedPrompt(input: EnrichedPromptInput): string {
  const { originalPrompt, answers, selectedWidgets, toggles } = input;
  const contextLines: string[] = [];

  // Toggles
  if (toggles.interactive) {
    contextLines.push('- Make it interactive with user input controls');
  }
  if (toggles.darkMode) {
    contextLines.push('- Dark mode: support theme tokens (--sn-bg, --sn-text, etc.)');
  }
  if (toggles.emitEvents) {
    contextLines.push('- Emit events via the StickerNest event bus for pipeline integration');
  }

  // Selected widgets — inject structured port contracts for AI awareness
  for (const widget of selectedWidgets) {
    const { portContracts } = widget;
    const hasContracts = portContracts.emits.length > 0 || portContracts.subscribes.length > 0;

    if (hasContracts) {
      contextLines.push(`--- CONNECT TO: "${widget.name}" ---`);
      for (const port of portContracts.emits) {
        const schemaStr = port.schema ? ` (payload: ${JSON.stringify(port.schema)})` : '';
        contextLines.push(`  Emits: ${port.name}${schemaStr}`);
        contextLines.push(`  YOUR WIDGET MUST subscribe to "${port.name}" with a matching event port.`);
      }
      for (const port of portContracts.subscribes) {
        const schemaStr = port.schema ? ` (payload: ${JSON.stringify(port.schema)})` : '';
        contextLines.push(`  Subscribes to: ${port.name}${schemaStr}`);
        contextLines.push(`  YOUR WIDGET MUST emit "${port.name}" with a matching event port.`);
      }
      contextLines.push('---');
    } else {
      contextLines.push(`- Connect with widget "${widget.name}"`);
    }
  }

  // Q&A answers (skip empty)
  for (const [question, answer] of Object.entries(answers)) {
    if (answer.trim()) {
      contextLines.push(`- Q: ${question} A: ${answer}`);
    }
  }

  if (contextLines.length === 0) {
    return originalPrompt;
  }

  return `${originalPrompt}\n\nAdditional context:\n${contextLines.join('\n')}`;
}

// ---------- Compatibility Heuristic ----------

/**
 * Computes a rough compatibility indicator between a user prompt and
 * a widget's port contracts. Used for green/yellow/red dots in the
 * PromptRefinement overlay.
 *
 * - `'none'` — widget has zero ports (no I/O)
 * - `'high'` — any port name or the widget name appears in the prompt
 * - `'partial'` — widget has ports but no textual overlap with the prompt
 */
export function computeCompatibility(
  prompt: string,
  widget: Pick<CompatibleWidget, 'name' | 'portContracts'>,
): 'high' | 'partial' | 'none' {
  const allPorts = [...widget.portContracts.emits, ...widget.portContracts.subscribes];

  if (allPorts.length === 0) {
    return 'none';
  }

  const lower = prompt.toLowerCase();

  // Check if the widget name appears in the prompt
  if (lower.includes(widget.name.toLowerCase())) {
    return 'high';
  }

  // Check if any port name appears in the prompt
  for (const port of allPorts) {
    if (port.name && lower.includes(port.name.toLowerCase())) {
      return 'high';
    }
  }

  return 'partial';
}
