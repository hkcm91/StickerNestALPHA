/**
 * usePersistence - auto-save + manual save/load for canvas documents.
 *
 * Serializes the scene graph to localStorage on entity changes (debounced 2s).
 * Manual save/load via Ctrl+S and on-demand.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CanvasEvents, CanvasDocumentEvents, DockerEvents, GridEvents } from '@sn/types';
import type { CanvasDocument, CanvasPositionConfig, ViewportConfig } from '@sn/types';

import type { SceneGraph } from '../../../canvas/core';
import { serialize, deserializeToSceneGraph } from '../../../canvas/core/persistence';
import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

export interface PersistenceState {
  status: SaveStatus;
  lastSavedAt: number | null;
  loaded: boolean;
  save: () => void;
  load: () => boolean;
}

export interface LocalCanvasSummary {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface CanvasIndex {
  items: LocalCanvasSummary[];
}

const STORAGE_KEY_PREFIX = 'sn:canvas:';
const STORAGE_INDEX_KEY = 'sn:canvas:index';
const AUTO_SAVE_DELAY_MS = 2000;

export function getStorageKey(canvasSlug: string): string {
  return `${STORAGE_KEY_PREFIX}${canvasSlug}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readCanvasIndex(): CanvasIndex {
  const raw = localStorage.getItem(STORAGE_INDEX_KEY);
  if (!raw) return { items: [] };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
      return { items: [] };
    }

    const items = parsed.items.filter((item): item is LocalCanvasSummary => {
      if (!isRecord(item)) return false;
      return (
        typeof item.id === 'string'
        && typeof item.slug === 'string'
        && typeof item.name === 'string'
        && typeof item.createdAt === 'string'
        && typeof item.updatedAt === 'string'
      );
    });

    return { items };
  } catch {
    return { items: [] };
  }
}

function writeCanvasIndex(index: CanvasIndex): void {
  localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
}

function createUuid(): string {
  return crypto.randomUUID();
}

export function slugifyCanvasName(input: string): string {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || 'canvas';
}

function pickUniqueSlug(baseSlug: string, existing: Set<string>): string {
  if (!existing.has(baseSlug)) return baseSlug;

  let index = 2;
  while (existing.has(`${baseSlug}-${index}`)) {
    index += 1;
  }

  return `${baseSlug}-${index}`;
}

export function listLocalCanvases(): LocalCanvasSummary[] {
  return [...readCanvasIndex().items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLocalCanvasBySlug(slug: string): LocalCanvasSummary | null {
  return readCanvasIndex().items.find((item) => item.slug === slug) ?? null;
}

function upsertLocalCanvas(summary: LocalCanvasSummary): LocalCanvasSummary {
  const index = readCanvasIndex();
  const nextItems = index.items.filter((item) => item.slug !== summary.slug && item.id !== summary.id);
  nextItems.push(summary);
  writeCanvasIndex({ items: nextItems });
  return summary;
}

export function createLocalCanvas(input?: { name?: string; slug?: string }): LocalCanvasSummary {
  const now = new Date().toISOString();
  const existing = readCanvasIndex();
  const existingSlugs = new Set(existing.items.map((item) => item.slug));
  const baseName = input?.name?.trim() || 'Untitled canvas';
  const baseSlug = slugifyCanvasName(input?.slug ?? baseName);
  const slug = pickUniqueSlug(baseSlug, existingSlugs);

  const summary: LocalCanvasSummary = {
    id: createUuid(),
    slug,
    name: baseName,
    createdAt: now,
    updatedAt: now,
  };

  return upsertLocalCanvas(summary);
}

export function renameLocalCanvas(slug: string, newName: string): LocalCanvasSummary | null {
  const index = readCanvasIndex();
  const entry = index.items.find((item) => item.slug === slug);
  if (!entry) return null;

  const now = new Date().toISOString();
  const updated: LocalCanvasSummary = { ...entry, name: newName.trim(), updatedAt: now };
  upsertLocalCanvas(updated);

  // Update name inside stored document if it exists
  const raw = localStorage.getItem(getStorageKey(slug));
  if (raw) {
    try {
      const doc = JSON.parse(raw);
      if (doc.meta) {
        doc.meta.name = updated.name;
        doc.meta.updatedAt = now;
      }
      localStorage.setItem(getStorageKey(slug), JSON.stringify(doc));
    } catch {
      // ignore parse errors
    }
  }

  return updated;
}

export function deleteLocalCanvas(slug: string): void {
  const index = readCanvasIndex();
  const nextItems = index.items.filter((item) => item.slug !== slug);
  writeCanvasIndex({ items: nextItems });
  localStorage.removeItem(getStorageKey(slug));
}

/**
 * Remove all locally-persisted canvases from localStorage.
 * Used during beta migration to move fully to cloud storage.
 */
export function clearAllLocalCanvases(): void {
  const index = readCanvasIndex();
  for (const item of index.items) {
    localStorage.removeItem(getStorageKey(item.slug));
  }
  localStorage.removeItem(STORAGE_INDEX_KEY);
}

export function duplicateLocalCanvas(slug: string): LocalCanvasSummary | null {
  const index = readCanvasIndex();
  const source = index.items.find((item) => item.slug === slug);
  if (!source) return null;

  const raw = localStorage.getItem(getStorageKey(slug));
  const now = new Date().toISOString();
  const existingSlugs = new Set(index.items.map((item) => item.slug));
  const newSlug = pickUniqueSlug(`${slug}-copy`, existingSlugs);
  const newId = createUuid();
  const newName = `${source.name} (copy)`;

  const summary: LocalCanvasSummary = {
    id: newId,
    slug: newSlug,
    name: newName,
    createdAt: now,
    updatedAt: now,
  };

  upsertLocalCanvas(summary);

  if (raw) {
    try {
      const doc = JSON.parse(raw);
      if (doc.meta) {
        doc.meta.id = newId;
        doc.meta.name = newName;
        doc.meta.createdAt = now;
        doc.meta.updatedAt = now;
      }
      localStorage.setItem(getStorageKey(newSlug), JSON.stringify(doc));
    } catch {
      // If parsing fails, duplicate without data
    }
  }

  return summary;
}

export function ensureLocalCanvas(input: { slug: string; fallbackName?: string }): LocalCanvasSummary {
  const normalizedSlug = slugifyCanvasName(input.slug);
  const existing = getLocalCanvasBySlug(normalizedSlug);
  if (existing) return existing;

  return createLocalCanvas({
    slug: normalizedSlug,
    name: input.fallbackName ?? `Canvas ${normalizedSlug}`,
  });
}

export function readStoredDocument(canvasSlug: string): CanvasDocument | null {
  const raw = localStorage.getItem(getStorageKey(canvasSlug));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CanvasDocument;
  } catch {
    return null;
  }
}

/**
 * Persistence hook - auto-saves canvas state to localStorage on entity changes.
 *
 * @param canvasSlug - The canvas slug (used as storage key)
 * @param sceneGraph - The scene graph to serialize/deserialize
 */
export interface CanvasSettingsRefs {
  viewportConfig?: React.RefObject<ViewportConfig | null>;
  borderRadius?: React.RefObject<number>;
  canvasPosition?: React.RefObject<CanvasPositionConfig | null>;
  theme?: React.RefObject<string | undefined>;
}

export function usePersistence(
  canvasSlug: string,
  sceneGraph: SceneGraph | null,
  canvasSummary?: Pick<LocalCanvasSummary, 'id' | 'name' | 'createdAt'>,
  settingsRefs?: CanvasSettingsRefs,
): PersistenceState {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneGraphRef = useRef(sceneGraph);
  sceneGraphRef.current = sceneGraph;
  const prevSlugRef = useRef(canvasSlug);

  // Reset loaded state when canvas slug changes
  useEffect(() => {
    if (prevSlugRef.current !== canvasSlug) {
      setLoaded(false);
      prevSlugRef.current = canvasSlug;
    }
  }, [canvasSlug]);

  const doSave = useCallback(() => {
    const sg = sceneGraphRef.current;
    if (!sg || !canvasSlug) {
      console.log('[Persistence] doSave() aborted: no sceneGraph or canvasSlug');
      return;
    }

    console.log('[Persistence] doSave() called', {
      canvasSlug,
      entityCount: sg.entityCount,
      entities: sg.getAllEntities().map(e => ({ id: e.id, type: e.type, name: e.name })),
    });

    setStatus('saving');

    try {
      const nowIso = new Date().toISOString();
      const existing = readStoredDocument(canvasSlug);
      const docId = existing?.meta?.id ?? canvasSummary?.id ?? createUuid();
      const docName = canvasSummary?.name ?? existing?.meta?.name ?? `Canvas ${canvasSlug}`;
      const createdAt = existing?.meta?.createdAt ?? canvasSummary?.createdAt ?? nowIso;

      const uiState = useUIStore.getState();

      const doc: CanvasDocument = serialize({
        sceneGraph: sg,
        meta: {
          id: docId,
          name: docName,
          createdAt,
          updatedAt: nowIso,
        },
        viewportConfig: settingsRefs?.viewportConfig?.current ?? undefined,
        platform: uiState.canvasPlatform,
        spatialMode: uiState.spatialMode,
        platformConfigs: uiState.platformConfigs as any,
        borderRadius: settingsRefs?.borderRadius?.current ?? 0,
        canvasPosition: settingsRefs?.canvasPosition?.current ?? undefined,
        theme: (settingsRefs?.theme?.current as any) ?? undefined,
      });

      const storageKey = getStorageKey(canvasSlug);
      const serialized = JSON.stringify(doc);
      localStorage.setItem(storageKey, serialized);
      console.log('[Persistence] Saved to localStorage', {
        storageKey,
        dataLength: serialized.length,
        entityCount: doc.entities.length,
      });

      upsertLocalCanvas({
        id: docId,
        slug: canvasSlug,
        name: docName,
        createdAt,
        updatedAt: nowIso,
      });

      const now = Date.now();
      setLastSavedAt(now);
      setStatus('saved');
      bus.emit(CanvasDocumentEvents.SAVED, { canvasId: docId, savedAt: now });
    } catch {
      setStatus('unsaved');
    }
  }, [canvasSlug, canvasSummary?.createdAt, canvasSummary?.id, canvasSummary?.name]);

  const scheduleSave = useCallback(() => {
    setStatus('unsaved');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      doSave();
      timerRef.current = null;
    }, AUTO_SAVE_DELAY_MS);
  }, [doSave]);

  const save = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    doSave();
  }, [doSave]);

  const load = useCallback((): boolean => {
    const sg = sceneGraphRef.current;
    if (!sg || !canvasSlug) {
      console.log('[Persistence] load() aborted: no sceneGraph or canvasSlug', { sg: !!sg, canvasSlug });
      return false;
    }

    const storageKey = getStorageKey(canvasSlug);
    const raw = localStorage.getItem(storageKey);
    console.log('[Persistence] load() called', { storageKey, hasData: !!raw, dataLength: raw?.length });

    if (!raw) {
      // No saved data - mark as loaded (empty canvas)
      console.log('[Persistence] No saved data found, marking as loaded (empty canvas)');
      setLoaded(true);
      bus.emit(CanvasDocumentEvents.LOADED, { canvasId: canvasSlug });
      return false;
    }

    const result = deserializeToSceneGraph(raw, sg, { skipInvalidEntities: true });
    console.log('[Persistence] deserializeToSceneGraph result:', {
      success: result.success,
      entityCount: result.document?.entities?.length,
      error: result.error,
      warnings: result.warnings,
    });

    if (result.success) {
      const loadedDoc = readStoredDocument(canvasSlug);
      if (loadedDoc) {
        const uiStore = useUIStore.getState();
        if (loadedDoc.platform) uiStore.setCanvasPlatform(loadedDoc.platform);
        if (loadedDoc.spatialMode) uiStore.setSpatialMode(loadedDoc.spatialMode);
        if (loadedDoc.platformConfigs) {
          for (const [p, config] of Object.entries(loadedDoc.platformConfigs)) {
            uiStore.setPlatformConfig(p as any, config);
          }
        }
        // Restore canvas settings via bus events so pages.tsx state stays in sync
        if (loadedDoc.viewport) {
          bus.emit(CanvasDocumentEvents.BACKGROUND_CHANGED, { background: loadedDoc.viewport.background });
          bus.emit(CanvasDocumentEvents.VIEWPORT_CHANGED, {
            viewport: {
              width: loadedDoc.viewport.width,
              height: loadedDoc.viewport.height,
              sizeMode: loadedDoc.viewport.sizeMode,
            },
          });
        }
        if (loadedDoc.borderRadius !== undefined) {
          bus.emit(CanvasDocumentEvents.BORDER_RADIUS_CHANGED, { borderRadius: loadedDoc.borderRadius });
        }
        if (loadedDoc.canvasPosition) {
          bus.emit(CanvasDocumentEvents.CANVAS_POSITION_CHANGED, { position: loadedDoc.canvasPosition });
        }
        if (loadedDoc.theme) {
          bus.emit('canvas.document.theme.loaded', { theme: loadedDoc.theme });
        }
      }
      console.log('[Persistence] Load successful, sceneGraph entityCount:', sg.entityCount);
      setLoaded(true);
      setStatus('saved');
      bus.emit(CanvasDocumentEvents.LOADED, { canvasId: loadedDoc?.meta?.id ?? canvasSlug });
      return true;
    }

    // Deserialization failed - mark as loaded anyway to unblock
    console.log('[Persistence] Deserialization failed:', result.error);
    setLoaded(true);
    return false;
  }, [canvasSlug]);

  useEffect(() => {
    const unsubs = [
      // Entity CRUD
      bus.subscribe(CanvasEvents.ENTITY_CREATED, scheduleSave),
      bus.subscribe(CanvasEvents.ENTITY_UPDATED, scheduleSave),
      bus.subscribe(CanvasEvents.ENTITY_DELETED, scheduleSave),
      bus.subscribe(CanvasEvents.ENTITY_MOVED, scheduleSave),
      bus.subscribe(CanvasEvents.ENTITY_RESIZED, scheduleSave),
      bus.subscribe(CanvasEvents.ENTITY_CONFIG_UPDATED, scheduleSave),
      bus.subscribe(CanvasEvents.ENTITY_GROUPED, scheduleSave),
      bus.subscribe(CanvasEvents.ENTITY_UNGROUPED, scheduleSave),

      // Canvas document properties
      bus.subscribe(CanvasDocumentEvents.BACKGROUND_CHANGED, scheduleSave),
      bus.subscribe(CanvasDocumentEvents.VIEWPORT_CHANGED, scheduleSave),
      bus.subscribe(CanvasDocumentEvents.BORDER_RADIUS_CHANGED, scheduleSave),
      bus.subscribe(CanvasDocumentEvents.CANVAS_POSITION_CHANGED, scheduleSave),
      bus.subscribe(CanvasDocumentEvents.PLATFORM_CHANGED, scheduleSave),
      bus.subscribe(CanvasDocumentEvents.LAYOUT_MODE_CHANGED, scheduleSave),
      bus.subscribe(CanvasDocumentEvents.META_UPDATED, scheduleSave),

      // Pipeline events
      bus.subscribe(CanvasEvents.PIPELINE_EDGE_CREATED, scheduleSave),
      bus.subscribe(CanvasEvents.PIPELINE_EDGE_DELETED, scheduleSave),
      bus.subscribe(CanvasEvents.PIPELINE_NODE_ADDED, scheduleSave),
      bus.subscribe(CanvasEvents.PIPELINE_NODE_REMOVED, scheduleSave),

      // Docker events
      bus.subscribe(DockerEvents.CREATED, scheduleSave),
      bus.subscribe(DockerEvents.DELETED, scheduleSave),
      bus.subscribe(DockerEvents.UPDATED, scheduleSave),
      bus.subscribe(DockerEvents.TAB_ADDED, scheduleSave),
      bus.subscribe(DockerEvents.TAB_REMOVED, scheduleSave),
      bus.subscribe(DockerEvents.WIDGET_ADDED, scheduleSave),
      bus.subscribe(DockerEvents.WIDGET_REMOVED, scheduleSave),

      // Grid events
      bus.subscribe(GridEvents.CELL_PAINTED, scheduleSave),
      bus.subscribe(GridEvents.CELLS_BATCH_PAINTED, scheduleSave),
      bus.subscribe(GridEvents.CELL_CLEARED, scheduleSave),
      bus.subscribe(GridEvents.CONFIG_CHANGED, scheduleSave),
      bus.subscribe(GridEvents.TOGGLED, scheduleSave),
      bus.subscribe(GridEvents.CLEARED, scheduleSave),

      // Manual save
      bus.subscribe(CanvasDocumentEvents.SAVE_REQUESTED, save),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [scheduleSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  return { status, lastSavedAt, loaded, save, load };
}
