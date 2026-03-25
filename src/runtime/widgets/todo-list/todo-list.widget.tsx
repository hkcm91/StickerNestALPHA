/**
 * Todo List Widget
 *
 * Inline built-in widget for managing task lists with priorities,
 * filtering, sorting, and persistent state.
 *
 * @module runtime/widgets/todo-list
 * @layer L3
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

import type { WidgetManifest } from '@sn/types';

import { useEmit, useSubscribe, useWidgetState } from '../../hooks';

import { TODO_EVENTS } from './todo-list.events';
import type { TodoItem, TodoPriority } from './todo-list.schema';
import { PRIORITY_LABELS, PRIORITY_ORDER } from './todo-list.schema';

// ── Unique ID generator ──────────────────────────────────────────

let idCounter = 0;
function uid(): string {
  return `td-${Date.now()}-${++idCounter}`;
}

// ── Inline SVG Icons ─────────────────────────────────────────────

const CheckIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EditIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M11.5 1.5l3 3L5 14H2v-3l9.5-9.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SortIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ── Filter types ─────────────────────────────────────────────────

type FilterTab = 'all' | 'active' | 'completed';
type SortBy = 'createdAt' | 'priority' | 'title';

// ── Widget Manifest ──────────────────────────────────────────────

export const todoListManifest: WidgetManifest = {
  id: 'sn.builtin.todo-list',
  name: 'Todo List',
  version: '1.0.0',
  description: 'Task manager with priorities, filtering, and sorting. Add, complete, edit, and organize your tasks with color-coded priority levels.',
  author: { name: 'StickerNest', url: 'https://stickernest.com' },
  category: 'productivity',
  tags: ['todo', 'tasks', 'productivity', 'checklist', 'organizer'],
  permissions: [],
  size: {
    defaultWidth: 360,
    defaultHeight: 480,
    minWidth: 280,
    minHeight: 300,
    aspectLocked: false,
  },
  license: 'MIT',
  config: { fields: [] },
  spatialSupport: false,
  entry: 'inline',
  crossCanvasChannels: [],
  events: {
    emits: [
      { name: TODO_EVENTS.emits.READY },
      { name: TODO_EVENTS.emits.ITEM_CREATED },
      { name: TODO_EVENTS.emits.ITEM_COMPLETED },
      { name: TODO_EVENTS.emits.ITEM_UNCOMPLETED },
      { name: TODO_EVENTS.emits.ITEM_DELETED },
      { name: TODO_EVENTS.emits.ITEM_UPDATED },
      { name: TODO_EVENTS.emits.LIST_CLEARED },
    ],
    subscribes: [
      { name: TODO_EVENTS.subscribes.ADD_ITEM },
      { name: TODO_EVENTS.subscribes.CLEAR_COMPLETED },
    ],
  },
};

// ── Main Component ───────────────────────────────────────────────

export const TodoListWidget: React.FC<{ instanceId: string }> = ({ instanceId }) => {
  const emit = useEmit();
  const [state, persistState] = useWidgetState(instanceId);

  // ── Hydrate state ────────────────────────────────────────────

  const [items, setItems] = useState<TodoItem[]>(() => {
    if (state.items && Array.isArray(state.items)) {
      return state.items as TodoItem[];
    }
    return [];
  });

  const [listTitle, setListTitle] = useState<string>(
    (state.listTitle as string) || 'My Tasks',
  );

  // ── UI state ─────────────────────────────────────────────────

  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TodoPriority>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isEditingListTitle, setIsEditingListTitle] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── Persist on change ────────────────────────────────────────

  useEffect(() => {
    persistState('items', items as any);
  }, [items, persistState]);

  useEffect(() => {
    persistState('listTitle', listTitle as any);
  }, [listTitle, persistState]);

  // ── Emit READY ───────────────────────────────────────────────

  useEffect(() => {
    emit(TODO_EVENTS.emits.READY, { instanceId, timestamp: Date.now() });
  }, [emit, instanceId]);

  // ── Focus edit input ─────────────────────────────────────────

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (isEditingListTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingListTitle]);

  // ── Actions ──────────────────────────────────────────────────

  const addItem = useCallback((title: string, priority: TodoPriority = 'none') => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const item: TodoItem = {
      id: uid(),
      title: trimmed,
      completed: false,
      priority,
      category: '',
      createdAt: Date.now(),
      notes: '',
    };

    setItems(prev => [item, ...prev]);
    emit(TODO_EVENTS.emits.ITEM_CREATED, {
      instanceId,
      itemId: item.id,
      title: item.title,
      priority: item.priority,
      timestamp: Date.now(),
    });
  }, [emit, instanceId]);

  const toggleItem = useCallback((id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const toggled = {
        ...item,
        completed: !item.completed,
        completedAt: !item.completed ? Date.now() : undefined,
      };

      emit(
        toggled.completed
          ? TODO_EVENTS.emits.ITEM_COMPLETED
          : TODO_EVENTS.emits.ITEM_UNCOMPLETED,
        {
          instanceId,
          itemId: id,
          title: item.title,
          timestamp: Date.now(),
        },
      );

      return toggled;
    }));
  }, [emit, instanceId]);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    emit(TODO_EVENTS.emits.ITEM_DELETED, {
      instanceId,
      itemId: id,
      timestamp: Date.now(),
    });
  }, [emit, instanceId]);

  const updateItem = useCallback((id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, title: trimmed } : item,
    ));
    setEditingId(null);
    emit(TODO_EVENTS.emits.ITEM_UPDATED, {
      instanceId,
      itemId: id,
      title: trimmed,
      timestamp: Date.now(),
    });
  }, [emit, instanceId]);

  const clearCompleted = useCallback(() => {
    const completedCount = items.filter(i => i.completed).length;
    if (completedCount === 0) return;

    setItems(prev => prev.filter(i => !i.completed));
    emit(TODO_EVENTS.emits.LIST_CLEARED, {
      instanceId,
      clearedCount: completedCount,
      timestamp: Date.now(),
    });
  }, [items, emit, instanceId]);

  const cyclePriority = useCallback((id: string) => {
    const order: TodoPriority[] = ['none', 'low', 'medium', 'high'];
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const idx = order.indexOf(item.priority);
      const next = order[(idx + 1) % order.length];
      emit(TODO_EVENTS.emits.ITEM_UPDATED, {
        instanceId,
        itemId: id,
        title: item.title,
        priority: next,
        timestamp: Date.now(),
      });
      return { ...item, priority: next };
    }));
  }, [emit, instanceId]);

  // ── Subscribe to commands ────────────────────────────────────

  useSubscribe(TODO_EVENTS.subscribes.ADD_ITEM, useCallback((payload: unknown) => {
    const p = payload as { title?: string; priority?: string };
    if (p?.title) {
      addItem(p.title, (p.priority as TodoPriority) || 'none');
    }
  }, [addItem]));

  useSubscribe(TODO_EVENTS.subscribes.CLEAR_COMPLETED, useCallback(() => {
    clearCompleted();
  }, [clearCompleted]));

  // ── Filter + sort ────────────────────────────────────────────

  const filtered = items.filter(item => {
    if (filter === 'active') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    return b.createdAt - a.createdAt;
  });

  // ── Counts ───────────────────────────────────────────────────

  const activeCount = items.filter(i => !i.completed).length;
  const completedCount = items.filter(i => i.completed).length;

  // ── Handlers ─────────────────────────────────────────────────

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addItem(newTitle, newPriority);
    setNewTitle('');
    setNewPriority('none');
    inputRef.current?.focus();
  };

  const handleEditSubmit = (id: string) => {
    updateItem(id, editingTitle);
  };

  const startEdit = (item: TodoItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const priorityDot = (p: TodoPriority) => {
    const colors: Record<TodoPriority, string> = {
      high: '#ef4444',
      medium: '#eab308',
      low: '#22c55e',
      none: '#9ca3af',
    };
    return colors[p];
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        {isEditingListTitle ? (
          <input
            ref={titleInputRef}
            style={styles.titleInput}
            value={listTitle}
            onChange={e => setListTitle(e.target.value)}
            onBlur={() => setIsEditingListTitle(false)}
            onKeyDown={e => {
              if (e.key === 'Enter') setIsEditingListTitle(false);
              if (e.key === 'Escape') setIsEditingListTitle(false);
            }}
          />
        ) : (
          <h2
            style={styles.title}
            onDoubleClick={() => setIsEditingListTitle(true)}
            title="Double-click to rename"
          >
            {listTitle}
          </h2>
        )}
        <div style={styles.headerActions}>
          <button
            style={styles.iconBtn}
            onClick={() => setShowSortMenu(!showSortMenu)}
            title="Sort"
          >
            <SortIcon />
          </button>
        </div>
      </div>

      {/* Sort dropdown */}
      {showSortMenu && (
        <div style={styles.sortMenu}>
          {(['createdAt', 'priority', 'title'] as SortBy[]).map(s => (
            <button
              key={s}
              style={{
                ...styles.sortOption,
                ...(sortBy === s ? styles.sortOptionActive : {}),
              }}
              onClick={() => { setSortBy(s); setShowSortMenu(false); }}
            >
              {s === 'createdAt' ? 'Date Created' : s === 'priority' ? 'Priority' : 'Title'}
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={styles.filterBar}>
        {(['all', 'active', 'completed'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            style={{
              ...styles.filterTab,
              ...(filter === tab ? styles.filterTabActive : {}),
            }}
            onClick={() => setFilter(tab)}
          >
            {tab === 'all' ? `All (${items.length})` : tab === 'active' ? `Active (${activeCount})` : `Done (${completedCount})`}
          </button>
        ))}
      </div>

      {/* Add form */}
      <form onSubmit={handleAddSubmit} style={styles.addForm}>
        <input
          ref={inputRef}
          style={styles.addInput}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add a task..."
        />
        <button
          type="button"
          style={{
            ...styles.priorityBtn,
            color: priorityDot(newPriority),
          }}
          onClick={() => {
            const order: TodoPriority[] = ['none', 'low', 'medium', 'high'];
            const idx = order.indexOf(newPriority);
            setNewPriority(order[(idx + 1) % order.length]);
          }}
          title={`Priority: ${PRIORITY_LABELS[newPriority]}`}
        >
          ●
        </button>
        <button
          type="submit"
          style={styles.addBtn}
          disabled={!newTitle.trim()}
          title="Add task"
        >
          <PlusIcon />
        </button>
      </form>

      {/* Items list */}
      <div style={styles.list}>
        {sorted.length === 0 && (
          <div style={styles.empty}>
            {filter === 'all'
              ? 'No tasks yet. Add one above!'
              : filter === 'active'
                ? 'No active tasks.'
                : 'No completed tasks.'}
          </div>
        )}

        {sorted.map(item => (
          <div
            key={item.id}
            style={{
              ...styles.item,
              ...(item.completed ? styles.itemCompleted : {}),
            }}
          >
            {/* Checkbox */}
            <button
              style={{
                ...styles.checkbox,
                ...(item.completed ? styles.checkboxChecked : {}),
              }}
              onClick={() => toggleItem(item.id)}
              title={item.completed ? 'Mark as active' : 'Mark as complete'}
            >
              {item.completed && <CheckIcon size={12} />}
            </button>

            {/* Priority dot */}
            <button
              style={{ ...styles.dot, color: priorityDot(item.priority) }}
              onClick={() => cyclePriority(item.id)}
              title={`Priority: ${PRIORITY_LABELS[item.priority]} (click to cycle)`}
            >
              ●
            </button>

            {/* Title */}
            {editingId === item.id ? (
              <input
                ref={editInputRef}
                style={styles.editInput}
                value={editingTitle}
                onChange={e => setEditingTitle(e.target.value)}
                onBlur={() => handleEditSubmit(item.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleEditSubmit(item.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <span
                style={{
                  ...styles.itemTitle,
                  ...(item.completed ? styles.itemTitleDone : {}),
                }}
                onDoubleClick={() => startEdit(item)}
                title="Double-click to edit"
              >
                {item.title}
              </span>
            )}

            {/* Actions */}
            <div style={styles.itemActions}>
              <button
                style={styles.itemBtn}
                onClick={() => startEdit(item)}
                title="Edit"
              >
                <EditIcon />
              </button>
              <button
                style={{ ...styles.itemBtn, ...styles.deleteBtn }}
                onClick={() => deleteItem(item.id)}
                title="Delete"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.footerText}>
          {activeCount} task{activeCount !== 1 ? 's' : ''} remaining
        </span>
        {completedCount > 0 && (
          <button
            style={styles.clearBtn}
            onClick={clearCompleted}
          >
            Clear completed ({completedCount})
          </button>
        )}
      </div>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--sn-surface, #1e1e2e)',
    color: 'var(--sn-text, #cdd6f4)',
    fontFamily: 'var(--sn-font-family, system-ui, -apple-system, sans-serif)',
    borderRadius: 'var(--sn-radius, 8px)',
    overflow: 'hidden',
    fontSize: 13,
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px 4px',
    gap: 8,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--sn-text, #cdd6f4)',
    cursor: 'default',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: 700,
    background: 'var(--sn-bg, #181825)',
    color: 'var(--sn-text, #cdd6f4)',
    border: '1px solid var(--sn-accent, #cba6f7)',
    borderRadius: 4,
    padding: '2px 6px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  headerActions: {
    display: 'flex',
    gap: 4,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--sn-text-muted, #6c7086)',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
  },

  // Sort menu
  sortMenu: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--sn-bg, #181825)',
    border: '1px solid var(--sn-border, #313244)',
    borderRadius: 6,
    margin: '0 14px 4px',
    overflow: 'hidden',
  },
  sortOption: {
    background: 'none',
    border: 'none',
    color: 'var(--sn-text, #cdd6f4)',
    padding: '6px 12px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: 12,
    fontFamily: 'inherit',
  },
  sortOptionActive: {
    background: 'var(--sn-accent, #cba6f7)',
    color: '#000',
    fontWeight: 600,
  },

  // Filter bar
  filterBar: {
    display: 'flex',
    gap: 2,
    padding: '4px 14px 8px',
  },
  filterTab: {
    flex: 1,
    background: 'var(--sn-bg, #181825)',
    color: 'var(--sn-text-muted, #6c7086)',
    border: '1px solid var(--sn-border, #313244)',
    borderRadius: 6,
    padding: '5px 0',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 500,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  filterTabActive: {
    background: 'var(--sn-accent, #cba6f7)',
    color: '#000',
    borderColor: 'var(--sn-accent, #cba6f7)',
    fontWeight: 700,
  },

  // Add form
  addForm: {
    display: 'flex',
    gap: 6,
    padding: '0 14px 10px',
    alignItems: 'center',
  },
  addInput: {
    flex: 1,
    background: 'var(--sn-bg, #181825)',
    color: 'var(--sn-text, #cdd6f4)',
    border: '1px solid var(--sn-border, #313244)',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  },
  priorityBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 2px',
    lineHeight: 1,
  },
  addBtn: {
    background: 'var(--sn-accent, #cba6f7)',
    color: '#000',
    border: 'none',
    borderRadius: 6,
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
  },

  // Item list
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  empty: {
    textAlign: 'center' as const,
    color: 'var(--sn-text-muted, #6c7086)',
    padding: '24px 0',
    fontSize: 13,
  },

  // Single item
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 8px',
    borderRadius: 6,
    background: 'var(--sn-bg, #181825)',
    border: '1px solid var(--sn-border, #313244)',
    transition: 'opacity 0.15s',
  },
  itemCompleted: {
    opacity: 0.55,
  },

  // Checkbox
  checkbox: {
    width: 18,
    height: 18,
    minWidth: 18,
    borderRadius: 4,
    border: '2px solid var(--sn-border, #313244)',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    color: 'var(--sn-text, #cdd6f4)',
    transition: 'all 0.15s',
  },
  checkboxChecked: {
    background: 'var(--sn-accent, #cba6f7)',
    borderColor: 'var(--sn-accent, #cba6f7)',
    color: '#000',
  },

  // Priority dot
  dot: {
    background: 'none',
    border: 'none',
    fontSize: 10,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },

  // Item title
  itemTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'default',
    fontSize: 13,
  },
  itemTitleDone: {
    textDecoration: 'line-through',
    color: 'var(--sn-text-muted, #6c7086)',
  },
  editInput: {
    flex: 1,
    background: 'var(--sn-surface, #1e1e2e)',
    color: 'var(--sn-text, #cdd6f4)',
    border: '1px solid var(--sn-accent, #cba6f7)',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  },

  // Item actions
  itemActions: {
    display: 'flex',
    gap: 2,
    opacity: 0.4,
    transition: 'opacity 0.15s',
  },
  itemBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--sn-text-muted, #6c7086)',
    cursor: 'pointer',
    padding: 3,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
  },
  deleteBtn: {
    color: '#f38ba8',
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderTop: '1px solid var(--sn-border, #313244)',
    fontSize: 11,
  },
  footerText: {
    color: 'var(--sn-text-muted, #6c7086)',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--sn-accent, #cba6f7)',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'inherit',
    fontWeight: 500,
    padding: '2px 4px',
  },
};
