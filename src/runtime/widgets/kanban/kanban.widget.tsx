/**
 * Kanban Board Widget
 *
 * A full drag-and-drop Kanban board with columns, cards, inline editing,
 * color labels, and persistent state. Supports adding/removing columns,
 * creating/moving/deleting cards, and emits bus events for all operations.
 *
 * @module runtime/widgets/kanban
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

import type { WidgetManifest } from '@sn/types';

import { useEmit, useSubscribe, useWidgetState } from '../../hooks';

import { KANBAN_EVENTS } from './kanban.events';
import type { KanbanCard, KanbanColumn } from './kanban.schema';

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                         */
/* ------------------------------------------------------------------ */

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const EditIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const GripIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="19" r="1" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const CARD_COLORS = [
  { label: 'None', value: undefined },
  { label: 'Red', value: '#fee2e2' },
  { label: 'Orange', value: '#ffedd5' },
  { label: 'Yellow', value: '#fef9c3' },
  { label: 'Green', value: '#dcfce7' },
  { label: 'Blue', value: '#dbeafe' },
  { label: 'Purple', value: '#f3e8ff' },
];

const COLUMN_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

let idCounter = 0;
function uid(): string {
  return `kb-${Date.now()}-${++idCounter}`;
}

/* ------------------------------------------------------------------ */
/*  Manifest                                                          */
/* ------------------------------------------------------------------ */

export const kanbanManifest: WidgetManifest = {
  id: 'sn.builtin.kanban',
  name: 'Kanban Board',
  version: '1.0.0',
  description: 'Drag-and-drop Kanban board with columns, cards, color labels, and inline editing',
  author: { name: 'StickerNest', url: 'https://stickernest.com' },
  category: 'productivity',
  tags: ['kanban', 'board', 'tasks', 'project', 'productivity', 'drag-and-drop'],
  permissions: [],
  size: {
    defaultWidth: 640,
    defaultHeight: 480,
    minWidth: 400,
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
      { name: KANBAN_EVENTS.emits.READY },
      { name: KANBAN_EVENTS.emits.CARD_CREATED },
      { name: KANBAN_EVENTS.emits.CARD_MOVED },
      { name: KANBAN_EVENTS.emits.CARD_DELETED },
      { name: KANBAN_EVENTS.emits.CARD_UPDATED },
      { name: KANBAN_EVENTS.emits.COLUMN_CREATED },
      { name: KANBAN_EVENTS.emits.COLUMN_DELETED },
      { name: KANBAN_EVENTS.emits.BOARD_CLEARED },
    ],
    subscribes: [
      { name: KANBAN_EVENTS.subscribes.ADD_CARD },
      { name: KANBAN_EVENTS.subscribes.CLEAR_BOARD },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Widget Component                                                  */
/* ------------------------------------------------------------------ */

export const KanbanWidget: React.FC<{ instanceId: string }> = ({ instanceId }) => {
  const emit = useEmit();
  const [state, persistState] = useWidgetState(instanceId);

  /* ---- Board state ------------------------------------------------ */
  const [columns, setColumns] = useState<KanbanColumn[]>(() => {
    if (state.columns && Array.isArray(state.columns)) {
      return state.columns as KanbanColumn[];
    }
    return [
      { id: uid(), title: 'To Do', color: COLUMN_COLORS[0], cards: [] },
      { id: uid(), title: 'In Progress', color: COLUMN_COLORS[1], cards: [] },
      { id: uid(), title: 'Done', color: COLUMN_COLORS[2], cards: [] },
    ];
  });

  const [boardTitle, setBoardTitle] = useState<string>(
    (state.boardTitle as string) || 'My Board'
  );

  /* ---- UI state --------------------------------------------------- */
  const [addingCardColumnId, setAddingCardColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardColor, setNewCardColor] = useState<string | undefined>(undefined);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);

  const newCardInputRef = useRef<HTMLInputElement>(null);
  const newColumnInputRef = useRef<HTMLInputElement>(null);

  /* ---- Persist on change ------------------------------------------ */
  useEffect(() => {
    persistState('columns', columns);
    persistState('boardTitle', boardTitle);
  }, [columns, boardTitle, persistState]);

  /* ---- Emit READY ------------------------------------------------- */
  useEffect(() => {
    emit(KANBAN_EVENTS.emits.READY, { instanceId, timestamp: Date.now() });
  }, [emit, instanceId]);

  /* ---- Focus refs ------------------------------------------------- */
  useEffect(() => {
    if (addingCardColumnId && newCardInputRef.current) {
      newCardInputRef.current.focus();
    }
  }, [addingCardColumnId]);

  useEffect(() => {
    if (addingColumn && newColumnInputRef.current) {
      newColumnInputRef.current.focus();
    }
  }, [addingColumn]);

  /* ---- Subscribe to external commands ----------------------------- */
  useSubscribe(KANBAN_EVENTS.subscribes.ADD_CARD, useCallback((payload: any) => {
    if (payload && payload.columnId && payload.title) {
      const card: KanbanCard = {
        id: uid(),
        title: payload.title,
        description: payload.description || '',
        createdAt: Date.now(),
      };
      setColumns(prev => prev.map(col =>
        col.id === payload.columnId ? { ...col, cards: [...col.cards, card] } : col
      ));
      emit(KANBAN_EVENTS.emits.CARD_CREATED, {
        instanceId,
        cardId: card.id,
        columnId: payload.columnId,
        title: card.title,
        timestamp: Date.now(),
      });
    }
  }, [emit, instanceId]));

  useSubscribe(KANBAN_EVENTS.subscribes.CLEAR_BOARD, useCallback(() => {
    setColumns(prev => prev.map(col => ({ ...col, cards: [] })));
    emit(KANBAN_EVENTS.emits.BOARD_CLEARED, { instanceId, timestamp: Date.now() });
  }, [emit, instanceId]));

  /* ---- Card CRUD -------------------------------------------------- */
  const addCard = useCallback((columnId: string) => {
    if (!newCardTitle.trim()) return;
    const card: KanbanCard = {
      id: uid(),
      title: newCardTitle.trim(),
      description: '',
      color: newCardColor,
      createdAt: Date.now(),
    };
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
    ));
    emit(KANBAN_EVENTS.emits.CARD_CREATED, {
      instanceId, cardId: card.id, columnId, title: card.title, timestamp: Date.now(),
    });
    setNewCardTitle('');
    setNewCardColor(undefined);
    setAddingCardColumnId(null);
  }, [newCardTitle, newCardColor, emit, instanceId]);

  const deleteCard = useCallback((columnId: string, cardId: string) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, cards: col.cards.filter(c => c.id !== cardId) } : col
    ));
    emit(KANBAN_EVENTS.emits.CARD_DELETED, {
      instanceId, cardId, columnId, timestamp: Date.now(),
    });
  }, [emit, instanceId]);

  const saveCardEdit = useCallback(() => {
    if (!editingCardId) return;
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: col.cards.map(c =>
        c.id === editingCardId ? { ...c, title: editTitle, description: editDescription } : c
      ),
    })));
    emit(KANBAN_EVENTS.emits.CARD_UPDATED, {
      instanceId, cardId: editingCardId, title: editTitle, description: editDescription, timestamp: Date.now(),
    });
    setEditingCardId(null);
  }, [editingCardId, editTitle, editDescription, emit, instanceId]);

  const startEditCard = useCallback((card: KanbanCard) => {
    setEditingCardId(card.id);
    setEditTitle(card.title);
    setEditDescription(card.description);
  }, []);

  /* ---- Column CRUD ------------------------------------------------ */
  const addColumn = useCallback(() => {
    if (!newColumnTitle.trim()) return;
    const col: KanbanColumn = {
      id: uid(),
      title: newColumnTitle.trim(),
      color: COLUMN_COLORS[columns.length % COLUMN_COLORS.length],
      cards: [],
    };
    setColumns(prev => [...prev, col]);
    emit(KANBAN_EVENTS.emits.COLUMN_CREATED, {
      instanceId, columnId: col.id, title: col.title, timestamp: Date.now(),
    });
    setNewColumnTitle('');
    setAddingColumn(false);
  }, [newColumnTitle, columns.length, emit, instanceId]);

  const deleteColumn = useCallback((columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));
    emit(KANBAN_EVENTS.emits.COLUMN_DELETED, {
      instanceId, columnId, timestamp: Date.now(),
    });
  }, [emit, instanceId]);

  /* ---- Drag and drop ---------------------------------------------- */
  const handleDragStart = useCallback((cardId: string) => {
    setDragCardId(cardId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumnId(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumnId(null);
  }, []);

  const handleDrop = useCallback((targetColumnId: string) => {
    if (!dragCardId) return;

    let movedCard: KanbanCard | null = null;
    let fromColumnId: string | null = null;

    // Find and remove from source
    const updated = columns.map(col => {
      const idx = col.cards.findIndex(c => c.id === dragCardId);
      if (idx !== -1) {
        movedCard = col.cards[idx];
        fromColumnId = col.id;
        return { ...col, cards: col.cards.filter(c => c.id !== dragCardId) };
      }
      return col;
    });

    if (!movedCard || !fromColumnId) return;

    // Add to target
    const final = updated.map(col =>
      col.id === targetColumnId ? { ...col, cards: [...col.cards, movedCard!] } : col
    );

    setColumns(final);
    setDragCardId(null);
    setDragOverColumnId(null);

    if (fromColumnId !== targetColumnId) {
      emit(KANBAN_EVENTS.emits.CARD_MOVED, {
        instanceId,
        cardId: dragCardId,
        fromColumnId,
        toColumnId: targetColumnId,
        timestamp: Date.now(),
      });
    }
  }, [dragCardId, columns, emit, instanceId]);

  /* ---- Move card left/right --------------------------------------- */
  const moveCard = useCallback((cardId: string, direction: 'left' | 'right') => {
    let fromIdx = -1;
    let card: KanbanCard | null = null;

    for (let i = 0; i < columns.length; i++) {
      const c = columns[i].cards.find(x => x.id === cardId);
      if (c) { fromIdx = i; card = c; break; }
    }
    if (fromIdx === -1 || !card) return;

    const toIdx = direction === 'left' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= columns.length) return;

    setColumns(prev => prev.map((col, i) => {
      if (i === fromIdx) return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
      if (i === toIdx) return { ...col, cards: [...col.cards, card!] };
      return col;
    }));

    emit(KANBAN_EVENTS.emits.CARD_MOVED, {
      instanceId,
      cardId,
      fromColumnId: columns[fromIdx].id,
      toColumnId: columns[toIdx].id,
      timestamp: Date.now(),
    });
  }, [columns, emit, instanceId]);

  /* ---- Total card count ------------------------------------------- */
  const totalCards = columns.reduce((sum, col) => sum + col.cards.length, 0);

  /* ---- Render ----------------------------------------------------- */
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--sn-surface, #fff)',
      color: 'var(--sn-text, #333)',
      fontFamily: 'var(--sn-font-family, sans-serif)',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--sn-border, #e5e5e5)',
        flexShrink: 0,
      }}>
        {editingBoardTitle ? (
          <input
            value={boardTitle}
            onChange={e => setBoardTitle(e.target.value)}
            onBlur={() => setEditingBoardTitle(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditingBoardTitle(false); }}
            autoFocus
            style={{
              fontWeight: 700,
              fontSize: '15px',
              border: '1px solid var(--sn-accent, #3b82f6)',
              borderRadius: '4px',
              padding: '2px 6px',
              background: 'var(--sn-bg, #f9f9f9)',
              color: 'inherit',
              outline: 'none',
              width: '180px',
            }}
          />
        ) : (
          <div
            onClick={() => setEditingBoardTitle(true)}
            style={{ fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Click to rename board"
          >
            {boardTitle} <EditIcon />
          </div>
        )}
        <div style={{ fontSize: '11px', color: 'var(--sn-text-muted, #999)' }}>
          {totalCards} card{totalCards !== 1 ? 's' : ''} &middot; {columns.length} col{columns.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Board */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '10px',
        padding: '10px',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}>
        {columns.map((col, colIdx) => (
          <div
            key={col.id}
            data-testid={`kanban-column-${col.id}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(col.id)}
            style={{
              minWidth: '200px',
              maxWidth: '260px',
              flex: '1 0 200px',
              display: 'flex',
              flexDirection: 'column',
              background: dragOverColumnId === col.id
                ? 'var(--sn-accent, #3b82f6)11'
                : 'var(--sn-bg, #f5f5f5)',
              borderRadius: 'var(--sn-radius, 8px)',
              border: dragOverColumnId === col.id
                ? '2px dashed var(--sn-accent, #3b82f6)'
                : '1px solid var(--sn-border, #e5e5e5)',
              transition: 'border-color 0.15s, background 0.15s',
              overflow: 'hidden',
            }}
          >
            {/* Column header */}
            <div style={{
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `2px solid ${col.color || '#ccc'}`,
              flexShrink: 0,
            }}>
              <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: col.color || '#ccc', display: 'inline-block', flexShrink: 0,
                }} />
                {col.title}
                <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--sn-text-muted, #999)' }}>
                  {col.cards.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  onClick={() => { setAddingCardColumnId(col.id); setNewCardTitle(''); setNewCardColor(undefined); }}
                  title="Add card"
                  style={iconBtnStyle}
                >
                  <PlusIcon />
                </button>
                {columns.length > 1 && (
                  <button
                    onClick={() => deleteColumn(col.id)}
                    title="Delete column"
                    style={iconBtnStyle}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Cards list */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              {col.cards.map(card => (
                <div
                  key={card.id}
                  data-testid={`kanban-card-${card.id}`}
                  draggable
                  onDragStart={() => handleDragStart(card.id)}
                  style={{
                    background: card.color || 'var(--sn-surface, #fff)',
                    borderRadius: '6px',
                    border: '1px solid var(--sn-border, #e5e5e5)',
                    padding: '8px 10px',
                    cursor: 'grab',
                    opacity: dragCardId === card.id ? 0.5 : 1,
                    transition: 'opacity 0.15s, box-shadow 0.15s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  {editingCardId === card.id ? (
                    /* Inline edit form */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCardEdit(); if (e.key === 'Escape') setEditingCardId(null); }}
                        autoFocus
                        style={inputStyle}
                      />
                      <textarea
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        placeholder="Description..."
                        rows={2}
                        style={{ ...inputStyle, resize: 'vertical', minHeight: '40px' }}
                      />
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={saveCardEdit} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setEditingCardId(null)} style={{ ...smallBtnStyle, background: 'transparent', color: 'var(--sn-text-muted, #999)' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    /* Card display */
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                          <span style={{ color: 'var(--sn-text-muted, #aaa)', cursor: 'grab', flexShrink: 0 }}><GripIcon /></span>
                          <span style={{ fontSize: '13px', fontWeight: 500, wordBreak: 'break-word' }}>{card.title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                          {colIdx > 0 && (
                            <button onClick={() => moveCard(card.id, 'left')} title="Move left" style={iconBtnStyle}><ChevronLeftIcon /></button>
                          )}
                          {colIdx < columns.length - 1 && (
                            <button onClick={() => moveCard(card.id, 'right')} title="Move right" style={iconBtnStyle}><ChevronRightIcon /></button>
                          )}
                          <button onClick={() => startEditCard(card)} title="Edit" style={iconBtnStyle}><EditIcon /></button>
                          <button onClick={() => deleteCard(col.id, card.id)} title="Delete" style={iconBtnStyle}><TrashIcon /></button>
                        </div>
                      </div>
                      {card.description && (
                        <div style={{ fontSize: '11px', color: 'var(--sn-text-muted, #888)', marginTop: '4px', paddingLeft: '18px' }}>
                          {card.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add card form (inline in column) */}
              {addingCardColumnId === col.id && (
                <div style={{
                  background: 'var(--sn-surface, #fff)',
                  borderRadius: '6px',
                  border: '1px solid var(--sn-accent, #3b82f6)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}>
                  <input
                    ref={newCardInputRef}
                    value={newCardTitle}
                    onChange={e => setNewCardTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addCard(col.id);
                      if (e.key === 'Escape') setAddingCardColumnId(null);
                    }}
                    placeholder="Card title..."
                    style={inputStyle}
                  />
                  {/* Color picker row */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--sn-text-muted, #999)' }}>Color:</span>
                    {CARD_COLORS.map(c => (
                      <button
                        key={c.label}
                        onClick={() => setNewCardColor(c.value)}
                        title={c.label}
                        style={{
                          width: '16px', height: '16px',
                          borderRadius: '50%',
                          border: newCardColor === c.value ? '2px solid var(--sn-accent, #3b82f6)' : '1px solid var(--sn-border, #ddd)',
                          background: c.value || 'var(--sn-surface, #fff)',
                          cursor: 'pointer', padding: 0,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => addCard(col.id)}
                      disabled={!newCardTitle.trim()}
                      style={{
                        ...smallBtnStyle,
                        opacity: newCardTitle.trim() ? 1 : 0.5,
                        cursor: newCardTitle.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Add
                    </button>
                    <button onClick={() => setAddingCardColumnId(null)} style={{ ...smallBtnStyle, background: 'transparent', color: 'var(--sn-text-muted, #999)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add column button / form */}
        <div style={{
          minWidth: '180px',
          flex: '0 0 auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {addingColumn ? (
            <div style={{
              background: 'var(--sn-bg, #f5f5f5)',
              borderRadius: 'var(--sn-radius, 8px)',
              border: '1px solid var(--sn-border, #e5e5e5)',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <input
                ref={newColumnInputRef}
                value={newColumnTitle}
                onChange={e => setNewColumnTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addColumn();
                  if (e.key === 'Escape') setAddingColumn(false);
                }}
                placeholder="Column title..."
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={addColumn}
                  disabled={!newColumnTitle.trim()}
                  style={{
                    ...smallBtnStyle,
                    opacity: newColumnTitle.trim() ? 1 : 0.5,
                    cursor: newColumnTitle.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add Column
                </button>
                <button onClick={() => setAddingColumn(false)} style={{ ...smallBtnStyle, background: 'transparent', color: 'var(--sn-text-muted, #999)' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddingColumn(true); setNewColumnTitle(''); }}
              style={{
                padding: '10px',
                borderRadius: 'var(--sn-radius, 8px)',
                border: '1px dashed var(--sn-border, #ddd)',
                background: 'transparent',
                color: 'var(--sn-text-muted, #999)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '13px',
                height: '40px',
              }}
            >
              <PlusIcon /> Add Column
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        fontSize: '10px',
        color: 'var(--sn-text-muted, #999)',
        textAlign: 'center',
        padding: '4px 10px',
        borderTop: '1px solid var(--sn-border, #e5e5e5)',
        flexShrink: 0,
      }}>
        Kanban Board &middot; {instanceId.slice(0, 8)}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Shared Inline Styles                                              */
/* ------------------------------------------------------------------ */

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '3px',
  borderRadius: '4px',
  color: 'var(--sn-text-muted, #999)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: '4px',
  border: '1px solid var(--sn-border, #e5e5e5)',
  background: 'var(--sn-bg, #f9f9f9)',
  color: 'inherit',
  fontSize: '12px',
  outline: 'none',
  fontFamily: 'inherit',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '4px',
  border: 'none',
  background: 'var(--sn-accent, #3b82f6)',
  color: '#fff',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
};
