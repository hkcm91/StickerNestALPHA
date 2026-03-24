/**
 * AI Canvas Agent Widget
 *
 * A built-in widget that accepts natural language commands and
 * manipulates the canvas via the AI action executor. Uses the
 * kernel AI module (prompt builder, action executor) and the
 * ai-canvas-agent edge function for LLM reasoning.
 *
 * @module runtime/widgets/ai-canvas-agent
 * @layer L3
 */

import React, { useState, useCallback, useRef } from 'react';

import type { WidgetManifest } from '@sn/types';

import { executeAIActions } from '../../../kernel/ai/action-executor';
import { buildCanvasAIContext } from '../../../kernel/ai/canvas-context';
import { buildAIPrompt, parseAIResponse } from '../../../kernel/ai/prompt-builder';
import { useEmit, useSubscribe, useWidgetState } from '../../hooks';

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const aiCanvasAgentManifest: WidgetManifest = {
  id: 'sn.builtin.ai-canvas-agent',
  name: 'AI Canvas Agent',
  version: '1.0.0',
  description: 'Natural language canvas manipulation powered by AI',
  author: { name: 'StickerNest', url: 'https://stickernest.com' },
  category: 'utilities',
  tags: ['ai', 'agent', 'canvas', 'automation'],
  permissions: ['ai'],
  size: { defaultWidth: 360, defaultHeight: 520, minWidth: 320, minHeight: 400, aspectLocked: false },
  license: 'MIT',
  config: { fields: [] },
  spatialSupport: false,
  entry: 'inline',
  crossCanvasChannels: [],
  events: {
    emits: [
      { name: 'widget.ai-canvas-agent.ready' },
      { name: 'widget.ai-canvas-agent.command.started' },
      { name: 'widget.ai-canvas-agent.command.completed' },
      { name: 'widget.ai-canvas-agent.command.failed' },
    ],
    subscribes: [
      { name: 'canvas.entity.selected' },
      { name: 'canvas.entity.created' },
      { name: 'canvas.entity.deleted' },
      { name: 'canvas.selection.cleared' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  actions?: number;
  error?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AICanvasAgentWidget: React.FC<{ instanceId: string }> = ({ instanceId }) => {
  const emit = useEmit();
  const [state, persistState] = useWidgetState(instanceId);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(state.history || []);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track entity selection for context
  useSubscribe('canvas.entity.selected', useCallback((payload: unknown) => {
    const p = payload as { entityId?: string };
    if (p?.entityId) setSelectedEntityId(p.entityId);
  }, []));

  useSubscribe('canvas.selection.cleared', useCallback(() => {
    setSelectedEntityId(null);
  }, []));

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Execute a user command
  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    setInput('');
    setIsProcessing(true);

    const userEntry: HistoryEntry = {
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const updatedHistory = [...history, userEntry];
    setHistory(updatedHistory);
    setTimeout(scrollToBottom, 50);

    emit('widget.ai-canvas-agent.command.started', { command: trimmed });

    try {
      // Build canvas context snapshot
      const context = buildCanvasAIContext({
        viewport: { x: 0, y: 0, zoom: 1, screenWidth: 1920, screenHeight: 1080 },
      });

      // Build conversation history for multi-turn
      const conversationHistory = updatedHistory
        .filter((e) => e.role === 'user' || e.role === 'assistant')
        .slice(-10)
        .map((e) => ({ role: e.role, content: e.content }));
      // Remove the last user entry (it will be the current prompt)
      conversationHistory.pop();

      const aiPrompt = buildAIPrompt(context, trimmed, {
        history: conversationHistory,
      });

      // Call the AI edge function via the bus integration pattern
      // For built-in widgets, we call the Supabase function directly
      const response = await callAIAgent(aiPrompt);

      // Parse the AI response
      const parsed = parseAIResponse(response);

      if (!parsed.success) {
        throw new Error(parsed.error || 'Failed to parse AI response');
      }

      // Execute the actions
      const result = executeAIActions(parsed.actions);

      const assistantEntry: HistoryEntry = {
        role: 'assistant',
        content: parsed.reasoning || `Executed ${result.succeeded} action(s)`,
        actions: result.succeeded,
        timestamp: Date.now(),
      };

      if (result.failed > 0) {
        assistantEntry.error = `${result.failed} action(s) failed`;
      }

      const finalHistory = [...updatedHistory, assistantEntry];
      setHistory(finalHistory);
      persistState('history', finalHistory.slice(-50));

      emit('widget.ai-canvas-agent.command.completed', {
        command: trimmed,
        succeeded: result.succeeded,
        failed: result.failed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errorEntry: HistoryEntry = {
        role: 'assistant',
        content: message,
        error: message,
        timestamp: Date.now(),
      };

      const finalHistory = [...updatedHistory, errorEntry];
      setHistory(finalHistory);
      persistState('history', finalHistory.slice(-50));

      emit('widget.ai-canvas-agent.command.failed', { command: trimmed, error: message });
    } finally {
      setIsProcessing(false);
      setTimeout(scrollToBottom, 50);
    }
  }, [input, isProcessing, history, selectedEntityId, emit, persistState, scrollToBottom]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleClear = useCallback(() => {
    setHistory([]);
    persistState('history', []);
  }, [persistState]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>AI Canvas Agent</span>
        {history.length > 0 && (
          <button onClick={handleClear} style={styles.clearBtn}>Clear</button>
        )}
      </div>

      <div ref={scrollRef} style={styles.chatArea}>
        {history.length === 0 && (
          <div style={styles.placeholder}>
            Describe what you want to do on the canvas. For example:
            <ul style={styles.examples}>
              <li>&quot;Add a blue rectangle at the center&quot;</li>
              <li>&quot;Create a title that says Welcome&quot;</li>
              <li>&quot;Move all text entities to the left&quot;</li>
            </ul>
          </div>
        )}
        {history.map((entry, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              ...(entry.role === 'user' ? styles.userMessage : styles.assistantMessage),
              ...(entry.error ? styles.errorMessage : {}),
            }}
          >
            <div style={styles.messageContent}>{entry.content}</div>
            {entry.actions != null && entry.actions > 0 && (
              <div style={styles.actionBadge}>
                {entry.actions} action{entry.actions !== 1 ? 's' : ''} executed
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div style={{ ...styles.message, ...styles.assistantMessage }}>
            <div style={styles.thinking}>Thinking...</div>
          </div>
        )}
      </div>

      <div style={styles.inputArea}>
        {selectedEntityId && (
          <div style={styles.contextTag}>
            Selected: {selectedEntityId.slice(0, 8)}...
          </div>
        )}
        <div style={styles.inputRow}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a canvas action..."
            style={styles.input}
            disabled={isProcessing}
            rows={1}
          />
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !input.trim()}
            style={{
              ...styles.sendBtn,
              opacity: isProcessing || !input.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AI Agent API call
// ---------------------------------------------------------------------------

async function callAIAgent(prompt: { system: string; messages: Array<{ role: string; content: string }> }): Promise<string> {
  // Use the Supabase edge function for AI canvas agent
  // In production this would go through the integration proxy
  const response = await fetch('/functions/v1/ai-canvas-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: prompt.system,
      messages: prompt.messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `AI agent request failed (${response.status})`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'AI agent returned unsuccessful response');
  }

  return data.text;
}

// ---------------------------------------------------------------------------
// Styles (CSS-in-JS using StickerNest theme tokens)
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--sn-bg, #ffffff)',
    color: 'var(--sn-text, #1a1a1a)',
    fontFamily: 'var(--sn-font-family, system-ui, sans-serif)',
    fontSize: 13,
    borderRadius: 'var(--sn-radius, 8px)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid var(--sn-border, #e0e0e0)',
    background: 'var(--sn-surface, #f5f5f5)',
  },
  title: {
    fontWeight: 600,
    fontSize: 14,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--sn-text-muted, #888)',
    cursor: 'pointer',
    fontSize: 12,
    padding: '2px 8px',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 12px',
  },
  placeholder: {
    color: 'var(--sn-text-muted, #888)',
    padding: '20px 0',
    lineHeight: 1.5,
  },
  examples: {
    marginTop: 8,
    paddingLeft: 16,
  },
  message: {
    marginBottom: 8,
    padding: '8px 10px',
    borderRadius: 6,
    maxWidth: '90%',
    lineHeight: 1.4,
  },
  userMessage: {
    background: 'var(--sn-accent, #4a90d9)',
    color: '#ffffff',
    marginLeft: 'auto',
    borderBottomRightRadius: 2,
  },
  assistantMessage: {
    background: 'var(--sn-surface, #f0f0f0)',
    color: 'var(--sn-text, #1a1a1a)',
    marginRight: 'auto',
    borderBottomLeftRadius: 2,
  },
  errorMessage: {
    borderLeft: '3px solid #e74c3c',
  },
  messageContent: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  actionBadge: {
    marginTop: 4,
    fontSize: 11,
    color: 'var(--sn-text-muted, #888)',
  },
  thinking: {
    fontStyle: 'italic',
    color: 'var(--sn-text-muted, #888)',
  },
  inputArea: {
    borderTop: '1px solid var(--sn-border, #e0e0e0)',
    padding: '8px 12px',
  },
  contextTag: {
    fontSize: 11,
    color: 'var(--sn-accent, #4a90d9)',
    marginBottom: 4,
  },
  inputRow: {
    display: 'flex',
    gap: 6,
  },
  input: {
    flex: 1,
    resize: 'none',
    border: '1px solid var(--sn-border, #ddd)',
    borderRadius: 6,
    padding: '6px 10px',
    fontFamily: 'inherit',
    fontSize: 13,
    background: 'var(--sn-bg, #fff)',
    color: 'var(--sn-text, #1a1a1a)',
    outline: 'none',
  },
  sendBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    background: 'var(--sn-accent, #4a90d9)',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
  },
};
