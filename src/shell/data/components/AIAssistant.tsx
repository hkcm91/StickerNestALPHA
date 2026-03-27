/**
 * AIAssistant — Sidebar panel for AI-powered database operations.
 *
 * Provides:
 * - Schema generation from natural language
 * - Autofill for empty cells
 * - AI column suggestions
 * - Natural language queries
 * - Data extraction from pasted text
 *
 * All AI operations route through the platform proxy — no API keys here.
 *
 * @module shell/data
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

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
} from '../../../kernel/datasource';
import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

// =============================================================================
// Types
// =============================================================================

type AIMode =
  | 'idle'
  | 'generate_schema'
  | 'autofill'
  | 'suggest_column'
  | 'query'
  | 'extract';

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
  const [mode, setMode] = useState<AIMode>('idle');
  const [prompt, setPrompt] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!user || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      switch (mode) {
        case 'generate_schema': {
          const res = await generateSchema({ prompt });
          if (res.success) {
            setResult(`Generated ${res.data.columns.length} columns: ${res.data.columns.map((c: { name: string }) => c.name).join(', ')}`);
            onSchemaGenerated?.(res.data);
          } else {
            setError(res.error.message);
          }
          break;
        }
        case 'autofill': {
          if (!dataSourceId) { setError('No database selected.'); break; }
          // prompt is used as columnId here
          const res = await autofill(dataSourceId, prompt, user.id);
          if (res.success) {
            const count = Object.keys(res.data.fills).length;
            setResult(`Filled ${count} cells.`);
            onAutofillComplete?.();
          } else {
            setError(res.error.message);
          }
          break;
        }
        case 'suggest_column': {
          if (!dataSourceId) { setError('No database selected.'); break; }
          const res = await suggestColumn(dataSourceId, prompt, user.id);
          if (res.success) {
            setResult(`Suggested column: "${res.data.column.name}" (${res.data.column.type})`);
            onColumnSuggested?.(res.data);
          } else {
            setError(res.error.message);
          }
          break;
        }
        case 'query': {
          if (!dataSourceId) { setError('No database selected.'); break; }
          const res = await naturalLanguageQuery(dataSourceId, prompt, user.id);
          if (res.success) {
            setResult(
              res.data.explanation ??
              `Generated ${res.data.filters?.length ?? 0} filters and ${res.data.sorts?.length ?? 0} sorts.`,
            );
            onQueryResult?.(res.data);
          } else {
            setError(res.error.message);
          }
          break;
        }
        case 'extract': {
          if (!dataSourceId) { setError('No database selected.'); break; }
          const res = await extractData(dataSourceId, pasteText, user.id);
          if (res.success) {
            setResult(`Extracted ${res.data.rows.length} rows.`);
            onDataExtracted?.(res.data);
          } else {
            setError(res.error.message);
          }
          break;
        }
        default:
          setError('Select an AI operation first.');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [mode, prompt, pasteText, dataSourceId, user, isProcessing, onSchemaGenerated, onColumnSuggested, onQueryResult, onDataExtracted, onAutofillComplete]);

  return (
    <div data-testid="ai-assistant" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>AI Assistant</h3>
        <button data-testid="btn-close-ai" onClick={onClose} style={styles.closeBtn}>
          x
        </button>
      </div>

      {/* Mode Selector */}
      <div style={styles.modeGrid}>
        <ModeButton
          active={mode === 'generate_schema'}
          onClick={() => setMode('generate_schema')}
          label="Generate Schema"
          desc="Describe your database"
          testId="mode-generate"
        />
        <ModeButton
          active={mode === 'autofill'}
          onClick={() => setMode('autofill')}
          label="Autofill"
          desc="Fill empty cells"
          testId="mode-autofill"
          disabled={!dataSourceId}
        />
        <ModeButton
          active={mode === 'suggest_column'}
          onClick={() => setMode('suggest_column')}
          label="Suggest Column"
          desc="AI-computed column"
          testId="mode-suggest"
          disabled={!dataSourceId}
        />
        <ModeButton
          active={mode === 'query'}
          onClick={() => setMode('query')}
          label="Smart Query"
          desc="Natural language filter"
          testId="mode-query"
          disabled={!dataSourceId}
        />
        <ModeButton
          active={mode === 'extract'}
          onClick={() => setMode('extract')}
          label="Extract Data"
          desc="Paste text to rows"
          testId="mode-extract"
          disabled={!dataSourceId}
        />
      </div>

      {/* Input Area */}
      {mode !== 'idle' && (
        <div style={styles.inputArea}>
          {mode === 'extract' ? (
            <textarea
              data-testid="ai-paste-input"
              placeholder="Paste unstructured text, CSV, or any data here..."
              value={pasteText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPasteText(e.target.value)}
              style={styles.textarea}
              rows={6}
            />
          ) : (
            <input
              data-testid="ai-prompt-input"
              type="text"
              placeholder={getPlaceholder(mode)}
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSubmit()}
              style={styles.input}
            />
          )}
          <button
            data-testid="btn-ai-submit"
            onClick={handleSubmit}
            disabled={isProcessing}
            style={{
              ...styles.submitBtn,
              ...(isProcessing ? styles.submitBtnDisabled : {}),
            }}
          >
            {isProcessing ? 'Processing...' : 'Run'}
          </button>
        </div>
      )}

      {/* Result / Error */}
      {error && (
        <div data-testid="ai-error" style={styles.error}>
          {error}
        </div>
      )}
      {result && (
        <div data-testid="ai-result" style={styles.result}>
          {result}
        </div>
      )}

      {/* Tips */}
      {mode === 'idle' && (
        <div style={styles.tips}>
          <p style={styles.tipsTitle}>What can AI do?</p>
          <ul style={styles.tipsList}>
            <li>Generate a database schema from a description</li>
            <li>Autofill empty cells based on patterns</li>
            <li>Suggest new computed columns</li>
            <li>Convert natural language to filters and sorts</li>
            <li>Extract structured data from pasted text</li>
          </ul>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Sub-Components
// =============================================================================

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
  testId: string;
  disabled?: boolean;
}

const ModeButton: React.FC<ModeButtonProps> = ({ active, onClick, label, desc, testId, disabled }: ModeButtonProps) => (
  <button
    data-testid={testId}
    onClick={onClick}
    disabled={disabled}
    style={{
      ...styles.modeBtn,
      ...(active ? styles.modeBtnActive : {}),
      ...(disabled ? styles.modeBtnDisabled : {}),
    }}
  >
    <span style={styles.modeBtnLabel}>{label}</span>
    <span style={styles.modeBtnDesc}>{desc}</span>
  </button>
);

function getPlaceholder(mode: AIMode): string {
  switch (mode) {
    case 'generate_schema':
      return 'e.g., "A bug tracker with priority, assignee, and status"';
    case 'autofill':
      return 'Enter column ID to autofill';
    case 'suggest_column':
      return 'e.g., "Summarize the description in 10 words"';
    case 'query':
      return 'e.g., "Show high priority items due this week"';
    default:
      return '';
  }
}

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', width: '320px', borderLeft: '1px solid var(--sn-border, rgba(255,255,255,0.06))', background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))', height: '100%', overflow: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--sn-border, #ddd)' },
  title: { margin: 0, fontSize: '16px', fontWeight: 600, background: 'linear-gradient(135deg, #7c3aed, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--sn-text-muted, #7A7784)', padding: '4px 8px' },
  modeGrid: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px' },
  modeBtn: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', background: 'var(--sn-surface-raised, #1A1A1F)', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', textAlign: 'left' as const, width: '100%' },
  modeBtnActive: { borderColor: 'var(--sn-accent, #3E7D94)', background: 'rgba(78,123,142,0.05)' },
  modeBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  modeBtnLabel: { fontWeight: 600, fontSize: '13px', color: 'var(--sn-text, #E8E6ED)' },
  modeBtnDesc: { fontSize: '11px', color: 'var(--sn-text-muted, #7A7784)', marginTop: '2px' },
  inputArea: { padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  input: { padding: '8px 12px', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', fontSize: '13px', background: 'var(--sn-bg, #fff)', color: 'var(--sn-text, #111)' },
  textarea: { padding: '8px 12px', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', fontSize: '13px', resize: 'vertical' as const, fontFamily: 'inherit', background: 'var(--sn-bg, #fff)', color: 'var(--sn-text, #111)' },
  submitBtn: { padding: '8px 16px', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff', border: 'none', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  submitBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  error: { margin: '0 12px', padding: '10px', background: 'rgba(200,88,88,0.1)', border: '1px solid rgba(200,88,88,0.2)', borderRadius: 'var(--sn-radius, 6px)', fontSize: '13px', color: '#C85858' },
  result: { margin: '0 12px', padding: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--sn-radius, 6px)', fontSize: '13px', color: '#166534' },
  tips: { padding: '16px', color: 'var(--sn-text-muted, #666)' },
  tipsTitle: { fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--sn-text, #111)' },
  ti