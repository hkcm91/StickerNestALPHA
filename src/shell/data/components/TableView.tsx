/**
 * TableView — Spreadsheet-like table view for a table DataSource.
 *
 * Renders columns as headers and rows as editable cells.
 * Supports sorting, filtering, and inline cell editing.
 *
 * @module shell/data
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  TableColumn,
  TableRow,
  TableSchema,
  CellValue,
  SortRule,
  DatabaseView,
} from '@sn/types';

import {
  getTableSchema,
  getTableRows,
  addRow,
  updateRow,
  deleteRow,
  queryTableRows,
} from '../../../kernel/datasource';
import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

// =============================================================================
// Constants
// =============================================================================

const SN_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

// =============================================================================
// Types
// =============================================================================

export interface TableViewProps {
  dataSourceId: string;
  onBack: () => void;
  onOpenAI: () => void;
  onColumnEdit: (column: TableColumn) => void;
  onAddColumn: () => void;
}

interface EditingCell {
  rowId: string;
  columnId: string;
}

// =============================================================================
// Component
// =============================================================================

export const TableView: React.FC<TableViewProps> = ({
  dataSourceId,
  onBack,
  onOpenAI,
  onColumnEdit,
  onAddColumn,
}: TableViewProps) => {
  const user = useAuthStore((s: { user: { id: string } | null }) => s.user);
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [activeView, setActiveView] = useState<DatabaseView | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  // Load schema and rows
  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const [schemaResult, rowsResult] = await Promise.all([
      getTableSchema(dataSourceId, user.id),
      sorts.length
        ? queryTableRows(dataSourceId, user.id, { sorts })
        : getTableRows(dataSourceId, user.id),
    ]);

    if (schemaResult.success) setSchema(schemaResult.data);
    if (rowsResult.success) {
      setRows('rows' in rowsResult.data ? rowsResult.data.rows : rowsResult.data);
    }
    setIsLoading(false);
  }, [dataSourceId, user, sorts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sorted columns by order
  const columns = useMemo(
    () => (schema?.columns ?? []).sort((a: TableColumn, b: TableColumn) => a.order - b.order),
    [schema],
  );

  // Column sort toggle
  const toggleSort = useCallback(
    (columnId: string) => {
      setSorts((prev: SortRule[]) => {
        const existing = prev.find((s: SortRule) => s.columnId === columnId);
        if (!existing) return [{ columnId, direction: 'asc' as const }];
        if (existing.direction === 'asc')
          return [{ columnId, direction: 'desc' as const }];
        return [];
      });
    },
    [],
  );

  // Start editing a cell
  const startEdit = useCallback(
    (rowId: string, columnId: string, currentValue: CellValue) => {
      setEditingCell({ rowId, columnId });
      setEditValue(currentValue?.toString() ?? '');
    },
    [],
  );

  // Commit cell edit
  const commitEdit = useCallback(async () => {
    if (!editingCell || !user) return;

    const column = columns.find((c: TableColumn) => c.id === editingCell.columnId);
    let value: CellValue = editValue;

    if (column) {
      if (column.type === 'number') value = editValue ? Number(editValue) : null;
      else if (column.type === 'checkbox') value = editValue === 'true';
    }

    const result = await updateRow(
      dataSourceId,
      editingCell.rowId,
      { [editingCell.columnId]: value },
      user.id,
    );

    if (result.success) {
      setRows((prev: TableRow[]) =>
        prev.map((r: TableRow) =>
          r.id === editingCell.rowId
            ? { ...r, cells: { ...r.cells, [editingCell.columnId]: value } }
            : r,
        ),
      );
    }

    setEditingCell(null);
  }, [editingCell, editValue, dataSourceId, user, columns]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Add new row
  const handleAddRow = useCallback(async () => {
    if (!user) return;
    const result = await addRow(dataSourceId, {}, user.id);
    if (result.success) {
      setRows((prev: TableRow[]) => [...prev, result.data]);
    }
  }, [dataSourceId, user]);

  // Delete row
  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      if (!user) return;
      const result = await deleteRow(dataSourceId, rowId, user.id);
      if (result.success) {
        setRows((prev: TableRow[]) => prev.filter((r: TableRow) => r.id !== rowId));
      }
    },
    [dataSourceId, user],
  );

  // Key handler for cell editing
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitEdit();
      else if (e.key === 'Escape') cancelEdit();
    },
    [commitEdit, cancelEdit],
  );

  if (isLoading) {
    return (
      <div data-testid="table-loading" style={styles.loading}>
        Loading table...
      </div>
    );
  }

  return (
    <div data-testid="table-view" style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <button
          data-testid="btn-back"
          onClick={onBack}
          style={{
            ...styles.glassBtn,
            ...(hoveredBtn === 'back' ? styles.glassBtnHover : {}),
          }}
          onMouseEnter={() => setHoveredBtn('back')}
          onMouseLeave={() => setHoveredBtn(null)}
        >
          Back
        </button>
        <h2 style={styles.tableName}>
          {schema?.columns?.[0]?.name ?? 'Table'}
        </h2>
        <div style={styles.toolbarActions}>
          <button
            data-testid="btn-ai-assist"
            onClick={onOpenAI}
            style={{
              ...styles.chromeBtn,
              ...(hoveredBtn === 'ai' ? styles.chromeBtnHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn('ai')}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            AI Assistant
          </button>
          <button
            data-testid="btn-add-row"
            onClick={handleAddRow}
            style={{
              ...styles.accentBtn,
              ...(hoveredBtn === 'addrow' ? styles.accentBtnHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn('addrow')}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            + Row
          </button>
        </div>
      </div>

      {/* View tabs */}
      {schema?.views && schema.views.length > 0 && (
        <div style={styles.viewTabs}>
          {schema.views.map((view: DatabaseView) => (
            <button
              key={view.id}
              data-testid={`view-tab-${view.id}`}
              onClick={() => setActiveView(view)}
              style={{
                ...styles.viewTab,
                ...(activeView?.id === view.id ? styles.viewTabActive : {}),
              }}
            >
              {view.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={styles.tableWrapper}>
        {columns.length === 0 ? (
          <div data-testid="empty-columns" style={styles.emptyColumns}>
            <h3 style={{ color: 'var(--sn-text, #E8E6ED)', margin: '0 0 8px' }}>No columns in this database</h3>
            <p style={{ color: 'var(--sn-text-muted, #7A7784)', margin: '0 0 16px' }}>
              Add your first column to start entering data, or use the AI Assistant to generate a schema for you.
            </p>
            <div style={styles.emptyActions}>
              <button
                data-testid="btn-add-first-column"
                onClick={onAddColumn}
                style={styles.accentBtn}
              >
                + Add Column
              </button>
              <button
                onClick={onOpenAI}
                style={styles.chromeBtn}
              >
                Ask AI Assistant
              </button>
            </div>
          </div>
        ) : (
          <table data-testid="data-table" style={styles.table}>
            <thead>
              <tr>
                {columns.map((col: TableColumn) => (
                  <th
                    key={col.id}
                    data-testid={`col-header-${col.id}`}
                    style={styles.th}
                  >
                    <button
                      onClick={() => toggleSort(col.id)}
                      style={styles.headerBtn}
                    >
                      {col.name}
                      <span style={styles.sortIndicator}>
                        {sorts.find((s: SortRule) => s.columnId === col.id)?.direction === 'asc'
                          ? ' ^'
                          : sorts.find((s: SortRule) => s.columnId === col.id)?.direction === 'desc'
                            ? ' v'
                            : ''}
                      </span>
                    </button>
                    <button
                      data-testid={`col-edit-${col.id}`}
                      onClick={() => onColumnEdit(col)}
                      style={styles.colEditBtn}
                      title="Edit column"
                    >
                      ...
                    </button>
                  </th>
                ))}
                <th style={styles.thAction}>
                  <button
                    data-testid="btn-add-column"
                    onClick={onAddColumn}
                    style={styles.addColBtn}
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: TableRow) => (
                <tr
                  key={row.id}
                  data-testid={`row-${row.id}`}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={hoveredRow === row.id ? styles.trHover : undefined}
                >
                  {columns.map((col: TableColumn) => {
                    const isEditing =
                      editingCell?.rowId === row.id &&
                      editingCell?.columnId === col.id;
                    const value = row.cells[col.id];

                    return (
                      <td
                        key={col.id}
                        data-testid={`cell-${row.id}-${col.id}`}
                        style={styles.td}
                        onDoubleClick={() => startEdit(row.id, col.id, value)}
                      >
                        {isEditing ? (
                          <input
                            data-testid="cell-editor"
                            type={col.type === 'number' ? 'number' : col.type === 'checkbox' ? 'checkbox' : 'text'}
                            value={editValue}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEditValue(
                                col.type === 'checkbox'
                                  ? String(e.target.checked)
                                  : e.target.value,
                              )
                            }
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            style={styles.cellInput}
                          />
                        ) : (
                          <span style={styles.cellValue}>
                            {renderCellValue(value, col)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td style={styles.tdAction}>
                    <button
                      data-testid={`btn-delete-row-${row.id}`}
                      onClick={() => handleDeleteRow(row.id)}
                      style={styles.deleteRowBtn}
                      title="Delete row"
                    >
                      x
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {columns.length > 0 && rows.length === 0 && (
        <div style={styles.emptyTable}>
          <p style={{ color: 'var(--sn-text-muted, #7A7784)', margin: 0 }}>
            No rows yet. Click "+ Row" to add data.
          </p>
        </div>
      )}
    </div>
  );
};

function renderCellValue(value: CellValue, _column: TableColumn): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && 'start' in value) {
    return value.end ? `${value.start} - ${value.end}` : value.start;
  }
  return String(value);
}

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  loading: {
    padding: '48px',
    textAlign: 'center' as const,
    color: 'var(--sn-text-muted, #7A7784)',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 24px',
    borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.82))',
    backdropFilter: 'blur(40px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(40px) saturate(1.3)',
  },
  glassBtn: {
    padding: '6px 12px',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
    border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    borderRadius: 'var(--sn-radius, 6px)',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--sn-text, #E8E6ED)',
    transition: `all 300ms ${SN_SPRING}`,
  },
  glassBtnHover: {
    borderColor: 'rgba(78,123,142,0.25)',
    transform: 'translateY(-1px)',
  },
  tableName: {
    flex: 1,
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    color: 'var(--sn-text, #E8E6ED)',
  },
  toolbarActions: {
    display: 'flex',
    gap: '8px',
  },
  chromeBtn: {
    padding: '6px 14px',
    background: 'linear-gradient(145deg, var(--sn-accent, #3E7D94), #2E6070)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--sn-radius, 6px)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    boxShadow: '0 0 10px rgba(62,125,148,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
    transition: `all 300ms ${SN_SPRING}`,
  },
  chromeBtnHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 0 16px rgba(62,125,148,0.35), 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
  },
  accentBtn: {
    padding: '6px 14px',
    background: 'var(--sn-accent, #3E7D94)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--sn-radius, 6px)',
    cursor: 'pointer',
    fontSize: '13px',
    transition: `all 300ms ${SN_SPRING}`,
  },
  accentBtnHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(62,125,148,0.25)',
  },
  viewTabs: {
    display: 'flex',
    gap: '4px',
    padding: '8px 24px',
    borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.6))',
  },
  viewTab: {
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--sn-text-muted, #7A7784)',
    transition: `all 300ms ${SN_SPRING}`,
  },
  viewTabActive: {
    borderBottomColor: 'var(--sn-accent, #3E7D94)',
    color: 'var(--sn-text, #E8E6ED)',
    fontWeight: 600,
  },
  tableWrapper: {
    flex: 1,
    overflow: 'auto',
    padding: '0 24px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    borderBottom: '2px solid var(--sn-border, rgba(255,255,255,0.08))',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
    backdropFilter: 'blur(20px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
    position: 'sticky' as const,
    top: 0,
    whiteSpace: 'nowrap' as const,
    zIndex: 1,
  },
  thAction: {
    width: '40px',
    padding: '8px',
    textAlign: 'center' as const,
    borderBottom: '2px solid var(--sn-border, rgba(255,255,255,0.08))',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
    backdropFilter: 'blur(20px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
  },
  headerBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    color: 'var(--sn-text, #E8E6ED)',
    padding: 0,
    fontFamily: "'DM Mono', monospace",
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  sortIndicator: {
    color: 'var(--sn-accent, #3E7D94)',
    marginLeft: '4px',
  },
  colEditBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'var(--sn-text-muted, #7A7784)',
    padding: '2px 4px',
    marginLeft: '4px',
  },
  addColBtn: {
    background: 'none',
    border: '1px dashed var(--sn-border, rgba(255,255,255,0.12))',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '2px 8px',
    fontSize: '14px',
    color: 'var(--sn-text-muted, #7A7784)',
  },
  trHover: {
    background: 'rgba(78,123,142,0.04)',
    boxShadow: 'inset 0 0 0 1px rgba(78,123,142,0.06)',
  },
  td: {
    padding: '6px 12px',
    borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.04))',
    cursor: 'text',
    minWidth: '120px',
    color: 'var(--sn-text, #E8E6ED)',
    transition: 'background 150ms ease',
  },
  tdAction: {
    width: '40px',
    padding: '6px',
    textAlign: 'center' as const,
    borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.04))',
  },
  cellValue: {
    display: 'block',
    minHeight: '20px',
    color: 'var(--sn-text, #E8E6ED)',
  },
  cellInput: {
    width: '100%',
    padding: '4px 6px',
    border: '2px solid var(--sn-accent, #3E7D94)',
    borderRadius: '3px',
    fontSize: '14px',
    outline: 'none',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
    color: 'var(--sn-text, #E8E6ED)',
    boxShadow: '0 0 8px rgba(62,125,148,0.2)',
  },
  deleteRowBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--sn-text-muted, #7A7784)',
    fontSize: '14px',
    padding: '2px 6px',
    transition: 'color 150ms',
  },
  emptyTable: {
    textAlign: 'center' as const,
    padding: '32px',
  },
  emptyColumns: {
    textAlign: 'center' as const,
    padding: '64px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  emptyActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },
};
