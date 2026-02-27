/**
 * DatabaseList — shows all accessible table DataSources with search and filters.
 *
 * @module shell/data
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { DataSource, DataSourceType } from '@sn/types';

import { listDataSources } from '../../../kernel/datasource';
import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

// =============================================================================
// Types
// =============================================================================

export interface DatabaseListProps {
  onSelect: (dataSource: DataSource) => void;
  onCreate: () => void;
  onImportNotion: () => void;
  onUseTemplate: () => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export const DatabaseList: React.FC<DatabaseListProps> = ({
  onSelect,
  onCreate,
  onImportNotion,
  onUseTemplate,
  onDelete,
  onRename,
}: DatabaseListProps) => {
  const user = useAuthStore((s: { user: { id: string } | null }) => s.user);
  const [databases, setDatabases] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DataSourceType | 'all'>('all');

  const loadDatabases = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const result = await listDataSources(user.id, {
      type: typeFilter === 'all' ? undefined : typeFilter,
    });

    if (result.success) {
      setDatabases(result.data);
    }
    setIsLoading(false);
  }, [user, typeFilter]);

  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  const filtered = useMemo(() => {
    if (!search) return databases;
    const q = search.toLowerCase();
    return databases.filter(
      (ds: DataSource) =>
        ds.metadata?.name?.toLowerCase().includes(q) ||
        ds.metadata?.description?.toLowerCase().includes(q) ||
        ds.type.includes(q),
    );
  }, [databases, search]);

  const handleRename = useCallback((e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    const newName = window.prompt('Enter new name:', currentName);
    if (newName && newName !== currentName && onRename) {
      onRename(id, newName);
    }
  }, [onRename]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${name}"?`) && onDelete) {
      onDelete(id);
    }
  }, [onDelete]);

  return (
    <div data-testid="database-list" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Databases</h1>
        <div style={styles.actions}>
          <button
            data-testid="btn-create-database"
            onClick={onCreate}
            style={styles.primaryBtn}
          >
            + New Database
          </button>
          <button
            data-testid="btn-import-notion"
            onClick={onImportNotion}
            style={styles.secondaryBtn}
          >
            Import from Notion
          </button>
          <button
            data-testid="btn-use-template"
            onClick={onUseTemplate}
            style={styles.secondaryBtn}
          >
            Use Template
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div style={styles.filterBar}>
        <input
          data-testid="search-databases"
          type="text"
          placeholder="Search databases..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          data-testid="filter-type"
          value={typeFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value as DataSourceType | 'all')}
          style={styles.typeSelect}
        >
          <option value="all">All Types</option>
          <option value="table">Table</option>
          <option value="doc">Document</option>
          <option value="note">Note</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Database Cards */}
      {isLoading ? (
        <div data-testid="loading-indicator" style={styles.loading}>
          Loading databases...
        </div>
      ) : filtered.length === 0 ? (
        <div data-testid="empty-state" style={styles.empty}>
          <p style={styles.emptyText}>
            {search ? 'No databases match your search.' : 'No databases yet.'}
          </p>
          <p style={styles.emptyHint}>
            Create a new database, import from Notion, or start from a template.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((ds: DataSource) => (
            <div
              key={ds.id}
              data-testid={`database-card-${ds.id}`}
              onClick={() => onSelect(ds)}
              style={styles.card}
            >
              <div style={styles.cardIcon}>
                {ds.metadata?.icon || typeIcon(ds.type)}
              </div>
              <div style={styles.cardContent}>
                <div style={styles.cardHeaderRow}>
                  <div style={styles.cardName}>
                    {ds.metadata?.name || 'Untitled'}
                  </div>
                  <div style={styles.cardActions}>
                    <button
                      data-testid={`btn-rename-${ds.id}`}
                      onClick={(e) => handleRename(e, ds.id, ds.metadata?.name || '')}
                      style={styles.iconBtn}
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      data-testid={`btn-delete-${ds.id}`}
                      onClick={(e) => handleDelete(e, ds.id, ds.metadata?.name || 'Untitled')}
                      style={styles.iconBtnDelete}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div style={styles.cardMeta}>
                  <span style={styles.typeBadge}>{ds.type}</span>
                  <span style={styles.scopeBadge}>{ds.scope}</span>
                </div>
                {ds.metadata?.description && (
                  <div style={styles.cardDesc}>{ds.metadata.description}</div>
                )}
                <div style={styles.cardDate}>
                  Updated {new Date(ds.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function typeIcon(type: DataSourceType): string {
  switch (type) {
    case 'table': return 'T';
    case 'doc': return 'D';
    case 'note': return 'N';
    case 'folder': return 'F';
    case 'file': return 'f';
    case 'custom': return 'C';
    default: return '?';
  }
}

// =============================================================================
// Styles (inline for L6 shell components — no external CSS dependency)
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--sn-text, #111)' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  primaryBtn: { padding: '8px 16px', background: 'var(--sn-accent, #2563eb)', color: '#fff', border: 'none', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },
  secondaryBtn: { padding: '8px 16px', background: 'var(--sn-surface, #f8f9fa)', color: 'var(--sn-text, #111)', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', fontSize: '14px' },
  filterBar: { display: 'flex', gap: '12px', marginBottom: '20px' },
  searchInput: { flex: 1, padding: '8px 12px', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', fontSize: '14px', background: 'var(--sn-surface, #fff)', color: 'var(--sn-text, #111)' },
  typeSelect: { padding: '8px 12px', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', fontSize: '14px', background: 'var(--sn-surface, #fff)', color: 'var(--sn-text, #111)' },
  loading: { textAlign: 'center' as const, padding: '48px', color: 'var(--sn-text-muted, #666)' },
  empty: { textAlign: 'center' as const, padding: '48px' },
  emptyText: { fontSize: '16px', color: 'var(--sn-text, #111)', marginBottom: '8px' },
  emptyHint: { fontSize: '14px', color: 'var(--sn-text-muted, #666)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  card: { display: 'flex', gap: '12px', padding: '16px', background: 'var(--sn-surface, #fff)', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 6px)', cursor: 'pointer', textAlign: 'left' as const, width: '100%', transition: 'border-color 0.15s', fontFamily: 'inherit' },
  cardIcon: { width: '40px', height: '40px', borderRadius: '8px', background: 'var(--sn-bg, #f0f0f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, flexShrink: 0 },
  cardContent: { flex: 1, minWidth: 0 },
  cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' },
  cardName: { fontWeight: 600, fontSize: '15px', color: 'var(--sn-text, #111)', flex: 1, marginRight: '8px' },
  cardActions: { display: 'flex', gap: '4px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '14px', color: 'var(--sn-text-muted, #999)', transition: 'color 0.1s' },
  iconBtnDelete: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '18px', color: 'var(--sn-text-muted, #999)', transition: 'color 0.1s', lineHeight: 1 },
  cardMeta: { display: 'flex', gap: '6px', marginBottom: '4px' },
  typeBadge: { fontSize: '11px', padding: '2px 6px', background: 'var(--sn-bg, #f0f0f0)', borderRadius: '4px', color: 'var(--sn-text-muted, #666)', textTransform: 'uppercase' as const },
  scopeBadge: { fontSize: '11px', padding: '2px 6px', background: 'var(--sn-bg, #f0f0f0)', borderRadius: '4px', color: 'var(--sn-text-muted, #666)' },
  cardDesc: { fontSize: '13px', color: 'var(--sn-text-muted, #666)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  cardDate: { fontSize: '12px', color: 'var(--sn-text-muted, #999)' },
};
