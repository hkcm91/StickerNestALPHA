/**
 * Gallery Store Tests
 *
 * @module kernel/stores/gallery
 * @layer L0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GalleryEvents, KernelEvents } from '@sn/types';

import { bus } from '../../bus';

// Mock Supabase client before imports
vi.mock('../../supabase/client', () => {
  const mockStorage = {
    from: vi.fn(() => ({
      getPublicUrl: vi.fn((path: string) => ({
        data: { publicUrl: `https://cdn.test/${path}` },
      })),
      upload: vi.fn(),
      remove: vi.fn(),
    })),
  };

  const mockFrom = vi.fn();

  return {
    supabase: {
      storage: mockStorage,
      from: mockFrom,
    },
  };
});

import { supabase } from '../../supabase/client';

import { useGalleryStore, setupGalleryBusSubscriptions } from './gallery.store';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockStorageFrom = supabase.storage.from as ReturnType<typeof vi.fn>;

function mockUpload(error: { message: string } | null = null) {
  mockStorageFrom.mockReturnValue({
    getPublicUrl: vi.fn((path: string) => ({
      data: { publicUrl: `https://cdn.test/${path}` },
    })),
    upload: vi.fn().mockResolvedValue({ error }),
    remove: vi.fn().mockResolvedValue({ error: null }),
  });
}

function mockGalleryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'asset-1',
    name: 'photo.png',
    storage_path: 'gallery/user-1/abc.png',
    thumbnail_path: null,
    file_size: 1024,
    file_type: 'image/png',
    width: 100,
    height: 200,
    description: null,
    tags: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Gallery Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGalleryStore.getState().reset();
    useGalleryStore.setState({ currentUserId: 'user-1' });
    bus.unsubscribeAll();
  });

  describe('initial state', () => {
    it('should have empty assets and not be loading or initialized', () => {
      useGalleryStore.getState().reset();
      const state = useGalleryStore.getState();
      expect(state.assets).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('setLoading / setError / reset', () => {
    it('setLoading sets the loading flag', () => {
      useGalleryStore.getState().setLoading(true);
      expect(useGalleryStore.getState().isLoading).toBe(true);
    });

    it('setError sets the error message', () => {
      useGalleryStore.getState().setError('Something failed');
      expect(useGalleryStore.getState().error).toBe('Something failed');
    });

    it('reset restores initial state', () => {
      useGalleryStore.setState({ assets: [mockGalleryRow() as never], isLoading: true, error: 'err' });
      useGalleryStore.getState().reset();
      expect(useGalleryStore.getState().assets).toEqual([]);
      expect(useGalleryStore.getState().isLoading).toBe(false);
      expect(useGalleryStore.getState().error).toBeNull();
    });
  });

  describe('uploadAsset', () => {
    it('returns null and sets error when no user is signed in', async () => {
      useGalleryStore.setState({ currentUserId: null });
      const file = new File(['data'], 'test.png', { type: 'image/png' });

      const result = await useGalleryStore.getState().uploadAsset(file);

      expect(result).toBeNull();
      expect(useGalleryStore.getState().error).toContain('signed in');
    });

    it('uploads file and inserts DB row on success', async () => {
      const row = mockGalleryRow();
      mockUpload(null);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          }),
        }),
      });

      const busHandler = vi.fn();
      bus.subscribe(GalleryEvents.ASSET_UPLOADED, busHandler);

      const file = new File(['data'], 'photo.png', { type: 'image/png' });
      const result = await useGalleryStore.getState().uploadAsset(file);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('asset-1');
      expect(useGalleryStore.getState().assets).toHaveLength(1);
      expect(busHandler).toHaveBeenCalledOnce();
    });

    it('sets error on storage upload failure', async () => {
      mockUpload({ message: 'Storage error' });

      const file = new File(['data'], 'photo.png', { type: 'image/png' });
      const result = await useGalleryStore.getState().uploadAsset(file);

      expect(result).toBeNull();
      // The storage upload error is not an Error instance, so the catch block
      // falls back to 'Upload failed'
      expect(useGalleryStore.getState().error).toBe('Upload failed');
    });
  });

  describe('deleteAsset', () => {
    it('removes asset from store and emits bus event', async () => {
      const asset = {
        id: 'asset-1',
        name: 'photo.png',
        url: 'https://cdn.test/gallery/user-1/abc.png',
        storagePath: 'gallery/user-1/abc.png',
        size: 1024,
        type: 'image/png',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      useGalleryStore.setState({ assets: [asset] });

      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockStorageFrom.mockReturnValue({
        getPublicUrl: vi.fn(),
        remove: vi.fn().mockResolvedValue({ error: null }),
      });

      const busHandler = vi.fn();
      bus.subscribe(GalleryEvents.ASSET_DELETED, busHandler);

      await useGalleryStore.getState().deleteAsset('asset-1');

      expect(useGalleryStore.getState().assets).toHaveLength(0);
      expect(busHandler).toHaveBeenCalledOnce();
    });

    it('sets error when asset not found', async () => {
      useGalleryStore.setState({ assets: [] });

      await useGalleryStore.getState().deleteAsset('nonexistent');

      expect(useGalleryStore.getState().error).toBe('Asset not found');
    });
  });

  describe('loadGallery', () => {
    it('loads assets from database and emits GALLERY_LOADED', async () => {
      const rows = [mockGalleryRow(), mockGalleryRow({ id: 'asset-2', name: 'cat.gif' })];
      // The code uses (supabase.from('gallery_assets') as any).select('*').eq(...).order(...).limit(100)
      const limitMock = vi.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ select: selectMock });

      const busHandler = vi.fn();
      bus.subscribe(GalleryEvents.GALLERY_LOADED, busHandler);

      await useGalleryStore.getState().loadGallery();

      expect(useGalleryStore.getState().assets).toHaveLength(2);
      expect(useGalleryStore.getState().isInitialized).toBe(true);
      expect(busHandler).toHaveBeenCalledOnce();
    });

    it('does nothing when no user is signed in', async () => {
      useGalleryStore.setState({ currentUserId: null });

      await useGalleryStore.getState().loadGallery();

      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('setupGalleryBusSubscriptions', () => {
    it('sets currentUserId and loads gallery on AUTH_STATE_CHANGED with user', async () => {
      // Set up loadGallery mock
      const rows = [mockGalleryRow()];
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
            }),
          }),
        }),
      });

      setupGalleryBusSubscriptions();

      bus.emit(KernelEvents.AUTH_STATE_CHANGED, { user: { id: 'user-2' } });

      expect(useGalleryStore.getState().currentUserId).toBe('user-2');
    });

    it('resets store on AUTH_STATE_CHANGED with null user', () => {
      useGalleryStore.setState({ currentUserId: 'user-1', assets: [mockGalleryRow() as never] });

      setupGalleryBusSubscriptions();

      bus.emit(KernelEvents.AUTH_STATE_CHANGED, { user: null });

      expect(useGalleryStore.getState().currentUserId).toBeNull();
      expect(useGalleryStore.getState().assets).toEqual([]);
    });
  });
});
