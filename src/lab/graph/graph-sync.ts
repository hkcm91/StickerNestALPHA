/**
 * Graph Sync
 *
 * Bidirectional synchronization between the text editor and node graph.
 * When manual edits break sync, enters "text-only mode".
 *
 * @module lab/graph
 * @layer L2
 */

import type { LabEditor } from '../editor/editor';

import type { GraphNode, GraphEdge } from './graph-compiler';
import { compileGraph } from './graph-compiler';

export interface GraphSync {
  syncToEditor(): boolean;
  syncFromEditor(): boolean;
  isInSyncMode(): boolean;
  setTextOnlyMode(enabled: boolean): void;
  getNodes(): GraphNode[];
  getEdges(): GraphEdge[];
  setGraph(nodes: GraphNode[], edges: GraphEdge[]): void;
  resetSync(): void;
  destroy(): void;
}

/**
 * Creates a bidirectional sync manager between editor and graph.
 *
 * @param editor - The Lab editor instance
 */
export function createGraphSync(editor: LabEditor): GraphSync {
  let nodes: GraphNode[] = [];
  let edges: GraphEdge[] = [];
  let textOnlyMode = false;
  let lastCompiledHtml = '';

  return {
    syncToEditor(): boolean {
      if (textOnlyMode) return false;

      const result = compileGraph(nodes, edges);
      if (result.errors.length > 0) return false;

      lastCompiledHtml = result.html;
      editor.setContent(result.html);
      return true;
    },

    syncFromEditor(): boolean {
      if (textOnlyMode) return false;

      const currentContent = editor.getContent();
      // If content matches what we last compiled, graph is already in sync
      if (currentContent === lastCompiledHtml) return true;

      // Manual edit detected — cannot reverse-parse arbitrary HTML back to graph
      textOnlyMode = true;
      return false;
    },

    isInSyncMode(): boolean {
      return !textOnlyMode;
    },

    setTextOnlyMode(enabled: boolean) {
      textOnlyMode = enabled;
    },

    getNodes() {
      return [...nodes];
    },

    getEdges() {
      return [...edges];
    },

    setGraph(newNodes: GraphNode[], newEdges: GraphEdge[]) {
      nodes = [...newNodes];
      edges = [...newEdges];
    },

    resetSync() {
      textOnlyMode = false;
      lastCompiledHtml = '';
    },

    destroy() {
      nodes = [];
      edges = [];
      textOnlyMode = false;
      lastCompiledHtml = '';
    },
  };
}
