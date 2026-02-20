/**
 * Graph Compiler
 *
 * Compiles a visual node graph into valid single-file HTML widget code.
 * Node types map to SDK calls: emit, subscribe, setState, getState,
 * integration.query, integration.mutate.
 *
 * @module lab/graph
 * @layer L2
 */

export type NodeType = 'emit' | 'subscribe' | 'setState' | 'getState' | 'integration.query' | 'integration.mutate' | 'transform';

export interface GraphNode {
  id: string;
  type: NodeType;
  config: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  targetPort: string;
}

export interface CompileResult {
  html: string;
  errors: string[];
}

/**
 * Detects cycles in the graph using DFS.
 *
 * @returns Array of node IDs forming a cycle, or empty if acyclic
 */
export function detectCycles(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    const targets = adjacency.get(edge.sourceNodeId);
    if (targets) {
      targets.push(edge.targetNodeId);
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cyclePath: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    inStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          cyclePath.unshift(nodeId);
          return true;
        }
      } else if (inStack.has(neighbor)) {
        cyclePath.push(neighbor);
        cyclePath.unshift(nodeId);
        return true;
      }
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return cyclePath;
      }
    }
  }

  return [];
}

/**
 * Generates JavaScript code for a single node.
 */
function compileNode(node: GraphNode): string {
  const cfg = node.config;
  switch (node.type) {
    case 'emit':
      return `StickerNest.emit(${JSON.stringify(cfg.eventType ?? 'custom.event')}, ${JSON.stringify(cfg.payload ?? {})});`;
    case 'subscribe':
      return `StickerNest.subscribe(${JSON.stringify(cfg.eventType ?? 'custom.event')}, function(payload) { /* handler */ });`;
    case 'setState':
      return `StickerNest.setState(${JSON.stringify(cfg.key ?? 'key')}, ${JSON.stringify(cfg.value ?? null)});`;
    case 'getState':
      return `StickerNest.getState(${JSON.stringify(cfg.key ?? 'key')}).then(function(value) { /* use value */ });`;
    case 'integration.query':
      return `StickerNest.integration(${JSON.stringify(cfg.name ?? 'default')}).query(${JSON.stringify(cfg.params ?? {})});`;
    case 'integration.mutate':
      return `StickerNest.integration(${JSON.stringify(cfg.name ?? 'default')}).mutate(${JSON.stringify(cfg.params ?? {})});`;
    case 'transform':
      return `// Transform: ${JSON.stringify(cfg.expression ?? 'identity')}`;
    default:
      return `// Unknown node type`;
  }
}

/**
 * Compiles a node graph into a single-file HTML widget.
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @returns Compile result with HTML and any errors
 */
export function compileGraph(nodes: GraphNode[], edges: GraphEdge[]): CompileResult {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push('Graph has no nodes');
    return { html: '', errors };
  }

  // Check for cycles
  const cycle = detectCycles(nodes, edges);
  if (cycle.length > 0) {
    errors.push(`Graph contains a cycle: ${cycle.join(' → ')}`);
    return { html: '', errors };
  }

  // Topological sort for execution order
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    const targets = adjacency.get(edge.sourceNodeId);
    if (targets) targets.push(edge.targetNodeId);
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const codeLines = sorted
    .map((id) => nodeMap.get(id))
    .filter((n): n is GraphNode => n !== undefined)
    .map((n) => `  ${compileNode(n)}`);

  const html = `<script>
StickerNest.register({ events: { emits: [], subscribes: [] } });
(function() {
${codeLines.join('\n')}
})();
StickerNest.ready();
</script>`;

  return { html, errors };
}
