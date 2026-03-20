/**
 * WidgetLibraryPicker — Browse and select widgets/stickers from the registry.
 *
 * Appears as a frosted-glass sliding panel when user clicks "Widget" or
 * "Sticker" in the GraphToolbar. Reads from widgetStore registry to show
 * all registered widgets with manifest-derived port info.
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { WidgetManifest } from '@sn/types';

import { useWidgetStore } from '../../../kernel/stores/widget/widget.store';
import type { WidgetRegistryEntry } from '../../../kernel/stores/widget/widget.store';
import { labPalette, SPRING } from '../shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface WidgetLibraryPickerProps {
  onSelect: (entry: WidgetRegistryEntry) => void;
  onClose: () => void;
  onDescribeWidget?: (manifest: WidgetManifest) => void;
  filterType: 'widget' | 'sticker';
}

// ═══════════════════════════════════════════════════════════════════
// Category display order & labels
// ═══════════════════════════════════════════════════════════════════

const CATEGORY_ORDER = [
  'productivity',
  'utilities',
  'data',
  'commerce',
  'social',
  'media',
  'games',
  'other',
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  productivity: '#4E7B8E',
  utilities: '#B0D0D8',
  data: '#B8A0D8',
  commerce: '#E8806C',
  social: '#5AA878',
  media: '#D4A04C',
  games: '#F09A88',
  other: '#7A7784',
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export const WidgetLibraryPicker: React.FC<WidgetLibraryPickerProps> = ({
  onSelect,
  onClose,
  onDescribeWidget,
  filterType,
}) => {
  const registry = useWidgetStore((s) => s.registry);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid catching the click that opened the picker
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Filter and group entries
  const entries = useMemo(() => {
    const all = Object.values(registry);
    const lowerSearch = search.toLowerCase();
    return all.filter((entry) => {
      const m = entry.manifest;
      const matchesSearch =
        !search ||
        m.name.toLowerCase().includes(lowerSearch) ||
        (m.description ?? '').toLowerCase().includes(lowerSearch) ||
        m.tags.some((t) => t.toLowerCase().includes(lowerSearch));
      return matchesSearch;
    });
  }, [registry, search]);

  // Group by category, built-in first within each group
  const grouped = useMemo(() => {
    const groups: Record<string, WidgetRegistryEntry[]> = {};
    for (const entry of entries) {
      const cat = entry.manifest.category ?? 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(entry);
    }
    // Sort: built-in first within each category
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => {
        if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
        return a.manifest.name.localeCompare(b.manifest.name);
      });
    }
    return CATEGORY_ORDER
      .filter((cat) => groups[cat]?.length)
      .map((cat) => ({ category: cat, entries: groups[cat] }));
  }, [entries]);

  const handleSelect = useCallback(
    (entry: WidgetRegistryEntry) => {
      onSelect(entry);
      onClose();
    },
    [onSelect, onClose],
  );

  const portCount = (m: WidgetManifest) => {
    const inCount = m.events?.subscribes?.length ?? 0;
    const outCount = m.events?.emits?.length ?? 0;
    return { inCount, outCount };
  };

  const isEmpty = grouped.length === 0;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={filterType === 'widget' ? 'Widget library' : 'Sticker library'}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 6,
        width: 320,
        maxHeight: 420,
        zIndex: 25,
        background: 'rgba(20,17,24,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        animation: `sn-unfold 250ms ${SPRING}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--sn-font-family)',
      }}
    >
      {/* Search input */}
      <div style={{ padding: '10px 12px 6px', flexShrink: 0 }}>
        <input
          type="text"
          placeholder={`Search ${filterType}s...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: 12,
            fontFamily: 'var(--sn-font-family)',
            color: labPalette.text,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            outline: 'none',
            transition: `border-color 200ms ${SPRING}`,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(78,123,142,0.4)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        />
      </div>

      {/* Scrollable list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '0 4px 8px',
      }}>
        {isEmpty && (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: labPalette.textMuted,
            fontSize: 12,
          }}>
            {search
              ? `No ${filterType}s match "${search}"`
              : `No ${filterType}s registered`}
          </div>
        )}

        {grouped.map(({ category, entries: catEntries }) => (
          <div key={category}>
            {/* Category header */}
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              color: labPalette.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              padding: '10px 10px 4px',
            }}>
              {category}
            </div>

            {catEntries.map((entry) => {
              const m = entry.manifest;
              const { inCount, outCount } = portCount(m);
              const isExpanded = expandedId === entry.widgetId;

              return (
                <div key={entry.widgetId}>
                  {/* Entry row */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.widgetId)
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '7px 10px',
                      background: isExpanded
                        ? 'rgba(78,123,142,0.06)'
                        : 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      textAlign: 'left',
                      outline: 'none',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => {
                      if (!isExpanded)
                        e.currentTarget.style.background =
                          'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded)
                        e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Category color dot */}
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: CATEGORY_COLORS[category] ?? '#7A7784',
                        boxShadow: `0 0 4px ${CATEGORY_COLORS[category] ?? '#7A7784'}44`,
                        flexShrink: 0,
                      }}
                    />

                    {/* Name + description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: labPalette.text,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {m.name}
                        {entry.isBuiltIn && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 9,
                              fontWeight: 600,
                              color: labPalette.storm,
                              opacity: 0.7,
                            }}
                          >
                            BUILT-IN
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <div
                          style={{
                            fontSize: 10,
                            color: labPalette.textMuted,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: 1,
                          }}
                        >
                          {m.description}
                        </div>
                      )}
                    </div>

                    {/* Port count badge */}
                    {(inCount > 0 || outCount > 0) && (
                      <div
                        style={{
                          fontSize: 9,
                          color: labPalette.textMuted,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {inCount} in · {outCount} out
                      </div>
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '4px 10px 10px 24px',
                        animation: `sn-drift-up 200ms ${SPRING}`,
                      }}
                    >
                      {/* Event ports */}
                      {(m.events?.emits?.length ?? 0) > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: labPalette.ember,
                              marginBottom: 2,
                            }}
                          >
                            EMITS
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: labPalette.textSoft,
                              lineHeight: 1.5,
                            }}
                          >
                            {m.events.emits.map((e) => e.name).join(', ')}
                          </div>
                        </div>
                      )}
                      {(m.events?.subscribes?.length ?? 0) > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: labPalette.storm,
                              marginBottom: 2,
                            }}
                          >
                            SUBSCRIBES
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: labPalette.textSoft,
                              lineHeight: 1.5,
                            }}
                          >
                            {m.events.subscribes.map((e) => e.name).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          marginTop: 8,
                        }}
                      >
                        <button
                          onClick={() => handleSelect(entry)}
                          style={{
                            padding: '5px 14px',
                            fontSize: 11,
                            fontWeight: 500,
                            fontFamily: 'var(--sn-font-family)',
                            color: '#fff',
                            background: labPalette.storm,
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            transition: `all 200ms ${SPRING}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform =
                              'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          Add to Scene
                        </button>

                        {onDescribeWidget && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDescribeWidget(m);
                            }}
                            aria-label={`Ask AI about ${m.name}`}
                            style={{
                              padding: '5px 10px',
                              fontSize: 11,
                              fontWeight: 500,
                              fontFamily: 'var(--sn-font-family)',
                              color: labPalette.opal,
                              background: 'rgba(176,208,216,0.08)',
                              border: '1px solid rgba(176,208,216,0.15)',
                              borderRadius: 6,
                              cursor: 'pointer',
                              transition: `all 200ms ${SPRING}`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                'rgba(176,208,216,0.12)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                'rgba(176,208,216,0.08)';
                            }}
                          >
                            Ask AI
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
