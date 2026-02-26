/**
 * TemplateSelector — Grid of pre-built database templates.
 *
 * @module shell/data
 * @layer L6
 */

import React, { useMemo, useState } from 'react';

import type { DatabaseTemplate, TemplateCategory } from '@sn/types';

import { getTemplates, getTemplatesByCategory } from '../../../kernel/datasource';

// =============================================================================
// Types
// =============================================================================

export interface TemplateSelectorProps {
  onSelect: (template: DatabaseTemplate) => void;
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

const CATEGORIES: Array<{ value: TemplateCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'project_management', label: 'Project Management' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelect,
  onClose,
}: TemplateSelectorProps) => {
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');

  const templates = useMemo(() => {
    if (category === 'all') return getTemplates();
    return getTemplatesByCategory(category);
  }, [category]);

  return (
    <div data-testid="template-selector" style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Choose a Template</h2>
          <button data-testid="btn-close-template" onClick={onClose} style={styles.closeBtn}>
            x
          </button>
        </div>

        {/* Category Filter */}
        <div style={styles.categoryBar}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              data-testid={`category-${cat.value}`}
              onClick={() => setCategory(cat.value)}
              style={{
                ...styles.categoryBtn,
                ...(category === cat.value ? styles.categoryBtnActive : {}),
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div style={styles.grid}>
          {templates.map((tmpl: DatabaseTemplate) => (
            <button
              key={tmpl.id}
              data-testid={`template-${tmpl.id}`}
              onClick={() => onSelect(tmpl)}
              style={styles.card}
            >
              <div style={styles.cardIcon}>{tmpl.icon}</div>
              <div style={styles.cardName}>{tmpl.name}</div>
              <div style={styles.cardDesc}>{tmpl.description}</div>
              <div style={styles.cardColumns}>
                {tmpl.columns.length} columns
              </div>
            </button>
          ))}
        </div>

        {templates.length === 0 && (
          <div style={styles.empty}>No templates in this category.</div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--sn-surface, #fff)', borderRadius: '12px', width: '700px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--sn-border, #ddd)' },
  title: { margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--sn-text, #111)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--sn-text-muted, #999)', padding: '4px 8px' },
  categoryBar: { display: 'flex', gap: '6px', padding: '12px 24px', borderBottom: '1px solid var(--sn-border, #eee)', flexWrap: 'wrap' },
  categoryBtn: { padding: '4px 12px', background: 'var(--sn-bg, #f0f0f0)', border: '1px solid transparent', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', color: 'var(--sn-text-muted, #666)' },
  categoryBtnActive: { background: 'var(--sn-accent, #2563eb)', color: '#fff', borderColor: 'var(--sn-accent, #2563eb)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', padding: '16px 24px', overflow: 'auto', flex: 1 },
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', background: 'var(--sn-bg, #f8f9fa)', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 8px)', cursor: 'pointer', textAlign: 'center' as const, transition: 'border-color 0.15s, box-shadow 0.15s', width: '100%' },
  cardIcon: { fontSize: '28px', marginBottom: '8px' },
  cardName: { fontWeight: 600, fontSize: '14px', color: 'var(--sn-text, #111)', marginBottom: '4px' },
  cardDesc: { fontSize: '12px', color: 'var(--sn-text-muted, #666)', marginBottom: '8px', lineHeight: 1.4 },
  cardColumns: { fontSize: '11px', color: 'var(--sn-text-muted, #999)', background: 'var(--sn-surface, #fff)', padding: '2px 8px', borderRadius: '10px' },
  empty: { padding: '32px', textAlign: 'center' as const, color: 'var(--sn-text-muted, #666)' },
};
