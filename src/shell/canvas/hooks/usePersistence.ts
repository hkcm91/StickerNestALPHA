/**
 * usePersistence — auto-save + manual save/load for canvas documents.
 *
 * Serializes the scene graph to localStorage on entity changes (debounced 2s).
 * Manual save/load via Ctrl+S and on-demand.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { CanvasEvents, CanvasDocumentEvents } from '@sn/types';
import type { CanvasDocument } from '@sn/types';

import type { SceneGraph } from '../../../canvas/core';
import { serialize, deserializeToSceneGraph } from '../../../canvas/core/persistence';
import { bus } from '../../../kernel/bus';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

export interface PersistenceState {
  status: SaveStatus;
  lastSavedAt: number | null;
  save: () => void;
  load: () => boolean;
}

const STORAGE_KEY_PREFIX = 'sn:canvas:';
const AUTO_SAVE_DELAY_MS = 2000;

function getStorageKey(canvasId: string): string {
  return `${STORAGE_KEY_PREFIX}${canvasId}`;
}

/**
 * Persistence hook — auto-saves canvas state to localStorage on entity changes.
 *
 * @param canvasId - The canvas ID (used as storage key)
 * @param sceneGraph - The scene graph to serialize/deserialize
 */
export function usePersistence(
  canvasId: string,
  sceneGraph: SceneGraph | null,
): PersistenceState {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneGraphRef = useRef(sceneGraph);
  sceneGraphRef.current = sceneGraph;

  // Perform the actual save to localStorage
  const doSave = useCallback(() => {
    const sg = sceneGraphRef.current;
    if (!sg || !canvasId) return;

    setStatus('saving');

    try {
      const doc: CanvasDocument = serialize({
        sceneGraph: sg,
        meta: {
          id: canvasId,
          name: `Canvas ${canvasId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      const json = JSON.stringify(doc);
      localStorage.setItem(getStorageKey(canvasId), json);

      const now = Date.now();
      setLastSavedAt(now);
      setStatus('saved');
      bus.emit(CanvasDocumentEvents.SAVED, { canvasId, savedAt: now });
    } catch {
      setStatus('unsaved');
    }
  }, [canvasId]);

  // Schedule a debounced auto-save
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

  // Manual save (immediate)
  const save = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    doSave();
  }, [doSave]);

  // Load from localStorage into scene graph
  const load = useCallback((): boolean => {
    const sg = sceneGraphRef.current;
    if (!sg || !canvasId) return false;

    const raw = localStorage.getItem(getStorageKey(canvasId));
    if (!raw) return false;

    const result = deserializeToSceneGraph(raw, sg, { skipInvalidEntities: true });
    if (result.success) {
      setStatus('saved');
      bus.emit(CanvasDocumentEvents.LOADED, { canvasId });
      return true;
    }

    return false;
  }, [canvasId]);

  // Subscribe to entity change events for auto-save
  useEffect(() => {
    const unsubs = [
      bus.subscribe(CanvasEvents.ENTITY_CREATED, scheduleSave),
      bus.subscribe(CanvasEvents.ENTITY_UPDATED, scheduleSave),
      bus.subscribe(CanvasEvents.ENTITY_DELETED, scheduleSave),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [scheduleSave]);

  // Listen for Ctrl+S (manual save shortcut)
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

  return { status, lastSavedAt, save, load };
}
