# Canvas Core API Reference

> **Layer:** L4A-1 (Canvas Core)
> **Path:** `src/canvas/core/`
> **Depends on:** L0 (Kernel), L3 (Runtime)

## Overview

Canvas Core is the foundation of all 2D canvas rendering and interaction in StickerNest V5. It owns the infinite canvas viewport, the entity scene graph, hit-testing, z-order management, coordinate transforms, the render loop, and drag scaffolding. All other canvas sub-layers (tools, wiring, panels) depend on Canvas Core.

Canvas Core reads `uiStore.canvasInteractionMode` to determine behavior: in edit mode, full entity manipulation is enabled; in preview mode, entity positions are locked and pointer events pass through to widgets.

---

## Viewport

**Module:** `src/canvas/core/viewport/`

The viewport manages pan, zoom, and coordinate transforms between canvas space and screen space.

### ViewportState

| Field | Type | Description |
|-------|------|-------------|
| `offset` | `Point2D` | Current pan offset in canvas units |
| `zoom` | `number` | Current zoom level (1.0 = 100%) |
| `minZoom` | `number` | Minimum zoom level (default: 0.1) |
| `maxZoom` | `number` | Maximum zoom level (default: 10) |
| `viewportWidth` | `number` | Browser viewport width in pixels |
| `viewportHeight` | `number` | Browser viewport height in pixels |

### Functions

#### `createViewport(width, height)`

Creates a new viewport state centered at the origin with zoom level 1.

| Parameter | Type | Description |
|-----------|------|-------------|
| `width` | `number` | Initial viewport width in pixels |
| `height` | `number` | Initial viewport height in pixels |

**Returns:** `ViewportState`

#### `canvasToScreen(point, viewport)`

Transforms a point from canvas space to screen space.

| Parameter | Type | Description |
|-----------|------|-------------|
| `point` | `Point2D` | Position in canvas space |
| `viewport` | `ViewportState` | Current viewport state |

**Returns:** `Point2D` — The corresponding screen-space position.

#### `screenToCanvas(point, viewport)`

Transforms a point from screen space to canvas space. This is the inverse of `canvasToScreen`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `point` | `Point2D` | Position in screen pixels |
| `viewport` | `ViewportState` | Current viewport state |

**Returns:** `Point2D` — The corresponding canvas-space position.

Entity positions are always stored in canvas space. Never store screen-space coordinates in entity state.

#### `panBy(viewport, delta)`

Returns a new viewport state panned by the given delta.

| Parameter | Type | Description |
|-----------|------|-------------|
| `viewport` | `ViewportState` | Current viewport state |
| `delta` | `Point2D` | Pan offset to apply |

**Returns:** `ViewportState`

#### `zoomTo(viewport, zoom, anchor)`

Returns a new viewport state zoomed to the target level, keeping the anchor point fixed on screen.

| Parameter | Type | Description |
|-----------|------|-------------|
| `viewport` | `ViewportState` | Current viewport state |
| `zoom` | `number` | Target zoom level (clamped to min/max) |
| `anchor` | `Point2D` | Screen-space point to keep fixed during zoom |

**Returns:** `ViewportState`

#### `getVisibleBounds(viewport)`

Returns the bounding box of the currently visible canvas region.

**Returns:** `BoundingBox2D` — Canvas-space bounds of the visible viewport area.

---

## Scene Graph

**Module:** `src/canvas/core/scene/`

The scene graph manages all entities on the canvas: insertion, removal, updates, z-order, spatial indexing, and parent-child relationships.

### SceneGraph Interface

| Method | Signature | Description |
|--------|-----------|-------------|
| `addEntity` | `(entity: CanvasEntity) => void` | Adds an entity to the scene. Updates the spatial index and z-order. |
| `removeEntity` | `(id: string) => void` | Removes an entity. Cleans up parent-child relationships (removes from parent's children array, clears parentId on children). |
| `updateEntity` | `(id: string, updates: Partial<CanvasEntity>) => void` | Applies partial updates to an entity. Re-indexes spatial bounds if transform changed. |
| `getEntity` | `(id: string) => CanvasEntity \| undefined` | Returns a single entity by ID, or undefined if not found. |
| `getAllEntities` | `() => CanvasEntity[]` | Returns all entities in insertion order. |
| `getEntitiesByZOrder` | `() => CanvasEntity[]` | Returns all entities sorted by z-index (back to front). |
| `bringToFront` | `(id: string) => void` | Moves an entity to the highest z-index. |
| `sendToBack` | `(id: string) => void` | Moves an entity to the lowest z-index. |
| `bringForward` | `(id: string) => void` | Moves an entity one step up in z-order. |
| `sendBackward` | `(id: string) => void` | Moves an entity one step down in z-order. |
| `getChildren` | `(parentId: string) => CanvasEntity[]` | Returns direct children of a group or docker entity. |
| `getParent` | `(childId: string) => CanvasEntity \| undefined` | Returns the parent entity of a child, if any. |
| `getDescendants` | `(rootId: string) => CanvasEntity[]` | Returns all descendants of an entity (recursive). |
| `queryRegion` | `(bounds: BoundingBox2D) => CanvasEntity[]` | Returns entities whose bounding boxes intersect the given region. Uses the spatial index. |
| `queryPoint` | `(point: Point2D) => CanvasEntity[]` | Returns entities whose bounding boxes contain the given point. Uses the spatial index. Returns results in reverse z-order (topmost first). |
| `clear` | `() => void` | Removes all entities from the scene graph. |
| `entityCount` | `readonly number` | The current number of entities in the scene. |
| `spatialIndex` | `readonly SpatialIndex` | Direct access to the underlying spatial index. |

### `createSceneGraph()`

Factory function that creates a new, empty scene graph instance.

**Returns:** `SceneGraph`

---

## Hit Testing

**Module:** `src/canvas/core/hittest/`

Hit-testing determines which entity is under the cursor or within a selection region. It uses the spatial index for efficient lookups rather than iterating all entities.

### Functions

#### `hitTestPoint(scene, point)`

Returns the topmost visible entity at a canvas-space point, or `null` if no entity is hit.

| Parameter | Type | Description |
|-----------|------|-------------|
| `scene` | `SceneGraph` | The scene graph to query |
| `point` | `Point2D` | Canvas-space point to test |

**Returns:** `CanvasEntity | null`

The function queries the spatial index for candidates, filters by visibility, performs exact point-in-entity tests (accounting for rotation), and returns the topmost match by z-order.

#### `hitTestRegion(scene, region)`

Returns all visible entities whose bounding boxes intersect the given region. Used for marquee/rubber-band selection.

| Parameter | Type | Description |
|-----------|------|-------------|
| `scene` | `SceneGraph` | The scene graph to query |
| `region` | `BoundingBox2D` | Canvas-space bounding box |

**Returns:** `CanvasEntity[]`

#### `pointInEntity(point, entity)`

Tests whether a canvas-space point is inside an entity's bounds, accounting for rotation. This is a precise test that rotates the point into the entity's local coordinate space.

| Parameter | Type | Description |
|-----------|------|-------------|
| `point` | `Point2D` | Canvas-space point |
| `entity` | `CanvasEntity` | Entity to test against |

**Returns:** `boolean`

#### `entityBounds(entity)`

Computes the axis-aligned bounding box for an entity, accounting for rotation.

**Returns:** `BoundingBox2D`

---

## Render Loop

**Module:** `src/canvas/core/renderer/`

The render loop drives canvas rendering using `requestAnimationFrame` (never `setInterval`). It targets 60fps and degrades gracefully under load.

### Dirty-Region Tracking

The renderer tracks dirty regions — only areas that have changed are re-rendered, not the entire viewport. When an entity moves, both its old and new bounding boxes are marked dirty. This is critical for performance with large canvases containing many entities.

Higher layers do not schedule renders directly. Instead, they emit bus events (e.g., `canvas.entity.moved`) and the render loop picks up the changes.

---

## Drag Manager

**Module:** `src/canvas/core/drag/`

The drag manager provides pointer capture and delta tracking primitives. It does not implement tool-specific logic (that belongs in Canvas Tools, L4A-2). It provides the low-level scaffolding that tools build on.

The drag manager tracks pointer state (down, move, up), computes deltas in canvas space, and supports a 4px drag threshold to distinguish clicks from drags.

---

## Spatial Index

**Module:** `src/canvas/core/scene/spatial-index.ts`

The spatial index accelerates region and point queries. It is updated automatically when entities are added, removed, or moved through the scene graph.

### SpatialIndex Interface

| Method | Signature | Description |
|--------|-----------|-------------|
| `insert` | `(id: string, bounds: BoundingBox2D) => void` | Adds an entity's bounds to the index |
| `remove` | `(id: string) => void` | Removes an entity from the index |
| `update` | `(id: string, bounds: BoundingBox2D) => void` | Updates an entity's bounds in the index |
| `queryRegion` | `(bounds: BoundingBox2D) => string[]` | Returns IDs of entities intersecting the region |
| `queryPoint` | `(point: Point2D) => string[]` | Returns IDs of entities containing the point |
| `clear` | `() => void` | Removes all entries from the index |

---

## Coordinate System

Canvas space is an infinite 2D plane with the origin at (0, 0). X increases to the right, Y increases downward. Entity positions are always in canvas space.

Screen space is the browser viewport with the origin at the top-left corner. The viewport module provides conversion functions between the two spaces.

The round-trip `screenToCanvas(canvasToScreen(p, vp), vp)` returns the original point (within floating-point epsilon).

---

## Edit vs Preview Mode

Canvas Core reads `canvasInteractionMode` from `uiStore`:

In **edit mode**, full entity manipulation is enabled: selection, drag, resize, z-order changes, and pipeline editing all work normally.

In **preview mode**, entity positions are locked. Pointer events pass through to widget iframes so widgets can handle their own interaction (buttons, inputs, etc.). The canvas layout is frozen — no entities can be moved, resized, or deleted.

Mode switching is a runtime state change. It does not require re-initializing the canvas.

---

## Bus Events

Canvas Core emits and consumes events on the bus:

| Event | Direction | Description |
|-------|-----------|-------------|
| `canvas.entity.created` | Emit | Entity added to the scene |
| `canvas.entity.updated` | Emit | Entity properties changed |
| `canvas.entity.deleted` | Emit | Entity removed from the scene |
| `canvas.entity.moved` | Emit | Entity position changed (after drop) |
| `canvas.entity.resized` | Emit | Entity size changed (after handle release) |
| `canvas.entity.selected` | Emit | Entity selected |
| `canvas.entity.deselected` | Emit | Entity deselected |
| `canvas.selection.cleared` | Emit | All entities deselected |
| `canvas.mode.changed` | Consume | Interaction mode toggled |
| `social.entity.transformed` | Consume | Remote entity transform from collaboration |

---

## Usage Example

```ts
import { createViewport, canvasToScreen, screenToCanvas, panBy, zoomTo } from '@/canvas/core/viewport';
import { createSceneGraph } from '@/canvas/core/scene';
import { hitTestPoint } from '@/canvas/core/hittest';

// Create viewport and scene
const viewport = createViewport(window.innerWidth, window.innerHeight);
const scene = createSceneGraph();

// Add an entity
scene.addEntity({
  id: 'sticker-1',
  type: 'sticker',
  transform: { position: { x: 100, y: 200 }, size: { width: 64, height: 64 }, rotation: 0, scale: 1 },
  zIndex: 0,
  visible: true,
  locked: false,
  // ... other fields
});

// Convert a click position to canvas space
const canvasPoint = screenToCanvas({ x: event.clientX, y: event.clientY }, viewport);

// Hit test
const hitEntity = hitTestPoint(scene, canvasPoint);
if (hitEntity) {
  console.log('Clicked on:', hitEntity.id);
}

// Pan and zoom
const pannedVp = panBy(viewport, { x: 50, y: 0 });
const zoomedVp = zoomTo(viewport, 1.5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
```
