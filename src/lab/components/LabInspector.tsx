/**
 * LabInspector — Event log panel for the Widget Lab preview session.
 *
 * Displays all events emitted and received by the preview widget:
 * - Direction icon (emitted = ember, received = storm)
 * - Event type, payload preview, timestamp
 * - Expandable rows for full JSON payload
 * - Filter by event type, clear button
 * - Auto-scroll with spring animation
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { EventInspector, InspectorEntry, EventDirection } from '../inspector/inspector';

import { labPalette, SPRING } from './shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Direction Badge
// ═══════════════════════════════════════════════════════════════════

const DIRECTION_STYLES: Record<EventDirection, { label: string; color: string; bg: string }> = {
  emitted: { label: '↑', color: '#E8806C', bg: 'rgba(232,128,108,0.1)' },
  received: { label: '↓', color: '#4E7B8E', bg: 'rgba(78,123,142,0.1)' },
};

const DirectionBadge: React.FC<{ direction: EventDirection }> = ({ direction }) => {
  const s = DIRECTION_STYLES[direction];
  return (
    <span
      aria-label={direction}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: 4, fontSize: 12,
        color: s.color, background: s.bg, flexShrink: 0,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Entry Row
// ═══════════════════════════════════════════════════════════════════

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    + '.' + String(d.getMilliseconds()).padStart(3, '0');
};

const truncatePayload = (payload: unknown): string => {
  const str = JSON.stringify(payload);
  if (!str || str.length <= 60) return str ?? 'null';
  return str.slice(0, 57) + '...';
};

const EntryRow: React.FC<{ entry: InspectorEntry }> = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        animation: 'sn-drift-up 300ms ease-out both',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${entry.direction} ${entry.eventType}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '6px 10px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left', outline: 'none',
          transition: `background 150ms`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <DirectionBadge direction={entry.direction} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: labPalette.text,
          fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          minWidth: 0, flex: '0 0 auto', maxWidth: '40%',
        }}>
          {entry.eventType}
        </span>
        <span style={{
          fontSize: 10, color: labPalette.textMuted,
          fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1, minWidth: 0,
        }}>
          {truncatePayload(entry.payload)}
        </span>
        <span style={{
          fontSize: 9, color: labPalette.textFaint,
          fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
          flexShrink: 0,
        }}>
          {formatTime(entry.timestamp)}
        </span>
      </button>

      {/* Expanded payload */}
      {expanded && (
        <div style={{
          padding: '8px 10px 8px 38px',
          background: 'rgba(0,0,0,0.15)',
          borderTop: '1px solid rgba(255,255,255,0.02)',
        }}>
          <pre style={{
            fontSize: 10, color: labPalette.textSoft,
            fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            lineHeight: 1.6, maxHeight: 200, overflow: 'auto',
          }}>
            {JSON.stringify(entry.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface LabInspectorProps {
  inspector: EventInspector;
}

export const LabInspectorComponent: React.FC<LabInspectorProps> = ({ inspector }) => {
  const [entries, setEntries] = useState<InspectorEntry[]>(inspector.getEntries());
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = inspector.subscribe((newEntries) => {
      setEntries(newEntries);
    });
    return unsub;
  }, [inspector]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const handleClear = useCallback(() => {
    inspector.clear();
  }, [inspector]);

  const filtered = filter
    ? entries.filter((e) => e.eventType.toLowerCase().includes(filter.toLowerCase()))
    : entries;

  // Unique event types for filter suggestions
  const eventTypes = [...new Set(entries.map((e) => e.eventType))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: labPalette.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.14em', flexShrink: 0,
        }}>
          Events
        </span>

        {/* Filter input */}
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter events"
          list="inspector-event-types"
          style={{
            flex: 1, padding: '3px 8px', fontSize: 10,
            fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
            color: labPalette.text, background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 4, outline: 'none',
            transition: `border-color 300ms ${SPRING}`,
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(78,123,142,0.3)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
        />
        <datalist id="inspector-event-types">
          {eventTypes.map((t) => <option key={t} value={t} />)}
        </datalist>

        {/* Auto-scroll toggle */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          aria-label={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          aria-pressed={autoScroll}
          title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: autoScroll ? labPalette.storm : labPalette.textFaint,
            padding: 2, lineHeight: 1,
          }}
        >
          ⤓
        </button>

        {/* Count */}
        <span style={{
          fontSize: 9, color: labPalette.textFaint,
          fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
        }}>
          {filtered.length}
        </span>

        {/* Clear */}
        <button
          onClick={handleClear}
          aria-label="Clear events"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: labPalette.textMuted, padding: 2, lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Event list */}
      <div
        ref={listRef}
        style={{ flex: 1, minHeight: 0, overflow: 'auto' }}
      >
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: labPalette.textFaint, fontSize: 11,
            fontFamily: 'var(--sn-font-family)',
          }}>
            No events yet
          </div>
        ) : (
          filtered.map((entry) => <EntryRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
};
