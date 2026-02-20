/**
 * Graph Compiler
 *
 * Compiles a visual node graph into valid single-file HTML widget code.
 * Node types map to SDK calls: emit, subscribe, setState, getState,
 * integration.query, integration.mutate.
 * Transform node types (filter, map) are inlined into subscribe handler chains.
 *
 * @module lab/graph
 * @layer L2
 */

export type NodeType = 'emit' | 'subscribe' | 'setState' | 'getState' | 'integration.query' | 'integration.mutate' | 'transform' | 'filter' | 'map';

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
 * Returns true if a node type is a transform that should be inlined
 * into a subscribe handler chain rather than generating standalone code.
 */
function isTransformNode(type: NodeType): boolean {
  return type === 'filter' || type === 'map' || type === 'transform';
}

/**
 * Generates the code body for a downstream chain starting from a given node.
 * Transform nodes (filter, map) are inlined; emit/setState/etc. generate SDK calls.
 */
function compileDownstreamChain(
  nodeId: string,
  nodeMap: Map<string, GraphNode>,
  downstream: Map<string, string[]>,
  indent: string,
): string {
  const node = nodeMap.get(nodeId);
  if (!node) return '';

  const cfg = node.config;
  const children = downstream.get(nodeId) ?? [];
  let childCode = '';
  for (const childId of children) {
    childCode += compileDownstreamChain(childId, nodeMap, downstream, indent + '  ');
  }

  switch (node.type) {
    case 'emit':
      return `${indent}StickerNest.emit(${JSON.stringify(cfg.eventType ?? 'custom.event')}, payload);\n`;
    case 'filter': {
      const condition = cfg.condition ?? 'true';
      return `${indent}if (payload && ${condition}) {\n${childCode}${indent}}\n`;
    }
    case 'map': {
      const mapping = cfg.mapping as Record<string, string> | undefined;
      if (mapping && Object.keys(mapping).length > 0) {
        let code = `${indent}payload = (function(p) {\n`;
        code += `${indent}  var result = {};\n`;
        for (const [target, source] of Object.entries(mapping)) {
          code += `${indent}  result[${JSON.stringify(target)}] = p[${JSON.stringify(source)}];\n`;
        }
        code += `${indent}  return result;\n`;
        code += `${indent}})(payload);\n`;
        code += childCode;
        return code;
      }
      // No mapping config — pass through
      return childCode;
    }
    case 'transform': {
      // Generic transform — inline expression as comment + pass through
      return `${indent}// Transform: ${JSON.stringify(cfg.expression ?? 'identity')}\n${childCode}`;
    }
    case 'setState':
      return `${indent}StickerNest.setState(${JSON.stringify(cfg.key ?? 'key')}, ${JSON.stringify(cfg.value ?? null)});\n`;
    case 'getState':
      return `${indent}StickerNest.getState(${JSON.stringify(cfg.key ?? 'key')}).then(function(value) { /* use value */ });\n`;
    case 'integration.query':
      return `${indent}StickerNest.integration(${JSON.stringify(cfg.name ?? 'default')}).query(${JSON.stringify(cfg.params ?? {})});\n`;
    case 'integration.mutate':
      return `${indent}StickerNest.integration(${JSON.stringify(cfg.name ?? 'default')}).mutate(${JSON.stringify(cfg.params ?? {})});\n`;
    default:
      return `${indent}// Unknown node type\n`;
  }
}

/**
 * Generates JavaScript code for a standalone (non-wired) node.
 */
function compileStandaloneNode(node: GraphNode): string {
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
    case 'filter':
    case 'map':
      return `// Transform: ${JSON.stringify(cfg.expression ?? cfg.condition ?? 'identity')}`;
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

  // Build node map and adjacency structures
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build downstream adjacency: for each node, which nodes follow it
  const downstream = new Map<string, string[]>();
  const hasIncoming = new Set<string>();
  for (const node of nodes) {
    downstream.set(node.id, []);
  }
  for (const edge of edges) {
    const targets = downstream.get(edge.sourceNodeId);
    if (targets) targets.push(edge.targetNodeId);
    hasIncoming.add(edge.targetNodeId);
  }

  // Derive emits and subscribes arrays from the graph
  const emitEvents: string[] = [];
  const subscribeEvents: string[] = [];
  for (const node of nodes) {
    if (node.type === 'emit' && node.config.eventType) {
      const evt = String(node.config.eventType);
      if (!emitEvents.includes(evt)) emitEvents.push(evt);
    }
    if (node.type === 'subscribe' && node.config.eventType) {
      const evt = String(node.config.eventType);
      if (!subscribeEvents.includes(evt)) subscribeEvents.push(evt);
    }
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

  // Generate code: subscribe nodes with downstream chains, standalone nodes for the rest
  const codeLines: string[] = [];
  const handledNodes = new Set<string>();

  for (const nodeId of sorted) {
    if (handledNodes.has(nodeId)) continue;
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    if (node.type === 'subscribe') {
      // Build the full handler chain for this subscribe node
      const children = downstream.get(nodeId) ?? [];
      if (children.length > 0) {
        // Mark all downstream transform/emit nodes as handled
        const markHandled = (nId: string) => {
          handledNodes.add(nId);
          for (const childId of downstream.get(nId) ?? []) {
            markHandled(childId);
          }
        };
        for (const childId of children) {
          markHandled(childId);
        }

        let handlerBody = '';
        for (const childId of children) {
          handlerBody += compileDownstreamChain(childId, nodeMap, downstream, '    ');
        }

        codeLines.push(`  StickerNest.subscribe(${JSON.stringify(node.config.eventType ?? 'custom.event')}, function(payload) {`);
        codeLines.push(handlerBody.replace(/\n$/, ''));
        codeLines.push('  });');
      } else {
        // Standalone subscribe with no downstream
        codeLines.push(`  ${compileStandaloneNode(node)}`);
      }
      handledNodes.add(nodeId);
    } else if (isTransformNode(node.type) && hasIncoming.has(nodeId)) {
      // Transform nodes with incoming edges are handled as part of subscribe chains
      handledNodes.add(nodeId);
    } else {
      // Standalone node (emit, setState, getState, integration, orphaned transform)
      codeLines.push(`  ${compileStandaloneNode(node)}`);
      handledNodes.add(nodeId);
    }
  }

  const emitsStr = JSON.stringify(emitEvents).replace(/"/g, "'");
  const subscribesStr = JSON.stringify(subscribeEvents).replace(/"/g, "'");

  const html = `<script>
StickerNest.register({ events: { emits: ${emitsStr}, subscribes: ${subscribesStr} } });
(function() {
${codeLines.join('\n')}
})();
StickerNest.ready();
</script>`;

  return { html, errors };
}
