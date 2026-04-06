/**
 * Gallery Handler Tests
 *
 * @module runtime/bridge
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useGalleryStore } from '../../kernel/stores/gallery/gallery.store';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

import { handleGalleryMessage } from './gallery-handler';
import type { WidgetMessage } from './message-types';

// Mock gallery store
vi.mock('../../kernel/stores/gallery/gallery.store', () => ({
  useGalleryStore: {
    getState: vi.fn(() => ({
      assets: [],
      isInitialized: false,
      loadGallery: vi.fn(),
      uploadAsset: vi.fn(),
      deleteAsset: vi.fn(),
    })),
  },
}));

// Mock widget store
vi.mock('../../kernel/stores/widget/widget.store', () => ({
  useWidgetStore: {
    getState: vi.fn(() => ({ registry: {} })),
  },
}));

function mockBridge() {
  return { send: vi.fn() } as any;
}

function ctxWith(overrides: Partial<{ widgetId: string; instanceId: string; bridge: any }> = {}) {
  return {
    widgetId: overrides.widgetId ?? 'w-1',
    instanceId: overrides.instanceId ?? 'inst-1',
    bridge: overrides.bridge ?? mockBridge(),
  };
}

function setPermissions(widgetId: string, permissions: string[]) {
  (useWidgetStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
    registry: {
      [widgetId]: { manifest: { permissions } },
    },
  });
}

function setGalleryState(state: Record<string, unknown>) {
  (useGalleryStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
    assets: [],
    isInitialized: false,
    loadGallery: vi.fn(),
    uploadAsset: vi.fn(),
    deleteAsset: vi.fn(),
    ...state,
  });
}

describe('handleGalleryMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useWidgetStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ registry: {} });
    (useGalleryStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      assets: [],
      isInitialized: false,
      loadGallery: vi.fn(),
      uploadAsset: vi.fn(),
      deleteAsset: vi.fn(),
    });
  });

  it('returns false for non-gallery message types', () => {
    const bridge = mockBridge();
    const ctx = ctxWith({ bridge });
    const result = handleGalleryMessage({ type: 'EMIT', eventType: 'x', payload: null } as WidgetMessage, ctx);
    expect(result).toBe(false);
    expect(bridge.send).not.toHaveBeenCalled();
  });

  it('rejects GALLERY_LIST without gallery permission', () => {
    const bridge = mockBridge();
    const ctx = ctxWith({ bridge, widgetId: 'w-no-perm' });

    const msg: WidgetMessage = {
      type: 'GALLERY_LIST',
      requestId: 'r1',
    };
    const handled = handleGalleryMessage(msg, ctx);

    expect(handled).toBe(true);
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'GALLERY_RESPONSE',
        requestId: 'r1',
        result: null,
        error: expect.stringContaining('Permission denied'),
      }),
    );
  });

  it('rejects GALLERY_DELETE without gallery permission', () => {
    const bridge = mockBridge();
    const ctx = ctxWith({ bridge, widgetId: 'w-no-perm' });

    const msg: WidgetMessage = {
      type: 'GALLERY_DELETE',
      requestId: 'r2',
      assetId: 'asset-1',
    };
    const handled = handleGalleryMessage(msg, ctx);

    expect(handled).toBe(true);
    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'GALLERY_RESPONSE',
        requestId: 'r2',
        result: null,
        error: expect.stringContaining('Permission denied'),
      }),
    );
  });

  it('handles GALLERY_LIST with permission and returns assets', async () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['gallery']);
    const assets = [
      { id: 'a1', name: 'photo1.png', url: 'http://example.com/a1' },
      { id: 'a2', name: 'photo2.png', url: 'http://example.com/a2' },
    ];
    setGalleryState({ assets, isInitialized: true });
    const ctx = ctxWith({ bridge });

    const msg: WidgetMessage = {
      type: 'GALLERY_LIST',
      requestId: 'r3',
    };
    const handled = handleGalleryMessage(msg, ctx);

    expect(handled).toBe(true);
    // Allow async to settle
    await vi.waitFor(() => {
      expect(bridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GALLERY_RESPONSE',
          requestId: 'r3',
          result: expect.objectContaining({ assets }),
        }),
      );
    });
  });

  it('handles GALLERY_DELETE with permission', async () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['gallery']);
    const deleteAsset = vi.fn().mockResolvedValue(undefined);
    setGalleryState({ deleteAsset, isInitialized: true });
    const ctx = ctxWith({ bridge });

    const msg: WidgetMessage = {
      type: 'GALLERY_DELETE',
      requestId: 'r4',
      assetId: 'asset-del',
    };
    const handled = handleGalleryMessage(msg, ctx);

    expect(handled).toBe(true);
    await vi.waitFor(() => {
      expect(deleteAsset).toHaveBeenCalledWith('asset-del');
      expect(bridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GALLERY_RESPONSE',
          requestId: 'r4',
          result: expect.objectContaining({ success: true }),
        }),
      );
    });
  });

  it('handles GALLERY_GET with permission and returns found asset', async () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['gallery']);
    const assets = [
      { id: 'a1', name: 'photo1.png', url: 'http://example.com/a1' },
      { id: 'a2', name: 'photo2.png', url: 'http://example.com/a2' },
    ];
    setGalleryState({ assets, isInitialized: true });
    const ctx = ctxWith({ bridge });

    const msg: WidgetMessage = {
      type: 'GALLERY_GET',
      requestId: 'r5',
      assetId: 'a2',
    };
    const handled = handleGalleryMessage(msg, ctx);

    expect(handled).toBe(true);
    await vi.waitFor(() => {
      expect(bridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GALLERY_RESPONSE',
          requestId: 'r5',
          result: expect.objectContaining({ asset: assets[1] }),
        }),
      );
    });
  });

  it('handles GALLERY_GET with asset not found', async () => {
    const bridge = mockBridge();
    setPermissions('w-1', ['gallery']);
    setGalleryState({ assets: [], isInitialized: true });
    const ctx = ctxWith({ bridge });

    const msg: WidgetMessage = {
      type: 'GALLERY_GET',
      requestId: 'r6',
      assetId: 'nonexistent',
    };
    const handled = handleGalleryMessage(msg, ctx);

    expect(handled).toBe(true);
    await vi.waitFor(() => {
      expect(bridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GALLERY_RESPONSE',
          requestId: 'r6',
          result: null,
          error: expect.stringContaining('not found'),
        }),
      );
    });
  });
});
