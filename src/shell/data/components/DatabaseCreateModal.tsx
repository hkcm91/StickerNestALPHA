/**
 * DatabaseCreateModal — Modal for creating a new database with name and type.
 *
 * @module shell/data
 * @layer L6
 */

import React, { useState } from 'react';
import type { DataSourceType } from '@sn/types';

export interface DatabaseCreateModalProps {
  onCreate: (name: string, type: DataSourceType) => void;
  onClose: () => void;
}

export const DatabaseCreateModal: React.FC<DatabaseCreateModalProps> = ({
  onCreate,
  onClose,
}: DatabaseCreateModalProps) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DataSourceType>('table');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), type);
    }
  };

  return (
    <div data-testid="create-database-modal" style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>New Database</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Name</label>
            <input
              data-testid="input-db-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Project Tasks"
              autoFocus
              style={styles.input}
              required
            />
          </div>
          
          <div style={styles.field}>
            <label style={styles.label}>Type</label>
            <select
              data-testid="select-db-type"
              value={type}
              onChange={(e) => setType(e.target.value as DataSourceType)}
              style={styles.select}
            >
              <option value="table">Table</option>
              <option value="doc">Document</option>
              <option value="note">Note</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button
              data-testid="btn-confirm-create"
              type="submit"
              disabled={!name.trim()}
              style={{
                ...styles.createBtn,
                ...(!name.trim() ? styles.disabledBtn : {}),
              }}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  modal: { background: 'var(--sn-surface, #fff)', borderRadius: '12px', width: '400px', maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--sn-border, #ddd)' },
  title: { margin: 0, fontSize: '18px', fontWeight: 700 },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' },
  form: { padding: '20px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--sn-border, #ddd)', fontSize: '14px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--sn-border, #ddd)', fontSize: '14px' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--sn-border, #ddd)', background: 'none', cursor: 'pointer', fontSize: '14px' },
  createBtn: { padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--sn-accent, #2563eb)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
  disabledBtn: { opacity: 0.5, cursor: 'not-allowed' },
};
