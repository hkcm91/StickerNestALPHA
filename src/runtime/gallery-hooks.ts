/**
 * Gallery Hooks
 *
 * Direct React hooks for trusted inline widgets to access the gallery store.
 * These bypass the bridge and talk directly to the kernel gallery store.
 *
 * @module runtime/gallery-hooks
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import { useCallback } from 'react';

import { useGalleryStore } from '../kernel/stores/gallery/gallery.store';
import type { GalleryAsset } from '../kernel/stores/gallery/gallery.store';

export type { GalleryAsset };

/**
 * Hook for trusted inline widgets to access gallery assets.
 *
 * Wraps the gallery store for direct access — no bridge needed for built-in widgets.
 *
 * @returns Gallery state and actions: assets, isLoading, error, uploadFromUrl, deleteAsset, refresh
 */
export function useGallery() {
  const assets = useGalleryStore((s) => s.assets);
  const isLoading = useGalleryStore((s) => s.isLoading);
  const error = useGalleryStore((s) => s.error);

  const uploadFromUrl = useCallback(async (imageUrl: string, name?: string): Promise<GalleryAsset | null> => {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const fileName = name || `gallery-${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
    const file = new File([blob], fileName, { type: blob.type });
    return useGalleryStore.getState().uploadAsset(file);
  }, []);

  const deleteAsset = useCallback(async (assetId: string): Promise<void> => {
    return useGalleryStore.getState().deleteAsset(assetId);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    return useGalleryStore.getState().loadGallery();
  }, []);

  return { assets, isLoading, error, uploadFromUrl, deleteAsset, refresh };
}
