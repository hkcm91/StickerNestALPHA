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

export interface CompatibleWidget {
  name: string;
  ports: string[];
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
    contextLines.push('- Support dark mode styling');
  }
  if (toggles.emitEvents) {
    contextLines.push('- Emit events via the StickerNest event bus for pipeline integration');
  }

  // Selected widgets
  for (const widget of selectedWidgets) {
    const portInfo = widget.ports.length > 0
      ? ` (ports: ${widget.ports.join(', ')})`
      : '';
    contextLines.push(`- Connect with widget "${widget.name}"${portInfo}`);
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
