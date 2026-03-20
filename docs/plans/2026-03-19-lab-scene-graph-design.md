# Lab Scene Graph — Dual-Layer Graph with AI Automation

**Date**: 2026-03-19
**Status**: Approved
**Scope**: `src/lab/graph/`, `src/lab/components/LabGraph/`, `src/lab/ai/`

---

## Problem

The Lab graph editor only supports flat SDK-call nodes (subscribe, emit, filter, map, setState, etc.) for building single widget internals. There is no way to:

1. Place Widget or Sticker nodes and wire their event ports together (inter-widget pipelines)
2. Navigate a scene hierarchy (Scene > Docker > Widget > Internals)
3. See or create port connections — nodes have no visible handles
4. Use AI to automate wiring, widget generation, or pipeline design

Widget pipelines are the core feature of StickerNest and the Lab has no way to design them.

## Solution: Approach A — Unified Graph with Depth Navigation

One `@xyflow/react` instance that switches context based on depth level. A breadcrumb trail shows position in the hierarchy.

### Graph Hierarchy

```
Scene (root)
  +-- Widget: WeatherApp        <- double-click to enter internals
  |     +-- subscribe: weather.updated
  |     +-- filter: isRaining
  |     +-- emit: alert.rain
  +-- Widget: ClockWidget
  +-- Sticker: PlayButton       <- output port from click action
  +-- Docker: Sidebar           <- expandable, shows children
  |     +-- Widget: NotesWidget
  |     +-- Widget: TodoWidget
  +-- Group: HeaderBar
        +-- Sticker: Logo
        +-- Widget: SearchBar
```

Breadcrumb: `Scene > Sidebar > NotesWidget (internals)`
Each segment clickable. Smooth zoom transition (framer-motion spring).

### Scene-Level Node Types

| Node Type | Color | Ports | Description |
|-----------|-------|-------|-------------|
| `widget` | Storm | Manifest-derived in/out event ports | Widget instance |
| `sticker` | Ember | Output port from click action | Visual trigger |
| `docker` | Opal | Aggregated child ports | Container |
| `group` | Violet | Pass-through | Logical grouping |
| `scene-input` | Moss | Output only | External events entering |
| `scene-output` | Moss | Input only | Events leaving scene |

### Widget-Level Node Types (existing + enhanced)

| Node Type | Color | Ports | Description |
|-----------|-------|-------|-------------|
| `subscribe` | Storm | 1 out | Listen for bus event |
| `emit` | Ember | 1 in | Fire bus event |
| `filter` | Violet | 1 in, 1 out | Conditional pass-through |
| `map` | Violet | 1 in, 1 out | Transform payload shape |
| `transform` | Violet | 1 in, 1 out | Generic transform |
| `setState` | Opal | 1 in | Persist to widget state |
| `getState` | Opal | 1 out | Read from widget state |
| `integration.query` | Moss | 1 out | External data read |
| `integration.mutate` | Moss | 1 in | External data write |
| `child-widget` | Storm (lighter) | Manifest-derived | Embedded child widget ref |

### Port System

Every node gets visible `<Handle>` components from xyflow:
- Input handles on left edge, output handles on right edge
- Each handle renders as a PortDot (8px glowing circle, color-coded)
- Drag from output handle to input handle creates GlowEdge
- Type-checking on hover: compatible targets pulse storm, incompatible stay dim

**Port derivation for scene nodes:**
- Widget nodes: `manifest.events.emits[]` -> output ports, `manifest.events.subscribes[]` -> input ports
- Sticker nodes: click action type determines ports (emit-event -> 1 output, launch-widget -> 1 output "launch")
- Docker nodes: union of all children's ports, namespaced (e.g. `Sidebar.NotesWidget.note.saved`)

**Connection rules:**
- Output -> Input only (xyflow handle types)
- Type compatibility via port JSON Schema intersection
- Incompatible drop -> ember flash + shake, no edge
- Cycle detection on every attempt
- Multi-fan-out allowed, single input per port

### Compilation

**Scene level -> Pipeline** (kernel schema):
- Scene nodes map to `PipelineNode` instances
- GlowEdges map to `PipelineEdge` connections
- Validates against `PipelineSchema` from `@sn/types`
- Output consumed by canvas wiring execution engine

**Widget level -> HTML** (existing compiler enhanced):
- Existing `compileGraph()` handles subscribe chains, transforms, state
- Enhanced with `child-widget` node type generating SDK channel calls

### AI Integration

The AI Companion gets deep graph context awareness.

**Context payload assembled on every prompt:**
```typescript
interface AIGraphContext {
  level: 'scene' | 'widget';
  sceneGraph: SceneNode[];
  currentManifest?: WidgetManifest;
  currentHtml?: string;
  availableChannels: string[];
  selection: { nodes: string[]; edges: string[] };
  connections: PipelineEdge[];
  widgetManifests: Record<string, WidgetManifest>;
}
```

**AI actions at scene level:**
- Add widgets with auto-generated HTML + manifest
- Auto-wire compatible ports between widgets
- Batch-create subscribe connections
- Create sticker triggers wired to targets

**AI actions at widget level:**
- Generate subscribe/filter/emit chains from natural language
- Generate full widget HTML + manifest
- Suggest internal logic based on manifest contract

**AI-Assisted Wiring:**
When a new widget drops onto the scene, AI suggests connections as ghost edges (dashed, opal, 40% opacity). Click to accept.

**Prompt templates:**
- "Wire this scene" - analyze unconnected ports, suggest complete wiring
- "Explain this pipeline" - trace event flow, generate description
- "Generate widget for [purpose]" - create + manifest + wire into scene

## Files

### New
- `src/lab/graph/scene-compiler.ts` - compiles scene graph -> Pipeline
- `src/lab/graph/scene-types.ts` - SceneNodeType, SceneNode types
- `src/lab/components/LabGraph/PortDot.tsx` - visible port handle
- `src/lab/components/LabGraph/SceneNode.tsx` - widget/sticker/docker renderers
- `src/lab/components/LabGraph/GraphBreadcrumb.tsx` - depth navigation
- `src/lab/components/LabGraph/GhostEdge.tsx` - AI suggestion edges
- `src/lab/ai/ai-context.ts` - builds AIGraphContext from live state

### Modified
- `src/lab/graph/graph-compiler.ts` - add child-widget NodeType
- `src/lab/components/LabGraph/LabGraph.tsx` - depth nav, scene/widget mode, handles
- `src/lab/components/LabGraph/NodeShell.tsx` - add Handle components
- `src/lab/components/LabGraph/GraphToolbar.tsx` - scene node types, AI actions
- `src/lab/components/LabAI/AIThread.tsx` - graph-aware prompting
- `src/lab/ai/ai-generator.ts` - add generateWithContext()

### No changes needed
- Kernel schemas (Pipeline, WidgetManifest, CanvasEntity) already support everything
