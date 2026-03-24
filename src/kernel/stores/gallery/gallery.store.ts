/**
 * Gallery Store — manages user-uploaded photo assets with Supabase sync
 * @module kernel/stores/gallery
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { GalleryEvents, KernelEvents } from '@sn/types';

import { bus } from '../../bus';
import { supabase } from '../../supabase/client';

/** Database row type for gallery_assets table */
interface GalleryRow {
  id: string;
  name: string;
  storage_path: string;
  thumbnail_path: string | null;
  file_size: number;
  file_type: string;
  width: number | null;
  height: number | null;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseErrorShape {
  code?: string;
  message?: string;
  details?: string;
}

export interface GalleryAsset {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  thumbnailUrl?: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GalleryState {
  assets: GalleryAsset[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  /** Current user ID, set via AUTH_STATE_CHANGED bus event */
  currentUserId: string | null;
}

export interface GalleryActions {
  uploadAsset: (file: File) => Promise<GalleryAsset | null>;
  deleteAsset: (assetId: string) => Promise<void>;
  updateAsset: (
    assetId: string,
    updates: { name?: string; description?: string; tags?: string[] }
  ) => Promise<void>;
  loadGallery: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type GalleryStore = GalleryState & GalleryActions;

const initialState: GalleryState = {
  assets: [],
  isLoading: false,
  error: null,
  isInitialized: false,
  currentUserId: null,
};

let galleryAssetsTableUnavailable = false;

/**
 * Gets the public URL for a storage path
 */
function getPublicUrl(storagePath: string): string {
  const {
    data: { publicUrl },
  } = supabase.storage.from('assets').getPublicUrl(storagePath);
  return publicUrl;
}

/**
 * Maps a database row to a GalleryAsset
 */
function mapRowToAsset(row: GalleryRow): GalleryAsset {
  return {
    id: row.id,
    name: row.name,
    url: getPublicUrl(row.storage_path),
    storagePath: row.storage_path,
    thumbnailUrl: row.thumbnail_path ? getPublicUrl(row.thumbnail_path) : undefined,
    size: row.file_size,
    type: row.file_type,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    description: row.description ?? undefined,
    tags: row.tags ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingGalleryAssetsTable(error: SupabaseErrorShape | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return text.includes('gallery_assets') && (text.includes('not found') || text.includes('does not exist'));
}

export const useGalleryStore = create<GalleryStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      uploadAsset: async (file: File): Promise<GalleryAsset | null> => {
        const userId = get().currentUserId;
        if (!userId) {
          set({ error: 'User must be signed in to upload photos.' });
          return null;
        }

        set({ isLoading: true, error: null });

        try {
          // Generate unique filename
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const storagePath = `gallery/${userId}/${fileName}`;

          console.log(`[GalleryStore] Uploading ${file.name} to ${storagePath}...`);

          // 1. Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('assets')
            .upload(storagePath, file);

          if (uploadError) {
            console.error('[GalleryStore] Supabase storage upload error:', uploadError);
            throw uploadError;
          }

          // 2. Insert metadata record into gallery_assets table
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: insertedRow, error: insertError } = (await (supabase.from('gallery_assets') as any)
            .insert({
              owner_id: userId,
              name: file.name,
              storage_path: storagePath,
              file_type: file.type,
              file_size: file.size,
            })
            .select()
            .single()) as { data: GalleryRow | null; error: { message: string } | null };

          if (insertError || !insertedRow) {
            // Rollback: delete the uploaded file if DB insert fails
            console.error('[GalleryStore] DB insert error, rolling back storage upload:', insertError);
            await supabase.storage.from('assets').remove([storagePath]);
            throw new Error(insertError?.message ?? 'Insert returned no data');
          }

          const newAsset = mapRowToAsset(insertedRow);

          set((state) => ({
            assets: [newAsset, ...state.assets],
            isLoading: false,
          }));

          bus.emit(GalleryEvents.ASSET_UPLOADED, { asset: newAsset });
          return newAsset;
        } catch (error) {
          console.error('[GalleryStore] Failed to upload asset:', error);
          const message = error instanceof Error ? error.message : 'Upload failed';
          set({ error: message, isLoading: false });
          return null;
        }
      },

      deleteAsset: async (assetId: string) => {
        set({ isLoading: true, error: null });

        try {
          // Find the asset to get its storage path
          const asset = get().assets.find((a) => a.id === assetId);
          if (!asset) {
            throw new Error('Asset not found');
          }

          // 1. Delete from database first
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: deleteDbError } = (await (supabase.from('gallery_assets') as any)
            .delete()
            .eq('id', assetId)) as { error: { message: string } | null };

          if (deleteDbError) throw new Error(deleteDbError.message);

          // 2. Delete from storage
          const { error: deleteStorageError } = await supabase.storage
            .from('assets')
            .remove([asset.storagePath]);

          if (deleteStorageError) {
            console.warn('[GalleryStore] Storage delete failed (orphaned file):', deleteStorageError);
            // Don't throw - the DB record is already deleted, which is the important part
          }

          set((state) => ({
            assets: state.assets.filter((a) => a.id !== assetId),
            isLoading: false,
          }));

          bus.emit(GalleryEvents.ASSET_DELETED, { assetId });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Delete failed';
          set({ error: message, isLoading: false });
        }
      },

      updateAsset: async (
        assetId: string,
        updates: { name?: string; description?: string; tags?: string[] }
      ) => {
        set({ isLoading: true, error: null });

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: updatedRow, error: updateError } = (await (supabase.from('gallery_assets') as any)
            .update(updates)
            .eq('id', assetId)
            .select()
            .single()) as { data: GalleryRow | null; error: { message: string } | null };

          if (updateError) throw new Error(updateError.message);
          if (!updatedRow) throw new Error('Update returned no data');

          const updatedAsset = mapRowToAsset(updatedRow);

          set((state) => ({
            assets: state.assets.map((a) => (a.id === assetId ? updatedAsset : a)),
            isLoading: false,
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Update failed';
          set({ error: message, isLoading: false });
        }
      },

      loadGallery: async () => {
        const userId = get().currentUserId;
        if (!userId) return;

        if (galleryAssetsTableUnavailable) {
          set({ assets: [], isLoading: false, error: null, isInitialized: true });
          bus.emit(GalleryEvents.GALLERY_LOADED, { assets: [] });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Load from database table (includes all metadata)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = (await (supabase.from('gallery_assets') as any)
            .select('*')
            .eq('owner_id', userId)
            .order('created_at', { ascending: false })
            .limit(100)) as { data: GalleryRow[] | null; error: { message: string } | null };

          if (error) {
            if (isMissingGalleryAssetsTable(error)) {
              galleryAssetsTableUnavailable = true;
              console.warn(
                '[GalleryStore] gallery_assets table is missing in this Supabase project. Returning empty gallery.',
                error
              );
              set({ assets: [], isLoading: false, error: null, isInitialized: true });
              bus.emit(GalleryEvents.GALLERY_LOADED, { assets: [] });
              return;
            }
            throw new Error(error.message);
          }

          const assets: GalleryAsset[] = (data ?? []).map(mapRowToAsset);

          set({ assets, isLoading: false, isInitialized: true });
          bus.emit(GalleryEvents.GALLERY_LOADED, { assets });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Load failed';
          set({ error: message, isLoading: false });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    })),
    { name: 'galleryStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

/** Subscribe to gallery-related bus events for cross-store coordination */
export function setupGalleryBusSubscriptions(): void {
  // React to auth state changes via bus (no direct store-to-store import)
  bus.subscribe(KernelEvents.AUTH_STATE_CHANGED, (event: BusEvent) => {
    const payload = event.payload as { user?: { id: string } | null } | null;
    const user = payload?.user ?? null;

    if (user) {
      useGalleryStore.setState({ currentUserId: user.id });
      useGalleryStore.getState().loadGallery();
    } else {
      useGalleryStore.setState({ currentUserId: null });
      useGalleryStore.getState().reset();
    }
  });
}
