/**
 * NotionImport — Modal for importing a Notion database.
 *
 * Lists accessible Notion databases and triggers import.
 *
 * @module shell/data
 * @layer L6
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  listNotionDatabases,
  importNotionDatabase,
} from '../../../kernel/datasource';
import type { NotionDatabaseSummary } from '../../../kernel/datasource';
import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

// =============================================================================
// Types
// =============================================================================

export interface NotionImportProps {
  onImported: (dataSourceId: string) => void;
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

export const NotionImport: React.FC<NotionImportProps> = ({
  onImported,
  onClose,
}: NotionImportProps) => {
  const user = useAuthStore((s: { user: { id: string } | null }) => s.user);
  const [databases, setDatabases] = useState<NotionDatabaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    listNotionDatabases(user.id).then((result) => {
      if (result.success) {
        setDatabases(result.data);
      } else {
        setError(result.error.message);
      }
      setIsLoading(false);
    });
  }, [user]);

  const handleImport = useCallback(async () => {
    if (!user || !selectedId) return;
    setIsImporting(true);
    setError(null);

    const result = await importNotionDatabase(selectedId, user.id);

    if (result.success) {
      onImported(result.data.dataSourceId);
    } else {
      setError(result.error.message);
    }
    setIsImporting(false);
  }, [user, selectedId, onImported]);

  return (
    <div data-testid="notion-import" style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Import from Notion</h2>
          <button data-testid="btn-close-notion" onClick={onClose} style={styles.closeBtn}>
            x
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {isLoading ? (
            <div data-testid="notion-loading" style={styles.loading}>
              Loading Notion databases...
            </div>
          ) : error && databases.length === 0 ? (
            <div data-testid="notion-error" style={styles.error}>
              <p>{error}</p>
              <p style={styles.errorHint}>
                Make sure you have connected your Notion account in Settings.
              </p>
            </div>
          ) : databases.length === 0 ? (
            <div style={styles.empty}>
              <p>No accessible Notion databases found.</p>
              <p style={styles.emptyHint}>
                Check that your Notion integration has access to your databases.
              </p>
            </div>
          ) : (
            <div style={styles.list}>
              {databases.map((db: NotionDatabaseSummary) => (
                <button
                  key={db.id}
                  data-testid={`notion-db-${db.id}`}
                  onClick={() => setSelectedId(db.id)}
                  style={{
                    ...styles.dbItem,
                    ...(selectedId === db.id ? styles.dbItemSelected : {}),
                  }}
                >
                  <span style={styles.dbIcon}>{db.icon || 'N'}</span>
                  <span style={styles.dbTitle}>{db.title}</span>
                  <span style={styles.dbProps}>
                    {db.propertyCount} properties
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error during import */}
        {error && databases.length > 0 && (
          <div style={{ ...styles.error, margin: '0 24px' }}>{error}</div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
          <button
            data-testid="btn-notion-import"
            onClick={handleImport}
            disabled={!selectedId || isImporting}
            style={{
              ...styles.importBtn,
              ...(!selectedId || isImporting ? styles.importBtnDisabled : {}),
            }}
          >
            {isImporting ? 'Importing...' : 'Import Database'}
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(10,10,14,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))', borderRadius: '12px', width: '500px', maxWidth: '90vw', maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.06))' },
  title: { margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--sn-text, #E8E6ED)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--sn-text-muted, #7A7784)', padding: '4px 8px' },
  content: { flex: 1, overflow: 'auto', padding: '16px 24px' },
  loading: { textAlign: 'center' as const, padding: '32px', color: 'var(--sn-text-muted, #7A7784)' },
  error: { padding: '12px', background: 'rgba(200,88,88,0.1)', border: '1px solid rgba(200,88,88,0.2)', borderRadius: 'var(--sn-radius, 6px)', color: '#C85858', fontSize: '13px' },
  errorHint: { fontSize: '12px', color: '#C85858', marginTop: '4px' },
  empty: { textAlign: 'center' as const, padding: '32px', color: 'var(--sn-text-muted, #666)' },
  emptyHint: { fontSize: '13px', marginTop: '4px' },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  dbItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--sn-surface-raised, #1A1A1F)', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', width: '100%', textAlign: 'left' as const },
  dbItemSelected: { borderColor: 'var(--sn-accent, #3E7D94)', background: 'rgba(78,123,142,0.05)' },
  dbIcon: { fontSize: '20px', width: '32px', textAlign: 'center' as const },
  dbTitle: { flex: 1, fontWeight: 600, fontSize: '14px', color: 'var(--sn-text, #111)' },
  dbProps: { fontSize: '12px', color: 'var(--sn-text-muted, #999)' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid var(--sn-border, #ddd)' },
  cancelBtn: { padding: '8px 16px', background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', fontSize: '14px' },
  importBtn: { padding: '8px 16px', background: 'var(--sn-accent, #2563eb)', color: '#fff', border: 'none', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },
  importBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
};
