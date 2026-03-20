/**
 * PromptBar — Inline AI prompt bar for the Creator Mode toolbar.
 *
 * Always-visible one-line input field. On submit, dispatches to the AI
 * generator and applies the result. Has expand button to open the full
 * AI thread panel. Styled with glassmorphism consistent with GlassPanel.
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useRef, useState } from 'react';

import type { AIGenerator } from '../ai/ai-generator';

import { labPalette, SPRING } from './shared/palette';

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
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export const PromptBar: React.FC<PromptBarProps> = ({
  generator,
  onApplyCode,
  currentEditorContent,
  graphContext,
  onExpandThread,
  threadOpen = false,
}) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasContent = currentEditorContent && currentEditorContent.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || !generator || generating) return;

    setGenerating(true);
    setError(null);

    const userPrompt = prompt.trim();
    setPrompt('');

    try {
      // If there is existing editor content, treat as an edit request
      const fullPrompt = hasContent
        ? `Edit this widget:\n\`\`\`html\n${currentEditorContent}\n\`\`\`\n\nChanges requested: ${userPrompt}`
        : userPrompt;

      const result = await generator.generate(fullPrompt, graphContext);

      if (result.isValid && result.html && onApplyCode) {
        onApplyCode(result.html);
      } else if (!result.isValid) {
        setError(result.errors[0] ?? 'Generation failed');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setGenerating(false);
    }
  }, [prompt, generator, generating, hasContent, currentEditorContent, graphContext, onApplyCode]);

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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
      }}
      role="search"
      aria-label="AI prompt bar"
    >
      {/* Input container with glassmorphism */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 10,
          background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${focused ? 'rgba(78,123,142,0.25)' : 'rgba(255,255,255,0.06)'}`,
          boxShadow: focused
            ? '0 0 8px rgba(78,123,142,0.12), 0 2px 8px rgba(0,0,0,0.2)'
            : '0 2px 8px rgba(0,0,0,0.2)',
          transition: `all 300ms ${SPRING}`,
          minWidth: 220,
          maxWidth: 360,
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
              ? labPalette.ember
              : 'rgba(78,123,142,0.5)',
            boxShadow: generating
              ? '0 0 6px rgba(232,128,108,0.4)'
              : '0 0 4px rgba(78,123,142,0.2)',
            animation: generating ? 'sn-ai-pulse 1.5s ease-in-out infinite' : undefined,
          }}
          aria-hidden="true"
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
              ? 'Generating...'
              : hasContent
                ? 'Describe a change...'
                : 'Describe a widget...'
          }
          aria-label="AI prompt input"
          disabled={generating}
          style={{
            flex: 1,
            padding: '4px 0',
            fontSize: 12,
            fontFamily: 'var(--sn-font-family)',
            color: labPalette.text,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            opacity: generating ? 0.5 : 1,
            minWidth: 0,
          }}
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || generating}
          aria-label={hasContent ? 'Apply AI edit' : 'Generate widget'}
          style={{
            padding: '3px 10px',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'var(--sn-font-family)',
            color: '#fff',
            background: generating
              ? 'rgba(232,128,108,0.15)'
              : labPalette.ember,
            border: 'none',
            borderRadius: 6,
            cursor: generating ? 'wait' : 'pointer',
            opacity: !prompt.trim() || generating ? 0.4 : 1,
            transition: `all 200ms ${SPRING}`,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {generating ? '...' : hasContent ? 'Edit' : 'Go'}
        </button>
      </div>

      {/* Expand button — opens full AI thread panel */}
      <button
        onClick={onExpandThread}
        aria-label={threadOpen ? 'Close AI thread' : 'Open AI thread'}
        aria-expanded={threadOpen}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: `1px solid ${threadOpen ? 'rgba(78,123,142,0.25)' : 'rgba(255,255,255,0.06)'}`,
          background: threadOpen
            ? 'rgba(78,123,142,0.12)'
            : 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: threadOpen ? labPalette.storm : labPalette.textMuted,
          fontSize: 14,
          lineHeight: 1,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: `all 200ms ${SPRING}`,
          flexShrink: 0,
          padding: 0,
        }}
      >
        {/* Chat bubble icon (Unicode) */}
        <span aria-hidden="true" style={{ fontSize: 13 }}>
          {threadOpen ? '\u00D7' : '\u2759'}
        </span>
      </button>

      {/* Error toast — brief inline indicator */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            padding: '4px 10px',
            fontSize: 10,
            fontFamily: 'var(--sn-font-family)',
            color: labPalette.error,
            background: 'rgba(200,88,88,0.08)',
            border: '1px solid rgba(200,88,88,0.15)',
            borderRadius: 6,
            whiteSpace: 'nowrap',
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
