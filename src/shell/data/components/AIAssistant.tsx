/**
 * AIAssistant — Conversational AI sidebar for database operations.
 *
 * Chat-style interface with intent detection, rich response cards,
 * smart suggestions, and streaming-style progress indicators.
 * All AI operations route through the platform proxy — no API keys here.
 *
 * @module shell/data
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AISchemaGenerateResponse,
  AISuggestColumnResponse,
  AINaturalLanguageQueryResponse,
  AIExtractDataResponse,
} from '@sn/types';

import {
  generateSchema,
  autofill,
  suggestColumn,
  naturalLanguageQuery,
  extractData,
  getTableSchema,
  getTableRows,
} from '../../../kernel/datasource';
import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

import type { AIChatMessage, AIContextInfo, AIResponseVariant } from './ai-chat-types';

// =============================================================================
// Constants
// =============================================================================

const SN_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

type AIIntent =
  | 'generate_schema'
  | 'autofill'
  | 'suggest_column'
  | 'query'
  | 'extract';

// =============================================================================
// Props
// =============================================================================

export interface AIAssistantProps {
  dataSourceId?: string;
  onSchemaGenerated?: (schema: AISchemaGenerateResponse) => void;
  onColumnSuggested?: (suggestion: AISuggestColumnResponse) => void;
  onQueryResult?: (result: AINaturalLanguageQueryResponse) => void;
  onDataExtracted?: (data: AIExtractDataResponse) => void;
  onAutofillComplete?: () => void;
  onClose: () => void;
}

// =============================================================================
// Intent Detection
// =============================================================================

function detectIntent(text: string): AIIntent {
  const lower = text.toLowerCase();
  if (/fill|autofill|complete|populate|empty.*(cell|row)/i.test(lower)) return 'autofill';
  if (/suggest.*column|add.*column|new.*column|compute|calculate/i.test(lower)) return 'suggest_column';
  if (/show|filter|sort|find|query|where|which|list.*where|search.*for/i.test(lower)) return 'query';
  if (/extract|paste|import.*text|parse|convert.*text/i.test(lower)) return 'extract';
  return 'generate_schema';
}


// =============================================================================
// Component
// =============================================================================

export const AIAssistant: React.FC<AIAssistantProps> = ({
  dataSourceId,
  onSchemaGenerated,
  onColumnSuggested,
  onQueryResult,
  onDataExtracted,
  onAutofillComplete,
  onClose,
}: AIAssistantProps) => {
  const user = useAuthStore((s: { user: { id: string } | null }) => s.user);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [contextInfo, setContextInfo] = useState<AIContextInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  // Load context info when dataSourceId changes
  useEffect(() => {
    if (!dataSourceId || !user) {
      setContextInfo(null);
      return;
    }
    (async () => {
      const [schemaRes, rowsRes] = await Promise.all([
        getTableSchema(dataSourceId, user.id),
        getTableRows(dataSourceId, user.id),
      ]);
      const cols = schemaRes.success ? schemaRes.data.columns : [];
      const rowData = rowsRes.success
        ? ('rows' in rowsRes.data ? rowsRes.data.rows : rowsRes.data)
        : [];
      setContextInfo({
        tableName: schemaRes.success ? (schemaRes.data as { name?: string }).name : undefined,
        columnCount: cols.length,
        rowCount: Array.isArray(rowData) ? rowData.length : 0,
      });
    })();
  }, [dataSourceId, user]);

  // Add a message to the thread
  const addMessage = useCallback((
    role: 'user' | 'assistant',
    content: string,
    variant?: AIResponseVariant,
    payload?: unknown,
  ) => {
    const msg: AIChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now(),
      variant,
      payload,
    };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }, []);

  // Handle sending a message
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !user || isStreaming) return;

    setInput('');
    addMessage('user', text);
    setIsStreaming(true);

    const intent = detectIntent(text);

    try {
      switch (intent) {
        case 'generate_schema': {
          const res = await generateSchema({ prompt: text });
          if (res.success) {
            const colNames = res.data.columns.map((c: { name: string }) => c.name).join(', ');
            addMessage(
              'assistant',
              `Generated ${res.data.columns.length} columns: ${colNames}`,
              'schema-preview',
              res.data,
            );
          } else {
            addMessage('assistant', `Error: ${res.error.message}`);
          }
          break;
        }
        case 'autofill': {
          if (!dataSourceId) {
            addMessage('assistant', 'No database selected. Open a table first to use autofill.');
            break;
          }
          const res = await autofill(dataSourceId, text, user.id);
          if (res.success) {
            const count = Object.keys(res.data.fills).length;
            addMessage('assistant', `Filled ${count} cells.`, 'fill-summary', res.data);
            onAutofillComplete?.();
          } else {
            addMessage('assistant', `Error: ${res.error.message}`);
          }
          break;
        }
        case 'suggest_column': {
          if (!dataSourceId) {
            addMessage('assistant', 'No database selected. Open a table first to suggest columns.');
            break;
          }
          const res = await suggestColumn(dataSourceId, text, user.id);
          if (res.success) {
            addMessage(
              'assistant',
              `Suggested column: "${res.data.column.name}" (${res.data.column.type})`,
              'column-card',
              res.data,
            );
          } else {
            addMessage('assistant', `Error: ${res.error.message}`);
          }
          break;
        }
        case 'query': {
          if (!dataSourceId) {
            addMessage('assistant', 'No database selected. Open a table first to query data.');
            break;
          }
          const res = await naturalLanguageQuery(dataSourceId, text, user.id);
          if (res.success) {
            addMessage(
              'assistant',
              res.data.explanation ??
                `Generated ${res.data.filters?.length ?? 0} filters and ${res.data.sorts?.length ?? 0} sorts.`,
              'query-result',
              res.data,
            );
          } else {
            addMessage('assistant', `Error: ${res.error.message}`);
          }
          break;
        }
        case 'extract': {
          if (!dataSourceId) {
            addMessage('assistant', 'No database selected. Open a table first to extract data.');
            break;
          }
          const res = await extractData(dataSourceId, text, user.id);
          if (res.success) {
            addMessage(
              'assistant',
              `Extracted ${res.data.rows.length} rows from your text.`,
              'extract-result',
              res.data,
            );
          } else {
            addMessage('assistant', `Error: ${res.error.message}`);
          }
          break;
        }
      }
    } catch (err) {
      addMessage('assistant', `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsStreaming(false);
    }
  }, [input, user, isStreaming, dataSourceId, addMessage, onAutofillComplete]);

  // Handle action button clicks on response cards
  const handleAction = useCallback((msg: AIChatMessage) => {
    if (msg.applied) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, applied: true } : m)),
    );

    switch (msg.variant) {
      case 'schema-preview':
        onSchemaGenerated?.(msg.payload as AISchemaGenerateResponse);
        break;
      case 'column-card':
        onColumnSuggested?.(msg.payload as AISuggestColumnResponse);
        break;
      case 'fill-summary':
        onAutofillComplete?.();
        break;
      case 'query-result':
        onQueryResult?.(msg.payload as AINaturalLanguageQueryResponse);
        break;
      case 'extract-result':
        onDataExtracted?.(msg.payload as AIExtractDataResponse);
        break;
    }
  }, [onSchemaGenerated, onColumnSuggested, onAutofillComplete, onQueryResult, onDataExtracted]);

  // Handle quick suggestion click
  const handleSuggestion = useCallback((text: string) => {
    setInput(text);
  }, []);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Smart suggestions based on context
  const suggestions = getSuggestions(dataSourceId, contextInfo);

  return (
    <div data-testid="ai-assistant" style={styles.container}>
      {/* Context bar */}
      {contextInfo && (
        <div style={styles.contextBar}>
          <span style={styles.contextLabel}>
            {contextInfo.tableName || 'Table'}
          </span>
          <span style={styles.contextMeta}>
            {contextInfo.columnCount} cols &middot; {contextInfo.rowCount} rows
          </span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>AI Assistant</h3>
        <button data-testid="btn-close-ai" onClick={onClose} style={styles.closeBtn}>
          &#215;
        </button>
      </div>

      {/* Message thread */}
      <div style={styles.messageList}>
        {/* Smart suggestions when empty */}
        {messages.length === 0 && (
          <div style={styles.suggestionsWrap}>
            <p style={styles.suggestionsTitle}>What can I help with?</p>
            <div style={styles.suggestionsGrid}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(s.prompt)}
                  style={styles.suggestionChip}
                >
                  <span style={styles.suggestionLabel}>{s.label}</span>
                  <span style={styles.suggestionDesc}>{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            onAction={() => handleAction(msg)}
          />
        ))}

        {/* Thinking indicator */}
        {isStreaming && <ThinkingDots />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={styles.inputArea}>
        <textarea
          data-testid="ai-prompt-input"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI anything about your data..."
          rows={2}
          style={styles.textarea}
        />
        <button
          data-testid="btn-ai-submit"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          style={{
            ...styles.sendBtn,
            ...(isStreaming || !input.trim() ? styles.sendBtnDisabled : {}),
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// Sub-Components
// =============================================================================

interface ChatBubbleProps {
  message: AIChatMessage;
  onAction: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onAction }: ChatBubbleProps) => {
  const isUser = message.role === 'user';
  const isError = !isUser && message.content.startsWith('Error:');
  const hasAction = !isUser && message.variant && message.variant !== 'text';

  return (
    <div style={{
      ...styles.bubble,
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      background: isUser
        ? 'var(--sn-accent, #3E7D94)'
        : isError
          ? 'rgba(200,88,88,0.12)'
          : 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
      border: isUser
        ? 'none'
        : isError
          ? '1px solid rgba(200,88,88,0.2)'
          : '1px solid var(--sn-border, rgba(255,255,255,0.06))',
      color: isUser ? '#fff' : isError ? '#C85858' : 'var(--sn-text, #E8E6ED)',
    }}>
      {/* Rich card badge */}
      {hasAction && (
        <div style={styles.cardBadge}>
          {variantLabel(message.variant!)}
        </div>
      )}

      <div data-testid={!isUser ? 'ai-result' : undefined} style={styles.bubbleText}>
        {message.content}
      </div>

      {/* Action buttons for rich responses */}
      {hasAction && (
        <div style={styles.actionRow}>
          <button
            onClick={onAction}
            disabled={message.applied}
            style={{
              ...styles.actionBtn,
              ...(message.applied ? styles.actionBtnApplied : {}),
            }}
          >
            {message.applied ? 'Applied' : getActionLabel(message.variant!)}
          </button>
        </div>
      )}
    </div>
  );
};

const ThinkingDots: React.FC = () => (
  <div style={styles.thinkingWrap}>
    <span style={styles.thinkingDot}>&#8226;</span>
    <span style={{ ...styles.thinkingDot, animationDelay: '0.2s' }}>&#8226;</span>
    <span style={{ ...styles.thinkingDot, animationDelay: '0.4s' }}>&#8226;</span>
  </div>
);

// =============================================================================
// Helpers
// =============================================================================

function variantLabel(variant: AIResponseVariant): string {
  switch (variant) {
    case 'schema-preview': return 'Schema';
    case 'column-card': return 'Column';
    case 'fill-summary': return 'Autofill';
    case 'query-result': return 'Query';
    case 'extract-result': return 'Extract';
    default: return '';
  }
}

function getActionLabel(variant: AIResponseVariant): string {
  switch (variant) {
    case 'schema-preview': return 'Apply Schema';
    case 'column-card': return 'Add Column';
    case 'fill-summary': return 'Apply';
    case 'query-result': return 'Apply Filters';
    case 'extract-result': return 'Import Rows';
    default: return 'Apply';
  }
}

interface Suggestion {
  label: string;
  desc: string;
  prompt: string;
}

function getSuggestions(dataSourceId?: string, context?: AIContextInfo | null): Suggestion[] {
  if (!dataSourceId) {
    return [
      { label: 'Create Database', desc: 'Describe your data', prompt: 'Create a database for ' },
      { label: 'Bug Tracker', desc: 'Quick template', prompt: 'Create a bug tracker with priority, assignee, status, and description' },
      { label: 'Project Tasks', desc: 'Quick template', prompt: 'Create a project task tracker with title, owner, due date, status, and tags' },
    ];
  }

  if (!context || (context.columnCount === 0 && context.rowCount === 0)) {
    return [
      { label: 'Describe Data', desc: 'Generate schema', prompt: 'Generate a schema for ' },
      { label: 'Import Text', desc: 'Paste data', prompt: 'Extract data from this text: ' },
    ];
  }

  if (context.columnCount > 0 && context.rowCount === 0) {
    return [
      { label: 'Add Sample Data', desc: 'Fill with examples', prompt: 'Autofill all empty cells with sample data' },
      { label: 'Suggest Column', desc: 'AI-computed', prompt: 'Suggest a new column that would be useful for this data' },
    ];
  }

  return [
    { label: 'Suggest Column', desc: 'AI-computed', prompt: 'Suggest a new column that would be useful for this data' },
    { label: 'Query Data', desc: 'Natural language', prompt: 'Show me ' },
    { label: 'Autofill', desc: 'Complete cells', prompt: 'Autofill empty cells' },
    { label: 'Extract Text', desc: 'Paste to rows', prompt: 'Extract data from this text: ' },
  ];
}

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    fontFamily: "'Outfit', sans-serif",
  },
  contextBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.04))',
    background: 'rgba(78,123,142,0.06)',
  },
  contextLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--sn-accent, #3E7D94)',
    fontFamily: "'DM Mono', monospace",
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  contextMeta: {
    fontSize: '11px',
    color: 'var(--sn-text-muted, #7A7784)',
    fontFamily: "'DM Mono', monospace",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--sn-text, #E8E6ED)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: 'var(--sn-text-muted, #7A7784)',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: `all 150ms ${SN_SPRING}`,
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minHeight: 0,
  },
  suggestionsWrap: {
    padding: '8px 0',
  },
  suggestionsTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--sn-text-muted, #7A7784)',
    marginBottom: '10px',
    margin: '0 0 10px',
  },
  suggestionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  suggestionChip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '10px 12px',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.5))',
    border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    borderRadius: 'var(--sn-radius, 6px)',
    cursor: 'pointer',
    textAlign: 'left' as const,
    width: '100%',
    transition: `all 300ms ${SN_SPRING}`,
  },
  suggestionLabel: {
    fontWeight: 600,
    fontSize: '13px',
    color: 'var(--sn-text, #E8E6ED)',
  },
  suggestionDesc: {
    fontSize: '11px',
    color: 'var(--sn-text-muted, #7A7784)',
    marginTop: '2px',
  },
  bubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '13px',
    lineHeight: 1.5,
    wordBreak: 'break-word' as const,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  cardBadge: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--sn-accent, #3E7D94)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: '4px',
    fontFamily: "'DM Mono', monospace",
  },
  bubbleText: {
    margin: 0,
  },
  actionRow: {
    marginTop: '8px',
    display: 'flex',
    gap: '6px',
  },
  actionBtn: {
    padding: '5px 12px',
    background: 'var(--sn-accent, #3E7D94)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--sn-radius, 6px)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    transition: `all 200ms ${SN_SPRING}`,
  },
  actionBtnApplied: {
    background: 'rgba(90,168,120,0.15)',
    color: '#5AA878',
    cursor: 'default',
  },
  thinkingWrap: {
    alignSelf: 'flex-start',
    display: 'flex',
    gap: '4px',
    padding: '10px 14px',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
    border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    borderRadius: '12px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  thinkingDot: {
    fontSize: '18px',
    color: 'var(--sn-accent, #3E7D94)',
    animation: 'sn-pulse 1.2s ease-in-out infinite',
  },
  inputArea: {
    padding: '12px 16px',
    borderTop: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    borderRadius: 'var(--sn-radius, 6px)',
    fontSize: '13px',
    fontFamily: "'Outfit', sans-serif",
    resize: 'none' as const,
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.5))',
    color: 'var(--sn-text, #E8E6ED)',
    outline: 'none',
    transition: `border-color 300ms ${SN_SPRING}`,
    minHeight: '40px',
    maxHeight: '120px',
  },
  sendBtn: {
    padding: '8px 16px',
    background: 'var(--sn-accent, #3E7D94)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--sn-radius, 6px)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    transition: `all 200ms ${SN_SPRING}`,
    whiteSpace: 'nowrap' as const,
  },
  sendBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
