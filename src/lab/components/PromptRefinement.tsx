/**
 * PromptRefinement — Centered glass modal overlay for enriching AI generation prompts.
 *
 * Appears before widget generation to let the creator refine their prompt with
 * clarifying questions, compatible widget selection, and quick toggles.
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { AIGenerator } from '../ai/ai-generator';
import {
  buildEnrichedPrompt,
  generateClarifyingQuestions,
  type CompatibleWidget,
  type PromptToggles,
} from '../ai/prompt-questions';

import { GlassPanel } from './shared';
import { HEX, labPalette, SPRING } from './shared/palette';

// ─── Types ───────────────────────────────────────────────────────────

export interface PromptRefinementProps {
  initialPrompt: string;
  generator: AIGenerator;
  compatibleWidgets: CompatibleWidget[];
  onGenerate: (enrichedPrompt: string, selectedWidgets: CompatibleWidget[]) => void;
  onCancel: () => void;
}

// ─── Shimmer Keyframe (injected once) ────────────────────────────────

const SHIMMER_STYLE_ID = 'sn-prompt-refinement-shimmer';

function ensureShimmerKeyframe(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SHIMMER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SHIMMER_STYLE_ID;
  style.textContent = `
    @keyframes sn-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Sub-components ──────────────────────────────────────────────────

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: labPalette.textMuted,
  marginBottom: 8,
};

function ShimmerLine({ width }: { width: string }) {
  return (
    <div
      style={{
        height: 14,
        width,
        borderRadius: 4,
        background: `linear-gradient(90deg, ${labPalette.surfaceRaised} 25%, rgba(255,255,255,0.06) 50%, ${labPalette.surfaceRaised} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'sn-shimmer 1.5s ease-in-out infinite',
        marginBottom: 10,
      }}
    />
  );
}

function TogglePill({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        padding: '5px 14px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        border: `1px solid ${active ? labPalette.storm : labPalette.border}`,
        background: active ? labPalette.storm : 'transparent',
        color: active ? '#fff' : labPalette.textSoft,
        cursor: 'pointer',
        transition: `all 250ms ${SPRING}`,
        outline: 'none',
      }}
    >
      {label}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export const PromptRefinement: React.FC<PromptRefinementProps> = ({
  initialPrompt,
  generator,
  compatibleWidgets,
  onGenerate,
  onCancel,
}) => {
  // State
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedWidgets, setSelectedWidgets] = useState<Set<number>>(new Set());
  const [questions, setQuestions] = useState<string[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [toggles, setToggles] = useState<PromptToggles>({
    interactive: false,
    darkMode: false,
    emitEvents: false,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inject shimmer keyframe on mount
  useEffect(() => {
    ensureShimmerKeyframe();
  }, []);

  // Auto-focus textarea
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Load clarifying questions on mount
  useEffect(() => {
    let cancelled = false;
    setQuestionsLoading(true);
    generateClarifyingQuestions(generator, initialPrompt).then((qs) => {
      if (!cancelled) {
        setQuestions(qs);
        setQuestionsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [generator, initialPrompt]);

  // Submit handler
  const handleGenerate = useCallback(() => {
    const selectedList = Array.from(selectedWidgets).map(
      (i) => compatibleWidgets[i],
    );
    const enriched = buildEnrichedPrompt({
      originalPrompt: prompt,
      answers,
      selectedWidgets: selectedList,
      toggles,
    });
    onGenerate(enriched, selectedList);
  }, [prompt, selectedWidgets, compatibleWidgets, answers, toggles, onGenerate]);

  // Keyboard handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleGenerate();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, handleGenerate]);

  // Toggle widget selection
  const toggleWidget = useCallback((index: number) => {
    setSelectedWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Toggle option pills
  const toggleOption = useCallback((key: keyof PromptToggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Set answer for a question
  const setAnswer = useCallback((question: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [question]: value }));
  }, []);

  return (
    // Backdrop
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'sn-fade-in 200ms ease-out',
      }}
    >
      {/* Card */}
      <GlassPanel
        glowColor={HEX.ember}
        role="dialog"
        aria-label="Refine your prompt"
        style={{
          maxWidth: 520,
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          animation: `sn-drift-up 300ms ${SPRING}`,
        }}
      >
        <div style={{ padding: '20px 24px 0' }}>
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: labPalette.text,
              }}
            >
              Refine your prompt
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12,
                color: labPalette.textMuted,
              }}
            >
              Add context before generating &middot; Ctrl+Enter to generate
            </p>
          </div>

          {/* 1. Prompt textarea */}
          <div style={{ marginBottom: 18 }}>
            <label style={sectionLabelStyle}>PROMPT</label>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                background: labPalette.surfaceRaised,
                border: `1px solid ${labPalette.border}`,
                borderRadius: 8,
                padding: '10px 12px',
                color: labPalette.text,
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                transition: `border-color 200ms ${SPRING}`,
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = labPalette.storm;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor =
                  'var(--sn-border, rgba(255,255,255,0.06))';
              }}
            />
          </div>

          {/* 2. Compatible widgets (conditional) */}
          {compatibleWidgets.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <label style={sectionLabelStyle}>CONNECT TO WIDGETS</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {compatibleWidgets.map((widget, i) => (
                  <label
                    key={widget.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: labPalette.textSoft,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWidgets.has(i)}
                      onChange={() => toggleWidget(i)}
                      style={{ accentColor: HEX.storm }}
                    />
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background:
                          widget.compatibility === 'high' ? '#5AA878'
                          : widget.compatibility === 'partial' ? '#E8B86C'
                          : '#666',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1 }}>{widget.name}</span>
                    {widget.ports.length > 0 && (
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: labPalette.textMuted,
                          textAlign: 'right',
                        }}
                      >
                        {widget.ports.join(', ')}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 3. AI clarifying questions */}
          <div style={{ marginBottom: 18 }}>
            <label style={sectionLabelStyle}>QUICK QUESTIONS</label>
            {questionsLoading ? (
              <div>
                <ShimmerLine width="90%" />
                <ShimmerLine width="75%" />
                <ShimmerLine width="82%" />
              </div>
            ) : questions.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: labPalette.textMuted,
                  margin: 0,
                }}
              >
                No additional questions
              </p>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {questions.map((q) => (
                  <div key={q}>
                    <p
                      style={{
                        fontSize: 12,
                        color: labPalette.textSoft,
                        margin: '0 0 4px',
                      }}
                    >
                      {q}
                    </p>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={answers[q] ?? ''}
                      onChange={(e) => setAnswer(q, e.target.value)}
                      style={{
                        width: '100%',
                        background: labPalette.surfaceRaised,
                        border: `1px solid ${labPalette.border}`,
                        borderRadius: 6,
                        padding: '7px 10px',
                        color: labPalette.text,
                        fontSize: 12,
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: `border-color 200ms ${SPRING}`,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = labPalette.storm;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          'var(--sn-border, rgba(255,255,255,0.06))';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Quick toggles */}
          <div style={{ marginBottom: 16 }}>
            <label style={sectionLabelStyle}>OPTIONS</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <TogglePill
                label="Interactive"
                active={toggles.interactive}
                onToggle={() => toggleOption('interactive')}
              />
              <TogglePill
                label="Dark mode"
                active={toggles.darkMode}
                onToggle={() => toggleOption('darkMode')}
              />
              <TogglePill
                label="Emit events"
                active={toggles.emitEvents}
                onToggle={() => toggleOption('emitEvents')}
              />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 24px',
            borderTop: `1px solid ${labPalette.border}`,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '7px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: `1px solid ${labPalette.border}`,
              background: 'transparent',
              color: labPalette.textSoft,
              cursor: 'pointer',
              transition: `all 200ms ${SPRING}`,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            style={{
              padding: '7px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: labPalette.ember,
              color: '#fff',
              cursor: 'pointer',
              boxShadow: `0 0 12px rgba(232,128,108,0.3), 0 0 24px rgba(232,128,108,0.15)`,
              transition: `all 200ms ${SPRING}`,
            }}
          >
            Generate
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};
