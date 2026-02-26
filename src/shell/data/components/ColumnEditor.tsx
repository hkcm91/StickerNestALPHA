/**
 * ColumnEditor — Modal for editing or creating a table column.
 *
 * @module shell/data
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import type { TableColumn, ColumnType, ColumnConfig, SelectOption } from '@sn/types';

// =============================================================================
// Types
// =============================================================================

export interface ColumnEditorProps {
  column?: TableColumn;
  onSave: (column: TableColumn) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const COLUMN_TYPES: Array<{ value: ColumnType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'formula', label: 'Formula' },
  { value: 'ai', label: 'AI Generated' },
];

// =============================================================================
// Component
// =============================================================================

export const ColumnEditor: React.FC<ColumnEditorProps> = ({
  column,
  onSave,
  onDelete,
  onClose,
}: ColumnEditorProps) => {
  const isNew = !column;
  const [name, setName] = useState(column?.name ?? '');
  const [type, setType] = useState<ColumnType>(column?.type ?? 'text');
  const [config, setConfig] = useState<ColumnConfig>(column?.config ?? {});
  const [optionInput, setOptionInput] = useState('');

  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    const col: TableColumn = {
      id: column?.id ?? crypto.randomUUID(),
      name: name.trim(),
      type,
      config: Object.keys(config).length > 0 ? config : undefined,
      order: column?.order ?? 999,
    };

    onSave(col);
  }, [name, type, config, column, onSave]);

  const addSelectOption = useCallback(() => {
    if (!optionInput.trim()) return;
    const newOption: SelectOption = {
      id: crypto.randomUUID(),
      name: optionInput.trim(),
    };
    setConfig((prev: ColumnConfig) => ({
      ...prev,
      selectOptions: [...(prev.selectOptions ?? []), newOption],
    }));
    setOptionInput('');
  }, [optionInput]);

  const removeSelectOption = useCallback((optionId: string) => {
    setConfig((prev: ColumnConfig) => ({
      ...prev,
      selectOptions: (prev.selectOptions ?? []).filter((o: SelectOption) => o.id !== optionId),
    }));
  }, []);

  return (
    <div data-testid="column-editor" style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>
            {isNew ? 'New Column' : 'Edit Column'}
          </h3>
          <button onClick={onClose} style={styles.closeBtn}>x</button>
        </div>

        {/* Fields */}
        <div style={styles.body}>
          <label style={styles.label}>
            Name
            <input
              data-testid="column-name"
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              style={styles.input}
              autoFocus
            />
          </label>

          <label style={styles.label}>
            Type
            <select
              data-testid="column-type"
              value={type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as ColumnType)}
              style={styles.select}
            >
              {COLUMN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          {/* Select options */}
          {(type === 'select' || type === 'multi_select') && (
            <div style={styles.optionsSection}>
              <span style={styles.label}>Options</span>
              <div style={styles.optionsList}>
                {(config.selectOptions ?? []).map((opt: SelectOption) => (
                  <div key={opt.id} style={styles.optionItem}>
                    <span>{opt.name}</span>
                    <button
                      onClick={() => removeSelectOption(opt.id)}
                      style={styles.optionRemoveBtn}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
              <div style={styles.optionInputRow}>
                <input
                  data-testid="option-input"
                  type="text"
                  value={optionInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOptionInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && addSelectOption()}
                  placeholder="Add option..."
                  style={styles.input}
                />
                <button onClick={addSelectOption} style={styles.addOptionBtn}>
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Number format */}
          {type === 'number' && (
            <label style={styles.label}>
              Format
              <select
                value={config.numberFormat ?? 'number'}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setConfig((prev: ColumnConfig) => ({
                    ...prev,
                    numberFormat: e.target.value as ColumnConfig['numberFormat'],
                  }))
                }
                style={styles.select}
              >
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="percent">Percent</option>
                <option value="rating">Rating</option>
              </select>
            </label>
          )}

          {/* Formula expression */}
          {type === 'formula' && (
            <label style={styles.label}>
              Formula Expression
              <input
                data-testid="formula-input"
                type="text"
                value={config.formulaExpression ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfig((prev: ColumnConfig) => ({
                    ...prev,
                    formulaExpression: e.target.value,
                  }))
                }
                placeholder="e.g., col_a + col_b"
                style={styles.input}
              />
            </label>
          )}

          {/* AI prompt */}
          {type === 'ai' && (
            <label style={styles.label}>
              AI Prompt
              <textarea
                data-testid="ai-prompt-input"
                value={config.aiPrompt ?? ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setConfig((prev: ColumnConfig) => ({ ...prev, aiPrompt: e.target.value }))
                }
                placeholder="Use {{column_name}} to reference other columns"
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' as const }}
                rows={3}
              />
            </label>
          )}

          {/* Required toggle */}
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={config.required ?? false}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfig((prev: ColumnConfig) => ({ ...prev, required: e.target.checked }))
              }
            />
            Required field
          </label>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {!isNew && onDelete && (
            <button
              data-testid="btn-delete-column"
              onClick={onDelete}
              style={styles.deleteBtn}
            >
              Delete Column
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button
            data-testid="btn-save-column"
            onClick={handleSave}
            disabled={!name.trim()}
            style={{
              ...styles.saveBtn,
              ...(!name.trim() ? { opacity: 0.5 } : {}),
            }}
          >
            {isNew ? 'Add Column' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--sn-surface, #fff)', borderRadius: '12px', width: '440px', maxWidth: '90vw', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--sn-border, #ddd)' },
  title: { margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--sn-text, #111)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--sn-text-muted, #999)', padding: '4px 8px' },
  body: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' },
  label: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--sn-text, #111)' },
  input: { padding: '8px 10px', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', fontSize: '14px', background: 'var(--sn-bg, #fff)', color: 'var(--sn-text, #111)', fontWeight: 400 },
  select: { padding: '8px 10px', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', fontSize: '14px', background: 'var(--sn-bg, #fff)', color: 'var(--sn-text, #111)', fontWeight: 400 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--sn-text, #111)' },
  optionsSection: { display: 'flex', flexDirection: 'column', gap: '6px' },
  optionsList: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  optionItem: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: 'var(--sn-bg, #f0f0f0)', borderRadius: '4px', fontSize: '12px' },
  optionRemoveBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: 'var(--sn-text-muted, #999)', padding: '0 2px' },
  optionInputRow: { display: 'flex', gap: '6px' },
  addOptionBtn: { padding: '8px 12px', background: 'var(--sn-surface, #f8f9fa)', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', fontSize: '13px' },
  footer: { display: 'flex', gap: '8px', padding: '14px 20px', borderTop: '1px solid var(--sn-border, #ddd)' },
  cancelBtn: { padding: '8px 16px', background: 'var(--sn-surface, #f8f9fa)', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', fontSize: '13px' },
  saveBtn: { padding: '8px 16px', background: 'var(--sn-accent, #2563eb)', color: '#fff', border: 'none', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  deleteBtn: { padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', fontSize: '13px' },
};
