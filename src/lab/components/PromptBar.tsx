/**
 * PromptBar — Floating AI prompt bar for the pipeline canvas.
 *
 * Single-line input with model selector and submit button. The one place
 * to generate or edit widgets via AI. Styled with glassmorphism.
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { AIGenerator } from '../ai/ai-generator';
import type { AIModel } from '../ai/models';
import { AI_MODELS, getModelById, loadSavedModelId, saveModelId } from '../ai/models';

import { labPalette, SPRING, HEX, hexToRgb } from './shared/palette';

const [er, eg, eb] = hexToRgb(HEX.ember);

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface PromptBarProps {
  /** AI generator instance for dispatching prompts */
  generator?: AIGenerator;
  /** Called when a generated widget should be applied to the editor */
  onApplyCode?: (code: string) => void;
  /** Current editor content — used for "edit" vs "generate" mode */
  currentEditorContent?: string;
  /** Graph context string for pipeline-aware prompts */
  graphContext?: string;
  /** Callback to open the full AI thread panel */
  onExpandThread?: () => void;
  /** Whether the full AI thread panel is currently open */
  threadOpen?: boolean;
  /** Called when generation state changes (true = generating, false = done) */
  onGeneratingChange?: (generating: boolean) => void;
  /** Called with accumulated HTML as it streams in (for live preview) */
  onStreamChunk?: (partialHtml: string) => void;
  /** Called when streaming completes (success or error) */
  onStreamDone?: (error?: string | null) => void;
  /** Called when user submits a prompt (before generation). Opens the refinement overlay. */
  onPromptReady?: (prompt: string) => void;
}

// ═══════════════════════════════════════════════════════════════════
// Model Selector
// ═══════════════════════════════════════════════════════════════════

interface ModelSelectorProps {
  currentModel: AIModel;
  onSelect: (model: AIModel) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ currentModel, onSelect, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-label={`AI model: ${currentModel.name}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          fontSize: 11,
          fontWeight: 500,
          fontFamily: 'var(--sn-font-family)',
          color: labPalette.textMuted,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 6,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: `all 200ms ${SPRING}`,
          whiteSpace: 'nowrap',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentModel.name}
        </span>
        <span style={{ fontSize: 8, opacity: 0.5 }}>&#9662;</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select AI model"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 4,
            minWidth: 200,
            padding: 4,
            background: 'rgba(20,17,24,0.95)',
            backdropFilter: 'blur(20px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          {AI_MODELS.map((model) => {
            const isActive = model.id === currentModel.id;
            return (
              <button
                key={model.id}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onSelect(model);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: 12,
                  fontFamily: 'var(--sn-font-family)',
                  color: isActive ? labPalette.text : labPalette.textMuted,
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: `background 150ms ${SPRING}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget.style.background = 'rgba(255,255,255,0.04)');
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget.style.background = 'transparent');
                }}
              >
                <div>
                  <div style={{ fontWeight: isActive ? 600 : 400 }}>{model.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1 }}>{model.description}</div>
                </div>
                {isActive && (
                  <span style={{ fontSize: 10, color: HEX.ember, flexShrink: 0, marginLeft: 8 }}>&#10003;</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export const PromptBar: React.FC<PromptBarProps> = ({
  generator,
  onApplyCode,
  currentEditorContent,
  graphContext,
  onGeneratingChange,
  onStreamChunk,
  onStreamDone,
  onPromptReady,
}) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [currentModel, setCurrentModel] = useState<AIModel>(() => getModelById(loadSavedModelId()));
  const inputRef = useRef<HTMLInputElement>(null);

  const hasContent = currentEditorContent && currentEditorContent.trim().length > 0;

  const handleModelSelect = useCallback((model: AIModel) => {
    setCurrentModel(model);
    saveModelId(model.id);
    generator?.setModel(model.id);
  }, [generator]);

  // Sync generator model on mount
  useEffect(() => {
    generator?.setModel(currentModel.id);
  }, [generator, currentModel.id]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || generating) return;

    const userPrompt = prompt.trim();

    // If refinement overlay handler is provided, delegate to it instead of generating directly
    if (onPromptReady) {
      setPrompt('');
      onPromptReady(userPrompt);
      return;
    }

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div
      style={{ position: 'relative' }}
      role="search"
      aria-label="AI prompt bar"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 12,
          background: focused
            ? 'rgba(20,17,24,0.9)'
            : 'rgba(20,17,24,0.8)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          border: `1px solid ${focused ? `rgba(${er},${eg},${eb},0.25)` : 'rgba(255,255,255,0.06)'}`,
          boxShadow: focused
            ? `0 0 12px rgba(${er},${eg},${eb},0.08), 0 4px 24px rgba(0,0,0,0.3)`
            : '0 4px 24px rgba(0,0,0,0.25)',
          transition: `all 300ms ${SPRING}`,
        }}
      >
        {/* AI indicator dot */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            flexShrink: 0,
            background: generating
              ? HEX.ember
              : focused
                ? `rgba(${er},${eg},${eb},0.6)`
                : 'rgba(255,255,255,0.2)',
            boxShadow: generating
              ? `0 0 6px rgba(${er},${eg},${eb},0.4)`
              : 'none',
            animation: generating ? 'sn-ai-pulse 1.5s ease-in-out infinite' : undefined,
            transition: `all 300ms ${SPRING}`,
          }}
          aria-hidden="true"
        />

        {/* Model selector */}
        <ModelSelector
          currentModel={currentModel}
          onSelect={handleModelSelect}
          disabled={generating}
        />

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={
            generating
              ? `${currentModel.name} generating...`
              : hasContent
                ? 'Describe a change...'
                : 'Describe a widget...'
          }
          aria-label="AI prompt input"
          disabled={generating}
          style={{
            flex: 1,
            padding: '2px 0',
            fontSize: 13,
            fontFamily: 'var(--sn-font-family)',
            color: labPalette.text,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            opacity: generating ? 0.5 : 1,
            minWidth: 0,
            letterSpacing: '0.01em',
          }}
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || generating}
          aria-label={hasContent ? 'Apply AI edit' : 'Generate widget'}
          style={{
            padding: '6px 16px',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'var(--sn-font-family)',
            color: !prompt.trim() || generating ? labPalette.textMuted : '#fff',
            background: !prompt.trim() || generating
              ? 'rgba(255,255,255,0.04)'
              : HEX.ember,
            border: 'none',
            borderRadius: 8,
            cursor: generating ? 'wait' : 'pointer',
            transition: `all 200ms ${SPRING}`,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            boxShadow: prompt.trim() && !generating
              ? `0 0 8px rgba(${er},${eg},${eb},0.2)`
              : 'none',
          }}
        >
          {generating ? '...' : hasContent ? 'Edit' : 'Generate'}
        </button>
      </div>

      {/* Error toast */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 6,
            padding: '5px 12px',
            fontSize: 11,
            fontFamily: 'var(--sn-font-family)',
            color: labPalette.error,
            background: 'rgba(200,88,88,0.08)',
            border: '1px solid rgba(200,88,88,0.15)',
            borderRadius: 8,
            textAlign: 'center',
            animation: `sn-drift-up 250ms ${SPRING} both`,
            zIndex: 10,
          }}
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
};
