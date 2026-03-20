/**
 * AIThread — Conversational thread panel for AI Companion.
 *
 * Slides up from bottom-right as a frosted glass panel.
 * Contains message thread, prompt input, generate/edit buttons.
 *
 * @module lab/components/LabAI
 * @layer L2
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { AIGenerator } from '../../ai/ai-generator';
import { labPalette, SPRING } from '../shared/palette';

import { AIMessage } from './AIMessage';
import type { AIMessageData } from './AIMessage';

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface AIThreadProps {
  generator?: AIGenerator;
  onApplyCode?: (code: string) => void;
  onClose?: () => void;
  currentEditorContent?: string;
  graphContext?: string;
  pendingPrompt?: string | null;
  onPendingPromptConsumed?: () => void;
}

export const AIThread: React.FC<AIThreadProps> = ({
  generator,
  onApplyCode,
  onClose,
  currentEditorContent,
  graphContext,
  pendingPrompt,
  onPendingPromptConsumed,
}) => {
  const [messages, setMessages] = useState<AIMessageData[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !generator || generating) return;

    const userMsg: AIMessageData = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setGenerating(true);

    try {
      const result = await generator.generate(prompt.trim(), graphContext);

      const assistantMsg: AIMessageData = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.isValid
          ? 'Here\'s the generated widget:'
          : `Generation had issues: ${result.errors.join(', ')}`,
        codeBlock: result.html || undefined,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: AIMessageData = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Something went wrong during generation.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setGenerating(false);
    }
  }, [prompt, generator, generating, graphContext]);

  const handleEdit = useCallback(async () => {
    if (!prompt.trim() || !generator || generating || !currentEditorContent) return;

    const editPrompt = `Edit this widget:\n\`\`\`html\n${currentEditorContent}\n\`\`\`\n\nChanges requested: ${prompt.trim()}`;

    const userMsg: AIMessageData = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: `Edit: ${prompt.trim()}`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setGenerating(true);

    try {
      const result = await generator.generate(editPrompt, graphContext);

      const assistantMsg: AIMessageData = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.isValid
          ? 'Here\'s the edited widget:'
          : `Edit had issues: ${result.errors.join(', ')}`,
        codeBlock: result.html || undefined,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: AIMessageData = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Something went wrong during editing.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setGenerating(false);
    }
  }, [prompt, generator, generating, currentEditorContent, graphContext]);

  // ─── Explain / ask about the graph ──────────────────────────────
  const handleExplain = useCallback(async (question: string) => {
    if (!generator || generating || !graphContext) return;

    const userMsg: AIMessageData = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setGenerating(true);

    try {
      const result = await generator.explain(graphContext, question);
      const assistantMsg: AIMessageData = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.error ? `Error: ${result.error}` : result.text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Something went wrong.',
        timestamp: Date.now(),
      }]);
    } finally {
      setGenerating(false);
    }
  }, [generator, generating, graphContext]);

  // ─── Handle pending prompt from external trigger ────────────────
  useEffect(() => {
    if (pendingPrompt && generator && !generating) {
      handleExplain(pendingPrompt);
      onPendingPromptConsumed?.();
    }
  }, [pendingPrompt, generator, generating, handleExplain, onPendingPromptConsumed]);

  const hasGraphNodes = graphContext && graphContext.includes('nodes');

  return (
    <div style={{
      width: 360, height: 480,
      display: 'flex', flexDirection: 'column',
      background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 12px rgba(176,208,216,0.06)',
      animation: `sn-drift-up 350ms ${SPRING} both`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mini orb indicator */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: generating
              ? labPalette.ember
              : 'rgba(78,123,142,0.6)',
            boxShadow: generating
              ? '0 0 8px rgba(232,128,108,0.4)'
              : '0 0 6px rgba(78,123,142,0.3)',
            animation: generating ? 'sn-ai-pulse 1.5s ease-in-out infinite' : undefined,
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600, color: labPalette.text,
            fontFamily: 'var(--sn-font-family)',
          }}>
            AI Companion
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI Companion"
          style={{
            padding: '2px 6px', fontSize: 12,
            color: labPalette.textMuted, background: 'none',
            border: 'none', cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* Thread */}
      <div
        ref={threadRef}
        style={{
          flex: 1, overflow: 'auto', padding: '8px 12px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8,
          }}>
            <div style={{
              fontSize: 28, opacity: 0.15,
              fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
            }}>
              ◇
            </div>
            <div style={{
              fontSize: 12, color: labPalette.textFaint,
              fontFamily: 'var(--sn-font-family)',
              textAlign: 'center', lineHeight: 1.6,
            }}>
              {hasGraphNodes
                ? 'Ask about your pipeline, suggest connections, or generate widgets.'
                : 'Describe a widget to generate, or ask to edit the current one.'}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <AIMessage
              key={msg.id}
              message={msg}
              onApplyCode={msg.role === 'assistant' ? onApplyCode : undefined}
            />
          ))
        )}
      </div>

      {/* Input area */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(0,0,0,0.1)',
      }}>
        <div style={{
          display: 'flex', gap: 6, marginBottom: 8,
        }}>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Describe your widget..."
            aria-label="AI prompt"
            disabled={generating}
            style={{
              flex: 1, padding: '8px 12px', fontSize: 12,
              fontFamily: 'var(--sn-font-family)',
              color: labPalette.text,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, outline: 'none',
              transition: `border-color 300ms ${SPRING}`,
              opacity: generating ? 0.5 : 1,
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(78,123,142,0.3)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          />
        </div>

        {/* Graph-aware AI actions */}
        {hasGraphNodes && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleExplain('Explain what this pipeline does in plain language.')}
              disabled={generating}
              style={{
                padding: '4px 10px', fontSize: 10, fontWeight: 500,
                fontFamily: 'var(--sn-font-family)',
                color: labPalette.opal,
                background: 'rgba(176,208,216,0.06)',
                border: '1px solid rgba(176,208,216,0.12)',
                borderRadius: 5, cursor: generating ? 'wait' : 'pointer',
                opacity: generating ? 0.4 : 1,
                transition: `all 200ms ${SPRING}`,
              }}
            >
              Explain Pipeline
            </button>
            <button
              onClick={() => handleExplain('What connections should I make between the disconnected ports? Suggest specific pairings.')}
              disabled={generating}
              style={{
                padding: '4px 10px', fontSize: 10, fontWeight: 500,
                fontFamily: 'var(--sn-font-family)',
                color: labPalette.storm,
                background: 'rgba(78,123,142,0.06)',
                border: '1px solid rgba(78,123,142,0.12)',
                borderRadius: 5, cursor: generating ? 'wait' : 'pointer',
                opacity: generating ? 0.4 : 1,
                transition: `all 200ms ${SPRING}`,
              }}
            >
              Suggest Connections
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            aria-label="Generate widget"
            style={{
              flex: 1, padding: '7px 12px', fontSize: 11, fontWeight: 500,
              fontFamily: 'var(--sn-font-family)', color: '#fff',
              background: generating
                ? 'rgba(232,128,108,0.15)'
                : labPalette.ember,
              border: 'none', borderRadius: 6, cursor: generating ? 'wait' : 'pointer',
              opacity: (!prompt.trim() || generating) ? 0.5 : 1,
              transition: `all 200ms ${SPRING}`,
            }}
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>

          {currentEditorContent && (
            <button
              onClick={handleEdit}
              disabled={!prompt.trim() || generating}
              aria-label="Edit current widget"
              style={{
                flex: 1, padding: '7px 12px', fontSize: 11, fontWeight: 500,
                fontFamily: 'var(--sn-font-family)',
                color: labPalette.storm,
                background: 'rgba(78,123,142,0.08)',
                border: '1px solid rgba(78,123,142,0.15)',
                borderRadius: 6, cursor: generating ? 'wait' : 'pointer',
                opacity: (!prompt.trim() || generating) ? 0.5 : 1,
                transition: `all 200ms ${SPRING}`,
              }}
            >
              Edit Current
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
