/**
 * Gallery Widget
 *
 * Personal photo bucket widget. Accepts images dropped from the canvas (absorb),
 * lets users drag thumbnails back out to the canvas (emit), and supports
 * delete-on-hover with double-click confirmation.
 *
 * @module runtime/widgets/gallery
 * @layer L3
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';

import type { WidgetManifest } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { useGallery } from '../../gallery-hooks';
import type { GalleryAsset } from '../../gallery-hooks';
import { useEmit, useSubscribe } from '../../hooks';

import { GALLERY_EVENTS } from './gallery.events';
import { DEFAULT_GALLERY_CONFIG } from './gallery.schema';
import type { GalleryConfig } from './gallery.schema';

// ── Inline SVG Icons ──────────────────────────────────────────────

const TrashIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ImageIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
    <circle cx="17" cy="21" r="3" stroke="currentColor" strokeWidth="2" />
    <path
      d="M6 32l10-8 6 5 8-6 12 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────

interface GalleryWidgetProps {
  instanceId: string;
  config?: Partial<GalleryConfig>;
}

// ── Widget Manifest ───────────────────────────────────────────────

export const galleryManifest: WidgetManifest = {
  id: 'sn.builtin.gallery',
  name: 'Gallery',
  version: '1.0.0',
  description: 'Personal photo bucket. Drag images in from the canvas to collect them, drag thumbnails out to place them back.',
  author: { name: 'StickerNest', url: 'https://stickernest.com' },
  category: 'productivity',
  tags: ['gallery', 'photos', 'images', 'collection', 'bucket'],
  permissions: ['canvas-write', 'gallery'],
  size: {
    defaultWidth: 300,
    defaultHeight: 400,
    minWidth: 200,
    minHeight: 200,
    aspectLocked: false,
  },
  events: {
    emits: [
      { name: GALLERY_EVENTS.emits.READY, description: 'Gallery widget is ready' },
      { name: GALLERY_EVENTS.emits.IMAGE_ABSORBED, description: 'An image was absorbed into the gallery' },
      { name: GALLERY_EVENTS.emits.IMAGE_EMITTED, description: 'An image was emitted from the gallery to the canvas' },
      { name: GALLERY_EVENTS.emits.IMAGE_DELETED, description: 'An image was deleted from the gallery' },
    ],
    subscribes: [
      { name: GALLERY_EVENTS.subscribes.CONFIG_UPDATE, description: 'Gallery config update' },
      { name: GALLERY_EVENTS.subscribes.ABSORB_ENTITY, description: 'Command to absorb an entity into the gallery' },
    ],
  },
  config: { fields: [] },
  entry: 'html',
  license: 'MIT',
  crossCanvasChannels: [],
  spatialSupport: false,
};

// ── Component ─────────────────────────────────────────────────────

export const GalleryWidget: React.FC<GalleryWidgetProps> = ({ instanceId, config }) => {
  const cfg: GalleryConfig = { ...DEFAULT_GALLERY_CONFIG, ...config };
  const { assets, isLoading, error, uploadFromUrl, deleteAsset, refresh } = useGallery();
  const emit = useEmit();

  const [isDragOver, setIsDragOver] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mount: load gallery and emit READY ──────────────────────

  useEffect(() => {
    refresh();
    emit(GALLERY_EVENTS.emits.READY, { instanceId, timestamp: Date.now() });
  }, [refresh, emit, instanceId]);

  // ── Clear confirmation timer on unmount ─────────────────────

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  // ── Absorb handler (shared by drop and bus subscription) ────

  const handleAbsorb = useCallback(
    async (imageUrl: string, entityId?: string, removeFromCanvas = false) => {
      const asset = await uploadFromUrl(imageUrl);
      if (asset) {
        emit(GALLERY_EVENTS.emits.IMAGE_ABSORBED, {
          instanceId,
          assetId: asset.id,
          sourceEntityId: entityId,
          timestamp: Date.now(),
        });
        if (removeFromCanvas && entityId) {
          emit(CanvasEvents.ENTITY_DELETED, { entityId });
        }
      }
    },
    [uploadFromUrl, emit, instanceId],
  );

  // ── Subscribe to ABSORB_ENTITY bus event ────────────────────

  const handleAbsorbEvent = useCallback(
    (payload: unknown) => {
      const data = payload as {
        entityId: string;
        imageUrl: string;
        name?: string;
        removeFromCanvas?: boolean;
      };
      handleAbsorb(data.imageUrl, data.entityId, data.removeFromCanvas ?? false);
    },
    [handleAbsorb],
  );

  useSubscribe(GALLERY_EVENTS.subscribes.ABSORB_ENTITY, handleAbsorbEvent);

  // ── Drag-over / drop handlers (absorb from canvas) ──────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only leave when exiting the container itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const raw = e.dataTransfer.getData('application/sn-entity');
      if (!raw) return;

      try {
        const entity = JSON.parse(raw) as {
          id?: string;
          imageUrl?: string;
          src?: string;
          url?: string;
        };
        const imageUrl = entity.imageUrl || entity.src || entity.url;
        if (!imageUrl) return;

        const removeFromCanvas = !e.shiftKey;
        await handleAbsorb(imageUrl, entity.id, removeFromCanvas);
      } catch {
        // Invalid JSON — silently ignore
      }
    },
    [handleAbsorb],
  );

  // ── Thumbnail drag-start (emit to canvas) ───────────────────

  const handleThumbnailDragStart = useCallback(
    (e: React.DragEvent, asset: GalleryAsset) => {
      const stickerEntity = {
        type: 'sticker',
        imageUrl: asset.url,
        name: asset.name,
        sourceGalleryAssetId: asset.id,
      };
      e.dataTransfer.setData('application/sn-entity', JSON.stringify(stickerEntity));
      e.dataTransfer.effectAllowed = 'copy';

      emit(GALLERY_EVENTS.emits.IMAGE_EMITTED, {
        instanceId,
        assetId: asset.id,
        entityId: '', // filled by canvas on drop
        timestamp: Date.now(),
      });
    },
    [emit, instanceId],
  );

  // ── Delete handlers ─────────────────────────────────────────

  const handleDeleteClick = useCallback(
    (assetId: string) => {
      if (confirmDeleteId === assetId) {
        // Second click — actually delete
        deleteAsset(assetId);
        emit(GALLERY_EVENTS.emits.IMAGE_DELETED, {
          instanceId,
          assetId,
          timestamp: Date.now(),
        });
        setConfirmDeleteId(null);
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      } else {
        // First click — set confirmation state
        setConfirmDeleteId(assetId);
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = setTimeout(() => {
          setConfirmDeleteId(null);
        }, 3000);
      }
    },
    [confirmDeleteId, deleteAsset, emit, instanceId],
  );

  // ── Styles ──────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: 'var(--sn-font-family)',
    background: 'var(--sn-bg)',
    color: 'var(--sn-text)',
    borderRadius: 'var(--sn-radius)',
    overflow: 'hidden',
    border: isDragOver
      ? '2px dashed var(--sn-accent)'
      : '1px solid var(--sn-border)',
    transition: 'border-color 0.15s ease',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid var(--sn-border)',
    background: 'var(--sn-surface)',
    flexShrink: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.02em',
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--sn-text-muted)',
    background: 'var(--sn-bg)',
    borderRadius: '10px',
    padding: '2px 8px',
    border: '1px solid var(--sn-border)',
  };

  const gridContainerStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
    background: isDragOver ? 'color-mix(in srgb, var(--sn-accent) 5%, var(--sn-bg))' : undefined,
    transition: 'background 0.15s ease',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${cfg.thumbnailSize}px, 1fr))`,
    gap: '6px',
  };

  const thumbnailWrapperStyle: React.CSSProperties = {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: 'calc(var(--sn-radius) * 0.6)',
    overflow: 'hidden',
    cursor: 'grab',
    border: '1px solid var(--sn-border)',
    background: 'var(--sn-surface)',
  };

  const thumbnailImgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  const deleteButtonStyle = (visible: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.15s ease',
    padding: 0,
  });

  const confirmBannerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '4px 6px',
    fontSize: '10px',
    fontWeight: 600,
    textAlign: 'center',
    background: 'rgba(220, 50, 50, 0.85)',
    color: '#fff',
    letterSpacing: '0.02em',
  };

  const emptyStateStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    height: '100%',
    color: 'var(--sn-text-muted)',
    padding: '24px',
    textAlign: 'center',
  };

  const errorStyle: React.CSSProperties = {
    padding: '12px',
    color: '#dc3232',
    fontSize: '12px',
    textAlign: 'center',
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div
      style={containerStyle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div style={headerStyle}>
        <span style={titleStyle}>Gallery</span>
        <span style={badgeStyle}>{assets.length}</span>
      </div>

      {/* Content */}
      <div style={gridContainerStyle}>
        {error && <div style={errorStyle}>{error}</div>}

        {!error && assets.length === 0 && !isLoading && (
          <div style={emptyStateStyle}>
            <ImageIcon size={48} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>No images yet</span>
            <span style={{ fontSize: '11px', lineHeight: '1.5' }}>
              Drag stickers here to collect them, or use the context menu to absorb entities.
            </span>
          </div>
        )}

        {isLoading && assets.length === 0 && (
          <div style={emptyStateStyle}>
            <span style={{ fontSize: '12px' }}>Loading...</span>
          </div>
        )}

        {assets.length > 0 && (
          <div style={gridStyle}>
            {assets.map((asset) => (
              <div
                key={asset.id}
                style={thumbnailWrapperStyle}
                draggable
                onDragStart={(e) => handleThumbnailDragStart(e, asset)}
                onMouseEnter={() => setHoveredId(asset.id)}
                onMouseLeave={() => {
                  setHoveredId(null);
                  if (confirmDeleteId === asset.id) {
                    // Keep confirmation visible while timer runs
                  }
                }}
              >
                <img
                  src={asset.url}
                  alt={asset.name || 'Gallery image'}
                  style={thumbnailImgStyle}
                  loading="lazy"
                  draggable={false}
                />
                <button
                  style={deleteButtonStyle(hoveredId === asset.id || confirmDeleteId === asset.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(asset.id);
                  }}
                  aria-label="Delete image"
                >
                  <TrashIcon size={12} />
                </button>
                {confirmDeleteId === asset.id && (
                  <div style={confirmBannerStyle}>Click again to delete</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
