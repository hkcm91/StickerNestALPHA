# Layer 4A-3 — Canvas Wiring Rules
# Applies to: `src/canvas/wiring/**`

## Identity and Responsibility

Canvas Wiring implements the visual Pipeline graph editor — the node-and-edge
UI that connects widget outputs to widget inputs. It also owns the runtime
execution of pipelines: evaluating the graph, routing events, and managing
pipeline state.

Wiring layer owns:
- Pipeline graph data model (nodes, edges, ports)
- Visual graph editor: drag-to-connect, node placement, edge routing
- Pipeline execution engine: event routing through the graph
- Pipeline validation: cycle detection, type-compatibility checking
- Pipeline persistence: save/load pipeline graph to/from backend
- Cross-widget event routing via the pipeline graph

---

## Import Rules — STRICTLY ENFORCED

- You MAY import from `src/kernel/**` (Layer 0)
- You MAY import from `src/runtime/**` (Layer 3)
- You MAY import from `src/canvas/core/**` (Layer 4A-1)
- You MUST NOT import from `src/social/**`, `src/lab/**`,
  `src/canvas/tools/**`, `src/canvas/panels/**`,
  `src/spatial/**`, `src/marketplace/**`, or `src/shell/**`

---

## Pipeline Data Model

A Pipeline is a directed acyclic graph (DAG):
- **Node**: represents a widget instance or a built-in transform (filter, map, merge, etc.)
- **Port**: typed input or output on a node (declared in widget manifest)
- **Edge**: connects an output port to an input port — must be type-compatible
- **Pipeline** schema lives in `src/kernel/schemas/` — import from `@sn/types`

Rules:
- No cycles — enforce at graph edit time with cycle detection
- Type compatibility is checked at edge creation — mismatched port types are rejected
- A single output port may fan out to multiple input ports
- A single input port accepts only one incoming edge (no implicit merge)

---

## Visual Graph Editor

- Nodes are positioned in canvas space — they are entities with a canvas position
- Drag output port → drag → release on input port → creates edge (if compatible)
- Incompatible port types show a visual rejection (red indicator, no edge created)
- Edges route around other nodes using an orthogonal or curved path algorithm
- The pipeline graph is only visible and editable in **edit mode**
- In **preview mode**: the graph is invisible; pipeline execution still runs

---

## Pipeline Execution Engine

- Pipeline events are routed on the event bus
- When a widget emits an event, the execution engine checks if any pipeline
  edges originate from that widget's output ports
- If an edge exists, the payload is forwarded to the target input port's widget
- Built-in transform nodes (filter, map, merge, delay, etc.) are evaluated inline
- Execution must be synchronous for simple pass-through edges
- Async transforms (e.g., API call nodes) must not block the event bus thread

---

## Validation

- Validate the full graph on load and after every edit
- Cycle detection: depth-first search; report the cycle path in the error
- Type checking: compare port schema definitions from both widget manifests
- Orphaned nodes (no edges) are allowed — they are inert but not invalid
- Emit a `canvas.pipeline.invalid` bus event when validation fails; include the reason

---

## Testing Requirements

1. **Cycle detection** — a graph with a cycle must be rejected at edge creation; no cycle may be saved
2. **Type mismatch** — connecting incompatible port types must fail with a visual indicator and no edge created
3. **Event routing** — widget A emits on output port; pipeline edge routes payload to widget B's input port correctly
4. **Preview mode** — pipeline graph is not visible in preview mode but event routing still functions
5. **Persistence round-trip** — save a pipeline graph, reload, confirm identical graph structure

---

## What You Must Not Do

- Do not allow cycles in the pipeline graph — detect and reject at edit time
- Do not block the event bus with synchronous long-running transforms
- Do not show the pipeline graph editor in preview mode
- Do not import from canvas tools or panels
- Do not redefine pipeline schemas locally — use `@sn/types`
- Do not silently drop pipeline events — if a node fails, emit a bus error event
