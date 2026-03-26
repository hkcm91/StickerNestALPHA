# Zustand Stores API Reference

> **Layer:** L0-kernel
> **Path:** `src/kernel/stores/`
> **State Library:** Zustand with `devtools` + `subscribeWithSelector` middleware
> **Bootstrap:** All stores are initialized via `initAllStores()` in `src/kernel/stores/index.ts`

## Overview

StickerNest V5 uses nine Zustand stores, each owning a single domain. Stores never import from or subscribe to each other's state directly — all cross-store coordination flows through the Event Bus. Each store exports a `setup*BusSubscriptions()` function that registers bus event handlers for cross-store reactivity.

---

## Store Isolation Rules

1. Stores do NOT import from each other.
2. Cross-store coordination happens exclusively via the Event Bus.
3. Each store is a standalone Zustand slice — no shared state object.
4. Store actions that need data from another store must emit a bus event and let the target store's subscriber handle the update.
5. Store isolation is enforced by static analysis tests (`store-isolation.test.ts`).

---

## 1. authStore

**Hook:** `useAuthStore`
**Bus Setup:** `setupAuthBusSubscriptions()`
**Domain:** Current user identity, session tokens, auth status.

### Types

```ts
interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  tier: 'free' | 'creator' | 'pro' | 'enterprise';
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
```

### State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `user` | `AuthUser \| null` | `null` | Current authenticated user |
| `session` | `AuthSession \| null` | `null` | Active session tokens |
| `isLoading` | `boolean` | `false` | Auth operation in progress |
| `error` | `string \| null` | `null` | Auth error message |
| `isInitialized` | `boolean` | `false` | Auth system has finished initial check |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setUser` | `(user: AuthUser \| null) => void` | Set or clear current user |
| `setSession` | `(session: AuthSession \| null) => void` | Set or clear session |
| `setLoading` | `(loading: boolean) => void` | Set loading state |
| `setError` | `(error: string \| null) => void` | Set error message |
| `setInitialized` | `() => void` | Mark auth as initialized |
| `clearError` | `() => void` | Clear error |
| `reset` | `() => void` | Reset to initial state |

### Selectors

| Selector | Returns | Description |
|----------|---------|-------------|
| `selectAuthReady` | `boolean` | `true` when initialized and not loading |
| `selectIsAuthenticated` | `boolean` | `true` when both user and session are present |

### Bus Subscriptions

Listens to `kernel.auth.sessionExpired` — clears session and sets error message.

---

## 2. workspaceStore

**Hook:** `useWorkspaceStore`
**Bus Setup:** `setupWorkspaceBusSubscriptions()`
**Domain:** Workspace metadata, member list, workspace-level settings.

### Types

```ts
interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

interface WorkspaceMember {
  userId: string;
  displayName: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  avatarUrl: string | null;
}

interface WorkspaceSettings {
  defaultCanvasRole: 'viewer' | 'commenter' | 'editor';
}
```

### State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `activeWorkspace` | `Workspace \| null` | `null` | Currently active workspace |
| `members` | `WorkspaceMember[]` | `[]` | Workspace member list |
| `settings` | `WorkspaceSettings` | `{ defaultCanvasRole: 'viewer' }` | Workspace settings |
| `isLoading` | `boolean` | `false` | Loading state |
| `error` | `string \| null` | `null` | Error message |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setActiveWorkspace` | `(workspace: Workspace \| null) => void` | Set active workspace |
| `setMembers` | `(members: WorkspaceMember[]) => void` | Set member list |
| `setSettings` | `(settings: WorkspaceSettings) => void` | Update workspace settings |
| `setLoading` | `(loading: boolean) => void` | Set loading state |
| `setError` | `(error: string \| null) => void` | Set error |
| `clearError` | `() => void` | Clear error |
| `reset` | `() => void` | Reset to initial state |

### Bus Subscriptions

Listens to `kernel.auth.stateChanged` — resets workspace when user logs out.

---

## 3. canvasStore

**Hook:** `useCanvasStore`
**Bus Setup:** `setupCanvasBusSubscriptions()`
**Domain:** Active canvas ID, canvas metadata, sharing settings, user role.

### Types

```ts
interface CanvasMeta {
  id: string;
  name: string;
  slug: string | null;
  ownerId: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  settings: Record<string, unknown>;
}

interface CanvasSharingSettings {
  isPublic: boolean;
  defaultRole: 'viewer' | 'commenter' | 'editor';
  slug: string | null;
}

type CanvasRole = 'owner' | 'editor' | 'commenter' | 'viewer';
```

### State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `activeCanvasId` | `string \| null` | `null` | ID of the currently open canvas |
| `canvasMeta` | `CanvasMeta \| null` | `null` | Metadata for the active canvas |
| `sharingSettings` | `CanvasSharingSettings \| null` | `null` | Sharing configuration |
| `userRole` | `CanvasRole \| null` | `null` | Current user's role on this canvas |
| `isLoading` | `boolean` | `false` | Loading state |
| `error` | `string \| null` | `null` | Error message |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setActiveCanvas` | `(id: string \| null, meta: CanvasMeta \| null) => void` | Set active canvas and metadata |
| `setSharingSettings` | `(settings: CanvasSharingSettings \| null) => void` | Update sharing settings |
| `setUserRole` | `(role: CanvasRole \| null) => void` | Set current user's role |
| `setLoading` | `(loading: boolean) => void` | Set loading state |
| `setError` | `(error: string \| null) => void` | Set error |
| `clearError` | `() => void` | Clear error |
| `reset` | `() => void` | Reset to initial state |

### Bus Subscriptions

Listens to `kernel.auth.stateChanged` — resets canvas when user logs out.

---

## 4. historyStore

**Hook:** `useHistoryStore`
**Bus Setup:** `setupHistoryBusSubscriptions()`
**Domain:** Undo/redo stack powered by event bus events.

### Types

```ts
interface HistoryEntry {
  event: BusEvent;           // The original event
  inverseEvent: BusEvent | null;  // The event to replay on undo
  timestamp: number;
}
```

### State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `undoStack` | `HistoryEntry[]` | `[]` | Stack of undoable actions |
| `redoStack` | `HistoryEntry[]` | `[]` | Stack of redoable actions |
| `maxSize` | `number` | `100` | Maximum undo stack size |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `pushEntry` | `(entry: HistoryEntry) => void` | Push undoable action (clears redo stack) |
| `undo` | `() => HistoryEntry \| null` | Pop and replay inverse event |
| `redo` | `() => HistoryEntry \| null` | Pop and replay original event |
| `clear` | `() => void` | Clear both stacks |
| `reset` | `() => void` | Reset to initial state |

### Selectors

| Selector | Returns | Description |
|----------|---------|-------------|
| `selectCanUndo` | `boolean` | `true` when undo stack is non-empty |
| `selectCanRedo` | `boolean` | `true` when redo stack is non-empty |

### Bus Subscriptions

Listens to `canvas.entity.moved` (and other undoable canvas events) — automatically pushes history entries with inverse events for undo support.

---

## 5. widgetStore

**Hook:** `useWidgetStore`
**Bus Setup:** `setupWidgetBusSubscriptions()`
**Domain:** Widget registry (installed widgets) and active widget instances.

### Types

```ts
interface WidgetRegistryEntry {
  widgetId: string;
  manifest: WidgetManifest;
  htmlContent: string;
  isBuiltIn: boolean;
  installedAt: string;
}

interface WidgetInstance {
  instanceId: string;
  widgetId: string;
  canvasId: string;
  state: Record<string, unknown>;
  config: Record<string, unknown>;
}
```

### State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `registry` | `Record<string, WidgetRegistryEntry>` | `{}` | Installed widgets keyed by widgetId |
| `instances` | `Record<string, WidgetInstance>` | `{}` | Active instances keyed by instanceId |
| `isLoading` | `boolean` | `false` | Loading state |
| `error` | `string \| null` | `null` | Error message |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `registerWidget` | `(entry: WidgetRegistryEntry) => void` | Add widget to registry |
| `unregisterWidget` | `(widgetId: string) => void` | Remove widget from registry |
| `addInstance` | `(instance: WidgetInstance) => void` | Add active widget instance |
| `removeInstance` | `(instanceId: string) => void` | Remove widget instance |
| `updateInstanceState` | `(instanceId: string, state: Record<string, unknown>) => void` | Update instance persisted state |
| `updateInstanceConfig` | `(instanceId: string, config: Record<string, unknown>) => void` | Update instance config |
| `setLoading` | `(loading: boolean) => void` | Set loading state |
| `setError` | `(error: string \| null) => void` | Set error |
| `clearError` | `() => void` | Clear error |
| `reset` | `() => void` | Reset to initial state |

### Bus Subscriptions

Listens to `widget.mounted` — adds instance to store. Listens to `widget.unmounted` — removes instance.

---

## 6. socialStore

**Hook:** `useSocialStore`
**Bus Setup:** `setupSocialBusSubscriptions()`
**Domain:** Presence map and cursor positions (written by Layer 1 via bus events).

### Types

```ts
interface PresenceUser {
  userId: string;
  displayName: string;
  color: string;
  cursorPosition: { x: number; y: number } | null;
  joinedAt: string;
}
```

### State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `presenceMap` | `Record<string, PresenceUser>` | `{}` | Users present on the current canvas |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setPresence` | `(userId: string, user: PresenceUser) => void` | Add or update user presence |
| `removePresence` | `(userId: string) => void` | Remove user from presence |
| `updateCursor` | `(userId: string, position: { x: number; y: number } \| null) => void` | Update cursor position |
| `clearPresence` | `() => void` | Clear all presence data |
| `reset` | `() => void` | Reset to initial state |

### Selectors

| Selector | Returns | Description |
|----------|---------|-------------|
| `selectUserCount` | `number` | Number of users currently present |

### Bus Subscriptions

Listens to `social.presence.joined`, `social.presence.left`, and `social.cursor.moved` — maintains the presence map and cursor positions from Layer 1 Realtime events.

---

## 7. uiStore

**Hook:** `useUIStore`
**Bus Setup:** `setupUIBusSubscriptions()`
**Domain:** UI-level flags, modes, active tool, theme, toasts.

### Types

```ts
interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

type ChromeMode = 'editor' | 'clean';
```

### State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `canvasInteractionMode` | `'edit' \| 'preview'` | `'edit'` | Canvas interaction mode (never persisted — derived on load) |
| `chromeMode` | `ChromeMode` | `'editor'` | UI chrome visibility mode |
| `activeTool` | `string` | `'select'` | Currently active canvas tool |
| `pendingToolData` | `Record<string, unknown> \| null` | `null` | Metadata from last tool change event |
| `sidebarLeftOpen` | `boolean` | `false` | Left sidebar visibility |
| `sidebarRightOpen` | `boolean` | `false` | Right sidebar visibility |
| `panels` | `Record<string, boolean>` | `{}` | Panel open/closed state |
| `theme` | `'light' \| 'dark' \| 'high-contrast'` | `'light'` | Active theme |
| `isGlobalLoading` | `boolean` | `false` | Global loading overlay |
| `toasts` | `Toast[]` | `[]` | Active toast notifications |
| `spatialMode` | `SpatialMode` | `'2d'` | Spatial rendering mode |
| `canvasPlatform` | `CanvasPlatform` | `'web'` | Target platform |
| `artboardPreviewMode` | `boolean` | `false` | Artboard preview mode |
| `fullscreenPreview` | `boolean` | `false` | Fullscreen preview (hides all chrome) |
| `platformConfigs` | `Record<CanvasPlatform, Partial<ViewportConfig>>` | `{ web: {...}, mobile: {...}, desktop: {...} }` | Platform viewport configs |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setCanvasInteractionMode` | `(mode: 'edit' \| 'preview') => void` | Set interaction mode |
| `setChromeMode` | `(mode: ChromeMode) => void` | Set chrome visibility mode |
| `setActiveTool` | `(tool: string) => void` | Set active tool (`'move'` maps to `'select'`) |
| `setPendingToolData` | `(data: Record<string, unknown> \| null) => void` | Set tool metadata |
| `toggleSidebarLeft` | `() => void` | Toggle left sidebar |
| `toggleSidebarRight` | `() => void` | Toggle right sidebar |
| `setPanelOpen` | `(panelId: string, open: boolean) => void` | Set panel visibility |
| `setTheme` | `(theme: 'light' \| 'dark' \| 'high-contrast') => void` | Set active theme |
| `setGlobalLoading` | `(loading: boolean) => void` | Set global loading state |
| `addToast` | `(toast: Toast) => void` | Add toast notification |
| `removeToast` | `(id: string) => void` | Remove toast notification |
| `setSpatialMode` | `(mode: SpatialMode) => void` | Set spatial rendering mode |
| `setCanvasPlatform` | `(platform: CanvasPlatform) => void` | Set target platform |
| `setPlatformConfig` | `(platform: CanvasPlatform, config: Partial<ViewportConfig>) => void` | Update platform config |
| `setArtboardPreviewMode` | `(preview: boolean) => void` | Toggle artboard preview |
| `setFullscreenPreview` | `(fullscreen: boolean) => void` | Toggle fullscreen preview |
| `reset` | `() => void` | Reset to initial state |

### Bus Subscriptions

Listens to canvas tool, mode, document, theme, and interaction mode events — keeps UI state synchronized with canvas and shell activity.

---

## 8. dockerStore

**Hook:** `useDockerStore`
**Bus Setup:** `setupDockerBusSubscriptions()`
**Domain:** Dockable container panels that host widget instances in a tabbed system.

### Types

Imports `Docker`, `DockerDockMode`, `DockerTab`, `DockerWidgetSlot`, `Point2D`, `Size2D`, `CreateDockerInput`, `UpdateDockerInput` from `@sn/types`.

### State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dockers` | `Record<string, Docker>` | `{}` | All docker containers keyed by ID |
| `activeDockerOrder` | `string[]` | `[]` | Z-order for floating dockers (last = front) |
| `isLoading` | `boolean` | `false` | Loading state |
| `error` | `string \| null` | `null` | Error message |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `addDocker` | `(input: CreateDockerInput) => string` | Create docker, returns ID |
| `removeDocker` | `(id: string) => void` | Delete docker |
| `updateDocker` | `(id: string, updates: UpdateDockerInput) => void` | Update docker properties |
| `setDockMode` | `(id: string, mode: DockerDockMode) => void` | Set floating/docked-left/docked-right |
| `setPosition` | `(id: string, position: Point2D) => void` | Set floating position |
| `setSize` | `(id: string, size: Size2D) => void` | Set docker size |
| `toggleVisible` | `(id: string) => void` | Toggle visibility |
| `setVisible` | `(id: string, visible: boolean) => void` | Set visibility |
| `togglePinned` | `(id: string) => void` | Toggle pinned state |
| `addTab` | `(dockerId: string, tab?: Partial<...>) => string` | Add tab, returns tab ID |
| `removeTab` | `(dockerId: string, tabIndex: number) => void` | Remove tab |
| `setActiveTab` | `(dockerId: string, tabIndex: number) => void` | Set active tab |
| `renameTab` | `(dockerId: string, tabIndex: number, name: string) => void` | Rename tab |
| `reorderTabs` | `(dockerId: string, tabIds: string[]) => void` | Reorder tabs |
| `addWidgetToTab` | `(dockerId: string, tabIndex: number, widgetInstanceId: string, height?: number) => void` | Add widget to tab |
| `removeWidgetFromTab` | `(dockerId: string, tabIndex: number, widgetInstanceId: string) => void` | Remove widget |
| `resizeWidgetInTab` | `(dockerId: string, tabIndex: number, widgetInstanceId: string, height: number \| undefined) => void` | Resize widget |
| `reorderWidgetsInTab` | `(dockerId: string, tabIndex: number, widgetInstanceIds: string[]) => void` | Reorder widgets |
| `bringToFront` | `(id: string) => void` | Bring docker to front of z-order |
| `loadFromConfig` | `(dockers: Docker[]) => void` | Load dockers from backend config |
| `getConfig` | `() => Docker[]` | Export current docker config |
| `setLoading` | `(loading: boolean) => void` | Set loading state |
| `setError` | `(error: string \| null) => void` | Set error |
| `reset` | `() => void` | Reset to initial state |

### Selectors

| Selector | Returns | Description |
|----------|---------|-------------|
| `selectVisibleDockers` | `Docker[]` | All visible dockers |
| `selectLeftDockedDockers` | `Docker[]` | Dockers docked to left |
| `selectRightDockedDockers` | `Docker[]` | Dockers docked to right |
| `selectFloatingDockers` | `Docker[]` | Floating (undocked) dockers |

### Bus Subscriptions

Emits `docker.*` events for all CRUD operations. Listens for docker config load/save events.

---

## 9. galleryStore

**Hook:** `useGalleryStore`
**Bus Setup:** `setupGalleryBusSubscriptions()`
**Domain:** User-uploaded photo/media assets with Supabase storage sync.

### Types

```ts
interface GalleryAsset {
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
```

### State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `assets` | `GalleryAsset[]` | `[]` | User's gallery assets |
| `isLoading` | `boolean` | `false` | Loading state |
| `error` | `string \| null` | `null` | Error message |
| `isInitialized` | `boolean` | `false` | Gallery has loaded at least once |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `uploadAsset` | `(file: File) => Promise<GalleryAsset \| null>` | Upload file to Supabase storage |
| `deleteAsset` | `(assetId: string) => Promise<void>` | Delete asset from storage and DB |
| `updateAsset` | `(assetId: string, updates: {...}) => Promise<void>` | Update asset metadata |
| `loadGallery` | `() => Promise<void>` | Load all assets from backend |
| `setLoading` | `(loading: boolean) => void` | Set loading state |
| `setError` | `(error: string \| null) => void` | Set error |
| `reset` | `() => void` | Reset to initial state |

### Bus Subscriptions

Emits `kernel.gallery.asset.uploaded`, `kernel.gallery.asset.deleted`, and `kernel.gallery.loaded` events after async operations complete.

---

## Bootstrap

All stores are initialized during app startup via `initAllStores()` in `src/kernel/stores/index.ts`. This function calls each store's `setup*BusSubscriptions()` to wire up cross-store reactivity through the Event Bus.

```ts
// src/kernel/stores/index.ts
export function initAllStores(): void {
  setupAuthBusSubscriptions();
  setupWorkspaceBusSubscriptions();
  setupCanvasBusSubscriptions();
  setupHistoryBusSubscriptions();
  setupWidgetBusSubscriptions();
  setupSocialBusSubscriptions();
  setupUIBusSubscriptions();
  setupDockerBusSubscriptions();
  setupGalleryBusSubscriptions();
}
```

## Usage Pattern

```ts
import { useAuthStore } from 'src/kernel/stores/auth';
import { useCanvasStore } from 'src/kernel/stores/canvas';

// In a React component
function MyComponent() {
  const user = useAuthStore((s) => s.user);
  const canvasId = useCanvasStore((s) => s.activeCanvasId);

  // Use selectors for derived state
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const canUndo = useHistoryStore(selectCanUndo);
}

// Outside React (e.g., in a bus handler)
const currentUser = useAuthStore.getState().user;
```
