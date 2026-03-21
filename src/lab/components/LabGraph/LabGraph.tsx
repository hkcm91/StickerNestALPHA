/**
 * LabGraph — Dual-layer scene graph editor using @xyflow/react.
 *
 * Two modes:
 * - Scene level: Widget, Sticker, Docker, Group nodes with manifest-derived ports
 * - Widget level: SDK-call nodes (subscribe, emit, filter, etc.) for widget internals
 *
 * Double-click a widget/docker node to enter its internals. Breadcrumb navigates back.
 *
 * @module lab/components/LabGraph
 * @layer L2
 */

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type OnConnect,
} from '@xyflow/react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';

import type { WidgetManifest } from '@sn/types';

import type { WidgetRegistryEntry } from '../../../kernel/stores/widget/widget.store';
import type { NodeType, GraphNode, GraphEdge } from '../../graph/graph-compiler';
import { compileGraph, detectCycles } from '../../graph/graph-compiler';
import type { GraphSync } from '../../graph/graph-sync';
import { compileScene } from '../../graph/scene-compiler';
import type {
  SceneNode,
  SceneEdge,
  SceneNodeType,
  GraphLevel,
  BreadcrumbSegment,
  Port,
} from '../../graph/scene-types';
import { portsFromManifest } from '../../graph/scene-types';
import { labPalette, SPRING } from '../shared/palette';

import { AuroraEdge } from './AuroraEdge';
import { CardNode } from './CardNode';
import type { CardNodeData } from './CardNode';
import { ConnectionFeedbackProvider, useConnectionFeedback } from './ConnectionFeedback';
import { GhostEdge } from './GhostEdge';
import { GlowEdge } from './GlowEdge';
import { GraphBreadcrumb } from './GraphBreadcrumb';
import { NodeShell } from './NodeShell';
import { PortDot } from './PortDot';
import type { SceneNodeData } from './SceneNode';
import { SceneNodeComponent } from './SceneNode';

// ═══════════════════════════════════════════════════════════════════
// Widget-Level Node Component (enhanced with port handles)
// ═══════════════════════════════════════════════════════════════════

interface WidgetGraphNodeData {
  nodeType: NodeType;
  label?: string;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

const WidgetNodeComponent: React.FC<{ data: WidgetGraphNodeData; selected?: boolean }> = ({
  data,
  selected,
}) => {
  const ports = getWidgetNodePorts(data.nodeType);

  return (
    <NodeShell nodeType={data.nodeType} label={data.label} selected={selected}>
      <div style={{ minHeight: 24 }}>
        {data.config.eventType != null && (
          <div style={{
            fontSize: 10, color: labPalette.textMuted,
            fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {String(data.config.eventType)}
          </div>
        )}
        {data.config.key != null && (
          <div style={{
            fontSize: 10, color: labPalette.textMuted,
            fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
          }}>
            key: {String(data.config.key)}
          </div>
        )}
        {data.config.name != null && (
          <div style={{
            fontSize: 10, color: labPalette.textMuted,
            fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
          }}>
            {String(data.config.name)}
          </div>
        )}
      </div>

      {/* Input ports */}
      {ports.inputs.map((port, i) => (
        <PortDot
          key={port.id}
          portId={port.id}
          type="target"
          position={'left' as any}
          label={port.name}
          color={port.color}
          index={i}
          total={ports.inputs.length}
        />
      ))}

      {/* Output ports */}
      {ports.outputs.map((port, i) => (
        <PortDot
          key={port.id}
          portId={port.id}
          type="source"
          position={'right' as any}
          label={port.name}
          color={port.color}
          index={i}
          total={ports.outputs.length}
        />
      ))}
    </NodeShell>
  );
};

/** Derive input/output ports for widget-level node types */
function getWidgetNodePorts(type: NodeType): {
  inputs: Array<{ id: string; name: string; color: string }>;
  outputs: Array<{ id: string; name: string; color: string }>;
} {
  switch (type) {
    case 'subscribe':
      return { inputs: [], outputs: [{ id: 'out', name: 'data', color: '#4E7B8E' }] };
    case 'emit':
      return { inputs: [{ id: 'in', name: 'data', color: '#E8806C' }], outputs: [] };
    case 'filter':
      return {
        inputs: [{ id: 'in', name: 'in', color: '#B8A0D8' }],
        outputs: [{ id: 'out', name: 'pass', color: '#B8A0D8' }],
      };
    case 'map':
      return {
        inputs: [{ id: 'in', name: 'in', color: '#B8A0D8' }],
        outputs: [{ id: 'out', name: 'out', color: '#B8A0D8' }],
      };
    case 'transform':
      return {
        inputs: [{ id: 'in', name: 'in', color: '#B8A0D8' }],
        outputs: [{ id: 'out', name: 'out', color: '#B8A0D8' }],
      };
    case 'setState':
      return { inputs: [{ id: 'in', name: 'value', color: '#B0D0D8' }], outputs: [] };
    case 'getState':
      return { inputs: [], outputs: [{ id: 'out', name: 'value', color: '#B0D0D8' }] };
    case 'integration.query':
      return { inputs: [], outputs: [{ id: 'out', name: 'result', color: '#5AA878' }] };
    case 'integration.mutate':
      return { inputs: [{ id: 'in', name: 'data', color: '#5AA878' }], outputs: [] };
    default:
      return { inputs: [], outputs: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Node / Edge Type Registrations
// ═══════════════════════════════════════════════════════════════════

const nodeTypes: NodeTypes = {
  widgetNode: WidgetNodeComponent,
  sceneNode: SceneNodeComponent,
  cardNode: CardNode,
};

const edgeTypes: EdgeTypes = {
  glow: GlowEdge,
  ghost: GhostEdge,
  aurora: AuroraEdge,
};

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

let nodeCounter = 0;

function createNodeId(): string {
  return `node-${Date.now()}-${++nodeCounter}`;
}

// Widget-level helpers (existing, preserved)
function graphNodesToFlow(graphNodes: GraphNode[]): Node<WidgetGraphNodeData>[] {
  return graphNodes.map((gn, i) => ({
    id: gn.id,
    type: 'widgetNode',
    position: { x: 200 + (i % 3) * 220, y: 100 + Math.floor(i / 3) * 160 },
    data: { nodeType: gn.type, config: gn.config },
  }));
}

function graphEdgesToFlow(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((ge) => ({
    id: ge.id,
    source: ge.sourceNodeId,
    target: ge.targetNodeId,
    sourceHandle: ge.sourcePort,
    targetHandle: ge.targetPort,
    type: 'glow',
  }));
}

function flowNodesToGraph(flowNodes: Node<WidgetGraphNodeData>[]): GraphNode[] {
  return flowNodes.map((fn) => ({
    id: fn.id,
    type: fn.data.nodeType,
    config: fn.data.config,
  }));
}

function flowEdgesToGraph(flowEdges: Edge[]): GraphEdge[] {
  return flowEdges.map((fe) => ({
    id: fe.id,
    sourceNodeId: fe.source,
    sourcePort: fe.sourceHandle ?? 'out',
    targetNodeId: fe.target,
    targetPort: fe.targetHandle ?? 'in',
  }));
}

// Scene-level helpers
function sceneNodesToFlow(sceneNodes: SceneNode[], onEnterWidget: (id: string) => void): Node<SceneNodeData>[] {
  return sceneNodes.map((sn, i) => ({
    id: sn.id,
    type: 'sceneNode',
    position: { x: 150 + (i % 4) * 260, y: 100 + Math.floor(i / 4) * 200 },
    data: {
      sceneType: sn.type,
      label: sn.label,
      inputPorts: sn.inputPorts,
      outputPorts: sn.outputPorts,
      config: sn.config,
      children: sn.children,
      widgetId: sn.widgetId,
      onEnterWidget,
    },
  }));
}

function sceneEdgesToFlow(sceneEdges: SceneEdge[]): Edge[] {
  return sceneEdges.map((se) => ({
    id: se.id,
    source: se.sourceNodeId,
    target: se.targetNodeId,
    sourceHandle: se.sourcePortId,
    targetHandle: se.targetPortId,
    type: 'glow',
  }));
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface LabGraphProps {
  graphSync?: GraphSync;
  onCompile?: (html: string) => void;
  /** Initial scene nodes (for scene-level graph) */
  initialSceneNodes?: SceneNode[];
  /** Initial scene edges */
  initialSceneEdges?: SceneEdge[];
  /** Called when scene graph state changes (for AI context) */
  onGraphStateChange?: (nodes: SceneNode[], edges: SceneEdge[]) => void;
  /** Called when user requests AI description of a widget */
  onDescribeWidget?: (manifest: WidgetManifest) => void;
}

export const LabGraph: React.FC<LabGraphProps> = ({
  graphSync,
  onCompile,
  initialSceneNodes = [],
  initialSceneEdges = [],
  onGraphStateChange,
  onDescribeWidget,
}) => {
  // ─── Navigation State ───────────────────────────────────────────
  const [level, setLevel] = useState<GraphLevel>('scene');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbSegment[]>([
    { id: 'scene', label: 'Scene', level: 'scene', nodeId: null },
  ]);
  const [currentWidgetNodeId, setCurrentWidgetNodeId] = useState<string | null>(null);

  // ─── Scene-level State ──────────────────────────────────────────
  const sceneNodesRef = useRef<SceneNode[]>(initialSceneNodes);
  const sceneEdgesRef = useRef<SceneEdge[]>(initialSceneEdges);

  // ─── Enter widget internals ─────────────────────────────────────
  const handleEnterWidget = useCallback((nodeId: string) => {
    const sceneNode = sceneNodesRef.current.find((n) => n.id === nodeId);
    if (!sceneNode) return;

    setCurrentWidgetNodeId(nodeId);
    setLevel('widget');
    setBreadcrumbs((prev) => [
      ...prev,
      {
        id: nodeId,
        label: sceneNode.label || 'Widget',
        level: 'widget',
        nodeId,
      },
    ]);
  }, []);

  // ─── Breadcrumb navigation ─────────────────────────────────────
  const handleBreadcrumbNavigate = useCallback((segmentIndex: number) => {
    const segment = breadcrumbs[segmentIndex];
    if (!segment) return;

    setBreadcrumbs((prev) => prev.slice(0, segmentIndex + 1));
    setLevel(segment.level);
    setCurrentWidgetNodeId(segment.level === 'widget' ? segment.nodeId : null);
  }, [breadcrumbs]);

  // ─── Flow State ─────────────────────────────────────────────────
  const initialFlowNodes = useMemo((): Node[] => {
    if (level === 'scene') {
      return sceneNodesToFlow(sceneNodesRef.current, handleEnterWidget) as Node[];
    }
    if (graphSync) return graphNodesToFlow(graphSync.getNodes()) as Node[];
    return [];
  }, [level, graphSync, handleEnterWidget]);

  const initialFlowEdges = useMemo(() => {
    if (level === 'scene') {
      return sceneEdgesToFlow(sceneEdgesRef.current);
    }
    if (graphSync) return graphEdgesToFlow(graphSync.getEdges());
    return [];
  }, [level, graphSync]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlowEdges);
  const [cycleError, setCycleError] = useState<string | null>(null);

  const syncMode = graphSync?.isInSyncMode() ?? true;

  // ─── Notify graph state change (debounced) ────────────────────
  const stateChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifyGraphStateChange = useCallback(() => {
    if (!onGraphStateChange) return;
    if (stateChangeTimerRef.current) clearTimeout(stateChangeTimerRef.current);
    stateChangeTimerRef.current = setTimeout(() => {
      onGraphStateChange(sceneNodesRef.current, sceneEdgesRef.current);
    }, 500);
  }, [onGraphStateChange]);

  // ─── Connection Handler ─────────────────────────────────────────
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    if (level === 'widget') {
      // Widget-level: cycle detection
      const testEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'glow',
      };
      const testEdges = [...edges, testEdge];
      const gNodes = flowNodesToGraph(nodes as Node<WidgetGraphNodeData>[]);
      const gEdges = flowEdgesToGraph(testEdges);
      const cycle = detectCycles(gNodes, gEdges);

      if (cycle.length > 0) {
        setCycleError('Cannot connect: would create cycle');
        setTimeout(() => setCycleError(null), 2000);
        return;
      }
    }

    setEdges((eds) => addEdge({ ...connection, type: 'glow' }, eds));
    setCycleError(null);

    // Track scene edge and notify
    if (level === 'scene' && connection.source && connection.target) {
      const edgeId = `edge-${Date.now()}`;
      sceneEdgesRef.current = [...sceneEdgesRef.current, {
        id: edgeId,
        sourceNodeId: connection.source,
        sourcePortId: connection.sourceHandle ?? '',
        targetNodeId: connection.target,
        targetPortId: connection.targetHandle ?? '',
      }];
      notifyGraphStateChange();
    }
  }, [edges, nodes, setEdges, level, notifyGraphStateChange]);

  // ─── Sync to Backend ────────────────────────────────────────────
  const syncToBackend = useCallback(() => {
    if (!graphSync || level !== 'widget') return;
    const gNodes = flowNodesToGraph(nodes as Node<WidgetGraphNodeData>[]);
    const gEdges = flowEdgesToGraph(edges);
    graphSync.setGraph(gNodes, gEdges);
    if (graphSync.isInSyncMode()) {
      graphSync.syncToEditor();
    }
  }, [graphSync, nodes, edges, level]);

  // ─── Add Node ───────────────────────────────────────────────────
  const handleAddNode = useCallback((type: NodeType | SceneNodeType) => {
    const id = createNodeId();

    if (level === 'scene') {
      // Scene-level node
      const sceneType = type as SceneNodeType;
      const defaultPorts = getDefaultScenePorts(sceneType);

      const newNode: Node<SceneNodeData> = {
        id,
        type: 'sceneNode',
        position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 },
        data: {
          sceneType,
          label: sceneType === 'widget' ? 'New Widget' : sceneType === 'sticker' ? 'New Sticker' : undefined,
          inputPorts: defaultPorts.inputPorts,
          outputPorts: defaultPorts.outputPorts,
          config: {},
          onEnterWidget: handleEnterWidget,
        },
      };
      setNodes((nds) => [...nds, newNode]);

      // Track in scene state
      sceneNodesRef.current = [...sceneNodesRef.current, {
        id,
        type: sceneType,
        label: (newNode.data as SceneNodeData).label ?? sceneType,
        inputPorts: defaultPorts.inputPorts,
        outputPorts: defaultPorts.outputPorts,
        config: {},
      }];
      notifyGraphStateChange();
    } else {
      // Widget-level node
      const nodeType = type as NodeType;
      const defaultConfig: Record<string, unknown> = {};

      if (nodeType === 'subscribe' || nodeType === 'emit') {
        defaultConfig.eventType = 'custom.event';
      } else if (nodeType === 'setState' || nodeType === 'getState') {
        defaultConfig.key = 'myKey';
      } else if (nodeType === 'integration.query' || nodeType === 'integration.mutate') {
        defaultConfig.name = 'default';
        defaultConfig.params = {};
      }

      const newNode: Node<WidgetGraphNodeData> = {
        id,
        type: 'widgetNode',
        position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 },
        data: { nodeType, config: defaultConfig },
      };
      setNodes((nds) => [...nds, newNode]);
    }
  }, [level, setNodes, handleEnterWidget, notifyGraphStateChange]);

  // ─── Add Widget from Library ──────────────────────────────────
  const handleAddWidgetFromLibrary = useCallback((entry: WidgetRegistryEntry) => {
    const id = createNodeId();
    const ports = portsFromManifest(entry.manifest);

    const newNode: Node<SceneNodeData> = {
      id,
      type: 'sceneNode',
      position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 },
      data: {
        sceneType: 'widget',
        label: entry.manifest.name,
        widgetId: entry.widgetId,
        inputPorts: ports.inputPorts,
        outputPorts: ports.outputPorts,
        config: {},
        onEnterWidget: handleEnterWidget,
      },
    };
    setNodes((nds) => [...nds, newNode]);

    // Track in scene state
    const sceneNode: SceneNode = {
      id,
      type: 'widget',
      label: entry.manifest.name,
      widgetId: entry.widgetId,
      inputPorts: ports.inputPorts,
      outputPorts: ports.outputPorts,
      config: {},
    };
    sceneNodesRef.current = [...sceneNodesRef.current, sceneNode];
    notifyGraphStateChange();
  }, [setNodes, handleEnterWidget, notifyGraphStateChange]);

  // ─── Compile ────────────────────────────────────────────────────
  const handleCompile = useCallback(() => {
    if (level === 'scene') {
      // Scene-level: compile to Pipeline
      const result = compileScene(sceneNodesRef.current, sceneEdgesRef.current);

      if (result.errors.length > 0) {
        setCycleError(result.errors[0]);
        setTimeout(() => setCycleError(null), 3000);
        return;
      }

      // Warnings are non-blocking
      if (result.warnings.length > 0) {
        setCycleError(`Pipeline built with ${result.warnings.length} warning(s)`);
        setTimeout(() => setCycleError(null), 3000);
      }

      // Pipeline is ready — future: pass to canvas wiring engine
      // For now, log success
      if (result.pipeline) {
        onCompile?.(`<!-- Scene Pipeline: ${result.pipeline.nodes.length} nodes, ${result.pipeline.edges.length} edges -->`);
      }
      return;
    }

    // Widget-level: compile to HTML
    const gNodes = flowNodesToGraph(nodes as Node<WidgetGraphNodeData>[]);
    const gEdges = flowEdgesToGraph(edges);
    const result = compileGraph(gNodes, gEdges);

    if (result.errors.length > 0) {
      setCycleError(result.errors[0]);
      setTimeout(() => setCycleError(null), 3000);
      return;
    }

    if (graphSync) {
      graphSync.setGraph(gNodes, gEdges);
      graphSync.syncToEditor();
    }

    onCompile?.(result.html);
  }, [nodes, edges, graphSync, onCompile, level]);

  // ─── Sync Toggle ────────────────────────────────────────────────
  const handleSyncToggle = useCallback(() => {
    if (!graphSync) return;
    if (graphSync.isInSyncMode()) {
      graphSync.setTextOnlyMode(true);
    } else {
      graphSync.resetSync();
      syncToBackend();
    }
  }, [graphSync, syncToBackend]);

  // ─── Empty state message ────────────────────────────────────────
  const currentWidgetLabel = currentWidgetNodeId
    ? sceneNodesRef.current.find((n) => n.id === currentWidgetNodeId)?.label
    : null;
  const emptyMessage = level === 'scene'
    ? 'Add widgets and stickers to design your scene'
    : `Add nodes to build ${currentWidgetLabel ?? 'widget'} logic`;

  return (
    <ConnectionFeedbackProvider>
    <div style={{
      width: '100%', height: '100%',
      position: 'relative',
      background: labPalette.bg,
    }}>
      {/* Cycle error banner */}
      {cycleError && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, padding: '6px 16px', borderRadius: 8,
          background: 'rgba(232,128,108,0.12)',
          border: '1px solid rgba(232,128,108,0.25)',
          fontSize: 11, fontWeight: 500,
          color: labPalette.ember,
          fontFamily: 'var(--sn-font-family)',
          animation: `sn-drift-up 250ms ${SPRING}`,
        }}>
          {cycleError}
        </div>
      )}

      {/* ReactFlow canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'glow' }}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >
        <Background
          color="rgba(255,255,255,0.015)"
          gap={24}
          size={1}
        />
        <Controls
          style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(12px)',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}
        />
        <MiniMap
          style={{
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.04)',
          }}
          maskColor="rgba(0,0,0,0.6)"
          nodeColor={() => 'rgba(78,123,142,0.4)'}
        />
      </ReactFlow>

      {/* Ambient empty state — breathing invitation */}
      {nodes.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          animation: `sn-drift-up 600ms ${SPRING}`,
        }}>
          {/* Subtle glow orb behind text */}
          <div aria-hidden="true" style={{
            position: 'absolute',
            width: 200, height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(78,123,142,0.04) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />

          <div style={{
            fontSize: 15,
            color: labPalette.textMuted,
            fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
            fontStyle: 'italic',
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 280,
            position: 'relative',
          }}>
            {level === 'scene'
              ? 'Describe a widget above, or drag to start building'
              : `Add nodes to build ${currentWidgetLabel ?? 'widget'} logic`
            }
          </div>

          {level === 'scene' && (
            <div style={{
              display: 'flex', gap: 12, marginTop: 20,
              pointerEvents: 'auto',
              animation: `sn-drift-up 600ms ${SPRING} 150ms both`,
            }}>
              <button
                onClick={() => handleAddNode('widget')}
                style={{
                  padding: '7px 16px', fontSize: 11, fontWeight: 500,
                  fontFamily: 'var(--sn-font-family)',
                  color: labPalette.textSoft,
                  background: 'transparent',
                  border: '1px solid rgba(78,123,142,0.15)',
                  borderRadius: 8, cursor: 'pointer',
                  transition: `all 300ms ${SPRING}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(78,123,142,0.35)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(78,123,142,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(78,123,142,0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                + Add widget
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </ConnectionFeedbackProvider>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Default Ports for Scene Nodes
// ═══════════════════════════════════════════════════════════════════

function getDefaultScenePorts(type: SceneNodeType): { inputPorts: Port[]; outputPorts: Port[] } {
  switch (type) {
    case 'widget':
      return {
        inputPorts: [{ id: 'sub-0', name: 'event.in', direction: 'input', eventType: '*' }],
        outputPorts: [{ id: 'emit-0', name: 'event.out', direction: 'output', eventType: '*' }],
      };
    case 'sticker':
      return {
        inputPorts: [],
        outputPorts: [{ id: 'click-emit', name: 'click', direction: 'output' }],
      };
    case 'docker':
      return {
        inputPorts: [{ id: 'sub-0', name: 'event.in', direction: 'input', eventType: '*' }],
        outputPorts: [{ id: 'emit-0', name: 'event.out', direction: 'output', eventType: '*' }],
      };
    case 'group':
      return { inputPorts: [], outputPorts: [] };
    case 'scene-input':
      return {
        inputPorts: [],
        outputPorts: [{ id: 'out-0', name: 'external', direction: 'output' }],
      };
    case 'scene-output':
      return {
        inputPorts: [{ id: 'in-0', name: 'external', direction: 'input' }],
        outputPorts: [],
      };
    default:
      return { inputPorts: [], outputPorts: [] };
  }
}
