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
import { GlassPanel } from '../../components/GlassPanel';

// =============================================================================
// Constants
// =============================================================================

const SN_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

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
  const [focusedSearch, setFocusedSearch] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [pressedCard, setPressedCard] = useState<string | null>(null);

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
            style={{
              ...styles.primaryBtn,
              ...(hoveredBtn === 'create' ? styles.primaryBtnHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn('create')}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            + New Database
          </button>
          <button
            data-testid="btn-import-notion"
            onClick={onImportNotion}
            style={{
              ...styles.glassBtn,
              ...(hoveredBtn === 'notion' ? styles.glassBtnHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn('notion')}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            Import from Notion
          </button>
          <button
            data-testid="btn-use-template"
            onClick={onUseTemplate}
            style={{
              ...styles.glassBtn,
              ...(hoveredBtn === 'template' ? styles.glassBtnHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn('template')}
            onMouseLeave={() => setHoveredBtn(null)}
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
          onFocus={() => setFocusedSearch(true)}
          onBlur={() => setFocusedSearch(false)}
          style={{
            ...styles.searchInput,
            ...(focusedSearch ? styles.searchInputFocus : {}),
          }}
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
            <GlassPanel
              key={ds.id}
              data-testid={`database-card-${ds.id}`}
              flashlight
              grain
              onClick={() => onSelect(ds)}
              onMouseDown={() => setPressedCard(ds.id)}
              onMouseUp={() => setPressedCard(null)}
              style={{
                ...styles.card,
                ...(pressedCard === ds.id ? styles.cardActive : {}),
                cursor: 'pointer',
              }}
            >
              <div style={styles.cardInner}>
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
                        &#9998;
                      </button>
                      <button
                        data-testid={`btn-delete-${ds.id}`}
                        onClick={(e) => handleDelete(e, ds.id, ds.metadata?.name || 'Untitled')}
                        style={styles.iconBtnDelete}
                        title="Delete"
                      >
                        &#215;
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
            </GlassPanel>
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
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 400,
    margin: 0,
    color: 'var(--sn-text, #E8E6ED)',
    fontFamily: "'Outfit', sans-serif",
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    padding: '8px 16px',
    background: 'linear-gradient(145deg, var(--sn-accent, #3E7D94), #2E6070)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--sn-radius, 6px)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    boxShadow: '0 0 12px rgba(62,125,148,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
    transition: `all 300ms ${SN_SPRING}`,
  },
  primaryBtnHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 0 20px rgba(62,125,148,0.35), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
  },
  glassBtn: {
    padding: '8px 16px',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
    backdropFilter: 'blur(12px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
    color: 'var(--sn-text, #E8E6ED)',
    border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    borderRadius: 'var(--sn-radius, 6px)',
    cursor: 'pointer',
    fontSize: '14px',
    transition: `all 300ms ${SN_SPRING}`,
  },
  glassBtnHover: {
    borderColor: 'rgba(78,123,142,0.25)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    borderRadius: 'var(--sn-radius, 6px)',
    fontSize: '14px',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: 'var(--sn-text, #E8E6ED)',
    outline: 'none',
    transition: `all 300ms ${SN_SPRING}`,
  },
  searchInputFocus: {
    borderColor: 'rgba(62,125,148,0.4)',
    boxShadow: '0 0 0 2px rgba(62,125,148,0.15)',
  },
  typeSelect: {
    padding: '8px 12px',
    border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    borderRadius: 'var(--sn-radius, 6px)',
    fontSize: '14px',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
    color: 'var(--sn-text, #E8E6ED)',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '48px',
    color: 'var(--sn-text-muted, #7A7784)',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '64px 48px',
  },
  emptyText: {
    fontSize: '16px',
    color: 'var(--sn-text, #E8E6ED)',
    marginBottom: '8px',
  },
  emptyHint: {
    fontSize: '14px',
    color: 'var(--sn-text-muted, #7A7784)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  card: {
    padding: 0,
    transition: `all 300ms ${SN_SPRING}`,
  },
  cardActive: {
    transform: 'scale(0.995)',
  },
  cardInner: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
  },
  cardIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: 'rgba(78,123,142,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
    flexShrink: 0,
    color: 'var(--sn-accent, #3E7D94)',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '4px',
  },
  cardName: {
    fontWeight: 600,
    fontSize: '15px',
    color: 'var(--sn-text, #E8E6ED)',
    flex: 1,
    marginRight: '8px',
  },
  cardActions: {
    display: 'flex',
    gap: '4px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: '14px',
    color: 'var(--sn-text-muted, #7A7784)',
    transition: `color 200ms ${SN_SPRING}`,
  },
  iconBtnDelete: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: '18px',
    color: 'var(--sn-text-muted, #7A7784)',
    transition: 'color 0.1s',
    lineHeight: 1,
  },
  cardMeta: {
    display: 'flex',
    gap: '6px',
    marginBottom: '4px',
  },
  typeBadge: {
    fontSize: '11px',
    padding: '2px 6px',
    background: 'rgba(20,17,24,0.5)',
    borderRadius: '4px',
    color: 'var(--sn-text-muted, #7A7784)',
    textTransform: 'uppercase' as const,
  },
  scopeBadge: {
    fontSize: '11px',
    padding: '2px 6px',
    background: 'rgba(20,17,24,0.5)',
    borderRadius: '4px',
    color: 'var(--sn-text-muted, #7A7784)',
  },
  cardDesc: {
    fontSize: '13px',
    color: 'var(--sn-text-muted, #7A7784)',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cardDate: {
    fontSize: '12px',
    color: 'var(--sn-text-muted, #7A7784)',
    fontFamily: "'DM Mono', monospace",
  },
};
