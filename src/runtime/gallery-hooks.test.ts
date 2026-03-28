/**
 * Gallery Hooks — Tests
 *
 * @module runtime/gallery-hooks
 * @layer L3
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { GalleryAsset } from '../kernel/stores/gallery/gallery.store';

// vi.hoisted runs before vi.mock hoisting, so these are available in the factory
const { mockUploadAsset, mockDeleteAsset, mockLoadGallery, mockStoreState } = vi.hoisted(() => {
  const state: Record<string, unknown> = {
    assets: [],
    isLoading: false,
    error: null,
  };
  return {
    mockUploadAsset: vi.fn(),
    mockDeleteAsset: vi.fn(),
    mockLoadGallery: vi.fn(),
    mockStoreState: state,
  };
});

vi.mock('../kernel/stores/gallery/gallery.store', () => {
  const useGalleryStore = Object.assign(
    (selector?: (state: Record<string, unknown>) => unknown) => {
      if (selector) return selector(mockStoreState);
      return mockStoreState;
    },
    {
      getState: () => mockStoreState,
      setState: (partial: Record<string, unknown>) => {
        Object.assign(mockStoreState, partial);
      },
    },
  );

  return { useGalleryStore };
});

import { useGallery } from './gallery-hooks';

const mockAssets: GalleryAsset[] = [
  {
    id: 'asset-1',
    name: 'photo.png',
    url: 'https://example.com/photo.png',
    storagePath: 'gallery/user-1/photo.png',
    size: 1024,
    type: 'image/png',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'asset-2',
    name: 'banner.jpg',
    url: 'https://example.com/banner.jpg',
    storagePath: 'gallery/user-1/banner.jpg',
    size: 2048,
    type: 'image/jpeg',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

describe('useGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadAsset.mockResolvedValue(null);
    mockDeleteAsset.mockResolvedValue(undefined);
    mockLoadGallery.mockResolvedValue(undefined);
    // Reset store state for each test
    mockStoreState.assets = mockAssets;
    mockStoreState.isLoading = false;
    mockStoreState.error = null;
    mockStoreState.uploadAsset = mockUploadAsset;
    mockStoreState.deleteAsset = mockDeleteAsset;
    mockStoreState.loadGallery = mockLoadGallery;
  });

  it('returns assets from the gallery store', () => {
    const { result } = renderHook(() => useGallery());

    expect(result.current.assets).toEqual(mockAssets);
    expect(result.current.assets).toHaveLength(2);
  });

  it('returns loading state from the gallery store', () => {
    const { result } = renderHook(() => useGallery());

    expect(result.current.isLoading).toBe(false);
  });

  it('returns error state from the gallery store', () => {
    const { result } = renderHook(() => useGallery());

    expect(result.current.error).toBeNull();
  });

  it('provides an uploadFromUrl function that fetches and uploads', async () => {
    const uploadedAsset: GalleryAsset = {
      id: 'asset-new',
      name: 'fetched.png',
      url: 'https://example.com/fetched.png',
      storagePath: 'gallery/user-1/fetched.png',
      size: 512,
      type: 'image/png',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    };
    mockUploadAsset.mockResolvedValue(uploadedAsset);

    const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    const { result } = renderHook(() => useGallery());

    let uploaded: GalleryAsset | null = null;
    await act(async () => {
      uploaded = await result.current.uploadFromUrl('https://example.com/remote.png', 'fetched.png');
    });

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/remote.png');
    expect(mockUploadAsset).toHaveBeenCalledTimes(1);
    const uploadedFile = mockUploadAsset.mock.calls[0][0];
    expect(uploadedFile).toBeInstanceOf(File);
    expect(uploadedFile.name).toBe('fetched.png');
    expect(uploadedFile.type).toBe('image/png');
    expect(uploaded).toEqual(uploadedAsset);

    fetchSpy.mockRestore();
  });

  it('provides a deleteAsset function', async () => {
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.deleteAsset('asset-1');
    });

    expect(mockDeleteAsset).toHaveBeenCalledWith('asset-1');
  });

  it('provides a refresh function that reloads the gallery', async () => {
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockLoadGallery).toHaveBeenCalledTimes(1);
  });

  it('generates a filename from blob type when no name is provided', async () => {
    const mockBlob = new Blob(['data'], { type: 'image/jpeg' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    } as Response);
    mockUploadAsset.mockResolvedValue(null);

    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.uploadFromUrl('https://example.com/img');
    });

    const uploadedFile = mockUploadAsset.mock.calls[0][0];
    expect(uploadedFile.name).toMatch(/^gallery-\d+\.jpeg$/);
    expect(uploadedFile.type).toBe('image/jpeg');

    fetchSpy.mockRestore();
  });
});
