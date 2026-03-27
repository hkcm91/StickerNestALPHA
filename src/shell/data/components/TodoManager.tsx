/**
 * TodoManager — Personal to-do list with priorities and due dates.
 *
 * @module shell/data
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { supabase } from '../../../kernel/supabase';

// =============================================================================
// Types
// =============================================================================

type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';
type FilterType = 'all' | 'active' | 'completed';

interface Todo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  priority: TodoPriority;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface TodoFormData {
  title: string;
  description: string;
  priority: TodoPriority;
  due_date: string;
}

// =============================================================================
// Priority Config
// =============================================================================

const PRIORITY_CONFIG: Record<TodoPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: '#5AA878', bg: 'rgba(90,168,120,0.1)' },
  medium: { label: 'Medium', color: '#4E7B8E', bg: 'rgba(78,123,142,0.1)' },
  high: { label: 'High', color: '#E8806C', bg: 'rgba(232,128,108,0.1)' },
  urgent: { label: 'Urgent', color: '#C85858', bg: 'rgba(200,88,88,0.15)' },
};

// =============================================================================
// Component
// =============================================================================

export const TodoManager: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [formData, setFormData] = useState<TodoFormData>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
  });

  // --- Load Todos ---
  const loadTodos = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      addToast({ id: crypto.randomUUID(), type: 'error', message: error.message });
    } else {
      setTodos((data as Todo[]) || []);
    }
    setIsLoading(false);
  }, [user, addToast]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // --- Filtered Todos ---
  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter((t) => !t.is_completed);
      case 'completed':
        return todos.filter((t) => t.is_completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  // --- Stats ---
  const stats = useMemo(() => ({
    total: todos.length,
    active: todos.filter((t) => !t.is_completed).length,
    completed: todos.filter((t) => t.is_completed).length,
  }), [todos]);

  // --- Form Handlers ---
  const resetForm = useCallback(() => {
    setFormData({ title: '', description: '', priority: 'medium', due_date: '' });
    setEditingTodo(null);
    setShowForm(false);
  }, []);

  const openEditForm = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority,
      due_date: todo.due_date ? todo.due_date.split('T')[0] : '',
    });
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim()) return;

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      priority: formData.priority,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
    };

    if (editingTodo) {
      // Update
      const { error } = await supabase
        .from('todos')
        .update(payload)
        .eq('id', editingTodo.id);

      if (error) {
        addToast({ id: crypto.randomUUID(), type: 'error', message: error.message });
      } else {
        addToast({ id: crypto.randomUUID(), type: 'success', message: 'Todo updated' });
        resetForm();
        loadTodos();
      }
    } else {
      // Create
      const { error } = await supabase
        .from('todos')
        .insert({ ...payload, user_id: user.id });

      if (error) {
        addToast({ id: crypto.randomUUID(), type: 'error', message: error.message });
      } else {
        addToast({ id: crypto.randomUUID(), type: 'success', message: 'Todo created' });
        resetForm();
        loadTodos();
      }
    }
  }, [user, formData, editingTodo, addToast, resetForm, loadTodos]);

  // --- Toggle Complete ---
  const toggleComplete = useCallback(async (todo: Todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_completed: !todo.is_completed })
      .eq('id', todo.id);

    if (error) {
      addToast({ id: crypto.randomUUID(), type: 'error', message: error.message });
    } else {
      loadTodos();
    }
  }, [addToast, loadTodos]);

  // --- Delete ---
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this todo?')) return;

    const { error } = await supabase.from('todos').delete().eq('id', id);

    if (error) {
      addToast({ id: crypto.randomUUID(), type: 'error', message: error.message });
    } else {
      addToast({ id: crypto.randomUUID(), type: 'success', message: 'Todo deleted' });
      loadTodos();
    }
  }, [addToast, loadTodos]);

  // --- Format Due Date ---
  const formatDueDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', color: '#C85858' };
    if (diffDays === 0) return { text: 'Today', color: '#E8806C' };
    if (diffDays === 1) return { text: 'Tomorrow', color: '#4E7B8E' };
    return { text: d.toLocaleDateString(), color: '#6b7280' };
  };

  // --- Render ---
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Todos</h1>
          <p style={styles.subtitle}>
            {stats.active} active, {stats.completed} completed
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={styles.addBtn}
        >
          + Add Todo
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterBtn,
              ...(filter === f ? styles.filterBtnActive : {}),
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && ` (${stats.total})`}
            {f === 'active' && ` (${stats.active})`}
            {f === 'completed' && ` (${stats.completed})`}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="What needs to be done?"
            value={formData.title}
            onChange={(e) => setFormData((d) => ({ ...d, title: e.target.value }))}
            style={styles.input}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
            style={styles.textarea}
            rows={2}
          />
          <div style={styles.formRow}>
            <select
              value={formData.priority}
              onChange={(e) => setFormData((d) => ({ ...d, priority: e.target.value as TodoPriority }))}
              style={styles.select}
            >
              {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label} Priority</option>
              ))}
            </select>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData((d) => ({ ...d, due_date: e.target.value }))}
              style={styles.dateInput}
            />
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={resetForm} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn}>
              {editingTodo ? 'Update' : 'Add'} Todo
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <div style={styles.loading}>Loading...</div>
      ) : filteredTodos.length === 0 ? (
        <div style={styles.empty}>
          {filter === 'all' ? 'No todos yet. Add one above!' : `No ${filter} todos.`}
        </div>
      ) : (
        <div style={styles.list}>
          {filteredTodos.map((todo) => {
            const due = formatDueDate(todo.due_date);
            const priority = PRIORITY_CONFIG[todo.priority];

            return (
              <div
                key={todo.id}
                style={{
                  ...styles.todoItem,
                  opacity: todo.is_completed ? 0.6 : 1,
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(todo)}
                  style={{
                    ...styles.checkbox,
                    background: todo.is_completed ? '#10b981' : 'transparent',
                    borderColor: todo.is_completed ? '#10b981' : '#d1d5db',
                  }}
                >
                  {todo.is_completed && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" fill="none" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div style={styles.todoContent}>
                  <div style={styles.todoHeader}>
                    <span
                      style={{
                        ...styles.todoTitle,
                        textDecoration: todo.is_completed ? 'line-through' : 'none',
                      }}
                    >
                      {todo.title}
                    </span>
                    <span
                      style={{
                        ...styles.priorityBadge,
                        color: priority.color,
                        background: priority.bg,
                      }}
                    >
                      {priority.label}
                    </span>
                  </div>
                  {todo.description && (
                    <p style={styles.todoDesc}>{todo.description}</p>
                  )}
                  {due && (
                    <span style={{ ...styles.dueDate, color: due.color }}>
                      Due: {due.text}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={styles.todoActions}>
                  <button
                    onClick={() => openEditForm(todo)}
                    style={styles.actionBtn}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    style={{ ...styles.actionBtn, color: '#dc2626' }}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--sn-text, #E8E6ED)',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '14px',
    color: 'var(--sn-text-muted, #7A7784)',
  },
  addBtn: {
    padding: '10px 20px',
    background: 'var(--sn-accent, #3E7D94)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  filterBtn: {
    padding: '8px 16px',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
    border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    color: 'var(--sn-text-muted, #6b7280)',
  },
  filterBtnActive: {
    background: 'var(--sn-accent, #2563eb)',
    borderColor: 'var(--sn-accent, #2563eb)',
    color: '#fff',
  },
  form: {
    background: 'var(--sn-surface, #f9fafb)',
    border: '1px solid var(--sn-border, #e5e7eb)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid var(--sn-border, #e5e7eb)',
    borderRadius: '8px',
    fontSize: '16px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid var(--sn-border, #e5e7eb)',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '12px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  select: {
    flex: 1,
    padding: '10px',
    border: '1px solid var(--sn-border, #e5e7eb)',
    borderRadius: '8px',
    fontSize: '14px',
  },
  dateInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid var(--sn-border, #e5e7eb)',
    borderRadius: '8px',
    fontSize: '14px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid var(--sn-border, #e5e7eb)',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 20px',
    background: 'var(--sn-accent, #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--sn-text-muted, #6b7280)',
  },
  empty: {
    padding: '60px 40px',
    textAlign: 'center',
    color: 'var(--sn-text-muted, #6b7280)',
    background: 'var(--sn-surface, #f9fafb)',
    borderRadius: '12px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  todoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
    border: '1px solid var(--sn-border, #e5e7eb)',
    borderRadius: '12px',
  },
  checkbox: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    marginTop: '2px',
  },
  todoContent: {
    flex: 1,
    minWidth: 0,
  },
  todoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  todoTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: 'var(--sn-text, #111)',
  },
  priorityBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  todoDesc: {
    margin: '6px 0 0',
    fontSize: '14px',
    color: 'var(--sn-text-muted, #6b7280)',
  },
  dueDate: {
    display: 'inline-block',
    marginTop: '8px',
    fontSize: '12px',
    fontWeight: 500,
  },
  todoActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  actionBtn: {
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid var(--sn-border, #e5e7eb)',
    borderRa