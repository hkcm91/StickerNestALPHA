/**
 * Gallery Bridge Handler
 *
 * Host-side handler for GALLERY_* messages from widgets.
 * Enforces 'gallery' permission and proxies to the galleryStore.
 *
 * @module runtime/bridge
 * @layer L3
 */

import { useGalleryStore } from '../../kernel/stores/gallery/gallery.store';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';

import type { WidgetBridge } from './bridge';
import type { WidgetMessage } from './message-types';

/**
 * Checks whether a widget has the 'gallery' permission.
 */
function hasGalleryPermission(widgetId: string): boolean {
  const entry = useWidgetStore.getState().registry[widgetId];
  return entry?.manifest?.permissions?.includes('gallery') ?? false;
}

interface HandlerContext {
  widgetId: string;
  instanceId: string;
  bridge: WidgetBridge;
}

/**
 * Handles gallery asset messages from a widget iframe.
 * Returns true if the message was handled, false otherwise.
 */
export function handleGalleryMessage(
  message: WidgetMessage,
  ctx: HandlerContext,
): boolean {
  // Only handle GALLERY_* messages
  if (!message.type.startsWith('GALLERY_')) {
    return false;
  }

  const { widgetId, instanceId, bridge } = ctx;
  const requestId = (message as { requestId?: string }).requestId ?? '';

  // Permission gate
  if (!hasGalleryPermission(widgetId)) {
    bridge.send({
      type: 'GALLERY_RESPONSE',
      requestId,
      result: null,
      error: 'Permission denied: widget lacks gallery permission',
    });
    return true;
  }

  switch (message.type) {
    case 'GALLERY_LIST': {
      const { limit, offset } = message as { limit?: number; offset?: number };
      handleGalleryList(requestId, limit, offset, instanceId, bridge);
      return true;
    }

    case 'GALLERY_UPLOAD': {
      const { imageUrl, name } = message as { imageUrl: string; name?: string };
      handleGalleryUpload(requestId, imageUrl, name, instanceId, bridge);
      return true;
    }

    case 'GALLERY_DELETE': {
      const { assetId } = message as { assetId: string };
      handleGalleryDelete(requestId, assetId, instanceId, bridge);
      return true;
    }

    case 'GALLERY_GET': {
      const { assetId } = message as { assetId: string };
      handleGalleryGet(requestId, assetId, instanceId, bridge);
      return true;
    }

    default:
      return false;
  }
}

async function handleGalleryList(
  requestId: string,
  limit: number | undefined,
  offset: number | undefined,
  instanceId: string,
  bridge: WidgetBridge,
): Promise<void> {
  try {
    const store = useGalleryStore.getState();

    // Load gallery if not yet initialized
    if (!store.isInitialized) {
      await store.loadGallery();
    }

    // Re-read after potential async load
    const { assets } = useGalleryStore.getState();
    const start = offset ?? 0;
    const end = limit ? start + limit : undefined;
    const sliced = assets.slice(start, end);

    bridge.send({
      type: 'GALLERY_RESPONSE',
      requestId,
      result: { assets: sliced, total: assets.length },
    });

    console.debug(`[GalleryHandler][${instanceId}] Listed ${sliced.length}/${assets.length} assets`);
  } catch (error) {
    bridge.send({
      type: 'GALLERY_RESPONSE',
      requestId,
      result: null,
      error: error instanceof Error ? error.message : 'Failed to list gallery assets',
    });
  }
}

async function handleGalleryUpload(
  requestId: string,
  imageUrl: string,
  name: string | undefined,
  instanceId: string,
  bridge: WidgetBridge,
): Promise<void> {
  try {
    // Fetch the image from the provided URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const fileName = name ?? imageUrl.split('/').pop() ?? 'upload';
    const file = new File([blob], fileName, { type: blob.type });

    const asset = await useGalleryStore.getState().uploadAsset(file);

    if (asset) {
      bridge.send({
        type: 'GALLERY_RESPONSE',
        requestId,
        result: { asset },
      });
      console.debug(`[GalleryHandler][${instanceId}] Uploaded asset: ${asset.id}`);
    } else {
      bridge.send({
        type: 'GALLERY_RESPONSE',
        requestId,
        result: null,
        error: 'Upload failed',
      });
    }
  } catch (error) {
    bridge.send({
      type: 'GALLERY_RESPONSE',
      requestId,
      result: null,
      error: error instanceof Error ? error.message : 'Failed to upload asset',
    });
  }
}

async function handleGalleryDelete(
  requestId: string,
  assetId: string,
  instanceId: string,
  bridge: WidgetBridge,
): Promise<void> {
  try {
    await useGalleryStore.getState().deleteAsset(assetId);

    bridge.send({
      type: 'GALLERY_RESPONSE',
      requestId,
      result: { success: true, assetId },
    });

    console.debug(`[GalleryHandler][${instanceId}] Deleted asset: ${assetId}`);
  } catch (error) {
    bridge.send({
      type: 'GALLERY_RESPONSE',
      requestId,
      result: null,
      error: error instanceof Error ? error.message : 'Failed to delete asset',
    });
  }
}

async function handleGalleryGet(
  requestId: string,
  assetId: string,
  instanceId: string,
  bridge: WidgetBridge,
): Promise<void> {
  try {
    const store = useGalleryStore.getState();

    if (!store.isInitialized) {
      await store.loadGallery();
    }

    const { assets } = useGalleryStore.getState();
    const asset = assets.find((a) => a.id === assetId);

    if (!asset) {
      bridge.send({
        type: 'GALLERY_RESPONSE',
        requestId,
        result: null,
        error: `Asset not found: ${assetId}`,
      });
      return;
    }

    bridge.send({
      type: 'GALLERY_RESPONSE',
      requestId,
      result: { asset },
    });

    console.debug(`[GalleryHandler][${instanceId}] Got asset: ${assetId}`);
  } catch (error) {
    bridge.send({
      type: 'GALLERY_RESPONSE',
      requestId,
      result: null,
      error: error instanceof Error ? error.message : 'Failed to get asset',
    });
  }
}
