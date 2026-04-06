# Gallery Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a gallery widget that absorbs/copies images from the canvas into a per-user Supabase-backed photo bucket, and can emit images back out as sticker entities.

**Architecture:** SDK-only built-in widget (Approach B) using new bridge message types (`GALLERY_UPLOAD`, `GALLERY_LIST`, `GALLERY_DELETE`, `GALLERY_GET`) that the host proxies to the existing `galleryStore` and Supabase storage. The widget uses the same hooks as other built-ins (`useEmit`, `useSubscribe`, `useWidgetState`) plus a new `useGallery` hook that wraps the gallery bridge messages.

**Tech Stack:** React, Zustand, Zod, Supabase Storage + DB, existing bridge/SDK infrastructure

---

### Task 1: Add 'gallery' permission to WidgetPermissionSchema

**Files:**
- Modify: `src/kernel/schemas/widget-manifest.ts:23-54` (add `'gallery'` to the enum)
- Modify: `src/kernel/schemas/widget-manifest.test.ts` (add gallery to valid permission test)

**Step 1: Add the permission**

In `src/kernel/schemas/widget-manifest.ts`, add `'gallery'` to the `WidgetPermissionSchema` enum:

```typescript
// After line 53 ('canvas-write'):
  /** Access to gallery asset management APIs */
  'gallery',
```

**Step 2: Update the test**

In `src/kernel/schemas/widget-manifest.test.ts`, find the `WidgetPermissionSchema` describe block and add `'gallery'` to the valid permissions array.

**Step 3: Run test to verify**

Run: `npx vitest run src/kernel/schemas/widget-manifest.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/kernel/schemas/widget-manifest.ts src/kernel/schemas/widget-manifest.test.ts
git commit -m "feat(kernel): add 'gallery' widget permission to WidgetPermissionSchema"
```

---

### Task 2: Add gallery bridge message types

**Files:**
- Modify: `src/runtime/bridge/message-types.ts` (add GALLERY_* to both WidgetMessage and HostMessage)

**Step 1: Add widget-to-host gallery messages**

In `src/runtime/bridge/message-types.ts`, add to the `WidgetMessage` union (after the property layer messages at line 90):

```typescript
  // Gallery asset management messages (requires 'gallery' permission)
  | { type: 'GALLERY_UPLOAD'; requestId: string; imageUrl: string; name?: string; sourceEntityId?: string }
  | { type: 'GALLERY_LIST'; requestId: string; limit?: number; offset?: number }
  | { type: 'GALLERY_DELETE'; requestId: string; assetId: string }
  | { type: 'GALLERY_GET'; requestId: string; assetId: string }
```

**Step 2: Add host-to-widget gallery response**

Add to the `HostMessage` union (after the existing response types):

```typescript
  | { type: 'GALLERY_RESPONSE'; requestId: string; result: unknown; error?: string }
```

**Step 3: Run existing bridge tests**

Run: `npx vitest run src/runtime/bridge/`
Expected: PASS (type additions don't break existing tests)

**Step 4: Commit**

```bash
git add src/runtime/bridge/message-types.ts
git commit -m "feat(runtime): add GALLERY_* bridge message types"
```

---

### Task 3: Create gallery bridge handler

**Files:**
- Create: `src/runtime/bridge/gallery-handler.ts`
- Create: `src/runtime/bridge/gallery-handler.test.ts`

**Step 1: Write the failing test**

Create `src/runtime/bridge/gallery-handler.test.ts`:

```typescript
/**
 * Gallery Bridge Handler Tests
 * @module runtime/bridge
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handleGalleryMessage } from './gallery-handler';
import type { WidgetMessage } from './message-types';

// Mock the gallery store
vi.mock('../../kernel/stores/gallery/gallery.store', () => ({
  useGalleryStore: {
    getState: vi.fn(() => ({
      assets: [],
      uploadAsset: vi.fn(),
      deleteAsset: vi.fn(),
      loadGallery: vi.fn(),
    })),
  },
}));

// Mock the widget store for permission checks
vi.mock('../../kernel/stores/widget/widget.store', () => ({
  useWidgetStore: {
    getState: vi.fn(() => ({
      registry: {
        'test-widget': {
          manifest: { permissions: ['gallery'] },
        },
        'no-perm-widget': {
          manifest: { permissions: [] },
        },
      },
    })),
  },
}));

describe('handleGalleryMessage', () => {
  const mockBridge = {
    send: vi.fn(),
    onMessage: vi.fn(),
    isReady: vi.fn(() => true),
    destroy: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false for non-gallery messages', () => {
    const message = { type: 'EMIT', eventType: 'test', payload: {} } as WidgetMessage;
    const result = handleGalleryMessage(message, {
      widgetId: 'test-widget',
      instanceId: 'inst-1',
      bridge: mockBridge,
    });
    expect(result).toBe(false);
  });

  it('rejects GALLERY_LIST without gallery permission', () => {
    const message = {
      type: 'GALLERY_LIST',
      requestId: 'req-1',
    } as WidgetMessage;
    const result = handleGalleryMessage(message, {
      widgetId: 'no-perm-widget',
      instanceId: 'inst-1',
      bridge: mockBridge,
    });
    expect(result).toBe(true);
    expect(mockBridge.send).toHaveBeenCalledWith({
      type: 'GALLERY_RESPONSE',
      requestId: 'req-1',
      result: null,
      error: 'Permission denied: widget lacks gallery permission',
    });
  });

  it('handles GALLERY_LIST with permission', () => {
    const message = {
      type: 'GALLERY_LIST',
      requestId: 'req-1',
    } as WidgetMessage;
    const result = handleGalleryMessage(message, {
      widgetId: 'test-widget',
      instanceId: 'inst-1',
      bridge: mockBridge,
    });
    expect(result).toBe(true);
    // Async — response sent after promise resolves
  });

  it('handles GALLERY_DELETE with permission', () => {
    const message = {
      type: 'GALLERY_DELETE',
      requestId: 'req-2',
      assetId: 'asset-123',
    } as WidgetMessage;
    const result = handleGalleryMessage(message, {
      widgetId: 'test-widget',
      instanceId: 'inst-1',
      bridge: mockBridge,
    });
    expect(result).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/runtime/bridge/gallery-handler.test.ts`
Expected: FAIL — `handleGalleryMessage` does not exist

**Step 3: Write the handler implementation**

Create `src/runtime/bridge/gallery-handler.ts`:

```typescript
/**
 * Gallery Bridge Handler
 *
 * Host-side handler for gallery asset management from widgets.
 * Enforces 'gallery' permission before proxying to galleryStore.
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
  const { widgetId, instanceId, bridge } = ctx;

  // Only handle GALLERY_* messages
  if (!('type' in message) || !message.type.startsWith('GALLERY_')) {
    return false;
  }

  const requestId = (message as any).requestId as string;

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
      const { limit, offset } = message as any;
      const store = useGalleryStore.getState();

      // Load gallery if not initialized
      if (!store.isInitialized) {
        store.loadGallery().then(() => {
          const assets = useGalleryStore.getState().assets;
          const start = offset ?? 0;
          const end = limit ? start + limit : undefined;
          bridge.send({
            type: 'GALLERY_RESPONSE',
            requestId,
            result: { assets: assets.slice(start, end) },
          });
        }).catch((err: unknown) => {
          bridge.send({
            type: 'GALLERY_RESPONSE',
            requestId,
            result: null,
            error: err instanceof Error ? err.message : 'Failed to load gallery',
          });
        });
      } else {
        const assets = store.assets;
        const start = offset ?? 0;
        const end = limit ? start + limit : undefined;
        bridge.send({
          type: 'GALLERY_RESPONSE',
          requestId,
          result: { assets: assets.slice(start, end) },
        });
      }
      return true;
    }

    case 'GALLERY_UPLOAD': {
      const { imageUrl, name } = message as any;

      // Fetch the image from the URL and convert to File
      fetch(imageUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const fileName = name || `gallery-${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
          const file = new File([blob], fileName, { type: blob.type });
          return useGalleryStore.getState().uploadAsset(file);
        })
        .then((asset) => {
          if (asset) {
            bridge.send({
              type: 'GALLERY_RESPONSE',
              requestId,
              result: { asset },
            });
          } else {
            bridge.send({
              type: 'GALLERY_RESPONSE',
              requestId,
              result: null,
              error: useGalleryStore.getState().error || 'Upload failed',
            });
          }
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'GALLERY_RESPONSE',
            requestId,
            result: null,
            error: err instanceof Error ? err.message : 'Upload failed',
          });
        });

      console.debug(`[GalleryHandler][${instanceId}] Upload requested: ${imageUrl}`);
      return true;
    }

    case 'GALLERY_DELETE': {
      const { assetId } = message as any;

      useGalleryStore.getState().deleteAsset(assetId)
        .then(() => {
          bridge.send({
            type: 'GALLERY_RESPONSE',
            requestId,
            result: { success: true },
          });
        })
        .catch((err: unknown) => {
          bridge.send({
            type: 'GALLERY_RESPONSE',
            requestId,
            result: null,
            error: err instanceof Error ? err.message : 'Delete failed',
          });
        });

      console.debug(`[GalleryHandler][${instanceId}] Delete requested: ${assetId}`);
      return true;
    }

    case 'GALLERY_GET': {
      const { assetId } = message as any;
      const store = useGalleryStore.getState();
      const asset = store.assets.find((a) => a.id === assetId);

      bridge.send({
        type: 'GALLERY_RESPONSE',
        requestId,
        result: asset ? { asset } : null,
        error: asset ? undefined : 'Asset not found',
      });
      return true;
    }

    default:
      return false;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/runtime/bridge/gallery-handler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/runtime/bridge/gallery-handler.ts src/runtime/bridge/gallery-handler.test.ts
git commit -m "feat(runtime): add gallery bridge handler with permission gating"
```

---

### Task 4: Wire gallery handler into WidgetFrame

**Files:**
- Modify: `src/runtime/WidgetFrame.tsx:24` (add import)
- Modify: `src/runtime/WidgetFrame.tsx:475-479` (add to handler chain in default case)

**Step 1: Add the import**

After line 24 (`import { handleEntityMessage } from './bridge/entity-handler';`), add:

```typescript
import { handleGalleryMessage } from './bridge/gallery-handler';
```

**Step 2: Add to the handler chain**

In the `default` case of the message switch (around line 474-479), add `handleGalleryMessage` to the chain. Change:

```typescript
          if (!handleCanvasWriteMessage(message, { widgetId, instanceId, bridge })
            && !handleEntityMessage(message, { widgetId, instanceId, bridge })
            && !handleDataSourceMessage(message, { widgetId, instanceId, bridge })
            && !handleMcpMessage(message, { widgetId, instanceId, bridge })) {
            handleAiCompletionMessage(message, { widgetId, instanceId, bridge });
          }
```

To:

```typescript
          if (!handleCanvasWriteMessage(message, { widgetId, instanceId, bridge })
            && !handleEntityMessage(message, { widgetId, instanceId, bridge })
            && !handleGalleryMessage(message, { widgetId, instanceId, bridge })
            && !handleDataSourceMessage(message, { widgetId, instanceId, bridge })
            && !handleMcpMessage(message, { widgetId, instanceId, bridge })) {
            handleAiCompletionMessage(message, { widgetId, instanceId, bridge });
          }
```

**Step 3: Run the build to verify no type errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/runtime/WidgetFrame.tsx
git commit -m "feat(runtime): wire gallery handler into WidgetFrame message chain"
```

---

### Task 5: Create useGallery hook for built-in widgets

**Files:**
- Create: `src/runtime/gallery-hooks.ts`
- Create: `src/runtime/gallery-hooks.test.ts`

**Step 1: Write the failing test**

Create `src/runtime/gallery-hooks.test.ts`:

```typescript
/**
 * Gallery Hooks Tests
 * @module runtime
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useGallery } from './gallery-hooks';

// Mock gallery store
const mockAssets = [
  { id: 'a1', name: 'photo.jpg', url: 'https://example.com/photo.jpg', storagePath: 'gallery/u1/photo.jpg', size: 1000, type: 'image/jpeg', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];

const mockUploadAsset = vi.fn().mockResolvedValue(mockAssets[0]);
const mockDeleteAsset = vi.fn().mockResolvedValue(undefined);
const mockLoadGallery = vi.fn().mockResolvedValue(undefined);

vi.mock('../kernel/stores/gallery/gallery.store', () => ({
  useGalleryStore: Object.assign(
    vi.fn((selector: any) => {
      const state = {
        assets: mockAssets,
        isLoading: false,
        error: null,
        isInitialized: true,
        uploadAsset: mockUploadAsset,
        deleteAsset: mockDeleteAsset,
        loadGallery: mockLoadGallery,
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: vi.fn(() => ({
        assets: mockAssets,
        isLoading: false,
        error: null,
        isInitialized: true,
        uploadAsset: mockUploadAsset,
        deleteAsset: mockDeleteAsset,
        loadGallery: mockLoadGallery,
      })),
    }
  ),
}));

describe('useGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns gallery assets', () => {
    const { result } = renderHook(() => useGallery());
    expect(result.current.assets).toEqual(mockAssets);
  });

  it('provides upload function', () => {
    const { result } = renderHook(() => useGallery());
    expect(typeof result.current.uploadFromUrl).toBe('function');
  });

  it('provides delete function', () => {
    const { result } = renderHook(() => useGallery());
    expect(typeof result.current.deleteAsset).toBe('function');
  });

  it('provides loading state', () => {
    const { result } = renderHook(() => useGallery());
    expect(result.current.isLoading).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/runtime/gallery-hooks.test.ts`
Expected: FAIL — `useGallery` does not exist

**Step 3: Write the hook implementation**

Create `src/runtime/gallery-hooks.ts`:

```typescript
/**
 * Gallery Hooks
 *
 * React hooks for built-in widgets to interact with the gallery store.
 * These are direct store access hooks (trusted inline widgets only).
 *
 * @module runtime
 * @layer L3
 */

import { useCallback } from 'react';

import { useGalleryStore } from '../kernel/stores/gallery/gallery.store';
import type { GalleryAsset } from '../kernel/stores/gallery/gallery.store';

export type { GalleryAsset };

/**
 * Hook for gallery asset management in built-in widgets.
 *
 * Provides access to gallery assets, upload (from URL), delete, and refresh.
 * For inline trusted widgets only — sandboxed widgets use bridge messages.
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/runtime/gallery-hooks.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/runtime/gallery-hooks.ts src/runtime/gallery-hooks.test.ts
git commit -m "feat(runtime): add useGallery hook for built-in widget gallery access"
```

---

### Task 6: Create gallery widget scaffold (events + schema + manifest)

**Files:**
- Create: `src/runtime/widgets/gallery/index.ts`
- Create: `src/runtime/widgets/gallery/gallery.events.ts`
- Create: `src/runtime/widgets/gallery/gallery.schema.ts`

**Step 1: Create gallery events**

Create `src/runtime/widgets/gallery/gallery.events.ts`:

```typescript
/**
 * Gallery Widget Events
 * @module runtime/widgets/gallery
 */

import { z } from 'zod';

export const GALLERY_EVENTS = {
  emits: {
    READY: 'widget.gallery.ready',
    IMAGE_ABSORBED: 'widget.gallery.image.absorbed',
    IMAGE_EMITTED: 'widget.gallery.image.emitted',
    IMAGE_DELETED: 'widget.gallery.image.deleted',
  },
  subscribes: {
    CONFIG_UPDATE: 'widget.gallery.config.update',
    ABSORB_ENTITY: 'widget.gallery.command.absorb',
  },
} as const;

export const GalleryEventPayloads = {
  emits: {
    [GALLERY_EVENTS.emits.READY]: z.object({
      instanceId: z.string(),
      timestamp: z.number(),
    }),
    [GALLERY_EVENTS.emits.IMAGE_ABSORBED]: z.object({
      instanceId: z.string(),
      assetId: z.string(),
      sourceEntityId: z.string().optional(),
      timestamp: z.number(),
    }),
    [GALLERY_EVENTS.emits.IMAGE_EMITTED]: z.object({
      instanceId: z.string(),
      assetId: z.string(),
      entityId: z.string(),
      timestamp: z.number(),
    }),
    [GALLERY_EVENTS.emits.IMAGE_DELETED]: z.object({
      instanceId: z.string(),
      assetId: z.string(),
      timestamp: z.number(),
    }),
  },
  subscribes: {
    [GALLERY_EVENTS.subscribes.CONFIG_UPDATE]: z.record(z.string(), z.unknown()),
    [GALLERY_EVENTS.subscribes.ABSORB_ENTITY]: z.object({
      entityId: z.string(),
      imageUrl: z.string(),
      name: z.string().optional(),
      removeFromCanvas: z.boolean().default(false),
    }),
  },
};
```

**Step 2: Create gallery schema**

Create `src/runtime/widgets/gallery/gallery.schema.ts`:

```typescript
/**
 * Gallery Widget Schemas
 * @module runtime/widgets/gallery
 * @layer L3
 */

import { z } from 'zod';

export const galleryConfigSchema = z.object({
  columnsMin: z.number().int().min(2).max(6).default(3),
  thumbnailSize: z.number().int().min(60).max(200).default(100),
});

export type GalleryConfig = z.infer<typeof galleryConfigSchema>;

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = galleryConfigSchema.parse({});
```

**Step 3: Create index**

Create `src/runtime/widgets/gallery/index.ts`:

```typescript
export { GalleryWidget, galleryManifest } from './gallery.widget';
export { GALLERY_EVENTS, GalleryEventPayloads } from './gallery.events';
export { galleryConfigSchema, DEFAULT_GALLERY_CONFIG } from './gallery.schema';
export type { GalleryConfig } from './gallery.schema';
```

**Step 4: Commit**

```bash
git add src/runtime/widgets/gallery/
git commit -m "feat(runtime): add gallery widget scaffold — events, schema, index"
```

---

### Task 7: Implement gallery widget component

**Files:**
- Create: `src/runtime/widgets/gallery/gallery.widget.tsx`

**Step 1: Implement the widget**

Create `src/runtime/widgets/gallery/gallery.widget.tsx`. This is the main component — a thumbnail grid with absorb/emit interactions:

```tsx
/**
 * Gallery Widget
 *
 * Inline built-in widget for collecting and managing images.
 * Absorbs images from the canvas into a Supabase-backed photo bucket.
 * Emits images back to canvas as sticker entities.
 *
 * @module runtime/widgets/gallery
 * @layer L3
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

import type { WidgetManifest } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { useEmit, useSubscribe } from '../../hooks';
import { useGallery } from '../../gallery-hooks';
import type { GalleryAsset } from '../../gallery-hooks';

import { GALLERY_EVENTS } from './gallery.events';
import { DEFAULT_GALLERY_CONFIG } from './gallery.schema';
import type { GalleryConfig } from './gallery.schema';

// ── Inline SVG Icons ─────────────────────────────────────────────

const TrashIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ImageIcon: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Widget Manifest ──────────────────────────────────────────────

export const galleryManifest: WidgetManifest = {
  id: 'sn.builtin.gallery',
  name: 'Gallery',
  version: '1.0.0',
  description: 'Personal photo bucket. Drag images from the canvas to collect them, drag out to place back. Your images are stored permanently until you delete them.',
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
      { name: GALLERY_EVENTS.emits.READY, description: 'Widget ready' },
      { name: GALLERY_EVENTS.emits.IMAGE_ABSORBED, description: 'Image absorbed from canvas' },
      { name: GALLERY_EVENTS.emits.IMAGE_EMITTED, description: 'Image emitted to canvas' },
      { name: GALLERY_EVENTS.emits.IMAGE_DELETED, description: 'Image deleted from gallery' },
    ],
    subscribes: [
      { name: GALLERY_EVENTS.subscribes.ABSORB_ENTITY, description: 'Absorb entity into gallery' },
    ],
  },
  config: { fields: [] },
  entry: 'inline',
  crossCanvasChannels: [],
  license: 'MIT',
  spatialSupport: false,
};

// ── Component ────────────────────────────────────────────────────

interface GalleryWidgetProps {
  instanceId: string;
  config?: Partial<GalleryConfig>;
}

export const GalleryWidget: React.FC<GalleryWidgetProps> = ({ instanceId, config: configOverrides }) => {
  const emit = useEmit();
  const { assets, isLoading, error, uploadFromUrl, deleteAsset, refresh } = useGallery();
  const [dragOver, setDragOver] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const dragItemRef = useRef<GalleryAsset | null>(null);

  const cfg: GalleryConfig = { ...DEFAULT_GALLERY_CONFIG, ...configOverrides };

  // Emit ready on mount
  useEffect(() => {
    emit(GALLERY_EVENTS.emits.READY, { instanceId, timestamp: Date.now() });
  }, [emit, instanceId]);

  // Load gallery on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to absorb commands (from context menu, toolbar button)
  useSubscribe(GALLERY_EVENTS.subscribes.ABSORB_ENTITY, useCallback((payload: unknown) => {
    const data = payload as { entityId: string; imageUrl: string; name?: string; removeFromCanvas?: boolean };
    if (!data?.imageUrl) return;

    setUploading(true);
    uploadFromUrl(data.imageUrl, data.name).then((asset) => {
      setUploading(false);
      if (asset) {
        emit(GALLERY_EVENTS.emits.IMAGE_ABSORBED, {
          instanceId,
          assetId: asset.id,
          sourceEntityId: data.entityId,
          timestamp: Date.now(),
        });
        // Remove from canvas if move semantics
        if (data.removeFromCanvas) {
          emit(CanvasEvents.ENTITY_DELETED, { entityId: data.entityId });
        }
      }
    }).catch(() => {
      setUploading(false);
    });
  }, [instanceId, emit, uploadFromUrl]));

  // Handle drop onto widget (absorb from canvas)
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    // Check for entity data from canvas drag
    const entityData = e.dataTransfer.getData('application/sn-entity');
    if (entityData) {
      try {
        const entity = JSON.parse(entityData);
        const imageUrl = entity.assetUrl || entity.url || entity.src;
        if (!imageUrl) return;

        const removeFromCanvas = !e.shiftKey; // Shift = copy, no shift = move (absorb)

        setUploading(true);
        uploadFromUrl(imageUrl, entity.name).then((asset) => {
          setUploading(false);
          if (asset) {
            emit(GALLERY_EVENTS.emits.IMAGE_ABSORBED, {
              instanceId,
              assetId: asset.id,
              sourceEntityId: entity.id,
              timestamp: Date.now(),
            });
            if (removeFromCanvas) {
              emit(CanvasEvents.ENTITY_DELETED, { entityId: entity.id });
            }
          }
        }).catch(() => {
          setUploading(false);
        });
      } catch {
        // Invalid JSON — ignore
      }
      return;
    }

    // Handle file drops directly
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      setUploading(true);
      Promise.all(
        files.map((file) => {
          const url = URL.createObjectURL(file);
          return uploadFromUrl(url, file.name).finally(() => URL.revokeObjectURL(url));
        })
      ).then(() => setUploading(false)).catch(() => setUploading(false));
    }
  }, [instanceId, emit, uploadFromUrl]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  // Emit image to canvas (drag out)
  const handleThumbnailDragStart = useCallback((e: React.DragEvent, asset: GalleryAsset) => {
    dragItemRef.current = asset;
    e.dataTransfer.setData('application/sn-entity', JSON.stringify({
      type: 'sticker',
      assetUrl: asset.url,
      name: asset.name,
      config: { galleryAssetId: asset.id, generatedBy: instanceId },
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, [instanceId]);

  // Delete with confirmation
  const handleDelete = useCallback((assetId: string) => {
    if (confirmDeleteId === assetId) {
      deleteAsset(assetId).then(() => {
        emit(GALLERY_EVENTS.emits.IMAGE_DELETED, {
          instanceId,
          assetId,
          timestamp: Date.now(),
        });
      });
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(assetId);
      // Auto-dismiss confirmation after 3 seconds
      setTimeout(() => setConfirmDeleteId((current) => current === assetId ? null : current), 3000);
    }
  }, [confirmDeleteId, deleteAsset, emit, instanceId]);

  // ── Styles ───────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: 'var(--sn-font-family, system-ui, sans-serif)',
    background: 'var(--sn-bg, #0a0a0a)',
    color: 'var(--sn-text, #e0e0e0)',
    borderRadius: 'var(--sn-radius, 8px)',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--sn-border, #333)',
    background: 'var(--sn-surface, #1a1a1a)',
    fontSize: '13px',
    fontWeight: 600,
    flexShrink: 0,
  };

  const badgeStyle: React.CSSProperties = {
    background: 'var(--sn-accent, #6366f1)',
    color: '#fff',
    borderRadius: '10px',
    padding: '1px 7px',
    fontSize: '11px',
    fontWeight: 600,
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${cfg.thumbnailSize}px, 1fr))`,
    gap: '4px',
    padding: '8px',
    overflowY: 'auto',
    flex: 1,
  };

  const dropZoneStyle: React.CSSProperties = {
    ...gridStyle,
    ...(dragOver ? {
      background: 'rgba(99, 102, 241, 0.1)',
      outline: '2px dashed var(--sn-accent, #6366f1)',
      outlineOffset: '-4px',
    } : {}),
  };

  const thumbContainerStyle: React.CSSProperties = {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: '6px',
    overflow: 'hidden',
    cursor: 'grab',
    background: 'var(--sn-surface, #1a1a1a)',
  };

  const thumbImgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  const deleteButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: 'rgba(0,0,0,0.7)',
    border: 'none',
    borderRadius: '4px',
    padding: '3px',
    cursor: 'pointer',
    color: '#fff',
    opacity: 0,
    transition: 'opacity 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const emptyStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '24px',
    color: 'var(--sn-text-muted, #888)',
    textAlign: 'center',
    gap: '8px',
    fontSize: '13px',
  };

  // ── Render ───────────────────────────────────────────────────

  const isEmpty = assets.length === 0 && !isLoading && !uploading;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span>Gallery</span>
        <span style={badgeStyle}>{assets.length}</span>
      </div>

      {error && (
        <div style={{ padding: '6px 12px', background: '#3a1111', color: '#f87171', fontSize: '12px', flexShrink: 0 }}>
          {error}
        </div>
      )}

      {isEmpty ? (
        <div
          style={{ ...emptyStyle, ...(dragOver ? { background: 'rgba(99, 102, 241, 0.1)' } : {}) }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <ImageIcon />
          <span>Drag images here to collect them</span>
          <span style={{ fontSize: '11px', opacity: 0.6 }}>Shift+drag to copy (keep original)</span>
        </div>
      ) : (
        <div
          style={dropZoneStyle}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {(uploading || isLoading) && (
            <div style={{ ...thumbContainerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--sn-text-muted, #888)' }}>...</span>
            </div>
          )}
          {assets.map((asset) => (
            <div
              key={asset.id}
              style={thumbContainerStyle}
              draggable
              onDragStart={(e) => handleThumbnailDragStart(e, asset)}
              title={asset.name}
              onMouseEnter={(e) => {
                const btn = e.currentTarget.querySelector('[data-delete-btn]') as HTMLElement;
                if (btn) btn.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget.querySelector('[data-delete-btn]') as HTMLElement;
                if (btn) btn.style.opacity = '0';
              }}
            >
              <img
                src={asset.thumbnailUrl || asset.url}
                alt={asset.name}
                style={thumbImgStyle}
                loading="lazy"
              />
              <button
                data-delete-btn
                style={{
                  ...deleteButtonStyle,
                  ...(confirmDeleteId === asset.id ? { opacity: 1, background: 'rgba(239,68,68,0.9)' } : {}),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(asset.id);
                }}
                title={confirmDeleteId === asset.id ? 'Click again to confirm' : 'Delete'}
              >
                <TrashIcon />
              </button>
              {confirmDeleteId === asset.id && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(239,68,68,0.9)', color: '#fff',
                  fontSize: '10px', textAlign: 'center', padding: '2px',
                }}>
                  Click again to delete
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/runtime/widgets/gallery/
git commit -m "feat(runtime): implement gallery widget component with absorb/emit"
```

---

### Task 8: Register gallery widget in built-in components

**Files:**
- Modify: `src/runtime/widgets/built-in-components.ts` (add gallery import + entry)
- Modify: `src/runtime/widgets/index.ts` (add gallery exports)
- Modify: `src/runtime/init.ts` (add gallery manifest to registration list)

**Step 1: Add to built-in-components.ts**

Add import at line 18 (after GreenScreenRemoverWidget import):

```typescript
import { GalleryWidget } from './gallery/gallery.widget';
```

Add to the `BUILT_IN_WIDGET_COMPONENTS` record (after shared-beacon entry):

```typescript
  'sn.builtin.gallery': GalleryWidget,
```

**Step 2: Add to index.ts**

Add exports (after the shared-beacon exports):

```typescript
export { GalleryWidget } from './gallery/gallery.widget';
export { galleryManifest } from './gallery/gallery.widget';
```

**Step 3: Add manifest registration in init.ts**

Find where built-in widget manifests are registered (look for other manifest imports like `imageGeneratorManifest`). Add:

```typescript
import { galleryManifest } from './widgets/gallery/gallery.widget';
```

And add `galleryManifest` to the array of manifests being registered.

**Step 4: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 5: Commit**

```bash
git add src/runtime/widgets/built-in-components.ts src/runtime/widgets/index.ts src/runtime/init.ts
git commit -m "feat(runtime): register gallery widget in built-in component registry"
```

---

### Task 9: Write gallery widget tests

**Files:**
- Create: `src/runtime/widgets/gallery/gallery.widget.test.tsx`

**Step 1: Write tests**

Create `src/runtime/widgets/gallery/gallery.widget.test.tsx`:

```tsx
/**
 * Gallery Widget Tests
 * @module runtime/widgets/gallery
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { GalleryWidget, galleryManifest } from './gallery.widget';

// Mock hooks
const mockEmit = vi.fn();
const mockUploadFromUrl = vi.fn().mockResolvedValue({ id: 'a1', name: 'test.jpg', url: 'http://example.com/test.jpg' });
const mockDeleteAsset = vi.fn().mockResolvedValue(undefined);
const mockRefresh = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks', () => ({
  useEmit: () => mockEmit,
  useSubscribe: vi.fn(),
}));

vi.mock('../../gallery-hooks', () => ({
  useGallery: () => ({
    assets: [],
    isLoading: false,
    error: null,
    uploadFromUrl: mockUploadFromUrl,
    deleteAsset: mockDeleteAsset,
    refresh: mockRefresh,
  }),
}));

describe('GalleryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state', () => {
    render(<GalleryWidget instanceId="test-inst" />);
    expect(screen.getByText('Drag images here to collect them')).toBeDefined();
  });

  it('shows gallery header with count', () => {
    render(<GalleryWidget instanceId="test-inst" />);
    expect(screen.getByText('Gallery')).toBeDefined();
    expect(screen.getByText('0')).toBeDefined();
  });

  it('emits READY event on mount', () => {
    render(<GalleryWidget instanceId="test-inst" />);
    expect(mockEmit).toHaveBeenCalledWith(
      'widget.gallery.ready',
      expect.objectContaining({ instanceId: 'test-inst' }),
    );
  });

  it('calls refresh on mount', () => {
    render(<GalleryWidget instanceId="test-inst" />);
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe('galleryManifest', () => {
  it('has correct id', () => {
    expect(galleryManifest.id).toBe('sn.builtin.gallery');
  });

  it('requires canvas-write and gallery permissions', () => {
    expect(galleryManifest.permissions).toContain('canvas-write');
    expect(galleryManifest.permissions).toContain('gallery');
  });

  it('has correct default size', () => {
    expect(galleryManifest.size.defaultWidth).toBe(300);
    expect(galleryManifest.size.defaultHeight).toBe(400);
  });

  it('declares emitted events', () => {
    expect(galleryManifest.events.emits.length).toBeGreaterThan(0);
  });

  it('is inline entry', () => {
    expect(galleryManifest.entry).toBe('inline');
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/runtime/widgets/gallery/`
Expected: PASS

**Step 3: Commit**

```bash
git add src/runtime/widgets/gallery/gallery.widget.test.tsx
git commit -m "test(runtime): add gallery widget unit tests"
```

---

### Task 10: Update message validator for gallery messages

**Files:**
- Modify: `src/runtime/bridge/message-validator.ts` (add GALLERY_* to validated types)
- Modify: `src/runtime/bridge/message-validator.test.ts` (add validation test)

**Step 1: Check current validator**

Read `src/runtime/bridge/message-validator.ts` to understand how message types are validated. Add GALLERY_UPLOAD, GALLERY_LIST, GALLERY_DELETE, GALLERY_GET to the set of known widget message types.

**Step 2: Add test for gallery message validation**

Add a test case that validates a `GALLERY_LIST` message passes validation and an unknown message type fails.

**Step 3: Run tests**

Run: `npx vitest run src/runtime/bridge/message-validator.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/runtime/bridge/message-validator.ts src/runtime/bridge/message-validator.test.ts
git commit -m "feat(runtime): add gallery message types to bridge validator"
```

---

### Task 11: Full integration verification

**Step 1: Run all runtime tests**

Run: `npx vitest run src/runtime/`
Expected: All PASS

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run lint**

Run: `npm run lint -- --no-error-on-unmatched-pattern 2>&1 | tail -20`
Expected: No new errors in gallery files

**Step 4: Run dev server and verify widget loads**

Run: `npm run dev` and verify the gallery widget appears in the built-in widget list.

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(runtime): integration fixes for gallery widget"
```
