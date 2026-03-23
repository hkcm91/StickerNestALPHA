# Prompt Refinement Pop-out Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a centered glass overlay that appears after the user enters a prompt, letting them refine it with AI-generated questions, compatible widget selection, quick toggles, and an expanded textarea before firing generation.

**Architecture:** The PromptBar intercepts Enter to emit a pending prompt instead of generating. A new `PromptRefinement` overlay mounts in `CanvasView`, collects additional context, and assembles an enriched prompt. A new `prompt-questions.ts` module makes a lightweight AI call via the existing `AIGenerator.explain()` method to generate clarifying questions.

**Tech Stack:** React, existing `AIGenerator`, existing `AIGraphContext`, existing lab palette/GlassPanel

---

### Task 1: Create the AI question generator module

**Files:**
- Create: `src/lab/ai/prompt-questions.ts`
- Test: `src/lab/ai/prompt-questions.test.ts`

**Step 1: Write the failing test**

```ts
// src/lab/ai/prompt-questions.test.ts
import { describe, it, expect, vi } from 'vitest';
import { generateClarifyingQuestions, buildEnrichedPrompt } from './prompt-questions';
import type { AIGenerator } from './ai-generator';

describe('prompt-questions', () => {
  describe('generateClarifyingQuestions', () => {
    it('returns parsed questions from AI response', async () => {
      const mockGenerator: Partial<AIGenerator> = {
        explain: vi.fn().mockResolvedValue({
          text: '1. What data format should the widget display?\n2. Should it update in real-time?\n3. What size should it be?',
          error: null,
        }),
        isGenerating: vi.fn().mockReturnValue(false),
      };

      const questions = await generateClarifyingQuestions(
        mockGenerator as AIGenerator,
        'Create a data dashboard widget',
      );

      expect(questions).toHaveLength(3);
      expect(questions[0]).toContain('data format');
    });

    it('returns empty array on error', async () => {
      const mockGenerator: Partial<AIGenerator> = {
        explain: vi.fn().mockResolvedValue({ text: '', error: 'fail' }),
        isGenerating: vi.fn().mockReturnValue(false),
      };

      const questions = await generateClarifyingQuestions(
        mockGenerator as AIGenerator,
        'anything',
      );

      expect(questions).toEqual([]);
    });

    it('returns empty array when generator is busy', async () => {
      const mockGenerator: Partial<AIGenerator> = {
        isGenerating: vi.fn().mockReturnValue(true),
      };

      const questions = await generateClarifyingQuestions(
        mockGenerator as AIGenerator,
        'anything',
      );

      expect(questions).toEqual([]);
    });
  });

  describe('buildEnrichedPrompt', () => {
    it('assembles prompt from all context sources', () => {
      const result = buildEnrichedPrompt({
        originalPrompt: 'Create a timer widget',
        answers: { 'What format?': 'countdown' },
        selectedWidgets: [{ name: 'Clock', ports: 'emits: tick' }],
        toggles: { interactive: true, darkMode: false, emitEvents: true },
      });

      expect(result).toContain('Create a timer widget');
      expect(result).toContain('countdown');
      expect(result).toContain('Clock');
      expect(result).toContain('Interactive');
      expect(result).toContain('Emit events');
      expect(result).not.toContain('Dark mode');
    });

    it('omits empty sections', () => {
      const result = buildEnrichedPrompt({
        originalPrompt: 'Simple widget',
        answers: {},
        selectedWidgets: [],
        toggles: { interactive: false, darkMode: false, emitEvents: false },
      });

      expect(result).toBe('Simple widget');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lab/ai/prompt-questions.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```ts
// src/lab/ai/prompt-questions.ts
/**
 * Prompt Questions — Generates clarifying questions and assembles enriched prompts.
 *
 * Uses the existing AIGenerator.explain() method with a short system prompt
 * to generate 2-3 clarifying questions about a widget prompt.
 *
 * @module lab/ai
 * @layer L2
 */

import type { AIGenerator } from './ai-generator';

const QUESTION_PROMPT = `You are helping a user refine their widget creation prompt. Based on their description, generate exactly 3 short clarifying questions that would help create a better widget. Each question should be on its own line, numbered 1-3. Keep questions under 15 words each. Focus on: data format, interactivity, visual style, or integration needs.`;

/**
 * Asks the AI to generate 2-3 clarifying questions about the user's prompt.
 * Returns an empty array if the generator is busy or the call fails.
 */
export async function generateClarifyingQuestions(
  generator: AIGenerator,
  prompt: string,
): Promise<string[]> {
  if (generator.isGenerating()) return [];

  try {
    const result = await generator.explain(QUESTION_PROMPT, prompt);
    if (result.error || !result.text) return [];

    return result.text
      .split('\n')
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);
  } catch {
    return [];
  }
}

export interface CompatibleWidget {
  name: string;
  ports: string;
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

/**
 * Assembles the final enriched prompt from all refinement context.
 * Only includes non-empty sections.
 */
export function buildEnrichedPrompt(input: EnrichedPromptInput): string {
  const parts: string[] = [input.originalPrompt];
  const context: string[] = [];

  // Toggles
  if (input.toggles.interactive) context.push('Interactive: widget should respond to user input');
  if (input.toggles.darkMode) context.push('Dark mode: support theme tokens (--sn-bg, --sn-text, etc.)');
  if (input.toggles.emitEvents) context.push('Emit events: widget should emit events to the pipeline');

  // Compatible widgets
  for (const w of input.selectedWidgets) {
    context.push(`Wire to "${w.name}" (${w.ports})`);
  }

  // AI Q&A
  for (const [question, answer] of Object.entries(input.answers)) {
    if (answer.trim()) {
      context.push(`Q: ${question} A: ${answer.trim()}`);
    }
  }

  if (context.length > 0) {
    parts.push('');
    parts.push('Additional context:');
    for (const line of context) {
      parts.push(`- ${line}`);
    }
  }

  return parts.join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lab/ai/prompt-questions.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat(lab): add prompt questions module for AI-generated clarifying questions
```

---

### Task 2: Create the PromptRefinement overlay component

**Files:**
- Create: `src/lab/components/PromptRefinement.tsx`

**Step 1: Write the component**

This is the centered glass overlay with four sections. Key implementation notes:
- Uses `GlassPanel` for the card surface
- Uses `labPalette`, `SPRING`, `HEX`, `hexToRgb` from `./shared/palette`
- Calls `generateClarifyingQuestions` on mount, shows shimmer while loading
- Compatible widgets are derived from the `orphanedPorts` prop (computed by parent)
- Escape key and backdrop click dismiss
- Cmd/Ctrl+Enter submits

```tsx
// src/lab/components/PromptRefinement.tsx
/**
 * PromptRefinement — Centered glass overlay for refining AI prompts.
 *
 * Appears after the user enters a prompt in the PromptBar. Shows:
 * 1. Prompt refinement textarea (pre-filled)
 * 2. Compatible widgets from the pipeline (checkboxes)
 * 3. AI-generated clarifying questions (with shimmer loading)
 * 4. Quick toggles (interactive, dark mode, emit events)
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { AIGenerator } from '../ai/ai-generator';
import type { CompatibleWidget, PromptToggles } from '../ai/prompt-questions';
import { buildEnrichedPrompt, generateClarifyingQuestions } from '../ai/prompt-questions';

import { GlassPanel } from './shared';
import { labPalette, SPRING, HEX, hexToRgb } from './shared/palette';

const [er, eg, eb] = hexToRgb(HEX.ember);
const [sr, sg, sb] = hexToRgb(HEX.storm);

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface PromptRefinementProps {
  /** The initial prompt from the PromptBar */
  initialPrompt: string;
  /** AI generator instance for clarifying questions */
  generator: AIGenerator;
  /** Compatible widgets from the pipeline graph */
  compatibleWidgets: CompatibleWidget[];
  /** Called with the enriched prompt when user confirms */
  onGenerate: (enrichedPrompt: string) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// Shimmer placeholder for loading questions
// ═══════════════════════════════════════════════════════════════════

const ShimmerLine: React.FC<{ width: string; delay?: number }> = ({ width, delay = 0 }) => (
  <div style={{
    height: 14,
    width,
    borderRadius: 4,
    background: `linear-gradient(90deg, rgba(${sr},${sg},${sb},0.08) 0%, rgba(${sr},${sg},${sb},0.15) 50%, rgba(${sr},${sg},${sb},0.08) 100%)`,
    backgroundSize: '200% 100%',
    animation: `sn-shimmer 1.5s ease-in-out infinite ${delay}ms`,
    marginBottom: 8,
  }} />
);

// ═══════════════════════════════════════════════════════════════════
// Toggle Pill
// ═══════════════════════════════════════════════════════════════════

const TogglePill: React.FC<{
  label: string;
  active: boolean;
  onToggle: () => void;
}> = ({ label, active, onToggle }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '5px 14px',
        fontSize: 11,
        fontWeight: 500,
        fontFamily: 'var(--sn-font-family)',
        color: active ? labPalette.text : labPalette.textMuted,
        background: active
          ? `rgba(${sr},${sg},${sb},0.15)`
          : hovered
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.02)',
        border: `1px solid ${active ? `rgba(${sr},${sg},${sb},0.25)` : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 20,
        cursor: 'pointer',
        transition: `all 200ms ${SPRING}`,
        outline: 'none',
      }}
    >
      {label}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export const PromptRefinement: React.FC<PromptRefinementProps> = ({
  initialPrompt,
  generator,
  compatibleWidgets,
  onGenerate,
  onCancel,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [questions, setQuestions] = useState<string[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedWidgets, setSelectedWidgets] = useState<Set<number>>(new Set());
  const [toggles, setToggles] = useState<PromptToggles>({
    interactive: false,
    darkMode: false,
    emitEvents: false,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load AI questions on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const qs = await generateClarifyingQuestions(generator, initialPrompt);
      if (!cancelled) {
        setQuestions(qs);
        setQuestionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [generator, initialPrompt]);

  // Auto-focus textarea
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  // Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  // Backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel();
  }, [onCancel]);

  // Submit
  const handleGenerate = useCallback(() => {
    const selected = Array.from(selectedWidgets).map((i) => compatibleWidgets[i]);
    const enriched = buildEnrichedPrompt({
      originalPrompt: prompt,
      answers,
      selectedWidgets: selected,
      toggles,
    });
    onGenerate(enriched);
  }, [prompt, answers, selectedWidgets, compatibleWidgets, toggles, onGenerate]);

  // Cmd/Ctrl+Enter to submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  const toggleWidget = useCallback((index: number) => {
    setSelectedWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const setToggle = useCallback((key: keyof PromptToggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setAnswer = useCallback((question: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [question]: value }));
  }, []);

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        animation: `sn-fade-in 200ms ${SPRING} both`,
      }}
    >
      <GlassPanel
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '80vh',
          overflow: 'auto',
          padding: 0,
          animation: `sn-drift-up 300ms ${SPRING} both`,
        }}
        glowColor={HEX.ember}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: labPalette.text,
            fontFamily: 'var(--sn-font-family)',
          }}>
            Refine your prompt
          </div>
          <div style={{
            fontSize: 11,
            color: labPalette.textMuted,
            fontFamily: 'var(--sn-font-family)',
            marginTop: 2,
          }}>
            Add context before generating &middot; <span style={{ opacity: 0.6 }}>Ctrl+Enter to generate</span>
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. Prompt textarea */}
          <div>
            <label style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase' as const, color: labPalette.textMuted,
              fontFamily: 'var(--sn-font-family)', display: 'block', marginBottom: 6,
            }}>
              Prompt
            </label>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                fontFamily: 'var(--sn-font-family)',
                color: labPalette.text,
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 2. Compatible widgets (conditional) */}
          {compatibleWidgets.length > 0 && (
            <div>
              <label style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase' as const, color: labPalette.textMuted,
                fontFamily: 'var(--sn-font-family)', display: 'block', marginBottom: 6,
              }}>
                Wire to pipeline widgets
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {compatibleWidgets.map((w, i) => (
                  <label
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                      background: selectedWidgets.has(i) ? `rgba(${sr},${sg},${sb},0.08)` : 'transparent',
                      transition: `background 150ms ${SPRING}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWidgets.has(i)}
                      onChange={() => toggleWidget(i)}
                      style={{ accentColor: HEX.storm }}
                    />
                    <span style={{
                      fontSize: 12, color: labPalette.text,
                      fontFamily: 'var(--sn-font-family)',
                    }}>
                      {w.name}
                    </span>
                    <span style={{
                      fontSize: 10, color: labPalette.textFaint,
                      fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
                      marginLeft: 'auto',
                    }}>
                      {w.ports}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 3. AI clarifying questions */}
          <div>
            <label style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase' as const, color: labPalette.textMuted,
              fontFamily: 'var(--sn-font-family)', display: 'block', marginBottom: 6,
            }}>
              Quick questions
            </label>
            {questionsLoading ? (
              <div>
                <ShimmerLine width="85%" />
                <ShimmerLine width="70%" delay={200} />
                <ShimmerLine width="60%" delay={400} />
              </div>
            ) : questions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {questions.map((q, i) => (
                  <div key={i}>
                    <div style={{
                      fontSize: 12, color: labPalette.textSoft,
                      fontFamily: 'var(--sn-font-family)', marginBottom: 4,
                    }}>
                      {q}
                    </div>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={answers[q] ?? ''}
                      onChange={(e) => setAnswer(q, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: 12,
                        fontFamily: 'var(--sn-font-family)',
                        color: labPalette.text,
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 6,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontSize: 11, color: labPalette.textFaint, fontStyle: 'italic',
              }}>
                No additional questions
              </div>
            )}
          </div>

          {/* 4. Quick toggles */}
          <div>
            <label style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase' as const, color: labPalette.textMuted,
              fontFamily: 'var(--sn-font-family)', display: 'block', marginBottom: 6,
            }}>
              Options
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <TogglePill label="Interactive" active={toggles.interactive} onToggle={() => setToggle('interactive')} />
              <TogglePill label="Dark mode" active={toggles.darkMode} onToggle={() => setToggle('darkMode')} />
              <TogglePill label="Emit events" active={toggles.emitEvents} onToggle={() => setToggle('emitEvents')} />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '12px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--sn-font-family)',
              color: labPalette.textMuted,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              cursor: 'pointer',
              transition: `all 200ms ${SPRING}`,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            style={{
              padding: '8px 20px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--sn-font-family)',
              color: '#fff',
              background: HEX.ember,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: `all 200ms ${SPRING}`,
              boxShadow: `0 0 8px rgba(${er},${eg},${eb},0.25)`,
            }}
          >
            Generate
          </button>
        </div>
      </GlassPanel>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes sn-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};
```

**Step 2: Run typecheck**

Run: `npm run typecheck 2>&1 | grep -i 'PromptRefinement'`
Expected: No errors for this file

**Step 3: Commit**

```
feat(lab): add PromptRefinement overlay component
```

---

### Task 3: Wire PromptBar to open the refinement overlay

**Files:**
- Modify: `src/lab/components/PromptBar.tsx` — intercept Enter to emit pending prompt
- Modify: `src/lab/components/views/CanvasView.tsx` — accept and mount refinement overlay
- Modify: `src/lab/components/LabPage.tsx` — manage refinement state and derive compatible widgets

**Step 1: Modify PromptBar**

In `PromptBar.tsx`, add a new prop `onPromptReady` and change `handleSubmit` to call it instead of generating directly:

Add to `PromptBarProps`:
```ts
/** Called when user submits a prompt (before generation). Opens the refinement overlay. */
onPromptReady?: (prompt: string) => void;
```

Replace `handleSubmit` logic: when `onPromptReady` is provided, call `onPromptReady(prompt)` instead of `generator.generate()`. The existing generation path remains as a fallback when `onPromptReady` is not provided.

New `handleSubmit`:
```ts
const handleSubmit = useCallback(async () => {
  if (!prompt.trim() || generating) return;

  const userPrompt = prompt.trim();

  // If refinement callback exists, open the refinement overlay instead of generating
  if (onPromptReady) {
    setPrompt('');
    onPromptReady(userPrompt);
    return;
  }

  // Fallback: direct generation (when refinement overlay is not wired)
  if (!generator) return;

  setGenerating(true);
  onGeneratingChange?.(true);
  setError(null);
  setPrompt('');

  try {
    const fullPrompt = hasContent
      ? `Edit this widget:\n\`\`\`html\n${currentEditorContent}\n\`\`\`\n\nChanges requested: ${userPrompt}`
      : userPrompt;

    const result = await generator.generate(fullPrompt, graphContext);

    if (result.isValid && result.html) {
      onStreamChunk?.(result.html);
      onStreamDone?.(null);
      onApplyCode?.(result.html);
    } else if (!result.isValid) {
      const errMsg = result.errors[0] ?? 'Generation failed';
      setError(errMsg);
      onStreamDone?.(errMsg);
    } else {
      onStreamDone?.(null);
    }
  } catch {
    setError('Something went wrong');
    onStreamDone?.('Something went wrong');
  } finally {
    setGenerating(false);
    onGeneratingChange?.(false);
  }
}, [prompt, generator, generating, hasContent, currentEditorContent, graphContext, onApplyCode, onGeneratingChange, onStreamChunk, onStreamDone, onPromptReady]);
```

**Step 2: Modify CanvasView**

In `CanvasView.tsx`, add a `refinementOverlay` slot prop:

```ts
export interface CanvasViewProps {
  debugMode: boolean;
  graphSlot?: React.ReactNode;
  promptBar?: React.ReactNode;
  streamingPreview?: React.ReactNode;
  /** Prompt refinement overlay — rendered over the canvas */
  refinementOverlay?: React.ReactNode;
}
```

Mount it in the render, right before the prompt bar:
```tsx
{/* Prompt refinement overlay */}
{refinementOverlay}
```

**Step 3: Modify LabPage**

In `LabPage.tsx` (`LabContent` component):

Add state:
```ts
const [pendingRefinementPrompt, setPendingRefinementPrompt] = useState<string | null>(null);
```

Derive compatible widgets from graph context:
```ts
import type { CompatibleWidget } from '../ai/prompt-questions';

const compatibleWidgets: CompatibleWidget[] = useMemo(() => {
  if (graphNodes.length === 0) return [];
  return graphNodes
    .filter((n) => n.type === 'widget')
    .map((n) => ({
      name: n.label,
      ports: [
        ...n.inputPorts.map((p) => `subscribes: ${p.name}`),
        ...n.outputPorts.map((p) => `emits: ${p.name}`),
      ].join(', ') || 'no ports',
    }));
}, [graphNodes]);
```

Add handlers:
```ts
const handlePromptReady = useCallback((prompt: string) => {
  setPendingRefinementPrompt(prompt);
}, []);

const handleRefinementGenerate = useCallback(async (enrichedPrompt: string) => {
  setPendingRefinementPrompt(null);
  // Fire generation with the enriched prompt
  if (!instances.aiGenerator) return;
  handleGeneratingChange(true);
  try {
    const result = await instances.aiGenerator.generate(enrichedPrompt, graphContext);
    if (result.isValid && result.html) {
      handleStreamChunk(result.html);
      handleStreamDone(null);
      handleApplyCode(result.html);
    } else {
      handleStreamDone(result.errors[0] ?? 'Generation failed');
    }
  } catch {
    handleStreamDone('Something went wrong');
  } finally {
    handleGeneratingChange(false);
  }
}, [instances, graphContext, handleGeneratingChange, handleStreamChunk, handleStreamDone, handleApplyCode]);

const handleRefinementCancel = useCallback(() => {
  setPendingRefinementPrompt(null);
}, []);
```

Pass `onPromptReady={handlePromptReady}` to the `PromptBar`.

Pass the refinement overlay to `CanvasView`:
```tsx
import { PromptRefinement } from './PromptRefinement';

refinementOverlay={
  pendingRefinementPrompt ? (
    <PromptRefinement
      initialPrompt={pendingRefinementPrompt}
      generator={instances.aiGenerator}
      compatibleWidgets={compatibleWidgets}
      onGenerate={handleRefinementGenerate}
      onCancel={handleRefinementCancel}
    />
  ) : undefined
}
```

**Step 4: Run typecheck**

Run: `npm run typecheck 2>&1 | grep -E 'PromptBar|PromptRefinement|CanvasView|LabPage'`
Expected: No new errors

**Step 5: Run tests**

Run: `npx vitest run src/lab/`
Expected: All lab tests pass

**Step 6: Commit**

```
feat(lab): wire prompt refinement overlay into PromptBar → CanvasView → LabPage
```

---

### Task 4: Add test for PromptRefinement component

**Files:**
- Create: `src/lab/components/PromptRefinement.test.tsx`

**Step 1: Write tests**

```tsx
// src/lab/components/PromptRefinement.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromptRefinement } from './PromptRefinement';
import type { AIGenerator } from '../ai/ai-generator';

function mockGenerator(questions: string[] = []): AIGenerator {
  return {
    explain: vi.fn().mockResolvedValue({
      text: questions.join('\n'),
      error: null,
    }),
    isGenerating: vi.fn().mockReturnValue(false),
    generate: vi.fn(),
    generateStream: vi.fn(),
    cancel: vi.fn(),
    getLastResult: vi.fn().mockReturnValue(null),
    setModel: vi.fn(),
    getModel: vi.fn().mockReturnValue({ id: 'test', name: 'Test', provider: 'anthropic', description: '' }),
  };
}

describe('PromptRefinement', () => {
  const defaultProps = {
    initialPrompt: 'Create a timer widget',
    compatibleWidgets: [],
    onGenerate: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders with prompt pre-filled', () => {
    render(<PromptRefinement {...defaultProps} generator={mockGenerator()} />);
    const textarea = screen.getByDisplayValue('Create a timer widget');
    expect(textarea).toBeTruthy();
  });

  it('shows shimmer while questions load', () => {
    render(<PromptRefinement {...defaultProps} generator={mockGenerator()} />);
    expect(screen.getByText('Quick questions')).toBeTruthy();
  });

  it('shows AI questions after loading', async () => {
    const gen = mockGenerator(['What format?', 'How big?']);
    render(<PromptRefinement {...defaultProps} generator={gen} />);

    await waitFor(() => {
      expect(screen.getByText('What format?')).toBeTruthy();
      expect(screen.getByText('How big?')).toBeTruthy();
    });
  });

  it('calls onCancel when Cancel clicked', () => {
    const onCancel = vi.fn();
    render(<PromptRefinement {...defaultProps} onCancel={onCancel} generator={mockGenerator()} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onGenerate with enriched prompt', () => {
    const onGenerate = vi.fn();
    render(<PromptRefinement {...defaultProps} onGenerate={onGenerate} generator={mockGenerator()} />);
    fireEvent.click(screen.getByText('Generate'));
    expect(onGenerate).toHaveBeenCalledWith(expect.stringContaining('Create a timer widget'));
  });

  it('shows compatible widgets when provided', () => {
    render(
      <PromptRefinement
        {...defaultProps}
        compatibleWidgets={[{ name: 'Clock', ports: 'emits: tick' }]}
        generator={mockGenerator()}
      />,
    );
    expect(screen.getByText('Clock')).toBeTruthy();
    expect(screen.getByText('emits: tick')).toBeTruthy();
  });

  it('hides compatible widgets section when empty', () => {
    render(<PromptRefinement {...defaultProps} generator={mockGenerator()} />);
    expect(screen.queryByText('Wire to pipeline widgets')).toBeNull();
  });

  it('shows toggle pills', () => {
    render(<PromptRefinement {...defaultProps} generator={mockGenerator()} />);
    expect(screen.getByText('Interactive')).toBeTruthy();
    expect(screen.getByText('Dark mode')).toBeTruthy();
    expect(screen.getByText('Emit events')).toBeTruthy();
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/lab/components/PromptRefinement.test.tsx`
Expected: PASS

**Step 3: Commit**

```
test(lab): add PromptRefinement overlay tests
```

---

### Task 5: Run full verification

**Step 1: Typecheck**

Run: `npm run typecheck`

**Step 2: All lab tests**

Run: `npx vitest run src/lab/`

**Step 3: Visual verification**

Run: `npm run dev` → navigate to `/lab` → type a prompt → hit Enter → verify pop-out appears

**Step 4: Final commit (if any fixes needed)**

```
fix(lab): address review feedback on prompt refinement
```
