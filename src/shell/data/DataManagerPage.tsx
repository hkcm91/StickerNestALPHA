/**
 * DataManagerPage — Main page for database management.
 *
 * Composes the database list, table view, AI assistant,
 * column editor, template selector, and Notion import.
 *
 * @module shell/data
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import type {
  DataSource,
  TableColumn,
  DatabaseTemplate,
  AISchemaGenerateResponse,
  AISuggestColumnResponse,
  AINaturalLanguageQueryResponse,
  AIExtractDataResponse,
} from '@sn/types';

import {
  createDataSource,
  updateDataSource,
  deleteDataSource,
  addColumn,
  updateColumn,
  removeColumn,
  addRows,
  applyTemplate,
  createDatabaseFromPrompt,
} from '../../kernel/datasource';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { useUIStore } from '../../kernel/stores/ui/ui.store';

import { PanelSlide } from '../components/PanelSlide';
import { AIAssistant } from './components/AIAssistant';
import { ColumnEditor } from './components/ColumnEditor';
import { DatabaseCreateModal } from './components/DatabaseCreateModal';
import { DatabaseList } from './components/DatabaseList';
import { NotionImport } from './components/NotionImport';
import { TableView } from './components/TableView';
import { TemplateSelector } from './components/TemplateSelector';
import { TodoManager } from './components/TodoManager';

// =============================================================================
// Types
// =============================================================================

type Tab = 'databases' | 'todos';

type View =
  | { type: 'list' }
  | { type: 'detail'; dataSource: DataSource };

type Modal =
  | null
  | { type: 'create' }
  | { type: 'template' }
  | { type: 'notion' }
  | { type: 'column-edit'; column?: TableColumn; dataSourceId: string }
  | { type: 'ai'; dataSourceId?: string };

// =============================================================================
// Constants
// =============================================================================

const SN_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

// =============================================================================
// Component
// =============================================================================

export const DataManagerPage: React.FC = () => {
  const user = useAuthStore((s: { user: { id: string } | null }) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<Tab>('databases');
  const [view, setView] = useState<View>({ type: 'list' });
  const [modal, setModal] = useState<Modal>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);

  const refresh = useCallback(() => setRefreshKey((k: number) => k + 1), []);

  // --- Navigation ---

  const goToList = useCallback(() => {
    setView({ type: 'list' });
    setShowAIPanel(false);
  }, []);

  const goToDetail = useCallback((dataSource: DataSource) => {
    setView({ type: 'detail', dataSource });
  }, []);

  // --- DataSource Operations ---

  const handleCreate = useCallback(async (name: string, type: DataSource['type']) => {
    if (!user) return;
    const result = await createDataSource(
      {
        type,
        ownerId: user.id,
        scope: 'user',
        schema: { columns: [], views: [] },
        metadata: { name },
      },
      user.id,
    );
    if (result.success) {
      addToast({ id: crypto.randomUUID(), type: 'success', message: `Database "${name}" created` });
      setModal(null);
      goToDetail(result.data);
    } else {
      addToast({ id: crypto.randomUUID(), type: 'error', message: result.error.message });
    }
  }, [user, goToDetail, addToast]);

  const handleRename = useCallback(async (id: string, name: string) => {
    if (!user) return;
    const result = await updateDataSource(id, { metadata: { name } }, user.id);
    if (result.success) {
      addToast({ id: crypto.randomUUID(), type: 'success', message: 'Database renamed' });
      refresh();
    } else {
      addToast({ id: crypto.randomUUID(), type: 'error', message: result.error.message });
    }
  }, [user, refresh, addToast]);

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return;
    const result = await deleteDataSource(id, user.id);
    if (result.success) {
      addToast({ id: crypto.randomUUID(), type: 'success', message: 'Database deleted' });
      refresh();
    } else {
      addToast({ id: crypto.randomUUID(), type: 'error', message: result.error.message });
    }
  }, [user, refresh, addToast]);

  // --- Template Applied ---

  const handleTemplateSelect = useCallback(
    async (template: DatabaseTemplate) => {
      if (!user) return;
      const result = await applyTemplate(template.id, user.id, {
        includeSampleRows: true,
      });
      if (result.success) {
        setModal(null);
        addToast({ id: crypto.randomUUID(), type: 'success', message: `Template "${template.name}" applied` });
        const { readDataSource } = await import('../../kernel/datasource');
        const ds = await readDataSource(result.data.dataSourceId, user.id);
        if (ds.success) goToDetail(ds.data);
      } else {
        addToast({ id: crypto.randomUUID(), type: 'error', message: result.error.message });
      }
    },
    [user, goToDetail, addToast],
  );

  // --- Notion Import ---

  const handleNotionImported = useCallback(
    async (dataSourceId: string) => {
      if (!user) return;
      setModal(null);
      addToast({ id: crypto.randomUUID(), type: 'success', message: 'Notion database imported' });
      const { readDataSource } = await import('../../kernel/datasource');
      const ds = await readDataSource(dataSourceId, user.id);
      if (ds.success) goToDetail(ds.data);
    },
    [user, goToDetail, addToast],
  );

  // --- Column Operations ---

  const handleColumnSave = useCallback(
    async (column: TableColumn) => {
      if (!user || modal?.type !== 'column-edit') return;
      const dsId = modal.dataSourceId;

      if (modal.column) {
        await updateColumn(dsId, column.id, {
          name: column.name,
          type: column.type,
          config: column.config,
        }, user.id);
      } else {
        await addColumn(dsId, column, user.id);
      }
      setModal(null);
      refresh();
    },
    [user, modal, refresh],
  );

  const handleColumnDelete = useCallback(async () => {
    if (!user || modal?.type !== 'column-edit' || !modal.column) return;
    await removeColumn(modal.dataSourceId, modal.column.id, user.id);
    setModal(null);
    refresh();
  }, [user, modal, refresh]);

  // --- AI Callbacks ---

  const handleSchemaGenerated = useCallback(
    async (schema: AISchemaGenerateResponse) => {
      if (!user) return;
      const result = await createDatabaseFromPrompt(
        schema.name ?? 'AI Database',
        user.id,
      );
      if (result.success) {
        addToast({ id: crypto.randomUUID(), type: 'success', message: 'AI Database created' });
        const { readDataSource } = await import('../../kernel/datasource');
        const ds = await readDataSource(result.data.dataSourceId, user.id);
        if (ds.success) goToDetail(ds.data);
      } else {
        addToast({ id: crypto.randomUUID(), type: 'error', message: result.error.message });
      }
    },
    [user, goToDetail, addToast],
  );

  const handleColumnSuggested = useCallback(
    async (suggestion: AISuggestColumnResponse) => {
      if (!user || view.type !== 'detail') return;
      await addColumn(view.dataSource.id, suggestion.column, user.id);
      addToast({ id: crypto.randomUUID(), type: 'success', message: `Column "${suggestion.column.name}" added` });
      refresh();
    },
    [user, view, refresh, addToast],
  );

  const handleQueryResult = useCallback(
    (result: AINaturalLanguageQueryResponse) => {
      // eslint-disable-next-line no-console
      console.log('[DataManager] AI query result:', result);
    },
    [],
  );

  const handleDataExtracted = useCallback(
    async (data: AIExtractDataResponse) => {
      if (!user || view.type !== 'detail') return;
      await addRows(view.dataSource.id, data.rows, user.id);
      addToast({ id: crypto.randomUUID(), type: 'success', message: `Extracted ${data.rows.length} rows` });
      refresh();
    },
    [user, view, refresh, addToast],
  );

  // --- Tab style helpers ---

  const getTabStyle = (tab: Tab): React.CSSProperties => ({
    ...styles.tab,
    ...(activeTab === tab ? styles.tabActive : {}),
    ...(hoveredTab === tab && activeTab !== tab ? styles.tabHover : {}),
  });

  // --- Render ---

  const currentDsId = view.type === 'detail' ? view.dataSource.id : undefined;

  return (
    <div data-testid="page-data" style={styles.page}>
      {/* Tab Navigation */}
      <div style={styles.tabBar}>
        <button
          style={getTabStyle('databases')}
          onMouseEnter={() => setHoveredTab('databases')}
          onMouseLeave={() => setHoveredTab(null)}
          onClick={() => {
            setActiveTab('databases');
            setView({ type: 'list' });
          }}
        >
          Databases
        </button>
        <button
          style={getTabStyle('todos')}
          onMouseEnter={() => setHoveredTab('todos')}
          onMouseLeave={() => setHoveredTab(null)}
          onClick={() => setActiveTab('todos')}
        >
          Todos
        </button>
      </div>

      {/* Main content area + AI sidebar */}
      <div style={styles.contentRow}>
        <div style={styles.main}>
          {activeTab === 'todos' ? (
            <TodoManager />
          ) : view.type === 'list' ? (
            <DatabaseList
              key={refreshKey}
              onSelect={goToDetail}
              onCreate={() => setModal({ type: 'create' })}
              onRename={handleRename}
              onDelete={handleDelete}
              onImportNotion={() => setModal({ type: 'notion' })}
              onUseTemplate={() => setModal({ type: 'template' })}
            />
          ) : (
            <TableView
              key={`${view.dataSource.id}-${refreshKey}`}
              dataSourceId={view.dataSource.id}
              onBack={goToList}
              onOpenAI={() => setShowAIPanel((v: boolean) => !v)}
              onColumnEdit={(col: TableColumn) =>
                setModal({
                  type: 'column-edit',
                  column: col,
                  dataSourceId: view.dataSource.id,
                })
              }
              onAddColumn={() =>
                setModal({
                  type: 'column-edit',
                  dataSourceId: view.dataSource.id,
                })
              }
            />
          )}
        </div>

        {/* AI Sidebar — curtain slide panel */}
        <PanelSlide open={showAIPanel} width={380} side="right">
          <AIAssistant
            dataSourceId={currentDsId}
            onSchemaGenerated={handleSchemaGenerated}
            onColumnSuggested={handleColumnSuggested}
            onQueryResult={handleQueryResult}
            onDataExtracted={handleDataExtracted}
            onAutofillComplete={refresh}
            onClose={() => setShowAIPanel(false)}
          />
        </PanelSlide>
      </div>

      {/* Modals */}
      {modal?.type === 'create' && (
        <DatabaseCreateModal
          onCreate={handleCreate}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'template' && (
        <TemplateSelector
          onSelect={handleTemplateSelect}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'notion' && (
        <NotionImport
          onImported={handleNotionImported}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'column-edit' && (
        <ColumnEditor
          column={modal.column}
          onSave={handleColumnSave}
          onDelete={modal.column ? handleColumnDelete : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--sn-bg-ground, #110E14)',
    fontFamily: "'Outfit', sans-serif",
    color: 'var(--sn-text, #E8E6ED)',
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(78,123,142,0.08)',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.82))',
    backdropFilter: 'blur(40px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(40px) saturate(1.3)',
    flexShrink: 0,
  },
  tab: {
    padding: '8px 16px',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderRadius: '0',
    background: 'transparent',
    color: 'var(--sn-text-muted, #7A7784)',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: "'Outfit', sans-serif",
    cursor: 'pointer',
    transition: `all 300ms ${SN_SPRING}`,
  },
  tabActive: {
    color: '#fff',
    borderBottomColor: 'var(--sn-accent, #3E7D94)',
    boxShadow: '0 2px 8px rgba(62,125,148,0.25)',
  },
  tabHover: {
    color: 'var(--sn-text, #E8E6ED)',
    transform: 'translateY(-1px)',
  },
  contentRow: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'auto',
  },
};
