/**
 * Asset Panel — sticker/widget library, search, drag-to-canvas.
 * Wraps the headless AssetPanelController from L4A-4.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useMemo, useState } from 'react';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export interface AssetItem {
  id: string;
  name: string;
  type: 'sticker' | 'widget';
  thumbnailUrl?: string;
  metadata: Record<string, unknown>;
}

export interface AssetPanelProps {
  /** Available assets to display */
  assets?: AssetItem[];
}

/** Placeholder mock assets for demonstration. */
const DEFAULT_ASSETS: AssetItem[] = [
  { id: 'stk-star', name: 'Star', type: 'sticker', metadata: { shape: 'star' } },
  { id: 'stk-heart', name: 'Heart', type: 'sticker', metadata: { shape: 'heart' } },
  { id: 'stk-arrow', name: 'Arrow', type: 'sticker', metadata: { shape: 'arrow' } },
  { id: 'wgt-clock', name: 'Clock', type: 'widget', metadata: { widgetType: 'clock' } },
  { id: 'wgt-note', name: 'Sticky Note', type: 'widget', metadata: { widgetType: 'sticky-note' } },
  { id: 'wgt-counter', name: 'Counter', type: 'widget', metadata: { widgetType: 'counter' } },
];

/**
 * Asset Panel — searchable grid of sticker and widget assets.
 * Hidden in preview mode.
 */
export const AssetPanel: React.FC<AssetPanelProps> = ({ assets = DEFAULT_ASSETS }) => {
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const lower = searchQuery.toLowerCase();
    return assets.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.type.toLowerCase().includes(lower),
    );
  }, [assets, searchQuery]);

  const handleAssetClick = useCallback((asset: AssetItem) => {
    if (asset.type === 'sticker') {
      bus.emit(CanvasEvents.TOOL_CHANGED, {
        tool: 'sticker',
        assetId: asset.id,
        metadata: asset.metadata,
      });
    } else {
      bus.emit(CanvasEvents.TOOL_CHANGED, {
        tool: 'widget',
        widgetId: asset.id,
        metadata: asset.metadata,
      });
    }
  }, []);

  // Hidden in preview mode
  if (mode !== 'edit') return null;

  return (
    <div
      data-testid="asset-panel"
      style={{
        fontFamily: 'var(--sn-font-family, system-ui)',
        fontSize: '13px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          fontWeight: 600,
          fontSize: '12px',
          color: 'var(--sn-text-muted, #6b7280)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          borderBottom: '1px solid var(--sn-border, #e0e0e0)',
        }}
      >
        Assets
      </div>

      {/* Search */}
      <div style={{ padding: '8px' }}>
        <input
          data-testid="asset-search"
          type="text"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--sn-border, #e0e0e0)',
            borderRadius: 'var(--sn-radius, 6px)',
            fontSize: '12px',
            fontFamily: 'inherit',
            outline: 'none',
            background: 'var(--sn-bg, #f8f9fa)',
            color: 'var(--sn-text, #1a1a2e)',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Asset grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px',
          alignContent: 'start',
        }}
      >
        {filteredAssets.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              color: 'var(--sn-text-muted, #6b7280)',
              fontSize: '12px',
              padding: '16px',
            }}
          >
            No assets found
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <button
              key={asset.id}
              data-testid={`asset-item-${asset.id}`}
              onClick={() => handleAssetClick(asset)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 4px',
                border: '1px solid var(--sn-border, #e0e0e0)',
                borderRadius: 'var(--sn-radius, 6px)',
                background: 'var(--sn-surface, #fff)',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'inherit',
                color: 'var(--sn-text, #1a1a2e)',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Thumbnail placeholder */}
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--sn-bg, #f8f9fa)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                {asset.type === 'sticker' ? '\u{2B50}' : '\u{1F9E9}'}
              </div>

              {/* Name */}
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {asset.name}
              </span>

              {/* Type badge */}
              <span
                style={{
                  fontSize: '9px',
                  color: 'var(--sn-text-muted, #6b7280)',
                  textTransform: 'uppercase',
                }}
              >
                {asset.type}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
