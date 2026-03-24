/**
 * AI Agent Built-in Widget
 *
 * A chat-based AI agent with configurable persona, persistent memory,
 * and canvas event awareness. Uses the AI completion bridge to generate
 * responses through the platform's Supabase edge function proxy.
 *
 * @module runtime/widgets/ai-agent
 * @layer L3
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { WidgetManifest } from '@sn/types';

import { useEmit, useSubscribe, useWidgetState } from '../../hooks';

import { AI_AGENT_EVENTS } from './ai-agent.events';
import type { AgentMessage } from './ai-agent.schema';
import { AGENT_COLORS, MAX_CONVERSATION_LENGTH } from './ai-agent.schema';

// ---------------------------------------------------------------------------
// Unique ID generator
// ---------------------------------------------------------------------------
let _counter = 0;
function uid(): string {
  return `msg-${Date.now()}-${++_counter}`;
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const aiAgentManifest: WidgetManifest = {
  id: 'sn.builtin.ai-agent',
  name: 'AI Agent',
  version: '1.0.0',
  description: 'An AI-powered chat agent with configurable persona and canvas event awareness.',
  author: { name: 'StickerNest', url: 'https://stickernest.com' },
  category: 'productivity',
  tags: ['ai', 'agent', 'chat', 'assistant'],
  permissions: ['ai', 'storage', 'user-state'],
  size: {
    defaultWidth: 400,
    defaultHeight: 600,
    minWidth: 320,
    minHeight: 400,
    aspectLocked: false,
  },
  license: 'MIT',
  config: {
    fields: [
      { name: 'personaName', type: 'string', label: 'Agent Name', default: 'AI Agent' },
      { name: 'personaRole', type: 'string', label: 'Role', default: 'General assistant' },
      { name: 'systemInstructions', type: 'string', label: 'System Instructions', default: 'You are a helpful AI assistant.' },
      { name: 'preferredModel', type: 'select', label: 'Model', default: 'claude-sonnet-4-20250514', options: [
        { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
        { label: 'Claude Haiku 3.5', value: 'claude-3-5-haiku-20241022' },
      ] },
    ],
  },
  spatialSupport: false,
  entry: 'inline',
  events: {
    emits: [
      { name: AI_AGENT_EVENTS.emits.READY },
      { name: AI_AGENT_EVENTS.emits.MESSAGE_SENT },
      { name: AI_AGENT_EVENTS.emits.RESPONSE_RECEIVED },
      { name: AI_AGENT_EVENTS.emits.ACTION_TAKEN },
      { name: AI_AGENT_EVENTS.emits.ERROR },
    ],
    subscribes: [
      { name: AI_AGENT_EVENTS.subscribes.SEND_MESSAGE },
      { name: AI_AGENT_EVENTS.subscribes.CANVAS_EVENT },
      { name: AI_AGENT_EVENTS.subscribes.CLEAR_HISTORY },
    ],
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AiAgentWidget: React.FC = () => {
  const emit = useEmit();
  const [widgetState, setWidgetState] = useWidgetState<unknown>('sn.builtin.ai-agent');

  // Conversation state
  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    const saved = widgetState.messages;
    return Array.isArray(saved) ? (saved as AgentMessage[]) : [];
  });
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Config from widget instance
  const personaName = (widgetState.personaName as string) || 'AI Agent';
  const systemInstructions = (widgetState.systemInstructions as string) || 'You are a helpful AI assistant.';
  const preferredModel = (widgetState.preferredModel as string) || undefined;

  // Persist messages to widget state
  useEffect(() => {
    setWidgetState('messages', messages);
  }, [messages, setWidgetState]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Emit ready on mount
  useEffect(() => {
    emit(AI_AGENT_EVENTS.emits.READY, { personaName });
  }, [emit, personaName]);

  // Handle incoming SEND_MESSAGE events from other widgets
  useSubscribe(AI_AGENT_EVENTS.subscribes.SEND_MESSAGE, useCallback((payload: unknown) => {
    const p = payload as { message?: string };
    if (p?.message && typeof p.message === 'string') {
      handleSend(p.message);
    }
  }, [systemInstructions, preferredModel, messages])); // eslint-disable-line

  // Handle CLEAR_HISTORY events
  useSubscribe(AI_AGENT_EVENTS.subscribes.CLEAR_HISTORY, useCallback(() => {
    setMessages([]);
    setStreamingText('');
  }, []));

  // Send a message and get AI response
  const handleSend = useCallback(async (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || isStreaming) return;

    const userMsg: AgentMessage = {
      id: uid(),
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg].slice(-MAX_CONVERSATION_LENGTH);
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');

    emit(AI_AGENT_EVENTS.emits.MESSAGE_SENT, { message: messageText });

    try {
      // Build conversation context
      const conversationContext = updatedMessages
        .slice(-20) // Last 20 messages for context
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const fullPrompt = conversationContext
        ? `${conversationContext}\nUser: ${messageText}`
        : messageText;

      // Use the AI completion bridge via window.StickerNest if available,
      // otherwise use event-based approach
      const SN = (window as unknown as { StickerNest?: {
        ai?: {
          stream?: (prompt: string, opts: Record<string, unknown>) => Promise<AsyncIterable<string>>;
          complete?: (prompt: string, opts: Record<string, unknown>) => Promise<string>;
        };
      } }).StickerNest;

      let responseText = '';

      if (SN?.ai?.stream) {
        const stream = await SN.ai.stream(fullPrompt, {
          systemPrompt: systemInstructions,
          model: preferredModel,
        });

        for await (const chunk of stream) {
          responseText += chunk;
          setStreamingText(responseText);
        }
      } else if (SN?.ai?.complete) {
        responseText = await SN.ai.complete(fullPrompt, {
          systemPrompt: systemInstructions,
          model: preferredModel,
        });
        setStreamingText(responseText);
      } else {
        responseText = 'AI completion not available. The widget requires the "ai" permission.';
      }

      const assistantMsg: AgentMessage = {
        id: uid(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg].slice(-MAX_CONVERSATION_LENGTH));
      setStreamingText('');
      emit(AI_AGENT_EVENTS.emits.RESPONSE_RECEIVED, { response: responseText });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorAssistantMsg: AgentMessage = {
        id: uid(),
        role: 'assistant',
        content: `Error: ${errorMsg}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);
      emit(AI_AGENT_EVENTS.emits.ERROR, { error: errorMsg });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, systemInstructions, preferredModel, emit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>🤖</div>
        <div style={styles.headerInfo}>
          <div style={styles.headerName}>{personaName}</div>
          <div style={styles.headerStatus}>
            {isStreaming ? 'Thinking...' : 'Online'}
          </div>
        </div>
        <button
          style={styles.clearButton}
          onClick={() => { setMessages([]); setStreamingText(''); }}
          title="Clear conversation"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={styles.messagesContainer}>
        {messages.length === 0 && !streamingText && (
          <div style={styles.emptyState}>
            Send a message to start the conversation.
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.messageBubble,
              ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble),
            }}
          >
            <div style={{
              color: msg.role === 'user' ? AGENT_COLORS.userText : AGENT_COLORS.assistantText,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {streamingText && (
          <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
            <div style={{ color: AGENT_COLORS.assistantText, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {streamingText}
              <span style={styles.cursor}>▊</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputContainer}>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={isStreaming}
        />
        <button
          style={{
            ...styles.sendButton,
            opacity: isStreaming || !input.trim() ? 0.5 : 1,
          }}
          onClick={() => handleSend()}
          disabled={isStreaming || !input.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--sn-bg, #ffffff)',
    fontFamily: 'var(--sn-font-family, system-ui, sans-serif)',
    borderRadius: 'var(--sn-radius, 8px)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: 'var(--sn-surface, #f5f5f5)',
    borderBottom: '1px solid var(--sn-border, #e0e0e0)',
  },
  headerIcon: {
    fontSize: '24px',
    lineHeight: 1,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--sn-text, #1a1a1a)',
  },
  headerStatus: {
    fontSize: '12px',
    color: 'var(--sn-text-muted, #888)',
  },
  clearButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: 'var(--sn-text-muted, #888)',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  messagesContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--sn-text-muted, #888)',
    fontSize: '14px',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  userBubble: {
    alignSelf: 'flex-end',
    background: AGENT_COLORS.userBubble,
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    background: AGENT_COLORS.assistantBubble,
    borderBottomLeftRadius: '4px',
  },
  cursor: {
    animation: 'blink 1s infinite',
    opacity: 0.7,
  },
  inputContainer: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid var(--sn-border, #e0e0e0)',
    background: 'var(--sn-surface, #f5f5f5)',
  },
  textarea: {
    flex: 1,
    resize: 'none',
    border: '1px solid var(--sn-border, #e0e0e0)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    background: 'var(--sn-bg, #ffffff)',
    color: 'var(--sn-text, #1a1a1a)',
    outline: 'none',
  },
  sendButton: {
    background: 'var(--sn-accent, #4A90D9)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '16px',
    cursor: 'pointer',
    lineHeight: 1,
  },
};
