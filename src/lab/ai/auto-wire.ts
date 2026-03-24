/**
 * Auto-Wire — Connects widgets in the pipeline graph using semantic port matching.
 *
 * Called after AI widget generation (from PromptRefinement overlay) or when
 * a widget is dropped on the canvas. Uses the semantic port matcher from L0
 * for fuzzy matching — no longer limited to exact string comparison.
 *
 * Mismatches are skipped without error — auto-wiring is best-effort.
 *
 * @module lab/ai
 * @layer L2
 */

import type { WidgetManifest } from '@sn/types';

import { matchPorts, type PortLike } from '../../kernel/pipeline/port-matcher';
import type { WidgetRegistryEntry } from '../../kernel/stores/widget/widget.store';
import { portsFromManifest } from '../graph/scene-types';

import type { CompatibleWidget } from './prompt-questions';

// ─── Types ───────────────────────────────────────────────────────────

/** Minimal graph API surface needed for auto-wiring */
export interface AutoWireGraphAPI {
  getSceneNodes: () => Array<{ id: string; label: string; widgetId?: string }>;
  addWidgetFromLibrary: (entry: WidgetRegistryEntry) => void;
  addSceneEdge: (
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string,
  ) => void;
}

/** Options for controlling auto-wire behavior */
export interface AutoWireOptions {
  /** Minimum match score to create a connection (default: 0.7) */
  minScore?: number;
}

// ─── Auto-Wire Logic ─────────────────────────────────────────────────

/**
 * Wires a newly generated widget to selected widgets in the pipeline graph.
 *
 * For each selected widget:
 * 1. Finds (or adds) the widget in the graph
 * 2. Derives ports from both the new widget's manifest and the selected widget's contracts
 * 3. Connects matching ports using semantic matching (exact, normalized, synonym)
 *
 * All failures are swallowed — auto-wiring is non-blocking.
 */
export function autoWireWidget(
  _newWidgetId: string,
  newManifest: WidgetManifest,
  selectedWidgets: CompatibleWidget[],
  graphAPI: AutoWireGraphAPI,
  installedWidgets: WidgetRegistryEntry[],
  options?: AutoWireOptions,
): void {
  const minScore = options?.minScore ?? 0.7;
  const sceneNodes = graphAPI.getSceneNodes();
  const newPorts = portsFromManifest(newManifest);

  // Find the newly added node (last node with matching label)
  const newNode = [...sceneNodes].reverse().find(
    (n) => n.label === newManifest.name,
  );
  if (!newNode) return;

  for (const selected of selectedWidgets) {
    // Find the selected widget's node in the graph
    let targetNode = sceneNodes.find(
      (n) => n.widgetId === selected.widgetId || n.label === selected.name,
    );

    // If not in graph, add it from the installed widgets registry
    if (!targetNode && selected.widgetId) {
      const registryEntry = installedWidgets.find(
        (w) => w.widgetId === selected.widgetId,
      );
      if (registryEntry) {
        graphAPI.addWidgetFromLibrary(registryEntry);
        // Re-fetch scene nodes to find the newly added node
        const updatedNodes = graphAPI.getSceneNodes();
        targetNode = [...updatedNodes].reverse().find(
          (n) => n.label === selected.name,
        );
      }
    }

    if (!targetNode) continue;

    // Derive target ports from the selected widget's contracts
    const targetPorts = portsFromManifest({
      events: {
        emits: selected.portContracts.emits,
        subscribes: selected.portContracts.subscribes,
      },
    });

    // Match new widget's outputs → selected widget's inputs (semantic matching)
    wireMatchingPorts(
      newNode.id,
      newPorts.outputPorts,
      targetNode.id,
      targetPorts.inputPorts,
      graphAPI,
      minScore,
    );

    // Match selected widget's outputs → new widget's inputs (semantic matching)
    wireMatchingPorts(
      targetNode.id,
      targetPorts.outputPorts,
      newNode.id,
      newPorts.inputPorts,
      graphAPI,
      minScore,
    );
  }
}

/**
 * Matches output ports against input ports using semantic matching
 * and creates edges for the best matches above the score threshold.
 *
 * Each input port gets at most one connection (best match wins).
 */
export function wireMatchingPorts(
  sourceNodeId: string,
  outputPorts: Array<{ id: string; name: string; direction: 'input' | 'output'; eventType?: string; schema?: Record<string, unknown> }>,
  targetNodeId: string,
  inputPorts: Array<{ id: string; name: string; direction: 'input' | 'output'; eventType?: string; schema?: Record<string, unknown> }>,
  graphAPI: Pick<AutoWireGraphAPI, 'addSceneEdge'>,
  minScore: number,
): void {
  // Track which input ports have been connected to avoid duplicates
  const connectedInputs = new Set<string>();

  // Score all possible connections
  const candidates: Array<{
    outPort: PortLike;
    inPort: PortLike;
    score: number;
  }> = [];

  for (const outPort of outputPorts) {
    for (const inPort of inputPorts) {
      const result = matchPorts(outPort as PortLike, inPort as PortLike);
      if (result.score >= minScore) {
        candidates.push({ outPort, inPort, score: result.score });
      }
    }
  }

  // Sort by score descending — best matches connect first
  candidates.sort((a, b) => b.score - a.score);

  for (const { outPort, inPort } of candidates) {
    if (connectedInputs.has(inPort.id)) continue;
    connectedInputs.add(inPort.id);

    graphAPI.addSceneEdge(
      sourceNodeId,
      outPort.id,
      targetNodeId,
      inPort.id,
    );
  }
}
