# Layer 4B — Spatial / VR Rules
# Applies to: `src/spatial/**`

## Identity and Responsibility

Layer 4B is the 3D and VR rendering environment for StickerNest V5. It runs
alongside the 2D canvas (Layer 4A), not as a replacement. It owns the Three.js
scene, WebXR session management, spatial entity positioning, and VR controller
input routing.

Spatial layer owns:
- Three.js scene graph and render loop
- WebXR session lifecycle (enter VR, exit VR, session events)
- VR controller input: ray casting, trigger, grip, thumbstick
- Spatial entity positioning: mapping 2D canvas entities into 3D space
- Gaze/cursor in VR: raycaster-based hover and selection
- Spatial bus events: `spatial.*` namespace

Layer 4B depends on Layer 0 and Layer 3. It does NOT depend on Layer 4A (2D canvas).
The two rendering systems are peers, not parent/child.

---

## Import Rules — STRICTLY ENFORCED

- You MAY import from `src/kernel/**` (Layer 0)
- You MAY import from `src/runtime/**` (Layer 3)
- You MAY import from external npm packages (three, @react-three/fiber, @react-three/xr, etc.)
- You MUST NOT import from `src/social/**`, `src/lab/**`,
  `src/canvas/**`, `src/marketplace/**`, or `src/shell/**`

Layer 4B and Layer 4A are peers. Neither imports the other.
Cross-environment communication goes through the event bus only.

---

## WebXR Session Management

- Enter VR via `navigator.xr.requestSession('immersive-vr')`
- Session lifecycle events: `sessionstart`, `sessionend`
- Emit `spatial.session.started` and `spatial.session.ended` bus events
- On session end: gracefully restore the 2D canvas view
- Handle session rejection (device not supported, user denied) gracefully —
  show a non-blocking error message, do not crash

---

## Three.js Scene

- One Three.js renderer instance — do not create multiple renderers
- Use `@react-three/fiber` for React integration if React is used in this layer
- Scene graph mirrors the canvas entity list — sync via bus events, not direct imports
- Camera: XR camera in VR mode; perspective camera in 3D browser mode
- Lighting: ambient + directional defaults; allow per-canvas override via bus event

---

## VR Controller Input

- Support left and right XR controllers
- Ray casting: project ray from controller, detect intersections with spatial entities
- Trigger press: select / activate entity under ray
- Grip press: grab and move entity
- Thumbstick: locomotion (teleport or smooth, configurable)
- Emit all controller actions as `spatial.controller.*` bus events
- Do not handle controller input inline — always route through the bus

---

## SpatialContext on BusEvents

- When emitting bus events from spatial interactions, populate the `spatial` field
  on the `BusEvent` schema with the current `SpatialContext`
- `SpatialContext`: `{ position: Vector3, rotation: Quaternion, normal: Vector3 }`
- For non-spatial bus events (e.g., session lifecycle), leave `spatial` as `undefined`
- Never default `spatial` to a zero vector — only populate when meaningful

---

## Spatial Entity Positioning

- 2D canvas entities have an optional `spatialPosition` field for 3D placement
- When a canvas entity is placed in 3D space, emit `spatial.entity.placed` with
  the SpatialContext — the 2D canvas layer reacts via the bus
- Do not directly read or write the 2D canvas scene graph

---

## Testing Requirements

1. **Session lifecycle** — entering and exiting VR emits correct `spatial.session.*` bus events
2. **Controller ray cast** — a simulated controller ray intersecting a spatial entity emits `spatial.controller.select` with correct entity id
3. **SpatialContext population** — bus events from spatial interactions have `spatial` field populated; non-spatial events have `spatial === undefined`
4. **Graceful rejection** — XR session request denial results in non-blocking UI error, no uncaught exception

---

## What You Must Not Do

- Do not import from Layer 4A (2D canvas) — they are peers on the bus
- Do not create multiple Three.js renderer instances
- Do not default `spatial` to a zero vector on BusEvents
- Do not block the render loop with synchronous bus operations
- Do not hard-crash on XR session rejection — degrade gracefully
